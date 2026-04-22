"use client";

import { useState, useMemo, useRef } from "react";
import DatePicker from "react-datepicker";
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
  const [searchDateTime, setSearchDateTime] = useState<Date | null>(null);
  
  const listRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadTime(null);
    setMessages([]);
    setCurrentPage(1);
    setSearchDateTime(null);

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
          setSearchDateTime(parsed[0].parsedDate ?? null);
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
    if (!searchDateTime || messages.length === 0) return;

    const ts = searchDateTime.getTime();
    if (isNaN(ts)) return;

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Analyzer</h1>
            <p className="text-blue-100 mt-1">Analyze your .txt chat exports</p>
          </div>
          {loadTime !== null && messages.length > 0 && (
            <div className="text-sm bg-blue-700 px-3 py-1 rounded shadow-sm text-blue-50">
              Loaded in {(loadTime / 1000).toFixed(2)}s
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Panel */}
          <div className="flex-1 flex flex-col p-6 border-r border-slate-100 min-w-0">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
                <div className="animate-spin mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full w-12 h-12"></div>
                <h3 className="text-lg font-medium text-slate-700">Parsing hundreds of text lines...</h3>
                <p className="text-slate-400 text-sm mt-2">This may take a few seconds depending on file size.</p>
              </div>
            ) : !messages.length ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                <input 
                  type="file" 
                  accept=".txt" 
                  onChange={handleFileUpload}
                  className="hidden" 
                  id="file-upload" 
                />
                <label 
                  htmlFor="file-upload" 
                  className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Choose .txt file
                </label>
                <p className="mt-4 text-slate-500 text-sm">Android and iOS formats are supported</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Find by date and time</label>
                    <DatePicker
                      selected={searchDateTime}
                      onChange={(date: Date | null) => setSearchDateTime(date)}
                      showTimeSelect
                      timeIntervals={1}
                      dateFormat="yyyy-MM-dd HH:mm:ss"
                      timeFormat="HH:mm"
                      placeholderText="Select date and time"
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSearchByDateTime}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm disabled:opacity-50"
                      disabled={searchDateTime === null || messages.length === 0}
                    >
                      Search
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <div className="text-sm text-slate-500 flex flex-wrap gap-2 items-center">
                    <span>Quick jumps:</span>
                    <button onClick={() => jumpToMessageIndex(0)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs transition border border-slate-300">First in chat</button>
                    <button onClick={() => jumpToMessageIndex(messages.length - 1)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs transition border border-slate-300">Last in chat</button>
                    <div className="w-px h-4 relative bg-slate-300 mx-1"></div>
                    <button onClick={() => startIndex !== null && jumpToMessageIndex(startIndex)} className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded text-xs transition border border-green-300">Selected start</button>
                    <button onClick={() => endIndex !== null && jumpToMessageIndex(endIndex)} className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs transition border border-red-300">Selected end</button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setStartIndex(0); setEndIndex(messages.length - 1); }}
                      className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 border border-orange-200 rounded transition"
                    >
                      Reset selection (All)
                    </button>
                    <button 
                      onClick={() => { setMessages([]); setStartIndex(null); setEndIndex(null); setLoadTime(null); setSearchDateTime(null); }}
                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition"
                    >
                      Clear file
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3" ref={listRef}>
                  {paginatedMessages.map((msg, i) => {
                    const actualIndex = (currentPage - 1) * PAGE_SIZE + i;
                    return (
                    <div id={`msg-${actualIndex}`} key={actualIndex} className={`p-3 rounded-lg shadow-sm border group transition-colors ${getMessageColorClass(actualIndex)}`}>
                      <div className="flex justify-between items-start text-xs mb-1">
                        <div className="flex flex-col">
                           <span className={`font-semibold ${getMessageColorClass(actualIndex).includes('bg-white') ? 'text-slate-600' : 'text-blue-800'}`}>{msg.sender}</span>
                           <span className="text-slate-500 mt-0.5 opacity-90">{formatTime24h(msg.parsedDate, msg.dateStr)}</span>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-end">
                            <button 
                              onClick={() => {
                                setStartIndex(actualIndex);
                                if (endIndex !== null && actualIndex > endIndex) setEndIndex(messages.length - 1);
                              }}
                              className="text-[10px] bg-green-100 border border-green-300 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition"
                            >
                              Set as Start
                            </button>
                            <button 
                              onClick={() => {
                                setEndIndex(actualIndex);
                                if (startIndex !== null && actualIndex < startIndex) setStartIndex(0);
                              }}
                              className="text-[10px] bg-red-100 border border-red-300 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 transition"
                            >
                              Set as End
                            </button>
                        </div>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap ${getMessageColorClass(actualIndex).includes('bg-white') ? 'text-slate-500' : 'text-slate-800'}`}>{msg.text}</p>
                    </div>
                  )})}
                  {messages.length === 0 && (
                    <div className="text-center text-slate-400 text-sm italic pt-4">
                       No messages loaded.
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded disabled:opacity-50 text-sm"
                    >
                      &larr; Previous ({PAGE_SIZE})
                    </button>
                    <span className="text-sm text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded disabled:opacity-50 text-sm"
                    >
                      Next ({PAGE_SIZE}) &rarr;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar Stats */}
          {messages.length > 0 && !isLoading && (
            <div className="w-[300px] bg-slate-50 flex flex-col border-l border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                <h2 className="font-bold text-slate-800">Selection analysis</h2>
                <button 
                  onClick={handleCopy}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                  title="Copy all results"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="mb-6 pb-6 border-b border-slate-200">
                  <div className="text-sm text-slate-500 mb-1">Messages in selected range</div>
                  <div className="text-3xl font-light text-slate-800 text-blue-600">{filteredMessages.length}</div>
                </div>
                
                {filteredMessages.length > 0 ? (
                  <div className="space-y-3">
                    {stats.map(([sender, count], idx) => (
                      <div key={sender} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 transition">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-5 text-slate-400 text-xs font-bold">{idx + 1}.</div>
                          <div className="text-sm font-medium text-slate-700 truncate">{sender}</div>
                        </div>
                        <div className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded shadow-sm text-sm border border-slate-100">{count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center italic">Empty range. Change selection to see stats.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
