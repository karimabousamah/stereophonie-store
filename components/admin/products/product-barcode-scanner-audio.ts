"use client";

let barcodeScannerAudioContext: AudioContext | null = null;

let barcodeScannerAudio:
  | HTMLAudioElement
  | null = null;

function ensureBarcodeScannerAudio() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!barcodeScannerAudio) {
    const audio =
      new Audio(
        "/sounds/barcode-scan.wav",
      );

    audio.preload = "auto";
    audio.volume = 0.78;

    barcodeScannerAudio =
      audio;
  }

  return barcodeScannerAudio;
}

export function primeBarcodeScannerAudio() {
  if (typeof window === "undefined") {
    return;
  }

  /*
   * PRIMARY SAFARI / IPAD PATH
   *
   * Prime the exact HTMLAudioElement during the administrator's
   * camera-button gesture. Safari is substantially more reliable
   * with a previously user-activated media element than with an
   * oscillator created only after barcode recognition.
   */
  try {
    const audio =
      ensureBarcodeScannerAudio();

    if (audio) {
      audio.pause();
      audio.currentTime = 0;

      const intendedVolume = 0.78;

      audio.volume = 0.001;

      const playPromise =
        audio.play();

      if (playPromise) {
        void playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume =
              intendedVolume;
          })
          .catch(() => {
            audio.volume =
              intendedVolume;
          });
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.volume =
          intendedVolume;
      }
    }
  } catch {
    // Web Audio fallback remains available below.
  }

  /*
   * SECONDARY WEB AUDIO FALLBACK
   */
  try {
    if (
      !barcodeScannerAudioContext ||
      barcodeScannerAudioContext.state ===
        "closed"
    ) {
      barcodeScannerAudioContext =
        new AudioContext();
    }

    const context =
      barcodeScannerAudioContext;

    if (
      context.state ===
      "suspended"
    ) {
      void context
        .resume()
        .catch(() => {
          // Optional audio feedback only.
        });
    }
  } catch {
    // Scanner itself remains fully functional.
  }
}

function playBarcodeScannerWebAudioFallback() {
  const context =
    barcodeScannerAudioContext;

  if (
    !context ||
    context.state === "closed"
  ) {
    return;
  }

  const play = () => {
    try {
      const now =
        context.currentTime;

      const playTone = ({
        frequency,
        start,
        duration,
        peak,
      }: {
        frequency: number;
        start: number;
        duration: number;
        peak: number;
      }) => {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type =
          "sine";

        oscillator.frequency.setValueAtTime(
          frequency,
          start,
        );

        gain.gain.setValueAtTime(
          0.0001,
          start,
        );

        gain.gain.exponentialRampToValueAtTime(
          peak,
          start + 0.005,
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          start + duration,
        );

        oscillator.connect(gain);
        gain.connect(
          context.destination,
        );

        oscillator.start(start);

        oscillator.stop(
          start + duration + 0.01,
        );
      };

      playTone({
        frequency: 1420,
        start: now,
        duration: 0.058,
        peak: 0.12,
      });

      playTone({
        frequency: 1780,
        start: now + 0.072,
        duration: 0.072,
        peak: 0.14,
      });
    } catch {
      // Optional audio feedback only.
    }
  };

  if (
    context.state ===
    "suspended"
  ) {
    void context
      .resume()
      .then(play)
      .catch(() => {});

    return;
  }

  play();
}

export function playBarcodeScannerBeep() {
  try {
    const audio =
      ensureBarcodeScannerAudio();

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.78;

      const playPromise =
        audio.play();

      if (playPromise) {
        void playPromise.catch(() => {
          playBarcodeScannerWebAudioFallback();
        });
      }

      return;
    }
  } catch {
    // Fall through to Web Audio.
  }

  playBarcodeScannerWebAudioFallback();
}

