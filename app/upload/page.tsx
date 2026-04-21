"use client";

import { useState, useCallback, useEffect } from "react";

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  chunk_count: number;
  created_at: string;
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const headers = { "x-upload-secret": secret };

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/documents", { headers });
    if (!res.ok) return;
    const data = await res.json();
    setDocuments(data.documents ?? []);
  }, [secret]);

  useEffect(() => {
    if (authed) fetchDocs();
  }, [authed, fetchDocs]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/documents", {
      headers: { "x-upload-secret": secret },
    });
    if (res.status === 401) { setAuthError("Wrong password"); return; }
    if (!res.ok) { setAuthError("Connection error — check Supabase env vars"); return; }
    setAuthed(true);
  }

  const uploadFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "txt", "docx", "md"].includes(ext)) {
      setUploadMsg({ type: "err", text: "Only PDF, DOCX, TXT, MD supported" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadMsg({ type: "err", text: "File exceeds 10 MB" });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadMsg({ type: "ok", text: `✓ "${file.name}" — ${data.chunks} chunks indexed` });
      await fetchDocs();
    } catch (err) {
      setUploadMsg({ type: "err", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }, [secret, fetchDocs]);

  const deleteDoc = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    setDeletingId(id);
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-gray-50">
        <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔒</div>
            <h1 className="text-xl font-bold text-gray-800">Admin — Knowledge Base</h1>
            <p className="text-sm text-gray-500 mt-1">Enter your upload password to continue</p>
          </div>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Upload password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500"
            autoFocus
          />
          {authError && <p className="text-red-600 text-sm">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  // ── Upload UI ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 p-5">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-6 shadow-md">
          <h1 className="text-2xl font-bold flex items-center gap-2">📚 Knowledge Base</h1>
          <p className="text-red-100 text-sm mt-1">Upload Icertis documents — PDF, DOCX, TXT, MD (max 10 MB)</p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !uploading && document.getElementById("file-input")?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all select-none ${
            uploading ? "opacity-60 pointer-events-none border-gray-300 bg-white"
            : isDragging ? "border-red-500 bg-red-50"
            : "border-gray-300 bg-white hover:border-red-400 hover:bg-red-50/40"
          }`}
        >
          <input id="file-input" type="file" className="hidden" accept=".pdf,.txt,.docx,.md"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-medium">Processing… this may take up to 60 s</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <span className="text-4xl">{isDragging ? "📂" : "⬆️"}</span>
              <p className="font-semibold text-gray-700">Drop file or click to upload</p>
              <p className="text-sm">PDF · DOCX · TXT · MD — max 10 MB</p>
            </div>
          )}
        </div>

        {uploadMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm ${
            uploadMsg.type === "ok" ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
          }`}>{uploadMsg.text}</div>
        )}

        {/* Document list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Indexed Documents</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🗄️</p>
              <p>No documents yet — upload one above</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 group">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{fmt(doc.size)} · {doc.chunk_count} chunks · {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => deleteDoc(doc.id, doc.name)} disabled={deletingId === doc.id}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40">
                    {deletingId === doc.id ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : "🗑️"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
