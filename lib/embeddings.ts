// Cohere embed-english-light-v3.0 — 384 dims, free trial, no credit card
// Get a free key at: dashboard.cohere.com → API Keys → "New Trial Key"

const COHERE_URL = "https://api.cohere.com/v2/embed";
const COHERE_MODEL = "embed-english-light-v3.0";
const BATCH_SIZE = 96; // Cohere accepts up to 96 texts per request

function cleanText(text: string): string {
  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim().slice(0, 512);
}

async function cohereEmbed(
  texts: string[],
  inputType: "search_document" | "search_query"
): Promise<number[][]> {
  const apiKey = process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "COHERE_API_KEY is not set. " +
      "Get a free key (no credit card) at dashboard.cohere.com → API Keys → New Trial Key. " +
      "Add it as COHERE_API_KEY in .env.local or your Vercel environment variables."
    );
  }

  const res = await fetch(COHERE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Client-Name": "airtel-icertis-rag",
    },
    body: JSON.stringify({
      texts,
      model: COHERE_MODEL,
      input_type: inputType,
      embedding_types: ["float"],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.message ?? body.error ?? res.statusText;
    throw new Error(`Cohere API ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return data.embeddings.float as number[][];
}

// Use "search_query" when embedding a user's chat message
export async function generateEmbedding(
  text: string,
  inputType: "search_query" | "search_document" = "search_query"
): Promise<number[]> {
  const results = await cohereEmbed([cleanText(text)], inputType);
  return results[0];
}

// Use "search_document" when embedding knowledge-base chunks
export async function generateEmbeddings(
  texts: string[],
  inputType: "search_query" | "search_document" = "search_document"
): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(cleanText);
    const batchResult = await cohereEmbed(batch, inputType);
    results.push(...batchResult);
  }

  return results;
}
