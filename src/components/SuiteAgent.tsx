"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SuiteAgentProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLauncher?: boolean;
}

export function SuiteAgent({ open: controlledOpen, onOpenChange, showLauncher = true }: SuiteAgentProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey, I’m your suite assistant. Ask me about balances, chores, trends, or anything happening in your suite.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 110);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = messages.filter((message, index) => message.role !== "assistant" || index > 0);

    setMessages((previous) => [...previous, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Connection issue. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <div
          className="fixed bottom-24 right-4 z-50 flex h-[500px] w-[min(94vw,380px)] flex-col overflow-hidden rounded-[1.6rem] border border-[rgba(108,73,118,0.22)] bg-[rgba(255,251,255,0.95)] shadow-[0_34px_72px_-34px_rgba(30,16,45,0.8)] backdrop-blur-md sm:right-6"
          style={{ animation: "riseIn 220ms cubic-bezier(0.2,0.7,0.2,1)" }}
        >
          <div className="flex items-center gap-3 border-b border-[rgba(108,73,118,0.16)] bg-gradient-to-r from-[#6b002e] to-[#8b1d44] px-4 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles size={15} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Suite Assistant</p>
              <p className="text-[11px] text-white/70">Lava AI insights</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/70 hover:bg-white/15 hover:text-white"
              aria-label="Close suite assistant"
            >
              <X size={17} />
            </button>
          </div>

          <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" ? (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6b002e] to-[#8b1d44] text-white">
                    <Sparkles size={10} />
                  </div>
                ) : null}
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-sm bg-[#2a1738] text-white"
                      : "rounded-bl-sm bg-[#f6eef9] text-[#33243f]"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6b002e] to-[#8b1d44] text-white">
                  <Sparkles size={10} />
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-[#f6eef9] px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9f8aa9]" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9f8aa9]" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9f8aa9]" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[rgba(108,73,118,0.16)] px-3 pb-3 pt-2.5">
            <div className="flex items-center gap-2 rounded-2xl border border-[rgba(108,73,118,0.2)] bg-white px-2.5 py-2">
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm text-[#2a1738] placeholder:text-[#9b89a2] outline-none"
                placeholder="Ask about your suite..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim() || loading}
                className="button-primary h-8 min-w-8 rounded-xl px-2.5 py-0"
                aria-label="Send message"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLauncher ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="floating-chat-anchor fixed bottom-6 right-6 z-50"
          aria-label={open ? "Close suite assistant" : "Open suite assistant"}
        >
          {open ? <X size={20} /> : <MessageCircle size={20} />}
        </button>
      ) : null}
    </>
  );
}
