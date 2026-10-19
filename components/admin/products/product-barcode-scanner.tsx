"use client";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import {
  playBarcodeScannerBeep,
} from "@/components/admin/products/product-barcode-scanner-audio";

type ScannerPhase =
  | "starting"
  | "scanning"
  | "success"
  | "error";

type CameraDevice = {
  deviceId: string;
  label: string;
};

type ScannerControls = {
  stop: () => void | Promise<void>;
};

type TrackingBox = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angleDeg?: number;
};

type BarcodeGuidance = {
  title: string;
  detail: string;
};

type VisualBarcodeCandidate = {
  box: TrackingBox;
  score: number;
};

type ResultPointLike = {
  getX: () => number;
  getY: () => number;
};

type BarcodeResultLike = {
  getResultPoints?: () => ResultPointLike[] | null;
};

type BarcodeDecodeResult =
  BarcodeResultLike & {
    getText: () => string;
  };

type CameraCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  focusMode?: string[];
};

type Props = {
  onClose: () => void;
  onDetected: (barcode: string) => void;
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function convertSourceRectToTrackingBox({
  sourceLeft,
  sourceTop,
  sourceWidth,
  sourceHeight,
  paddingX,
  paddingY,
  video,
}: {
  sourceLeft: number;
  sourceTop: number;
  sourceWidth: number;
  sourceHeight: number;
  paddingX: number;
  paddingY: number;
  video: HTMLVideoElement | null;
}): TrackingBox | null {
  if (
    !video ||
    video.videoWidth <= 0 ||
    video.videoHeight <= 0 ||
    video.clientWidth <= 0 ||
    video.clientHeight <= 0
  ) {
    return null;
  }

  const rawLeft = clamp(
    sourceLeft - paddingX,
    0,
    video.videoWidth,
  );

  const rawTop = clamp(
    sourceTop - paddingY,
    0,
    video.videoHeight,
  );

  const rawRight = clamp(
    sourceLeft + sourceWidth + paddingX,
    0,
    video.videoWidth,
  );

  const rawBottom = clamp(
    sourceTop + sourceHeight + paddingY,
    0,
    video.videoHeight,
  );

  const adjustedWidth = Math.max(
    rawRight - rawLeft,
    video.videoWidth * 0.08,
  );

  const adjustedHeight = Math.max(
    rawBottom - rawTop,
    video.videoHeight * 0.05,
  );

  const sourceCenterX =
    rawLeft + adjustedWidth / 2;

  const sourceCenterY =
    rawTop + adjustedHeight / 2;

  const sourceWidthPx =
    video.videoWidth;

  const sourceHeightPx =
    video.videoHeight;

  const viewWidth = video.clientWidth;
  const viewHeight = video.clientHeight;

  const scale = Math.max(
    viewWidth / sourceWidthPx,
    viewHeight / sourceHeightPx,
  );

  const displayedWidth =
    sourceWidthPx * scale;

  const displayedHeight =
    sourceHeightPx * scale;

  const cropX =
    (displayedWidth - viewWidth) / 2;

  const cropY =
    (displayedHeight - viewHeight) / 2;

  const centerX =
    ((sourceCenterX * scale - cropX) /
      viewWidth) *
    100;

  const centerY =
    ((sourceCenterY * scale - cropY) /
      viewHeight) *
    100;

  const width =
    (adjustedWidth * scale / viewWidth) *
    100;

  const height =
    (adjustedHeight * scale / viewHeight) *
    100;

  const safeWidth = clamp(
    width,
    12,
    94,
  );

  const safeHeight = clamp(
    height,
    5,
    48,
  );

  return {
    centerX: clamp(
      centerX,
      safeWidth / 2 + 1,
      99 - safeWidth / 2,
    ),
    centerY: clamp(
      centerY,
      safeHeight / 2 + 1,
      99 - safeHeight / 2,
    ),
    width: safeWidth,
    height: safeHeight,
  };
}

function calculateBarcodeLock(
  result: BarcodeResultLike,
  video: HTMLVideoElement | null,
): TrackingBox | null {
  const rawPoints =
    result.getResultPoints?.();

  if (
    !Array.isArray(rawPoints) ||
    rawPoints.length < 2
  ) {
    return null;
  }

  const points = rawPoints
    .map((point) => {
      const x = point.getX();
      const y = point.getY();

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        return null;
      }

      return { x, y };
    })
    .filter(
      (
        point,
      ): point is {
        x: number;
        y: number;
      } => point !== null,
    );

  if (points.length < 2) {
    return null;
  }

  const minX = Math.min(
    ...points.map((point) => point.x),
  );

  const maxX = Math.max(
    ...points.map((point) => point.x),
  );

  const minY = Math.min(
    ...points.map((point) => point.y),
  );

  const maxY = Math.max(
    ...points.map((point) => point.y),
  );

  const rawWidth = Math.max(
    maxX - minX,
    1,
  );

  const rawHeight = Math.max(
    maxY - minY,
    1,
  );

  return convertSourceRectToTrackingBox({
    sourceLeft: minX,
    sourceTop: minY,
    sourceWidth: rawWidth,
    sourceHeight: rawHeight,
    paddingX: rawWidth * 0.12,
    paddingY: Math.max(
      rawHeight * 1.15,
      (video?.videoHeight ?? 0) * 0.018,
    ),
    video,
  });
}

const DEFAULT_BARCODE_GUIDANCE: BarcodeGuidance = {
  title: "Point the camera at a barcode",
  detail: "The scanner will locate it automatically.",
};

function normalizeBarcodeAngle(
  angleDeg: number,
) {
  let angle = angleDeg;

  while (angle >= 90) {
    angle -= 180;
  }

  while (angle < -90) {
    angle += 180;
  }

  return angle;
}

function barcodeAngleDelta(
  from: number,
  to: number,
) {
  let delta =
    normalizeBarcodeAngle(to) -
    normalizeBarcodeAngle(from);

  while (delta > 90) {
    delta -= 180;
  }

  while (delta < -90) {
    delta += 180;
  }

  return delta;
}

function smoothTrackingBox(
  previous: TrackingBox | null,
  next: TrackingBox,
): TrackingBox {
  if (!previous) {
    return next;
  }

  const alpha = 0.46;
  const angleAlpha = 0.42;

  const previousAngle =
    previous.angleDeg ?? 0;

  const nextAngle =
    next.angleDeg ?? 0;

  return {
    centerX:
      previous.centerX +
      (next.centerX - previous.centerX) *
        alpha,

    centerY:
      previous.centerY +
      (next.centerY - previous.centerY) *
        alpha,

    width:
      previous.width +
      (next.width - previous.width) *
        alpha,

    height:
      previous.height +
      (next.height - previous.height) *
        alpha,

    angleDeg:
      normalizeBarcodeAngle(
        previousAngle +
          barcodeAngleDelta(
            previousAngle,
            nextAngle,
          ) *
            angleAlpha,
      ),
  };
}

function trackingMovement(
  previous: TrackingBox | null,
  next: TrackingBox,
) {
  if (!previous) {
    return 0;
  }

  return (
    Math.hypot(
      next.centerX - previous.centerX,
      next.centerY - previous.centerY,
    ) +
    (
      Math.abs(next.width - previous.width) +
      Math.abs(next.height - previous.height)
    ) *
      0.32
  );
}

function barcodeGuidanceForCandidate(
  box: TrackingBox,
  score: number,
  movement: number,
): BarcodeGuidance {
  if (box.width < 24) {
    return {
      title: "Move closer",
      detail:
        "The barcode is visible but too small for a reliable read.",
    };
  }

  if (
    box.width > 88 ||
    box.height > 46
  ) {
    return {
      title: "Move farther away",
      detail:
        "Keep the complete barcode visible inside the camera.",
    };
  }

  if (
    box.centerX < 23 ||
    box.centerX > 77 ||
    box.centerY < 18 ||
    box.centerY > 82
  ) {
    return {
      title: "Center the barcode",
      detail:
        "Move the barcode away from the edge of the camera view.",
    };
  }

  if (movement > 7) {
    return {
      title: "Hold steady",
      detail:
        "The barcode is located. Keep the device still for a moment.",
    };
  }

  if (score < 28) {
    return {
      title: "Adjust the distance",
      detail:
        "Move slightly closer and keep the barcode sharp and well lit.",
    };
  }

  return {
    title: "Reading barcode…",
    detail:
      "Barcode located. Hold steady while the scanner confirms it.",
  };
}

function locateLinearBarcode(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): VisualBarcodeCandidate | null {
  if (
    video.videoWidth <= 0 ||
    video.videoHeight <= 0
  ) {
    return null;
  }

  /*
   * Small analysis frame keeps this lightweight on iPads/laptops.
   * ZXing still performs the real decoding.
   */
  const width = 320;

  const height = clamp(
    Math.round(
      width *
        (
          video.videoHeight /
          video.videoWidth
        ),
    ),
    150,
    240,
  );

  if (
    canvas.width !== width ||
    canvas.height !== height
  ) {
    canvas.width = width;
    canvas.height = height;
  }

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

  if (!context) {
    return null;
  }

  context.drawImage(
    video,
    0,
    0,
    width,
    height,
  );

  let imageData: ImageData;

  try {
    imageData =
      context.getImageData(
        0,
        0,
        width,
        height,
      );
  } catch {
    return null;
  }

  const gray =
    new Uint8Array(
      width * height,
    );

  for (
    let pixel = 0;
    pixel < gray.length;
    pixel += 1
  ) {
    const offset =
      pixel * 4;

    gray[pixel] =
      (
        imageData.data[offset] * 77 +
        imageData.data[offset + 1] * 150 +
        imageData.data[offset + 2] * 29
      ) >>
      8;
  }

  /*
   * Horizontal luminance derivative:
   * strong values correspond to vertical lines such as barcode bars.
   */
  const edges =
    new Uint8Array(
      width * height,
    );

  for (
    let y = 1;
    y < height - 1;
    y += 1
  ) {
    const row =
      y * width;

    for (
      let x = 1;
      x < width - 1;
      x += 1
    ) {
      const index =
        row + x;

      edges[index] =
        Math.min(
          255,
          Math.abs(
            gray[index + 1] -
              gray[index - 1],
          ),
        );
    }
  }

  type Candidate = {
    x: number;
    y: number;
    width: number;
    height: number;
    score: number;
  };

  let best:
    | Candidate
    | null = null;

  const candidateWidths = [
    Math.round(width * 0.22),
    Math.round(width * 0.30),
    Math.round(width * 0.40),
    Math.round(width * 0.52),
    Math.round(width * 0.64),
  ];

  const candidateHeights = [
    Math.round(height * 0.075),
    Math.round(height * 0.105),
    Math.round(height * 0.145),
    Math.round(height * 0.19),
  ];

  /*
   * Evaluate barcode-like windows.
   *
   * Real 1D barcodes tend to have many repeated high-contrast
   * transitions across multiple horizontal scan rows.
   */
  for (
    const candidateWidth
    of candidateWidths
  ) {
    for (
      const candidateHeight
      of candidateHeights
    ) {
      for (
        let y = 5;
        y <=
        height -
          candidateHeight -
          5;
        y += 6
      ) {
        for (
          let x = 5;
          x <=
          width -
            candidateWidth -
            5;
          x += 8
        ) {
          const sampleRows = [
            0.22,
            0.36,
            0.50,
            0.64,
            0.78,
          ];

          let strongRows = 0;
          let transitionTotal = 0;
          let energyTotal = 0;

          for (
            const fraction
            of sampleRows
          ) {
            const sampleY =
              clamp(
                Math.round(
                  y +
                    candidateHeight *
                      fraction,
                ),
                1,
                height - 2,
              );

            const rowOffset =
              sampleY * width;

            let transitions = 0;
            let previousStrong = false;

            for (
              let scanX = x + 1;
              scanX <
              x +
                candidateWidth -
                1;
              scanX += 1
            ) {
              const energy =
                edges[
                  rowOffset +
                    scanX
                ];

              energyTotal +=
                energy;

              const strong =
                energy > 35;

              if (
                strong &&
                !previousStrong
              ) {
                transitions += 1;
              }

              previousStrong =
                strong;
            }

            transitionTotal +=
              transitions;

            if (transitions >= 11) {
              strongRows += 1;
            }
          }

          if (strongRows < 3) {
            continue;
          }

          const averageTransitions =
            transitionTotal /
            sampleRows.length;

          const averageEnergy =
            energyTotal /
            (
              candidateWidth *
              sampleRows.length
            );

          if (
            averageTransitions < 11 ||
            averageEnergy < 9
          ) {
            continue;
          }

          const score =
            averageTransitions *
              1.5 +
            averageEnergy *
              0.72 +
            strongRows *
              3.4;

          if (
            !best ||
            score > best.score
          ) {
            best = {
              x,
              y,
              width:
                candidateWidth,
              height:
                candidateHeight,
              score,
            };
          }
        }
      }
    }
  }

  if (
    !best ||
    best.score < 28
  ) {
    return null;
  }

  /*
   * Tighten horizontally around columns carrying real edge energy.
   * This makes the white frame follow the barcode rather than the
   * coarse analysis window.
   */
  const columnEnergy =
    new Float64Array(
      best.width,
    );

  for (
    let localY = 0;
    localY < best.height;
    localY += 1
  ) {
    const row =
      (best.y + localY) *
      width;

    for (
      let localX = 0;
      localX < best.width;
      localX += 1
    ) {
      columnEnergy[
        localX
      ] +=
        edges[
          row +
            best.x +
            localX
        ];
    }
  }

  const peak =
    Math.max(
      ...columnEnergy,
      1,
    );

  const threshold =
    peak * 0.20;

  let first = -1;
  let last = -1;

  for (
    let index = 0;
    index < columnEnergy.length;
    index += 1
  ) {
    if (
      columnEnergy[index] >=
      threshold
    ) {
      first = index;
      break;
    }
  }

  for (
    let index =
      columnEnergy.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      columnEnergy[index] >=
      threshold
    ) {
      last = index;
      break;
    }
  }

  if (
    first < 0 ||
    last <= first ||
    last - first <
      best.width * 0.38
  ) {
    first = 0;
    last =
      best.width - 1;
  }

  const refinedX =
    best.x + first;

  const refinedWidth =
    Math.max(
      1,
      last - first + 1,
    );

  let tensorXX = 0;
  let tensorYY = 0;
  let tensorXY = 0;
  let tensorSamples = 0;

  const tensorStartX =
    Math.max(
      1,
      best.x,
    );

  const tensorEndX =
    Math.min(
      width - 2,
      best.x + best.width,
    );

  const tensorStartY =
    Math.max(
      1,
      best.y,
    );

  const tensorEndY =
    Math.min(
      height - 2,
      best.y + best.height,
    );

  for (
    let sampleY = tensorStartY;
    sampleY <= tensorEndY;
    sampleY += 2
  ) {
    const row =
      sampleY * width;

    for (
      let sampleX = tensorStartX;
      sampleX <= tensorEndX;
      sampleX += 2
    ) {
      const index =
        row + sampleX;

      const gradientX =
        gray[index + 1] -
        gray[index - 1];

      const gradientY =
        gray[index + width] -
        gray[index - width];

      const strength =
        gradientX * gradientX +
        gradientY * gradientY;

      if (strength < 900) {
        continue;
      }

      tensorXX +=
        gradientX * gradientX;

      tensorYY +=
        gradientY * gradientY;

      tensorXY +=
        gradientX * gradientY;

      tensorSamples += 1;
    }
  }

  let estimatedAngleDeg = 0;

  if (tensorSamples >= 12) {
    estimatedAngleDeg =
      normalizeBarcodeAngle(
        0.5 *
          Math.atan2(
            2 * tensorXY,
            tensorXX - tensorYY,
          ) *
          180 /
          Math.PI,
      );
  }

  const sourceScaleX =
    video.videoWidth /
    width;

  const sourceScaleY =
    video.videoHeight /
    height;

  const box =
    convertSourceRectToTrackingBox({
      sourceLeft:
        refinedX *
        sourceScaleX,

      sourceTop:
        best.y *
        sourceScaleY,

      sourceWidth:
        refinedWidth *
        sourceScaleX,

      sourceHeight:
        best.height *
        sourceScaleY,

      paddingX:
        refinedWidth *
        sourceScaleX *
        0.045,

      paddingY:
        best.height *
        sourceScaleY *
        0.14,

      video,
    });

  if (!box) {
    return null;
  }

  return {
    box: {
      ...box,
      angleDeg:
        estimatedAngleDeg,
    },
    score: best.score,
  };
}

function cameraErrorMessage(error: unknown) {
  const name =
    error &&
    typeof error === "object" &&
    "name" in error
      ? String(
          (error as {
            name?: unknown;
          }).name ?? "",
        )
      : "";

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError"
  ) {
    return "Camera access is blocked. Allow camera access for this site, then try again.";
  }

  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError"
  ) {
    return "No camera was found on this device.";
  }

  if (
    name === "NotReadableError" ||
    name === "TrackStartError"
  ) {
    return "The camera is currently unavailable. Another app may be using it.";
  }

  if (name === "OverconstrainedError") {
    return "The requested camera is unavailable. Try another camera.";
  }

  if (name === "SecurityError") {
    return "Camera access requires a secure HTTPS connection.";
  }

  return "The camera could not be started. Check camera permission and try again.";
}

export default function ProductBarcodeScanner({
  onClose,
  onDetected,
}: Props) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const controlsRef =
    useRef<ScannerControls | null>(null);

  const rotationDecodeRef =
    useRef<
      | ((
          canvas: HTMLCanvasElement,
        ) => BarcodeDecodeResult)
      | null
    >(null);

  const activeTrackRef =
    useRef<MediaStreamTrack | null>(null);

  const handledRef = useRef(false);

  const successTimerRef =
    useRef<number | null>(null);

  const trackingBoxRef =
    useRef<TrackingBox | null>(null);

  const [phase, setPhase] =
    useState<ScannerPhase>("starting");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [detectedValue, setDetectedValue] =
    useState("");

  const [trackingBox, setTrackingBox] =
    useState<TrackingBox | null>(null);

  const [guidance, setGuidance] =
    useState<BarcodeGuidance>(
      DEFAULT_BARCODE_GUIDANCE,
    );

  const [successBox, setSuccessBox] =
    useState<TrackingBox | null>(null);

  const [devices, setDevices] =
    useState<CameraDevice[]>([]);

  const [activeDeviceId, setActiveDeviceId] =
    useState<string | null>(null);

  const [
    requestedDeviceId,
    setRequestedDeviceId,
  ] = useState<string | null>(null);

  const [
    torchSupported,
    setTorchSupported,
  ] = useState(false);

  const [torchOn, setTorchOn] =
    useState(false);

  const [torchBusy, setTorchBusy] =
    useState(false);

  const [attempt, setAttempt] =
    useState(0);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusFrame =
      window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.cancelAnimationFrame(
        focusFrame,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    let localControls:
      | ScannerControls
      | null = null;

    handledRef.current = false;

    rotationDecodeRef.current = null;

    activeTrackRef.current = null;

    setPhase("starting");
    setErrorMessage("");
    setDetectedValue("");

    trackingBoxRef.current = null;

    setTrackingBox(null);

    setGuidance(
      DEFAULT_BARCODE_GUIDANCE,
    );

    setSuccessBox(null);
    setTorchSupported(false);
    setTorchOn(false);
    setTorchBusy(false);

    async function startScanner() {
      if (!window.isSecureContext) {
        throw Object.assign(
          new Error(
            "Camera requires HTTPS.",
          ),
          {
            name: "SecurityError",
          },
        );
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        throw Object.assign(
          new Error(
            "Camera APIs are unavailable.",
          ),
          {
            name: "NotFoundError",
          },
        );
      }

      const [
        {
          BrowserMultiFormatReader,
        },
        {
          DecodeHintType,
        },
      ] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);

      if (cancelled) {
        return;
      }

      /*
       * TRY_HARDER makes ZXing inspect more scan rows and enables
       * its rotated 1D decode path when the luminance source
       * supports rotation.
       *
       * This improves recognition when a retail barcode is:
       * - slightly tilted
       * - shifted left/right
       * - not perfectly centered
       * - presented vertically rather than horizontally
       */
      const hints =
        new Map();

      hints.set(
        DecodeHintType.TRY_HARDER,
        true,
      );

      const reader =
        new BrowserMultiFormatReader(
          hints,
          {
            delayBetweenScanAttempts: 75,
            delayBetweenScanSuccess: 650,
          },
        );

      const rotationReader =
        new BrowserMultiFormatReader(
          hints,
          {
            delayBetweenScanAttempts: 0,
            delayBetweenScanSuccess: 0,
          },
        );

      rotationDecodeRef.current =
        (
          canvas: HTMLCanvasElement,
        ) =>
          rotationReader.decodeFromCanvas(
            canvas,
          ) as BarcodeDecodeResult;

      const constraints: MediaStreamConstraints =
        {
          audio: false,
          video: requestedDeviceId
            ? {
                deviceId: {
                  exact:
                    requestedDeviceId,
                },
                width: {
                  ideal: 1920,
                },
                height: {
                  ideal: 1080,
                },
              }
            : {
                facingMode: {
                  ideal: "environment",
                },
                width: {
                  ideal: 1920,
                },
                height: {
                  ideal: 1080,
                },
              },
        };

      const controls =
        await reader.decodeFromConstraints(
          constraints,
          videoRef.current ??
            undefined,
          (
            result,
            _error,
            _callbackControls,
          ) => {
            if (
              !result ||
              handledRef.current ||
              cancelled
            ) {
              return;
            }

            const value =
              result
                .getText()
                .trim();

            if (!value) {
              return;
            }

            handledRef.current = true;

            const finalBox =
              trackingBoxRef.current ??
              calculateBarcodeLock(
                result,
                videoRef.current,
              );

            setSuccessBox(finalBox);
            setDetectedValue(value);
            setPhase("success");

            playBarcodeScannerBeep();

            if (
              "vibrate" in navigator &&
              typeof navigator.vibrate ===
                "function"
            ) {
              navigator.vibrate(45);
            }

            successTimerRef.current =
              window.setTimeout(() => {
                onDetected(value);
              }, 1000);
          },
        );

      localControls = controls;
      controlsRef.current = controls;

      if (cancelled) {
        try {
          void controls.stop();
        } catch {
          // Already stopped.
        }

        return;
      }

      if (handledRef.current) {
        return;
      }

      setPhase("scanning");

      const stream =
        videoRef.current
          ?.srcObject as
          | MediaStream
          | null;

      const activeTrack =
        stream
          ?.getVideoTracks()[0] ??
        null;

      activeTrackRef.current =
        activeTrack;

      const settings =
        activeTrack?.getSettings();

      const currentDeviceId =
        settings?.deviceId ??
        requestedDeviceId ??
        null;

      setActiveDeviceId(
        currentDeviceId,
      );

      if (
        activeTrack &&
        typeof activeTrack
          .getCapabilities ===
          "function"
      ) {
        const capabilities =
          activeTrack.getCapabilities() as
            CameraCapabilities;

        setTorchSupported(
          capabilities.torch === true,
        );

        if (
          Array.isArray(
            capabilities.focusMode,
          ) &&
          capabilities.focusMode.includes(
            "continuous",
          )
        ) {
          void activeTrack
            .applyConstraints(
              {
                advanced: [
                  {
                    focusMode:
                      "continuous",
                  },
                ],
              } as unknown as MediaTrackConstraints,
            )
            .catch(() => {
              // Autofocus is enhancement only.
            });
        }
      }

      try {
        const availableDevices =
          await navigator.mediaDevices.enumerateDevices();

        if (cancelled) {
          return;
        }

        const cameras =
          availableDevices
            .filter(
              (device) =>
                device.kind ===
                  "videoinput" &&
                Boolean(device.deviceId),
            )
            .map(
              (
                device,
                index,
              ) => ({
                deviceId:
                  device.deviceId,
                label:
                  device.label.trim() ||
                  `Camera ${index + 1}`,
              }),
            );

        setDevices(cameras);
      } catch {
        // Camera switching is optional.
      }
    }

    void startScanner().catch(
      (error) => {
        if (
          cancelled ||
          handledRef.current
        ) {
          return;
        }

        setPhase("error");
        setErrorMessage(
          cameraErrorMessage(
            error,
          ),
        );
      },
    );

    return () => {
      cancelled = true;

      if (
        successTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          successTimerRef.current,
        );
        successTimerRef.current =
          null;
      }

      activeTrackRef.current = null;

      const controls =
        localControls ??
        controlsRef.current;

      controlsRef.current = null;

      if (controls) {
        try {
          void controls.stop();
        } catch {
          // Stream may already be stopped.
        }
      }
    };
  }, [
    attempt,
    onDetected,
    requestedDeviceId,
  ]);

  useEffect(() => {
    if (phase !== "scanning") {
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    let lastAnalysisAt = 0;
    let missingFrames = 0;

    const canvas =
      document.createElement(
        "canvas",
      );

    const analyze = (
      timestamp: number,
    ) => {
      if (
        cancelled ||
        handledRef.current
      ) {
        return;
      }

      const video =
        videoRef.current;

      if (
        !video ||
        video.readyState < 2 ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0 ||
        document.hidden
      ) {
        animationFrame =
          window.requestAnimationFrame(
            analyze,
          );

        return;
      }

      /*
       * Roughly 9 visual analyses per second.
       * Enough to follow a moving hand without wasting CPU.
       */
      if (
        timestamp -
          lastAnalysisAt <
        110
      ) {
        animationFrame =
          window.requestAnimationFrame(
            analyze,
          );

        return;
      }

      lastAnalysisAt =
        timestamp;

      const candidate =
        locateLinearBarcode(
          video,
          canvas,
        );

      if (candidate) {
        missingFrames = 0;

        const previous =
          trackingBoxRef.current;

        const movement =
          trackingMovement(
            previous,
            candidate.box,
          );

        const smoothed =
          smoothTrackingBox(
            previous,
            candidate.box,
          );

        trackingBoxRef.current =
          smoothed;

        setTrackingBox(
          smoothed,
        );

        setGuidance(
          barcodeGuidanceForCandidate(
            smoothed,
            candidate.score,
            movement,
          ),
        );
      } else {
        missingFrames += 1;

        /*
         * A tiny grace period prevents one noisy frame from
         * making the white outline flash on/off.
         */
        if (missingFrames >= 3) {
          trackingBoxRef.current =
            null;

          setTrackingBox(null);

          setGuidance(
            DEFAULT_BARCODE_GUIDANCE,
          );
        }
      }

      if (
        !cancelled &&
        !handledRef.current
      ) {
        animationFrame =
          window.requestAnimationFrame(
            analyze,
          );
      }
    };

    animationFrame =
      window.requestAnimationFrame(
        analyze,
      );

    return () => {
      cancelled = true;

      window.cancelAnimationFrame(
        animationFrame,
      );
    };
  }, [
    phase,
    attempt,
    requestedDeviceId,
  ]);

  /*
   * ORIENTATION-INDEPENDENT DECODER
   *
   * The main ZXing camera reader remains the fastest path.
   * This second path rotates a lightweight copy of the live frame
   * and decodes it with an independent ZXing reader.
   */
  useEffect(() => {
    if (phase !== "scanning") {
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    let lastAttemptAt = 0;
    let sequenceIndex = 0;
    let preferTrackedAngle = true;

    const rotatedCanvas =
      document.createElement(
        "canvas",
      );

    /*
     * Fixed fallbacks make the decoder independent from the
     * visual locator. This matters especially for a barcode that
     * enters the camera already vertical and has not yet produced
     * a white tracking box.
     */
    const rotationSequence = [
      -90,
      90,
      180,
      -45,
      45,
      -30,
      30,
      -60,
      60,
      -15,
      15,
      -75,
      75,
    ];

    const decodeFrame = (
      timestamp: number,
    ) => {
      if (
        cancelled ||
        handledRef.current
      ) {
        return;
      }

      const video =
        videoRef.current;

      const decodeRotated =
        rotationDecodeRef.current;

      if (
        !video ||
        !decodeRotated ||
        video.readyState < 2 ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0 ||
        document.hidden
      ) {
        animationFrame =
          window.requestAnimationFrame(
            decodeFrame,
          );

        return;
      }

      /*
       * One extra orientation attempt roughly every 120 ms.
       * We deliberately do NOT try every rotation in one frame,
       * which keeps iPad/Safari responsive.
       */
      if (
        timestamp -
          lastAttemptAt <
        120
      ) {
        animationFrame =
          window.requestAnimationFrame(
            decodeFrame,
          );

        return;
      }

      lastAttemptAt =
        timestamp;

      const trackedAngle =
        trackingBoxRef.current
          ?.angleDeg ??
        0;

      let rotationDeg: number;

      if (
        preferTrackedAngle &&
        Math.abs(
          trackedAngle,
        ) >= 5
      ) {
        /*
         * Barcode at +30° => rotate image -30°.
         */
        rotationDeg =
          -trackedAngle;
      } else {
        rotationDeg =
          rotationSequence[
            sequenceIndex %
              rotationSequence.length
          ];

        sequenceIndex += 1;
      }

      preferTrackedAngle =
        !preferTrackedAngle;

      const sourceWidth =
        video.videoWidth;

      const sourceHeight =
        video.videoHeight;

      /*
       * 640 px is deliberately smaller than the 1920 camera
       * stream. Barcode edges remain clear while rotated decoding
       * stays fast enough for tablets.
       */
      const scale =
        Math.min(
          1,
          640 /
            Math.max(
              sourceWidth,
              sourceHeight,
            ),
        );

      const drawWidth =
        Math.max(
          1,
          Math.round(
            sourceWidth *
              scale,
          ),
        );

      const drawHeight =
        Math.max(
          1,
          Math.round(
            sourceHeight *
              scale,
          ),
        );

      const radians =
        rotationDeg *
        Math.PI /
        180;

      const cosine =
        Math.abs(
          Math.cos(
            radians,
          ),
        );

      const sine =
        Math.abs(
          Math.sin(
            radians,
          ),
        );

      const outputWidth =
        Math.ceil(
          drawWidth *
            cosine +
          drawHeight *
            sine,
        );

      const outputHeight =
        Math.ceil(
          drawWidth *
            sine +
          drawHeight *
            cosine,
        );

      rotatedCanvas.width =
        outputWidth;

      rotatedCanvas.height =
        outputHeight;

      const context =
        rotatedCanvas.getContext(
          "2d",
          {
            willReadFrequently:
              true,
          },
        );

      if (!context) {
        animationFrame =
          window.requestAnimationFrame(
            decodeFrame,
          );

        return;
      }

      /*
       * White corners are friendlier to barcode thresholding than
       * the default transparent/black area after canvas rotation.
       */
      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        outputWidth,
        outputHeight,
      );

      context.save();

      context.translate(
        outputWidth / 2,
        outputHeight / 2,
      );

      context.rotate(
        radians,
      );

      context.drawImage(
        video,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      );

      context.restore();

      try {
        const result =
          decodeRotated(
            rotatedCanvas,
          );

        const value =
          result
            .getText()
            .trim();

        if (
          value &&
          !handledRef.current
        ) {
          handledRef.current =
            true;

          /*
           * If the visual locator already follows the product,
           * preserve that exact rotated box for the green lock.
           */
          let finalBox =
            trackingBoxRef.current;

          /*
           * If no white tracking box existed (common when the
           * barcode entered vertically), map ZXing's result points
           * from the rotated canvas back into the original camera.
           */
          if (!finalBox) {
            const rawPoints =
              result
                .getResultPoints?.() ??
              [];

            const mappedPoints =
              rawPoints
                .map((point) => {
                  const resultX =
                    point.getX();

                  const resultY =
                    point.getY();

                  if (
                    !Number.isFinite(
                      resultX,
                    ) ||
                    !Number.isFinite(
                      resultY,
                    )
                  ) {
                    return null;
                  }

                  const translatedX =
                    resultX -
                    outputWidth / 2;

                  const translatedY =
                    resultY -
                    outputHeight / 2;

                  /*
                   * Undo the canvas rotation.
                   */
                  const inverseCosine =
                    Math.cos(
                      -radians,
                    );

                  const inverseSine =
                    Math.sin(
                      -radians,
                    );

                  const drawX =
                    translatedX *
                      inverseCosine -
                    translatedY *
                      inverseSine +
                    drawWidth / 2;

                  const drawY =
                    translatedX *
                      inverseSine +
                    translatedY *
                      inverseCosine +
                    drawHeight / 2;

                  return {
                    x:
                      drawX /
                      scale,

                    y:
                      drawY /
                      scale,
                  };
                })
                .filter(
                  (
                    point,
                  ): point is {
                    x: number;
                    y: number;
                  } =>
                    point !== null,
                );

            if (
              mappedPoints.length >=
              2
            ) {
              let pointA =
                mappedPoints[0];

              let pointB =
                mappedPoints[1];

              let longestDistance =
                0;

              for (
                let a = 0;
                a <
                mappedPoints.length;
                a += 1
              ) {
                for (
                  let b =
                    a + 1;
                  b <
                  mappedPoints.length;
                  b += 1
                ) {
                  const distance =
                    Math.hypot(
                      mappedPoints[b]
                        .x -
                        mappedPoints[a]
                          .x,

                      mappedPoints[b]
                        .y -
                        mappedPoints[a]
                          .y,
                    );

                  if (
                    distance >
                    longestDistance
                  ) {
                    longestDistance =
                      distance;

                    pointA =
                      mappedPoints[a];

                    pointB =
                      mappedPoints[b];
                  }
                }
              }

              const centerX =
                mappedPoints.reduce(
                  (
                    total,
                    point,
                  ) =>
                    total +
                    point.x,
                  0,
                ) /
                mappedPoints.length;

              const centerY =
                mappedPoints.reduce(
                  (
                    total,
                    point,
                  ) =>
                    total +
                    point.y,
                  0,
                ) /
                mappedPoints.length;

              const longSide =
                Math.max(
                  longestDistance,
                  sourceWidth *
                    0.12,
                );

              const shortSide =
                Math.max(
                  sourceHeight *
                    0.055,
                  longSide *
                    0.14,
                );

              const mappedBox =
                convertSourceRectToTrackingBox({
                  sourceLeft:
                    centerX -
                    longSide / 2,

                  sourceTop:
                    centerY -
                    shortSide / 2,

                  sourceWidth:
                    longSide,

                  sourceHeight:
                    shortSide,

                  paddingX:
                    longSide *
                    0.06,

                  paddingY:
                    shortSide *
                    0.18,

                  video,
                });

              if (mappedBox) {
                finalBox = {
                  ...mappedBox,

                  angleDeg:
                    normalizeBarcodeAngle(
                      Math.atan2(
                        pointB.y -
                          pointA.y,

                        pointB.x -
                          pointA.x,
                      ) *
                        180 /
                        Math.PI,
                    ),
                };
              }
            }
          }

          setSuccessBox(
            finalBox,
          );

          setDetectedValue(
            value,
          );

          setPhase(
            "success",
          );

          playBarcodeScannerBeep();

          if (
            "vibrate" in navigator &&
            typeof navigator.vibrate ===
              "function"
          ) {
            navigator.vibrate(
              45,
            );
          }

          successTimerRef.current =
            window.setTimeout(
              () => {
                onDetected(
                  value,
                );
              },
              1000,
            );

          return;
        }
      } catch {
        /*
         * NotFound / Checksum / Format errors are completely
         * expected while the camera is moving between angles.
         */
      }

      if (
        !cancelled &&
        !handledRef.current
      ) {
        animationFrame =
          window.requestAnimationFrame(
            decodeFrame,
          );
      }
    };

    animationFrame =
      window.requestAnimationFrame(
        decodeFrame,
      );

    return () => {
      cancelled = true;

      window.cancelAnimationFrame(
        animationFrame,
      );
    };
  }, [
    phase,
    attempt,
    onDetected,
    requestedDeviceId,
  ]);

  function retryCamera() {
    setRequestedDeviceId(null);
    setAttempt(
      (current) =>
        current + 1,
    );
  }

  function switchCamera() {
    if (devices.length < 2) {
      return;
    }

    const currentIndex =
      devices.findIndex(
        (device) =>
          device.deviceId ===
          activeDeviceId,
      );

    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) %
          devices.length
        : 0;

    const nextDevice =
      devices[nextIndex];

    setTorchOn(false);
    setRequestedDeviceId(
      nextDevice.deviceId,
    );
  }

  async function toggleTorch() {
    const track =
      activeTrackRef.current;

    if (
      !track ||
      !torchSupported ||
      torchBusy
    ) {
      return;
    }

    const nextState = !torchOn;

    setTorchBusy(true);

    try {
      await track.applyConstraints(
        {
          advanced: [
            {
              torch: nextState,
            },
          ],
        } as unknown as MediaTrackConstraints,
      );

      setTorchOn(nextState);
    } catch {
      setTorchSupported(false);
      setTorchOn(false);
    } finally {
      setTorchBusy(false);
    }
  }

  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const visibleBox =
    phase === "success"
      ? successBox
      : trackingBox;

  const frameStyle =
    visibleBox
      ? {
          left:
            `${visibleBox.centerX}%`,
          top:
            `${visibleBox.centerY}%`,
          width:
            `${visibleBox.width}%`,
          height:
            `${visibleBox.height}%`,
          transform:
            `translate(-50%, -50%) rotate(${visibleBox.angleDeg ?? 0}deg)`,
        }
      : undefined;

  const showFrame =
    phase === "success"
      ? Boolean(successBox)
      : Boolean(trackingBox);

  return createPortal(
    <div
      className="st-admin-barcode-scanner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="st-admin-barcode-scanner-title"
      aria-describedby="st-admin-barcode-scanner-description"
    >
      <div className="st-admin-barcode-scanner__panel">
        <header className="st-admin-barcode-scanner__header">
          <div>
            <span className="st-admin-barcode-scanner__eyebrow">
              Barcode scanner
            </span>

            <h2 id="st-admin-barcode-scanner-title">
              Scan a product
            </h2>

            <p id="st-admin-barcode-scanner-description">
              Point the camera at a barcode. The scanner outlines it automatically and inserts the result after capture.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="st-admin-barcode-scanner__close"
            onClick={onClose}
            aria-label="Close barcode scanner"
            title="Close scanner"
          >
            <X
              className="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="st-admin-barcode-scanner__viewport">
          <video
            ref={videoRef}
            className="st-admin-barcode-scanner__video"
            autoPlay
            muted
            playsInline
            aria-hidden="true"
          />

          {phase === "scanning" ? (
            <div
              className={`st-admin-barcode-scanner__floating-hint ${
                showFrame
                  ? "is-guiding"
                  : "is-searching"
              }`}
              role="status"
              aria-live="polite"
            >
              <strong>
                {guidance.title}
              </strong>

              <span>
                {guidance.detail}
              </span>
            </div>
          ) : null}

          <div
            className={`st-admin-barcode-scanner__frame ${
              showFrame
                ? "is-visible"
                : ""
            } ${
              phase === "scanning"
                ? "is-tracking"
                : ""
            } ${
              phase === "success"
                ? "is-success"
                : ""
            }`}
            style={frameStyle}
            aria-hidden="true"
          >
            <span className="st-admin-barcode-scanner__corner is-top-left" />
            <span className="st-admin-barcode-scanner__corner is-top-right" />
            <span className="st-admin-barcode-scanner__corner is-bottom-left" />
            <span className="st-admin-barcode-scanner__corner is-bottom-right" />

            <span className="st-admin-barcode-scanner__beam" />

            <span className="st-admin-barcode-scanner__frame-label">
              {phase === "success"
                ? "Barcode captured"
                : "Reading…"}
            </span>
          </div>

          {phase === "starting" ? (
            <div className="st-admin-barcode-scanner__state">
              <div className="st-admin-barcode-scanner__spinner" />

              <strong>
                Opening camera
              </strong>

              <span>
                Camera permission may be requested by your device.
              </span>
            </div>
          ) : null}

          {phase === "success" ? (
            <div
              data-admin-product-success="true"
              className="st-admin-product-alert-v5 st-category-action-notice-v4 st-admin-barcode-scanner__success-notice"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2
                aria-hidden="true"
              />

              <div>
                <p>
                  Barcode captured
                </p>

                <p>
                  <strong>
                    {detectedValue}
                  </strong>{" "}
                  recognized. Adding to product search…
                </p>
              </div>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="st-admin-barcode-scanner__error">
              <span className="st-admin-barcode-scanner__error-icon">
                <AlertCircle aria-hidden="true" />
              </span>

              <strong>
                Camera unavailable
              </strong>

              <p>
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={retryCamera}
              >
                <RefreshCw aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : null}
        </div>

        <footer className="st-admin-barcode-scanner__footer">
          <div className="st-admin-barcode-scanner__instruction">
            <span>
              <Camera aria-hidden="true" />
            </span>

            <div>
              <strong>
                Hold the barcode clearly in view
              </strong>

              <small>
                The scanner follows the barcode live, turns green when captured, then inserts the value automatically.
              </small>
            </div>
          </div>

          {phase === "scanning" ? (
            <div className="st-admin-barcode-scanner__controls">
              {torchSupported ? (
                <button
                  type="button"
                  className={`st-admin-barcode-scanner__utility-button st-admin-barcode-scanner__flash-button ${
                    torchOn
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    void toggleTorch()
                  }
                  disabled={torchBusy}
                  aria-pressed={torchOn}
                  aria-label={
                    torchOn
                      ? "Turn flash off"
                      : "Turn flash on"
                  }
                >
                  <span
                    className="st-admin-barcode-scanner__flash-face st-admin-barcode-scanner__flash-face--off"
                    aria-hidden="true"
                  >
                    <Zap />
                    <span>Flash</span>
                  </span>

                  <span
                    className="st-admin-barcode-scanner__flash-face st-admin-barcode-scanner__flash-face--on"
                    aria-hidden="true"
                  >
                    <Zap />
                    <span>Flash on</span>
                  </span>
                </button>
              ) : null}

              {devices.length > 1 ? (
                <button
                  type="button"
                  className="st-admin-barcode-scanner__utility-button"
                  onClick={switchCamera}
                >
                  <RefreshCw aria-hidden="true" />
                  Switch camera
                </button>
              ) : null}
            </div>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
