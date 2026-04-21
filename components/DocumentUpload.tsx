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

type Status = { type: "success" | "error"; message: string } | null;

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function fileIcon(name: string): string {
  if (name.endsWith(".pdf")) return "📕";
  if (name.endsWith(".docx")) return "📘";
  if (name.endsWith(".md")) return "📝";
  return "📄";
}

export default function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } finally {
      setLoadingDocs(false);
    }
  };

  const uploadFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "txt", "docx", "md"].includes(ext)) {
      setStatus({ type: "error", message: "Unsupported type. Upload PDF, DOCX, TXT, or Markdown." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus({ type: "error", message: "File exceeds 10 MB limit." });
      return;
    }

    setUploading(true);
    setStatus(null);
    setProgress("Extracting text…");

    const form = new FormData();
    form.append("file", file);

    try {
      setProgress("Generating embeddings & storing in knowledge base…");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setStatus({
        type: "success",
        message: `✓ "${file.name}" added — ${data.chunks} chunks indexed.`,
      });
      await fetchDocuments();
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
      setProgress("");
    }
  }, []);

  const deleteDoc = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from the knowledge base?`)) return;
    setDeletingId(id);
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) uploadFile(f);
    },
    [uploadFile]
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 p-5">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📚</span>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
          </div>
          <p className="text-red-100 text-sm">
            Upload Icertis documents to power the AI chatbot. Supports{" "}
            <strong>PDF, DOCX, TXT, Markdown</strong> (max 10 MB).
          </p>
          <p className="text-red-200 text-xs mt-2">
            Free tier: HuggingFace embeddings · Supabase pgvector · Groq LLaMA
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !uploading && document.getElementById("file-input")?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer select-none ${
            uploading
              ? "opacity-60 pointer-events-none border-gray-300 bg-white"
              : isDragging
              ? "border-red-500 bg-red-50 scale-[1.01]"
              : "border-gray-300 bg-white hover:border-red-400 hover:bg-red-50/40"
          }`}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.txt,.docx,.md"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold">Processing…</p>
              <p className="text-sm text-gray-400">{progress}</p>
              <p className="text-xs text-gray-400">This may take 20–60 s for large documents</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <span className="text-5xl">{isDragging ? "📂" : "⬆️"}</span>
              <div>
                <p className="font-semibold text-gray-700">
                  {isDragging ? "Drop to upload" : "Drag & drop or click to upload"}
                </p>
                <p className="text-sm text-gray-400 mt-1">PDF · DOCX · TXT · MD — max 10 MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Status banner */}
        {status && (
          <div
            className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
              status.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <span>{status.type === "success" ? "✅" : "❌"}</span>
            <span>{status.message}</span>
          </div>
        )}

        {/* Document list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              📋 Indexed Documents
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loadingDocs ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <span className="text-5xl block mb-3">🗄️</span>
              <p className="font-medium">No documents yet</p>
              <p className="text-sm mt-1">Upload your first document above to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-2xl flex-shrink-0">{fileIcon(doc.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {fmt(doc.size)} · {doc.chunk_count} chunks ·{" "}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id, doc.name)}
                    disabled={deletingId === doc.id}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    title="Remove from knowledge base"
                  >
                    {deletingId === doc.id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "🗑️"
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
          <p className="font-semibold">💡 Tips for best results</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-600">
            <li>Upload Icertis user guides, release notes, and SOPs</li>
            <li>Keep files under 5 MB for fastest processing on free tier</li>
            <li>Text-based PDFs work best — scanned images are not supported</li>
            <li>First embedding request may take 20–30 s (model warm-up)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
