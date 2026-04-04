import { isNomicModel } from "@shared";
import OpenAI from "openai";
import type { EmbeddingApiResponse, EmbeddingInput } from "./types";

export class OpenAIEmbeddingError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OpenAIEmbeddingError";
  }
}

/**
 * Embed multiple inputs using the OpenAI-compatible `/v1/embeddings` endpoint.
 * Works with OpenAI, Ollama, and any provider that exposes the OpenAI embeddings API.
 *
 * OpenAI-compatible providers support text only. Non-text inputs fall back to
 * a `"[image]"` placeholder so index alignment is preserved.
 */
export async function callOpenAIEmbedding(params: {
  inputs: EmbeddingInput[];
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  dimensions?: number;
}): Promise<EmbeddingApiResponse> {
  const { inputs, model, apiKey, baseUrl, dimensions } = params;
  // OpenAI-compatible APIs are text-only: map image inputs to a placeholder.
  const texts = inputs.map((input) =>
    typeof input === "string" ? input : "[image]",
  );

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl ?? undefined,
  });

  try {
    const response = await client.embeddings.create({
      model,
      input: texts,
      // Nomic models do not support the `dimensions` parameter.
      ...(dimensions !== undefined && !isNomicModel(model)
        ? { dimensions }
        : {}),
    });

    return {
      object: response.object,
      data: response.data.map((item) => ({
        object: item.object,
        embedding: item.embedding,
        index: item.index,
      })),
      model: response.model,
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
      },
    };
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      throw new OpenAIEmbeddingError(err.status ?? 500, err.message);
    }
    throw err;
  }
}
