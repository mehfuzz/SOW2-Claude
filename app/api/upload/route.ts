import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseDocument } from "@/lib/document-parser";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddings } from "@/lib/embeddings";

export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large — maximum is 10 MB" }, { status: 400 });
    }

    // Parse → chunk → embed → store
    const text = await parseDocument(file);

    if (text.trim().length < 10) {
      return NextResponse.json({ error: "Could not extract text from document" }, { status: 400 });
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "Document produced no usable text chunks" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Insert document metadata first
    const { data: doc, error: docErr } = await supabase
      .from("rag_documents")
      .insert({ name: file.name, size: file.size, type: file.type, chunk_count: chunks.length })
      .select()
      .single();

    if (docErr) throw new Error(docErr.message);

    // Generate embeddings in batches
    const embeddings = await generateEmbeddings(chunks);

    // Bulk insert chunks
    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      content,
      embedding: embeddings[i],
      chunk_index: i,
    }));

    const { error: chunkErr } = await supabase.from("rag_chunks").insert(rows);
    if (chunkErr) {
      // Roll back document record if chunks fail
      await supabase.from("rag_documents").delete().eq("id", doc.id);
      throw new Error(chunkErr.message);
    }

    return NextResponse.json({ success: true, document: doc, chunks: chunks.length });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
