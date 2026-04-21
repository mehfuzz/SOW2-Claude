import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function checkSecret(req: NextRequest) {
  const secret = process.env.UPLOAD_SECRET;
  if (!secret) throw new Error("UPLOAD_SECRET env var not set on server");
  if (req.headers.get("x-upload-secret") !== secret) throw new Error("Unauthorized");
}

export async function GET(req: NextRequest) {
  try {
    checkSecret(req);
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("rag_documents")
      .select("id, name, size, type, chunk_count, created_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    checkSecret(req);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("rag_documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
