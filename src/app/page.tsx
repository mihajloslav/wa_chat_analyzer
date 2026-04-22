"use client";

import { useState, useMemo, useRef } from "react";
import { ChatMessage, parseChat } from "@/utils/parseChat";

const PAGE_SIZE = 100;

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Absolute message indexes are used for selection
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchDateTime, setSearchDateTime] = useState("");
  
  const listRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadTime(null);
    setMessages([]);
    setCurrentPage(1);
    setSearchDateTime("");

    setTimeout(() => {
      const startTime = performance.now();
      const reader = new FileReader();

      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseChat(text);
        
        setMessages(parsed);
        
        if (parsed.length > 0) {
          setStartIndex(0);
          setEndIndex(parsed.length - 1);
          setSearchDateTime(toDatetimeLocal(parsed[0].parsedDate));
        }
        
        const endTime = performance.now();
        setLoadTime(endTime - startTime);
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    }, 50);
  };

  const toDatetimeLocal = (date: Date | null) => {
    if (!date) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const filteredMessages = useMemo(() => {
    if (startIndex === null || endIndex === null) return [];
    return messages.slice(startIndex, endIndex + 1);
  }, [messages, startIndex, endIndex]);

  const startValue = startIndex !== null && messages[startIndex] ? toDatetimeLocal(messages[startIndex].parsedDate) : "";
  const endValue = endIndex !== null && messages[endIndex] ? toDatetimeLocal(messages[endIndex].parsedDate) : "";

  const totalPages = Math.ceil(messages.length / PAGE_SIZE);
  const paginatedMessages = messages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of filteredMessages) {
      counts[m.sender] = (counts[m.sender] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredMessages]);

  const handleCopy = () => {
    let result = `=== WHATSAPP CHAT ANALYSIS ===\n`;
    result += `Total messages in range: ${filteredMessages.length}\n`;
    result += `Range: ${startValue.replace('T', ' ')} to ${endValue.replace('T', ' ')}\n`;
    result += `------------------\n`;
    stats.forEach(([sender, count], idx) => {
      result += `${idx + 1}. ${sender}: ${count}\n`;
    });

    navigator.clipboard.writeText(result);
    alert("Copied to clipboard!");
  };

  const jumpToMessageIndex = (index: number) => {
    if (index < 0 || index >= messages.length) return;
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    setCurrentPage(targetPage);
    setTimeout(() => {
      const msgEl = document.getElementById(`msg-${index}`);
      if (msgEl) {
        msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  const findClosestMessageIndex = (targetTs: number) => {
    let closestIdx = -1;
    let closestDiff = Number.POSITIVE_INFINITY;

    messages.forEach((message, idx) => {
      const messageTs = message.parsedDate?.getTime();
      if (messageTs === undefined) return;

      const diff = Math.abs(messageTs - targetTs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = idx;
      }
    });

    return closestIdx;
  };

  const handleSearchByDateTime = () => {
    const ts = new Date(searchDateTime).getTime();
    if (isNaN(ts) || messages.length === 0) return;

    const idx = findClosestMessageIndex(ts);
    if (idx === -1) return;

    jumpToMessageIndex(idx);
  };

  const formatTime24h = (date: Date | null, originalStr: string) => {
    if (!date) return originalStr.replace(/am|pm/i, '').trim();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const getMessageColorClass = (actualIndex: number) => {
    if (startIndex === null || endIndex === null) return "bg-white border-slate-100 opacity-60";
    if (actualIndex === startIndex) return "bg-green-100 border-green-300 ring-1 ring-green-400";
    if (actualIndex === endIndex) return "bg-red-100 border-red-300 ring-1 ring-red-400";
    if (actualIndex > startIndex && actualIndex < endIndex) return "bg-blue-50 border-blue-200";
    return "bg-white border-slate-100 opacity-60"; // out of selected range
  };

  const getBubbleLayout = (actualIndex: number) => {
    if (startIndex !== null && actualIndex === startIndex) return "ml-0 mr-auto";
    if (endIndex !== null && actualIndex === endIndex) return "ml-auto mr-0";
    return actualIndex % 2 === 0 ? "ml-auto mr-0" : "ml-0 mr-auto";
  };

  return (
    <main className="min-h-screen bg-[#d1d7db] p-3 md:p-5 text-[#111b21]">
      <div className="mx-auto h-[94vh] max-w-[1450px] overflow-hidden rounded-xl border border-[#c7cdd1] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex h-full">
          <aside className="w-full max-w-[370px] border-r border-[#d8dde1] bg-[#f0f2f5] flex flex-col">
            <div className="bg-[#f0f2f5] px-4 py-3 border-b border-[#d8dde1]">
              <div className="flex items-center justify-between">
                <h1 className="text-[22px] font-semibold text-[#00a884]">WhatsApp Analyzer</h1>
                {loadTime !== null && messages.length > 0 && (
                  <span className="rounded-full bg-[#d9fdd3] px-3 py-1 text-xs font-medium text-[#087f5b]">
                    {(loadTime / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            </div>

            {!messages.length ? (
              <div className="flex-1 px-4 py-6">
                <div className="rounded-2xl border border-dashed border-[#bcc5ca] bg-white p-6 text-center">
                  <p className="text-sm text-[#55626b] mb-4">Upload chat export to start analysis.</p>
                  <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" id="file-upload" />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex cursor-pointer items-center rounded-full bg-[#00a884] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#019272]"
                  >
                    Choose .txt file
                  </label>
                  <p className="mt-3 text-xs text-[#8696a0]">Android and iOS exports are supported.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 space-y-3 border-b border-[#d8dde1]">
                  <label className="text-xs font-medium tracking-wide text-[#667781]">Find by date and time</label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      lang="en-GB"
                      step="1"
                      value={searchDateTime}
                      onChange={(e) => setSearchDateTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchByDateTime();
                      }}
                      className="dt-24h flex-1 rounded-lg border border-[#d8dde1] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25d366]"
                    />
                    <button
                      onClick={handleSearchByDateTime}
                      className="rounded-lg bg-[#00a884] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#019272] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!searchDateTime}
                    >
                      Search
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-[#d8dde1] space-y-2">
                  <p className="text-xs font-medium tracking-wide text-[#667781]">Quick jumps</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => jumpToMessageIndex(0)} className="wa-chip">First</button>
                    <button onClick={() => jumpToMessageIndex(messages.length - 1)} className="wa-chip">Last</button>
                    <button onClick={() => startIndex !== null && jumpToMessageIndex(startIndex)} className="wa-chip">Start</button>
                    <button onClick={() => endIndex !== null && jumpToMessageIndex(endIndex)} className="wa-chip">End</button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => {
                        setStartIndex(0);
                        setEndIndex(messages.length - 1);
                      }}
                      className="text-xs text-[#cf8f00] hover:underline"
                    >
                      Reset selection
                    </button>
                    <button
                      onClick={() => {
                        setMessages([]);
                        setStartIndex(null);
                        setEndIndex(null);
                        setLoadTime(null);
                        setSearchDateTime("");
                      }}
                      className="text-xs text-[#d10000] hover:underline"
                    >
                      Clear file
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                  <div className="rounded-xl bg-white border border-[#d8dde1] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-[#111b21]">Selection analysis</h2>
                      <button
                        onClick={handleCopy}
                        className="rounded-md bg-[#f0f2f5] px-2 py-1 text-xs text-[#3b4a54] hover:bg-[#e4e8eb]"
                        title="Copy all results"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-[#667781]">Messages in selected range</p>
                    <p className="mb-3 text-2xl font-semibold text-[#00a884]">{filteredMessages.length}</p>
                    <div className="space-y-1.5">
                      {stats.map(([sender, count], idx) => (
                        <div key={sender} className="flex items-center justify-between rounded-md bg-[#f7f8fa] px-2 py-1.5 text-sm">
                          <span className="truncate text-[#111b21]">{idx + 1}. {sender}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#3b4a54] border border-[#e3e6e8]">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>

          <section className="flex min-w-0 flex-1 flex-col bg-[#efeae2]">
            <div className="flex items-center justify-between border-b border-[#d8dde1] bg-[#f0f2f5] px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111b21]">Chat Messages</h3>
                <p className="text-xs text-[#667781]">Search jumps to the closest date/time message.</p>
              </div>
              <span className="text-xs text-[#667781]">Page {currentPage} of {Math.max(1, totalPages)}</span>
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center wa-chat-bg">
                <div className="rounded-xl bg-white/80 px-5 py-4 text-sm text-[#3b4a54] shadow-sm">Parsing chat file...</div>
              </div>
            ) : (
              <div className="wa-chat-bg flex-1 overflow-y-auto px-4 py-4" ref={listRef}>
                <div className="space-y-3">
                  {paginatedMessages.map((msg, i) => {
                    const actualIndex = (currentPage - 1) * PAGE_SIZE + i;
                    return (
                      <div key={actualIndex} id={`msg-${actualIndex}`} className={`max-w-[76%] rounded-lg border px-3 py-2 shadow-sm group ${getMessageColorClass(actualIndex)} ${getBubbleLayout(actualIndex)}`}>
                        <div className="mb-1 flex items-start justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-[#50715d] truncate">{msg.sender}</span>
                          <span className="text-[#667781] whitespace-nowrap">{formatTime24h(msg.parsedDate, msg.dateStr)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-[#111b21]">{msg.text}</p>
                        <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setStartIndex(actualIndex);
                              if (endIndex !== null && actualIndex > endIndex) setEndIndex(messages.length - 1);
                            }}
                            className="rounded bg-[#d9fdd3] px-2 py-0.5 text-[10px] text-[#087f5b]"
                          >
                            Set as Start
                          </button>
                          <button
                            onClick={() => {
                              setEndIndex(actualIndex);
                              if (startIndex !== null && actualIndex < startIndex) setStartIndex(0);
                            }}
                            className="rounded bg-[#ffe1e1] px-2 py-0.5 text-[10px] text-[#9c2222]"
                          >
                            Set as End
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#d8dde1] bg-[#f0f2f5] px-5 py-2.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="wa-nav-btn"
                >
                  Previous
                </button>
                <span className="text-xs text-[#667781]">{PAGE_SIZE} messages per page</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="wa-nav-btn"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
