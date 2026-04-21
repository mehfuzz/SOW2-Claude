const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL = `https://api-inference.huggingface.co/models/${MODEL}`;
const BATCH_SIZE = 8;

function cleanText(text: string): string {
  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim().slice(0, 512);
}

async function hfPost(inputs: string | string[]): Promise<number[][]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(HF_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs }),
    });

    if (res.ok) {
      const data = await res.json();
      // API returns [[emb]] for single string, [[emb1],[emb2]] for array
      if (typeof inputs === "string") {
        return Array.isArray(data[0]) ? data : [data];
      }
      return data;
    }

    if (res.status === 503) {
      // Model loading — wait for estimated_time then retry
      const body = await res.json().catch(() => ({}));
      const wait = Math.min((body.estimated_time ?? 20) * 1000, 30_000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    throw new Error(`HuggingFace API ${res.status}: ${res.statusText}`);
  }

  throw new Error("HuggingFace model failed to load after retries");
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

    // Throttle between batches to respect rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return results;
}
