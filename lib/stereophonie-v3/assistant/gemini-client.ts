/*
 * ST_ASSISTANT_GEMINI_TRANSPORT_V1
 *
 * Server-side Gemini transport for shopping interpretation.
 *
 * The model interprets customer intent only.
 * All product facts, prices, configurations and availability
 * must still be verified against the published Supabase catalog.
 *
 * This module does not retrieve private customer/order records.
 */

type GeminiRequest = {
  model: string;
  instructions: string;
  input: string;
  max_output_tokens?: number;
  thinking_level?: "minimal" | "low";
  text: {
    format: {
      type?: string;
      name?: string;
      strict?: boolean;
      schema: unknown;
    };
  };
};

type GeminiCandidate = {
  finishReason?: string;
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
};

type GeminiApiResponse = {
  candidates?: GeminiCandidate[];
};

type TransportResponse = {
  status: "completed" | "incomplete";
  output_text: string;
};

const ALLOWED_MODELS = new Set([
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
]);

export function createAssistantGeminiClient({
  apiKey,
  timeout,
}: {
  apiKey: string;
  timeout: number;
}) {
  return {
    responses: {
      async create(
        request: GeminiRequest,
      ): Promise<TransportResponse> {
        if (!apiKey.trim()) {
          throw new Error(
            "Gemini API credentials missing"
          );
        }

        if (!ALLOWED_MODELS.has(request.model)) {
          throw new Error(
            "Unsupported Gemini model"
          );
        }

        const controller = new AbortController();

        const timer = setTimeout(
          () => controller.abort(),
          timeout,
        );

        try {
          const endpoint =
            "https://generativelanguage.googleapis.com/" +
            "v1beta/models/" +
            encodeURIComponent(request.model) +
            ":generateContent";

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: request.instructions,
                  },
                ],
              },
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: request.input,
                    },
                  ],
                },
              ],
              generationConfig: {
                /*
                 * ST_ASSISTANT_MINIMAL_THINKING_V1
                 *
                 * Optional per-request latency optimization.
                 * Existing calls retain their original behavior.
                 */
                ...(request.thinking_level
                  ? {
                      thinkingConfig: {
                        thinkingLevel: request.thinking_level,
                      },
                    }
                  : {}),
                responseMimeType: "application/json",
                responseJsonSchema: request.text.format.schema,
                maxOutputTokens: Math.max(
                  320,
                  Math.min(
                    640,
                    request.max_output_tokens ?? 512,
                  ),
                ),
                temperature: 0.1,
              },
            }),
            signal: controller.signal,
            cache: "no-store",
          });

          if (!response.ok) {
            /*
             * Never expose a remote error body.
             * The API key, prompt and customer context
             * must not appear in client-facing errors.
             */
            throw new Error(
              `Gemini request failed: HTTP ${response.status}`,
            );
          }

          const data =
            (await response.json()) as GeminiApiResponse;

          const candidate = data.candidates?.[0];

          if (
            !candidate ||
            (
              candidate.finishReason &&
              candidate.finishReason !== "STOP"
            )
          ) {
            return {
              status: "incomplete",
              output_text: "",
            };
          }

          const output = (
            candidate.content?.parts ?? []
          )
            .map(
              (part) => part.text ?? "",
            )
            .join("")
            .trim();

          if (!output) {
            return {
              status: "incomplete",
              output_text: "",
            };
          }

          return {
            status: "completed",
            output_text: output,
          };
        } finally {
          clearTimeout(timer);
        }
      },
    },
  };
}
