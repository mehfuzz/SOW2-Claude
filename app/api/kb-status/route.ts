import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/kb-status
 * Returns the health of the knowledge base setup.
 * Checks: match_chunks function exists, document count, chunk count.
 */
export async function GET() {
  const supabase = supabaseAdmin();
  const status: Record<string, unknown> = {};

  // 1. Check rag_documents table + count
  const { count: docCount, error: docErr } = await supabase
    .from("rag_documents")
    .select("*", { count: "exact", head: true });

  if (docErr) {
    status.documents = { ok: false, error: docErr.message };
  } else {
    status.documents = { ok: true, count: docCount ?? 0 };
  }

  // 2. Check rag_chunks table + count
  const { count: chunkCount, error: chunkErr } = await supabase
    .from("rag_chunks")
    .select("*", { count: "exact", head: true });

  if (chunkErr) {
    status.chunks = { ok: false, error: chunkErr.message };
  } else {
    status.chunks = { ok: true, count: chunkCount ?? 0 };
  }

  // 3. Check match_chunks function exists by doing a dummy probe call
  const { error: fnErr } = await supabase.rpc("match_chunks", {
    query_embedding: Array(384).fill(0),
    match_count: 1,
    similarity_threshold: 0.0,
  });

  status.match_chunks_fn = fnErr
    ? { ok: false, error: fnErr.message }
    : { ok: true };

  // 4. List document names
  const { data: docs } = await supabase
    .from("rag_documents")
    .select("name, chunk_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  status.indexed_documents = docs ?? [];

  const allOk =
    (status.documents as { ok: boolean }).ok &&
    (status.chunks as { ok: boolean }).ok &&
    (status.match_chunks_fn as { ok: boolean }).ok &&
    (status.chunks as { count: number }).count > 0;

  return NextResponse.json({ ok: allOk, ...status });
}
