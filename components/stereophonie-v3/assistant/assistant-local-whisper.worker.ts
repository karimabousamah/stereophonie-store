/*
 * ST_ASSISTANT_LOCAL_WHISPER_WORKER_V1
 *
 * Multilingual Whisper Tiny.
 * Runs in the customer's browser using WebAssembly.
 * No audio is transmitted to an inference service.
 *
 * Model assets are fetched on first use and may be cached
 * by the browser. Keep this worker off the main UI thread.
 */

import {
  env,
  pipeline,
} from "@huggingface/transformers";

env.allowLocalModels = false;

type RequestMessage = {
  type: "transcribe";
  id: number;
  audio: Float32Array;
};

type WorkerMessage =
  | {
      type: "progress";
      id: number;
      progress: number;
    }
  | {
      type: "loading";
      id: number;
    }
  | {
      type: "processing";
      id: number;
    }
  | {
      type: "result";
      id: number;
      text: string;
    }
  | {
      type: "error";
      id: number;
      code: string;
    };

const scope = self as unknown as {
  postMessage: (message: WorkerMessage) => void;
};

const MODEL = "Xenova/whisper-tiny";
const SAMPLE_RATE = 16_000;
const MAX_AUDIO_SECONDS = 60;

let activeRequestId = 0;
let busy = false;

async function createTranscriber() {
  return pipeline(
    "automatic-speech-recognition",
    MODEL,
    {
      device: "wasm",
      dtype: "q8",
      progress_callback: (status) => {
        if (
          status.status === "progress" &&
          typeof status.progress === "number"
        ) {
          scope.postMessage({
            type: "progress",
            id: activeRequestId,
            progress: Math.min(
              100,
              Math.max(0, status.progress),
            ),
          });
        }
      },
    },
  );
}

/*
 * Keep the model in the worker after the first
 * successful load. A failure allows a later retry.
 */
let transcriberPromise:
  | ReturnType<typeof createTranscriber>
  | null = null;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = createTranscriber().catch(
      (error: unknown) => {
        transcriberPromise = null;
        throw error;
      },
    );
  }

  return transcriberPromise;
}

/*
 * ST_ASSISTANT_WHISPER_LANGUAGE_DETECTION_V1
 *
 * Transformers.js 3.8.1 defaults to English if no
 * language is supplied to multilingual Whisper.
 *
 * Generate only the first token after
 * <|startoftranscript|>. Whisper predicts its language
 * token there. Then use that detected language for
 * normal transcription, preserving the original speech.
 *
 * No separate model or external transcription API.
 */
async function detectWhisperLanguage(
  transcriber: Awaited<ReturnType<typeof createTranscriber>>,
  audio: Float32Array,
): Promise<string> {
  type LanguageModel = {
    generation_config?: {
      decoder_start_token_id?: number;
      lang_to_id?: Record<string, number>;
    };
    generate: (
      options: Record<string, unknown>,
    ) => Promise<unknown>;
  };

  type LanguagePipeline = {
    model: LanguageModel;
    processor: (
      samples: Float32Array,
    ) => Promise<{ input_features: unknown }>;
  };

  const internal =
    transcriber as unknown as LanguagePipeline;

  const config = internal.model.generation_config;
  const startToken = config?.decoder_start_token_id;
  const languages = config?.lang_to_id;

  if (
    !Number.isInteger(startToken) ||
    !languages ||
    Object.keys(languages).length === 0
  ) {
    throw new Error("Language detection configuration unavailable.");
  }

  const sample = audio.subarray(
    0,
    Math.min(audio.length, SAMPLE_RATE * 20),
  );

  const features = await internal.processor(sample);

  // Passing decoder_input_ids bypasses the library's
  // English-default prefix generation.
  const generated = await internal.model.generate({
    inputs: features.input_features,
    decoder_input_ids: [startToken],
    max_new_tokens: 1,
    forced_decoder_ids: null,
    return_dict_in_generate: false,
  });

  type TokenTensor = {
    tolist?: () => unknown;
    sequences?: { tolist?: () => unknown };
    [index: number]: { tolist?: () => unknown };
  };

  const tensor = generated as TokenTensor;
  const allTokens =
    tensor.sequences?.tolist?.() ??
    tensor.tolist?.() ??
    tensor[0]?.tolist?.();

  if (!Array.isArray(allTokens)) {
    throw new Error("Language token could not be decoded.");
  }

  const tokens = Array.isArray(allTokens[0])
    ? allTokens[0]
    : allTokens;

  const predictedToken = Number(tokens.at(-1));

  if (
    tokens.length < 2 ||
    !Number.isSafeInteger(predictedToken) ||
    predictedToken === startToken
  ) {
    throw new Error("Language token is missing.");
  }

  for (const [tag, id] of Object.entries(languages)) {
    if (
      id === predictedToken &&
      /^<\|[a-z]{2,3}\|>$/.test(tag)
    ) {
      return tag.slice(2, -2);
    }
  }

  // Never silently substitute English for an unknown
  // language token.
  throw new Error("Spoken language could not be identified.");
}

async function handleRequest(message: RequestMessage) {
  if (busy) {
    scope.postMessage({
      type: "error",
      id: message.id,
      code: "BUSY",
    });
    return;
  }

  if (
    !Number.isSafeInteger(message.id) ||
    !(message.audio instanceof Float32Array) ||
    message.audio.length < SAMPLE_RATE / 10 ||
    message.audio.length >
      SAMPLE_RATE * MAX_AUDIO_SECONDS
  ) {
    scope.postMessage({
      type: "error",
      id: message.id,
      code: "INVALID_AUDIO",
    });
    return;
  }

  busy = true;
  activeRequestId = message.id;

  try {
    scope.postMessage({
      type: "loading",
      id: message.id,
    });

    const transcriber = await getTranscriber();

    scope.postMessage({
      type: "processing",
      id: message.id,
    });

    // Detect spoken language from the audio itself.
    // Keep the original language; do not translate.
    const detectedLanguage = await detectWhisperLanguage(
      transcriber,
      message.audio,
    );

    const result = await transcriber(message.audio, {
      language: detectedLanguage,
      task: "transcribe",
      chunk_length_s: 25,
      stride_length_s: 4,
    });

    const text = Array.isArray(result)
      ? result.map((item) => item.text).join(" ").trim()
      : result.text.trim();

    if (!text) {
      scope.postMessage({
        type: "error",
        id: message.id,
        code: "NO_SPEECH",
      });
      return;
    }

    scope.postMessage({
      type: "result",
      id: message.id,
      text,
    });
  } catch {
    // Never forward internal runtime exceptions to visitors.
    scope.postMessage({
      type: "error",
      id: message.id,
      code: "LOCAL_ENGINE_FAILED",
    });
  } finally {
    busy = false;
    activeRequestId = 0;
  }
}

self.addEventListener(
  "message",
  (event: MessageEvent<RequestMessage>) => {
    if (event.data?.type !== "transcribe") {
      return;
    }

    void handleRequest(event.data);
  },
);
