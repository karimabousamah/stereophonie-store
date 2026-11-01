"use client";

/*
 * ST_ASSISTANT_MEDIA_RECORDER_V5
 *
 * Microphone capture and multilingual transcription.
 * Record -> finish -> review, or Record -> Send directly.
 * No recorded audio is saved by this application.
 */

import { useEffect, useRef, useState, type RefObject } from "react";

type Phase =
  | "idle"
  | "starting"
  | "recording"
  | "finishing"
  | "transcribing";

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  onRecordingChange: (active: boolean) => void;
  onProcessingChange: (active: boolean) => void;
  onAudioLevel: (level: number) => void;
  onStatusChange: (status: string) => void;
  onSendText: (text: string) => void | Promise<void>;
  directSendRef: RefObject<(() => void) | null>;
  disabled: boolean;
  open: boolean;
};

const MAX_DURATION_MS = 60_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <path d="M12 19v3" />
      <path d="M8 22h8" />
    </svg>
  );
}

/* ST_ASSISTANT_CLOSE_AND_FOCUS_POLISH_V2 */
function VoiceCloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function recordingFormat(): string | null {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return null;
  }

  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}


/* ST_ASSISTANT_LOCAL_WHISPER_CONNECTION_V1 */

type LocalWhisperMessage = {
  type: "loading" | "progress" | "processing" | "result" | "error";
  id: number;
  progress?: number;
  text?: string;
  code?: string;
};

const WHISPER_SAMPLE_RATE = 16_000;
const MAX_LOCAL_SAMPLES = 60 * WHISPER_SAMPLE_RATE;

/*
 * Decode MediaRecorder audio entirely in the browser.
 * Downmix and resample to mono, 16 kHz Float32 PCM.
 * The resulting samples go only to a local Web Worker.
 */
async function decodeForWhisper(
  recording: Blob,
): Promise<Float32Array> {
  const context = new AudioContext();

  try {
    const bytes = await recording.arrayBuffer();
    const decoded = await context.decodeAudioData(bytes);

    if (
      !Number.isFinite(decoded.duration) ||
      decoded.duration < 0.1 ||
      decoded.duration > 61
    ) {
      throw new Error(
        "Invalid recording duration. Please try again.",
      );
    }

    const frameCount = Math.min(
      MAX_LOCAL_SAMPLES,
      Math.max(
        1,
        Math.ceil(
          decoded.duration * WHISPER_SAMPLE_RATE,
        ),
      ),
    );

    const offline = new OfflineAudioContext(
      1,
      frameCount,
      WHISPER_SAMPLE_RATE,
    );

    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);

    const rendered = await offline.startRendering();

    return new Float32Array(
      rendered.getChannelData(0),
    );
  } finally {
    void context.close().catch(() => {});
  }
}

export default function AssistantVoiceDictation({
  draft,
  onDraftChange,
  onRecordingChange,
  onProcessingChange,
  onAudioLevel,
  onStatusChange,
  onSendText,
  directSendRef,
  disabled,
  open,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");

  const phaseRef = useRef<Phase>("idle");
  const sessionRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const interruptRef = useRef<(() => void) | null>(null);
  const baseRef = useRef("");
  const sendAfterRef = useRef(false);

  function updatePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function releaseAudio() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) void context.close().catch(() => {});

    onAudioLevel(0);
  }

  function cancel() {
    sessionRef.current += 1;

    interruptRef.current?.();
    interruptRef.current = null;

    workerRef.current?.terminate();
    workerRef.current = null;

    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.onstop = null;
        recorder.stop();
      } catch {
        // Already stopped.
      }
    }

    releaseAudio();
    onStatusChange("");
    sendAfterRef.current = false;
    onDraftChange(baseRef.current);
    onRecordingChange(false);
    onProcessingChange(false);
    updatePhase("idle");
    setNotice("");
  }

  useEffect(() => {
    if (!open && phaseRef.current !== "idle") {
      cancel();
    }
    // Assistant visibility changes cancel ongoing dictation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      interruptRef.current?.();
      interruptRef.current = null;

      workerRef.current?.terminate();
      workerRef.current = null;

      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.onstop = null;
          recorder.stop();
        } catch {
          // Ignore unmount races.
        }
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  async function transcribe(
    session: number,
    recordedAudio: Blob,
    sendImmediately: boolean,
  ) {
    if (sessionRef.current !== session) return;

    updatePhase("transcribing");
    onProcessingChange(true);
    onStatusChange("Preparing recording...");

    try {
      if (
        recordedAudio.size < 100 ||
        recordedAudio.size > MAX_AUDIO_BYTES
      ) {
        throw new Error(
          "Recording is empty or too large. Please try again.",
        );
      }

      const samples = await decodeForWhisper(
        recordedAudio,
      );

      if (sessionRef.current !== session) return;

      if (
        samples.length < WHISPER_SAMPLE_RATE / 10 ||
        samples.length > MAX_LOCAL_SAMPLES
      ) {
        throw new Error(
          "Please record a shorter question.",
        );
      }

      let worker = workerRef.current;

      if (!worker) {
        worker = new Worker(
          new URL(
            "./assistant-local-whisper.worker.ts",
            import.meta.url,
          ),
          { type: "module" },
        );

        workerRef.current = worker;
      }

      const localWorker = worker;

      const transcript = await new Promise<string>(
        (resolve, reject) => {
          let settled = false;
          let timer = 0;

          const cleanup = () => {
            window.clearTimeout(timer);
            localWorker.onmessage = null;
            localWorker.onerror = null;

            if (interruptRef.current === interrupt) {
              interruptRef.current = null;
            }
          };

          const fail = (error: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
          };

          const succeed = (text: string) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(text);
          };

          const interrupt = () => {
            fail(new Error("Dictation cancelled."));
          };

          interruptRef.current = interrupt;

          localWorker.onmessage = (
            event: MessageEvent<LocalWhisperMessage>,
          ) => {
            const message = event.data;

            if (
              !message ||
              message.id !== session ||
              sessionRef.current !== session
            ) {
              return;
            }

            if (message.type === "loading") {
              onStatusChange("Loading speech model...");
              return;
            }

            if (message.type === "progress") {
              if (
                typeof message.progress === "number"
              ) {
                onStatusChange(
                  "Loading model " +
                    Math.round(message.progress) +
                    "%",
                );
              }
              return;
            }

            if (message.type === "processing") {
              onStatusChange(
                "Transcribing on your device...",
              );
              return;
            }

            if (message.type === "result") {
              const text = message.text?.trim();

              if (text) {
                succeed(text);
              } else {
                fail(
                  new Error(
                    "No speech detected. Please try again.",
                  ),
                );
              }

              return;
            }

            if (message.type === "error") {
              if (
                message.code === "LOCAL_ENGINE_FAILED"
              ) {
                localWorker.terminate();
                if (workerRef.current === localWorker) {
                  workerRef.current = null;
                }
              }

              fail(
                new Error(
                  message.code === "NO_SPEECH"
                    ? "No speech detected. Please try again."
                    : "Local speech recognition failed. " +
                      "Please try again.",
                ),
              );
            }
          };

          localWorker.onerror = () => {
            localWorker.terminate();

            if (workerRef.current === localWorker) {
              workerRef.current = null;
            }

            fail(
              new Error(
                "The local speech engine couldn't load. " +
                  "Please try again.",
              ),
            );
          };

          // The first model download may take longer.
          timer = window.setTimeout(() => {
            localWorker.terminate();

            if (workerRef.current === localWorker) {
              workerRef.current = null;
            }

            fail(
              new Error(
                "Speech recognition took too long. " +
                  "Please try again.",
              ),
            );
          }, 240_000);

          try {
            localWorker.postMessage(
              {
                type: "transcribe",
                id: session,
                audio: samples,
              },
              [samples.buffer],
            );
          } catch {
            localWorker.terminate();

            if (workerRef.current === localWorker) {
              workerRef.current = null;
            }

            fail(
              new Error(
                "Your browser couldn't start the " +
                  "local speech engine.",
              ),
            );
          }
        },
      );

      if (sessionRef.current !== session) return;

      const completeText = [
        baseRef.current.trim(),
        transcript.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      onDraftChange(completeText);
      onRecordingChange(false);
      onProcessingChange(false);
      onStatusChange("");
      updatePhase("idle");
      setNotice("");

      if (sendImmediately && completeText) {
        void Promise.resolve(
          onSendText(completeText),
        ).catch(() => {
          setNotice(
            "The message couldn't be sent. Please try again.",
          );
        });
      }
    } catch (error) {
      if (sessionRef.current !== session) return;

      onDraftChange(baseRef.current);
      onRecordingChange(false);
      onProcessingChange(false);
      onStatusChange("");
      updatePhase("idle");

      setNotice(
        error instanceof Error
          ? error.message
          : "Local transcription failed. Please try again.",
      );
    }
  }

  function finish(sendImmediately: boolean) {
    if (
      phaseRef.current !== "recording" ||
      !recorderRef.current
    ) {
      return;
    }

    sendAfterRef.current = sendImmediately;
    updatePhase("finishing");
    onStatusChange("Preparing recording...");
    onProcessingChange(true);

    try {
      recorderRef.current.stop();
    } catch {
      cancel();
      setNotice("Recording couldn't finish. Please try again.");
    }
  }

  // Expose direct Send without changing the shopping API.
  useEffect(() => {
    directSendRef.current = () => finish(true);
    return () => {
      directSendRef.current = null;
    };
  });

  function startAudioLevels(stream: MediaStream) {
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioContextRef.current = context;

      const samples = new Uint8Array(analyser.fftSize);
      let lastTime = 0;

      const tick = (time: number) => {
        if (
          phaseRef.current !== "recording" ||
          !streamRef.current
        ) {
          return;
        }

        if (time - lastTime > 50) {
          analyser.getByteTimeDomainData(samples);

          let total = 0;

          for (let index = 0; index < samples.length; index++) {
            const value = (samples[index] - 128) / 128;
            total += value * value;
          }

          const rms = Math.sqrt(total / samples.length);
          onAudioLevel(Math.min(1, rms * 12));
          lastTime = time;
        }

        frameRef.current = window.requestAnimationFrame(tick);
      };

      frameRef.current = window.requestAnimationFrame(tick);

      if (context.state === "suspended") {
        void context.resume().catch(() => {});
      }
    } catch {
      // Recording stays functional if visualization is unavailable.
    }
  }

  async function start() {
    if (disabled || phaseRef.current !== "idle") return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setNotice(
        "Microphone recording isn't supported in this browser.",
      );
      return;
    }

    const mime = recordingFormat();

    if (!mime) {
      setNotice(
        "This browser doesn't provide a supported audio format.",
      );
      return;
    }

    const session = ++sessionRef.current;
    baseRef.current = draft;
    sendAfterRef.current = false;

    setNotice("");
    onStatusChange("Requesting microphone...");
    updatePhase("starting");
    onRecordingChange(true);
    onProcessingChange(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (sessionRef.current !== session) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const recorder = new MediaRecorder(
        stream,
        { mimeType: mime },
      );

      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (
          sessionRef.current === session &&
          event.data.size > 0
        ) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (sessionRef.current !== session) return;
        cancel();
        setNotice("Audio recording failed. Please try again.");
      };

      recorder.onstop = () => {
        if (sessionRef.current !== session) return;

        const directSend = sendAfterRef.current;
        const recordedType = recorder.mimeType || mime;

        recorderRef.current = null;
        releaseAudio();

        void transcribe(
          session,
          new Blob(chunks, { type: recordedType }),
          directSend,
        );
      };

      recorder.start(500);
      updatePhase("recording");
      onStatusChange("");
      onProcessingChange(false);
      startAudioLevels(stream);

      timerRef.current = window.setTimeout(
        () => finish(false),
        MAX_DURATION_MS,
      );
    } catch (error) {
      if (sessionRef.current !== session) return;

      releaseAudio();
      recorderRef.current = null;
      onRecordingChange(false);
      onProcessingChange(false);
      onStatusChange("");
      updatePhase("idle");

      const name = error instanceof Error ? error.name : "";

      setNotice(
        name === "NotAllowedError"
          ? "Microphone access was denied. Check your browser permissions."
          : name === "NotFoundError"
            ? "No microphone was found."
            : "The microphone couldn't start. Please try again.",
      );
    }
  }

  return (
    <div className="st3-ai-dictation">
      {phase !== "idle" ? (
        <button
          className="st3-ai-dictation__cancel"
          type="button"
          onClick={cancel}
          aria-label="Cancel and discard dictation"
          title="Cancel recording"
        >
          <VoiceCloseIcon />
        </button>
      ) : null}

      <button
        className="st3-ai-dictation__mic"
        type="button"
        disabled={
          disabled ||
          phase === "starting" ||
          phase === "finishing" ||
          phase === "transcribing"
        }
        onClick={phase === "idle" ? start : () => finish(false)}
        onContextMenu={(event) => {
          if (phase === "recording") {
            event.preventDefault();
            finish(false);
          }
        }}
        data-phase={phase}
        aria-pressed={phase !== "idle"}
        aria-label={
          phase === "idle"
            ? "Start dictation"
            : phase === "recording"
              ? "Finish and review dictation"
              : "Processing dictation"
        }
        title={
          phase === "idle"
            ? "Speak your question"
            : "Finish dictation"
        }
      >
        {phase === "idle" ? (
          <MicrophoneIcon />
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
      </button>

      {notice ? (
        <div
          className="st3-ai-dictation__notice"
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss dictation notice"
          >
            <VoiceCloseIcon />
          </button>
        </div>
      ) : null}
    </div>
  );
}
