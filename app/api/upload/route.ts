import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseDocument } from "@/lib/document-parser";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddings } from "@/lib/embeddings";

export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024;

function checkSecret(req: NextRequest) {
  const secret = process.env.UPLOAD_SECRET;
  if (!secret) throw new Error("UPLOAD_SECRET env var not set on server");
  const provided = req.headers.get("x-upload-secret");
  if (provided !== secret) throw new Error("Unauthorized");
}

export async function POST(req: NextRequest) {
  try {
    checkSecret(req);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large — max 10 MB" }, { status: 400 });

    const text = await parseDocument(file);
    if (text.trim().length < 10) return NextResponse.json({ error: "No text extracted" }, { status: 400 });

    const chunks = chunkText(text);
    const supabase = supabaseAdmin();

    const { data: doc, error: docErr } = await supabase
      .from("rag_documents")
      .insert({ name: file.name, size: file.size, type: file.type, chunk_count: chunks.length })
      .select().single();
    if (docErr) throw new Error(docErr.message);

    const embeddings = await generateEmbeddings(chunks);

    const { error: chunkErr } = await supabase.from("rag_chunks").insert(
      chunks.map((content, i) => ({
        document_id: doc.id, content, embedding: embeddings[i], chunk_index: i,
      }))
    );
    if (chunkErr) {
      await supabase.from("rag_documents").delete().eq("id", doc.id);
      throw new Error(chunkErr.message);
    }

    return NextResponse.json({ success: true, document: doc, chunks: chunks.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
