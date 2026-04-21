const CHUNK_SIZE = 1000;
const OVERLAP   = 200;
const MIN_CHUNK  = 60;

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = start + CHUNK_SIZE;
    let chunk = cleaned.slice(start, end);

    if (end < cleaned.length) {
      // Prefer breaking at paragraph, then sentence, then word boundary
      const paraBreak = chunk.lastIndexOf("\n\n");
      const sentBreak = chunk.lastIndexOf(". ");
      const wordBreak  = chunk.lastIndexOf(" ");

      const breakAt = paraBreak > CHUNK_SIZE * 0.4
        ? paraBreak + 2
        : sentBreak > CHUNK_SIZE * 0.4
        ? sentBreak + 2
        : wordBreak > CHUNK_SIZE * 0.4
        ? wordBreak + 1
        : CHUNK_SIZE;

      chunk = cleaned.slice(start, start + breakAt);
      start = start + breakAt - OVERLAP;
    } else {
      start = cleaned.length;
    }

    if (chunk.trim().length >= MIN_CHUNK) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}
