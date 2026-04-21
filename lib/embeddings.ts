const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const BATCH_SIZE = 8;

// HuggingFace moved to a new router-based API in 2024.
// We try endpoints in order until one succeeds.
const HF_URLS = [
  // New router API (primary, as of 2024-25)
  `https://router.huggingface.co/hf-inference/models/${MODEL}/v1/feature-extraction`,
  // Legacy pipeline endpoint (fallback)
  `https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL}`,
  // Oldest endpoint (last resort)
  `https://api-inference.huggingface.co/models/${MODEL}`,
];

function cleanText(text: string): string {
  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim().slice(0, 512);
}

async function hfPost(inputs: string | string[]): Promise<number[][]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "HUGGINGFACE_API_KEY is not set — add it to .env.local or Vercel environment variables. " +
      "Get a free token at huggingface.co/settings/tokens (Fine-grained token with 'Inference API' permission)."
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const errors: string[] = [];

  for (const url of HF_URLS) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs,
        options: { wait_for_model: true },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Normalise to number[][]
      // Router endpoint returns number[] for single input, number[][] for batch
      // Legacy endpoints return number[][] for single, number[][][] for batch
      if (typeof inputs === "string") {
        if (typeof data[0] === "number") return [data];          // flat → wrap
        if (Array.isArray(data[0]) && typeof data[0][0] === "number") return data; // [[emb]]
        if (Array.isArray(data[0][0])) return [data[0][0]];     // [[[emb]]] → unwrap
        return [data[0]];
      } else {
        if (typeof data[0] === "number") return [data];          // unexpected flat
        if (Array.isArray(data[0]) && typeof data[0][0] === "number") return data; // [[e1],[e2]]
        return data.map((d: number[][] | number[]) =>
          Array.isArray(d[0]) ? (d as number[][])[0] : (d as number[])
        );
      }
    }

    // Auth errors — stop immediately, no point trying other URLs
    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        `HuggingFace auth failed (${res.status}): ${body.error ?? res.statusText}. ` +
        "Create a Fine-grained token at huggingface.co/settings/tokens with " +
        "'Make calls to the serverless Inference API' permission enabled."
      );
    }

    const body = await res.json().catch(() => ({}));
    errors.push(`[${url.includes("router") ? "router" : url.includes("pipeline") ? "pipeline" : "legacy"}] ${res.status}: ${body.error ?? res.statusText}`);

    // 404 → try next URL pattern; anything else → report and try next
  }

  throw new Error(
    `HuggingFace embedding failed on all endpoints:\n${errors.join("\n")}`
  );
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await hfPost(cleanText(text));
  return result[0];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(cleanText);
    const batchResult = await hfPost(batch);
    results.push(...batchResult);

    if (i + BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return results;
}
