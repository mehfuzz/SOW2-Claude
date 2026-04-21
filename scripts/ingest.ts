/**
 * Ingest documents from knowledge-base/ into Supabase pgvector.
 *
 * Usage:
 *   npm run ingest                      — ingest new files only (skip already-indexed)
 *   npm run ingest -- --force           — delete all existing + re-ingest everything
 *   npm run ingest -- --file=guide.pdf  — re-ingest one specific file
 *   npm run ingest -- --clear           — delete ALL existing embeddings (no re-ingest)
 *
 * Run --clear then npm run ingest when switching embedding providers
 * (e.g. after the switch from HuggingFace to Cohere).
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local before anything else reads process.env
config({ path: resolve(process.cwd(), ".env.local") });

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { parseDocumentBuffer } from "../lib/document-parser";
import { chunkText } from "../lib/chunker";
import { generateEmbeddings } from "../lib/embeddings";

const KB_DIR = path.join(process.cwd(), "knowledge-base");
const SUPPORTED = [".pdf", ".txt", ".docx", ".md"];

const MIME: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt":  "text/plain",
  ".md":   "text/markdown",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const clear = args.includes("--clear");
  const fileArg = args.find((a) => a.startsWith("--file="));
  const targetFile = fileArg ? fileArg.replace("--file=", "") : null;
  return { force, clear, targetFile };
}

async function main() {
  const { force, clear, targetFile } = parseArgs();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // --clear: wipe all embeddings and exit (run before switching embedding providers)
  if (clear) {
    console.log("Clearing all knowledge base embeddings from Supabase...");
    await supabase.from("rag_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("Done. Run `npm run ingest` to re-index your documents.");
    return;
  }

  // List files in knowledge-base/
  const allFiles = fs
    .readdirSync(KB_DIR)
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED.includes(ext) && !f.startsWith("_") && !f.startsWith(".");
    });

  if (allFiles.length === 0) {
    console.log("No documents found in knowledge-base/");
    console.log("Add PDF, DOCX, TXT, or MD files and run again.");
    return;
  }

  const filesToProcess = targetFile
    ? allFiles.filter((f) => f === targetFile)
    : allFiles;

  if (filesToProcess.length === 0) {
    console.error(`File not found in knowledge-base/: ${targetFile}`);
    process.exit(1);
  }

  // Handle --force: delete all existing docs (or just the target file)
  if (force) {
    if (targetFile) {
      const { data: existing } = await supabase
        .from("rag_documents")
        .select("id")
        .eq("name", targetFile);
      if (existing?.length) {
        await supabase
          .from("rag_documents")
          .delete()
          .in("id", existing.map((d: { id: string }) => d.id));
        console.log(`  Deleted existing record for "${targetFile}"`);
      }
    } else {
      console.log("--force: deleting all existing knowledge base records...");
      await supabase.from("rag_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("  Done.\n");
    }
  }

  console.log(`Processing ${filesToProcess.length} file(s):\n`);

  for (const fileName of filesToProcess) {
    const filePath = path.join(KB_DIR, fileName);
    process.stdout.write(`  ${fileName} ... `);

    // Skip if already ingested and not forced
    if (!force) {
      const { data: existing } = await supabase
        .from("rag_documents")
        .select("id")
        .eq("name", fileName)
        .maybeSingle();

      if (existing) {
        console.log("skipped (already ingested — use --force to re-ingest)");
        continue;
      }
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const text = await parseDocumentBuffer(buffer, fileName);

      if (text.trim().length < 10) {
        console.log("✗ no text extracted (is it a scanned PDF?)");
        continue;
      }

      const chunks = chunkText(text);
      process.stdout.write(`${chunks.length} chunks → embeddings ... `);

      const embeddings = await generateEmbeddings(chunks);

      const stats = fs.statSync(filePath);
      const { data: doc, error: docErr } = await supabase
        .from("rag_documents")
        .insert({
          name: fileName,
          size: stats.size,
          type: MIME[path.extname(fileName).toLowerCase()] ?? "application/octet-stream",
          chunk_count: chunks.length,
        })
        .select()
        .single();

      if (docErr) throw new Error(docErr.message);

      const rows = chunks.map((content, i) => ({
        document_id: doc.id,
        content,
        embedding: embeddings[i],
        chunk_index: i,
      }));

      const { error: chunkErr } = await supabase.from("rag_chunks").insert(rows);
      if (chunkErr) {
        await supabase.from("rag_documents").delete().eq("id", doc.id);
        throw new Error(chunkErr.message);
      }

      console.log("✓");
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err.message ?? err);
  process.exit(1);
});
