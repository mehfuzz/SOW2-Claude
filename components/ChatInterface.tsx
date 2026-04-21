"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

const SUGGESTED = [
  "How do I create a new contract in Icertis?",
  "What is the contract approval workflow?",
  "How do I add an amendment to an existing contract?",
  "What are the contract lifecycle stages in Icertis?",
  "How do I generate a contract report?",
];

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hello! I'm the Airtel Icertis AI Support Assistant. I can help you troubleshoot issues, explain workflows, and answer questions about the Icertis CLM platform.\n\nTry one of the suggested questions below, or type your own.",
  timestamp: new Date(),
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = { role: "user", content: trimmed, timestamp: new Date() };
      const history = messages
        .filter((m) => m !== WELCOME)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      const placeholder: Message = {
        role: "assistant",
        content: "",
        sources: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, placeholder]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error ${res.status}`);
        }
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sourcesRead = false;
        let sources: string[] = [];
        let content = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          buffer += raw;

          if (!sourcesRead) {
            const nl = buffer.indexOf("\n");
            if (nl !== -1) {
              try {
                const meta = JSON.parse(buffer.slice(0, nl));
                if (meta.type === "sources") sources = meta.data ?? [];
              } catch {
                // not JSON, treat whole buffer as content
              }
              buffer = buffer.slice(nl + 1);
              content = buffer;
              sourcesRead = true;
            }
          } else {
            content += raw;
          }

          const snap = content;
          const srcSnap = sources;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { ...placeholder, content: snap, sources: srcSnap },
          ]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: `⚠️ Error: ${msg}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showSuggestions = messages.length === 1 && !isLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white text-lg">
          🤖
        </div>
        <div>
          <h1 className="font-bold text-gray-800">Icertis AI Support</h1>
          <p className="text-xs text-gray-500">RAG-powered · Groq LLaMA · Airtel Knowledge Base</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm">
                  🤖
                </div>
              )}

              <div className="max-w-[78%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-red-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none"
                  }`}
                >
                  {msg.content || (
                    <span className="flex items-center gap-2 text-gray-400">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                      Thinking…
                    </span>
                  )}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {msg.sources.map((src, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                      >
                        📄 {src}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm">
                  👤
                </div>
              )}
            </div>
          ))}

          {/* Suggested questions */}
          {showSuggestions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm bg-white border border-gray-200 hover:border-red-400 hover:bg-red-50 px-4 py-3 rounded-xl transition-colors text-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about Icertis CLM issues, workflows, processes…"
            disabled={isLoading}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl px-4 py-3 transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-1 text-sm">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </span>
            ) : (
              <span className="text-base">➤</span>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
