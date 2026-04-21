import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const status: Record<string, unknown> = {
    // Show partial URL so you can verify it without exposing secrets
    supabase_url: url
      ? url.replace(/\/\/([^.]{4})[^.]*/, "//$1***")
      : "NOT SET — add NEXT_PUBLIC_SUPABASE_URL in Vercel env vars",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? "set" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: serviceKey ? "set" : "MISSING",
      GROQ_API_KEY: process.env.GROQ_API_KEY ? "set" : "MISSING",
      COHERE_API_KEY: process.env.COHERE_API_KEY ? "set" : "MISSING",
    },
  };

  // 1. Raw connectivity ping — catches paused projects and wrong URLs
  if (url) {
    try {
      const ping = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(8000),
      });
      status.connectivity = {
        ok: ping.ok || ping.status === 401, // 401 = project alive, just needs auth
        http_status: ping.status,
        note: ping.status === 503
          ? "Supabase project is PAUSED — go to supabase.com and click Resume"
          : ping.status === 401
          ? "Project reachable — check your anon key"
          : ping.ok
          ? "Connected"
          : `Unexpected status ${ping.status}`,
      };
    } catch (e) {
      status.connectivity = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        note: "Cannot reach Supabase. Check the URL is correct or if the project is paused.",
      };
    }
  } else {
    status.connectivity = { ok: false, note: "URL not set" };
  }

  // 2. Table + function checks (only if connectivity looks ok)
  const connOk = (status.connectivity as { ok: boolean }).ok;

  if (connOk) {
    const supabase = supabaseAdmin();

    const { count: docCount, error: docErr } = await supabase
      .from("rag_documents")
      .select("*", { count: "exact", head: true });
    status.documents = docErr
      ? { ok: false, error: docErr.message }
      : { ok: true, count: docCount ?? 0 };

    const { count: chunkCount, error: chunkErr } = await supabase
      .from("rag_chunks")
      .select("*", { count: "exact", head: true });
    status.chunks = chunkErr
      ? { ok: false, error: chunkErr.message }
      : { ok: true, count: chunkCount ?? 0 };

    const { error: fnErr } = await supabase.rpc("match_chunks", {
      query_embedding: Array(384).fill(0),
      match_count: 1,
      similarity_threshold: 0.0,
    });
    status.match_chunks_fn = fnErr
      ? { ok: false, error: fnErr.message }
      : { ok: true };

    const { data: docs } = await supabase
      .from("rag_documents")
      .select("name, chunk_count, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    status.indexed_documents = docs ?? [];
  } else {
    status.documents = { ok: false, skipped: "connectivity failed" };
    status.chunks = { ok: false, skipped: "connectivity failed" };
    status.match_chunks_fn = { ok: false, skipped: "connectivity failed" };
    status.indexed_documents = [];
  }

  const allOk =
    connOk &&
    (status.documents as { ok: boolean }).ok &&
    (status.chunks as { ok: boolean }).ok &&
    (status.match_chunks_fn as { ok: boolean }).ok &&
    ((status.chunks as { count?: number }).count ?? 0) > 0;

  return NextResponse.json({ ok: allOk, ...status });
}
