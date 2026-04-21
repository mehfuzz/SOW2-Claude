const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const BATCH_SIZE = 8;

// HuggingFace exposes the same model under two URL patterns depending on account/plan.
// We try the pipeline prefix first (more reliable), then fall back to the models path.
const HF_URLS = [
  `https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL}`,
  `https://api-inference.huggingface.co/models/${MODEL}`,
];

function cleanText(text: string): string {
  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim().slice(0, 512);
}

async function hfPost(inputs: string | string[]): Promise<number[][]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "HUGGINGFACE_API_KEY is not set. Get a free read token at huggingface.co/settings/tokens"
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // wait_for_model: true tells HuggingFace to wait until the model is loaded
  // instead of returning a 503 immediately. Avoids the retry-loop entirely.
  const body = JSON.stringify({
    inputs,
    options: { wait_for_model: true },
  });

  let lastError = "";

  for (const url of HF_URLS) {
    const res = await fetch(url, { method: "POST", headers, body });

    if (res.ok) {
      const data = await res.json();
      // Single string → [[emb]]; array of strings → [[emb1], [emb2], ...]
      if (typeof inputs === "string") {
        return Array.isArray(data[0]) ? data : [data];
      }
      return data;
    }

    // Read the actual HuggingFace error message
    const errBody = await res.json().catch(() => ({}));
    const detail = errBody.error ?? errBody.message ?? res.statusText;
    lastError = `HuggingFace ${res.status} (${url.includes("pipeline") ? "pipeline" : "models"} endpoint): ${detail}`;

    // 404 on this URL → try next URL pattern
    if (res.status === 404) continue;

    // 401/403 → bad token, no point retrying other URLs
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `HuggingFace auth failed (${res.status}): check your HUGGINGFACE_API_KEY token. ` +
        "Make sure it is a 'read' token from huggingface.co/settings/tokens"
      );
    }

    // Any other error from this URL → break and report
    break;
  }

  throw new Error(lastError || "HuggingFace request failed on all endpoints");
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
