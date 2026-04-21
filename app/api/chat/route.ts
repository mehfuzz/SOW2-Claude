import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";
import { getGroq, GROQ_MODEL, SYSTEM_PROMPT } from "@/lib/groq-client";

export const maxDuration = 30;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  let message: string;
  let history: HistoryMessage[] = [];

  try {
    const body = await req.json();
    message = body.message?.trim();
    history = body.history ?? [];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), { status: 400 });
  }

  try {
    const supabase = supabaseAdmin();

    // Embed the query — use "search_query" type for retrieval
    const queryEmbedding = await generateEmbedding(message, "search_query");

    // Retrieve relevant chunks from knowledge base
    const { data: chunks } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_count: 5,
      similarity_threshold: 0.25,
    });

    // Deduplicate source document names
    const sources: string[] = [
      ...new Set(((chunks ?? []) as { document_name: string }[]).map((c) => c.document_name)),
    ];

    const context =
      chunks && chunks.length > 0
        ? `Relevant knowledge base excerpts:\n\n${chunks
            .map((c: { content: string }, i: number) => `[${i + 1}] ${c.content}`)
            .join("\n\n---\n\n")}`
        : "No matching documentation found in the knowledge base for this query.";

    // Build message list (keep last 6 turns to stay within context window)
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Context:\n${context}` },
      { role: "assistant", content: "Understood. I will use this context to answer accurately." },
      ...history.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    const stream = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.5,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        // First line: sources metadata as NDJSON
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "sources", data: sources }) + "\n")
        );

        // Remaining: raw streamed AI text
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }

        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[chat]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Chat failed" }),
      { status: 500 }
    );
  }
}
