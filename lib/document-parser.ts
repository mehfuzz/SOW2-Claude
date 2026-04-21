// For use in Node.js scripts (Buffer + filename string)
export async function parseDocumentBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf"))  return parsePdf(buffer);
  if (name.endsWith(".docx")) return parseDocx(buffer);
  if (name.endsWith(".txt") || name.endsWith(".md")) return buffer.toString("utf-8");
  throw new Error(`Unsupported file type: ${fileName}`);
}

// For use in Next.js API routes (Web File object)
export async function parseDocument(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) return parsePdf(buffer);
  if (name.endsWith(".docx")) return parseDocx(buffer);
  if (name.endsWith(".txt") || name.endsWith(".md")) return buffer.toString("utf-8");

  throw new Error(
    `Unsupported file type "${file.type}". Please upload PDF, DOCX, TXT, or Markdown.`
  );
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse");
  const data = await pdfParse(buffer);
  return data.text as string;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value as string;
}
