"use client";

import Image from "next/image";
import { useState, useMemo, useRef } from "react";
import { ChatMessage, parseChat } from "@/utils/parseChat";

const PAGE_SIZE = 100;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

type ScrollColumnProps = {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  format2?: boolean;
};

function ScrollColumn({ values, selected, onSelect, format2 = false }: ScrollColumnProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 48,
        overflowY: "auto",
        maxHeight: 260,
        scrollbarWidth: "none",
      }}
    >
      {values.map((v) => {
        const label = format2 ? String(v).padStart(2, "0") : String(v);
        const isSelected = v === selected;
        return (
          <div
            key={v}
            onClick={() => onSelect(v)}
            style={{
              width: 40,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: isSelected ? 700 : 400,
              fontSize: 15,
              color: isSelected ? "#fff" : "#333",
              background: isSelected ? "#1DAA61" : "transparent",
              transition: "background 0.15s",
              userSelect: "none",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Absolute message indexes are used for selection
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openPicker, setOpenPicker] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(() => new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => new Date().getMinutes());
  const [second, setSecond] = useState(() => new Date().getSeconds());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);

  const pad = (n: number) => String(n).padStart(2, "0");

  const applyDateToPicker = (date: Date) => {
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setSelectedDate(date.getDate());
    setSelectedMonth(date.getMonth());
    setSelectedYear(date.getFullYear());
    setHour(date.getHours());
    setMinute(date.getMinutes());
    setSecond(date.getSeconds());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadTime(null);
    setMessages([]);
    setCurrentPage(1);
    setOpenPicker(false);

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
          if (parsed[0].parsedDate) {
            applyDateToPicker(parsed[0].parsedDate);
          }
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

  const orderedEntries = useMemo(() => {
    const allEntries = messages.map((msg, actualIndex) => ({ msg, actualIndex }));
    const system = allEntries.filter(({ msg }) => msg.sender === "System");
    const regular = allEntries.filter(({ msg }) => msg.sender !== "System");
    return [...system, ...regular];
  }, [messages]);

  const totalPages = Math.ceil(orderedEntries.length / PAGE_SIZE);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedEntries = orderedEntries.slice(pageStart, currentPage * PAGE_SIZE);
  const firstUserPosition = orderedEntries.findIndex(({ msg }) => msg.sender !== "System");

  const selectedSystemCount = useMemo(
    () => filteredMessages.filter((m) => m.sender === "System").length,
    [filteredMessages]
  );
  const selectedUserCount = filteredMessages.length - selectedSystemCount;

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of filteredMessages) {
      if (m.sender === "System") continue;
      counts[m.sender] = (counts[m.sender] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredMessages]);

  const handleCopy = () => {
    let result = `=== WHATSAPP CHAT ANALYSIS ===\n`;
    result += `Total messages in range: ${filteredMessages.length}\n`;
    result += `User messages in range: ${selectedUserCount}\n`;
    result += `System messages in range: ${selectedSystemCount}\n`;
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
    const orderedPosition = orderedEntries.findIndex((entry) => entry.actualIndex === index);
    if (orderedPosition === -1) return;

    const targetPage = Math.floor(orderedPosition / PAGE_SIZE) + 1;
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
    const ts = new Date(selectedYear, selectedMonth, selectedDate, hour, minute, second).getTime();
    if (isNaN(ts) || messages.length === 0) return;

    const idx = findClosestMessageIndex(ts);
    if (idx === -1) return;

    jumpToMessageIndex(idx);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const displayValue = `${pad(selectedDate)}/${pad(selectedMonth + 1)}/${selectedYear}, ${pad(hour)}:${pad(minute)}:${pad(second)}`;

  const handleDayClick = (day: number) => {
    setSelectedDate(day);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
      return;
    }
    setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
      return;
    }
    setViewMonth((m) => m + 1);
  };

  const isSelectedDay = (day: number) => {
    return day === selectedDate && viewMonth === selectedMonth && viewYear === selectedYear;
  };

  const isToday = (day: number) => {
    const t = new Date();
    return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
  };

  const prevDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);
  const yearOptions = Array.from({ length: 41 }, (_, i) => new Date().getFullYear() - 20 + i);
  const grid: Array<{ day: number; other: boolean }> = [];
  for (let i = 0; i < firstDay; i += 1) grid.push({ day: prevDays - firstDay + 1 + i, other: true });
  for (let d = 1; d <= daysInMonth; d += 1) grid.push({ day: d, other: false });
  const remaining = 42 - grid.length;
  for (let i = 1; i <= remaining; i += 1) grid.push({ day: i, other: true });

  const formatTime24h = (date: Date | null, originalStr: string) => {
    if (!date) return originalStr.replace(/am|pm/i, '').trim();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const getMessageColorClass = (actualIndex: number) => {
    if (startIndex === null || endIndex === null) return "bg-white border-[#d8dde1]";
    if (actualIndex === startIndex) return "bg-white border-green-400 ring-1 ring-green-300";
    if (actualIndex === endIndex) return "bg-white border-red-400 ring-1 ring-red-300";
    if (actualIndex > startIndex && actualIndex < endIndex) return "bg-white border-[#cfd8dd]";
    return "bg-white border-[#d8dde1]"; // out of selected range
  };

  const getBubbleLayout = () => {
    return "ml-0 mr-auto";
  };

  const getBubbleChainClass = (actualIndex: number) => {
    const currentSender = messages[actualIndex]?.sender;
    const prevSender = actualIndex > 0 ? messages[actualIndex - 1]?.sender : null;
    const nextSender = actualIndex < messages.length - 1 ? messages[actualIndex + 1]?.sender : null;

    const hasPrevSame = prevSender === currentSender;
    const hasNextSame = nextSender === currentSender;

    if (!hasPrevSame && !hasNextSame) return "mt-3 rounded-2xl";
    if (!hasPrevSame && hasNextSame) return "mt-3 rounded-2xl rounded-bl-md";
    if (hasPrevSame && hasNextSame) return "mt-1 rounded-2xl rounded-tl-md rounded-bl-md";
    return "mt-1 rounded-2xl rounded-tl-md";
  };

  return (
    <main className="min-h-screen bg-[#f7f5f3] p-3 md:p-5 text-[#111b21]">
      <div className="mx-auto h-[94vh] max-w-[1450px] overflow-hidden rounded-xl border border-[#c7cdd1] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex h-full">
          <aside className="w-full max-w-[370px] border-r border-[#d8dde1] bg-[#ffffff] flex flex-col">
            <div className="bg-[#ffffff] px-4 py-3 border-b border-[#d8dde1]">
              <div className="flex items-center justify-between">
                <h1 className="flex items-center gap-1.5 text-[18px] font-semibold text-[#25D366]">
                  <Image
                    src="/wa_chat_analyzer.svg"
                    alt="WhatsApp Analyzer icon"
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0"
                  />
                  <span>WhatsApp Chat Analyzer</span>
                </h1>
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
                    className="inline-flex cursor-pointer items-center rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#189754]"
                  >
                    Choose .txt file
                  </label>
                  <p className="mt-3 text-xs text-[#8696a0]">Android and iOS exports are supported.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="relative px-4 py-3 space-y-3 border-b border-[#d8dde1] z-30">
                  <label className="text-xs font-medium tracking-wide text-[#667781]">Find by date and time</label>
                  <div className="flex gap-2">
                    <div
                      onClick={() => setOpenPicker((o) => !o)}
                      className="flex-1 rounded-lg border border-[#d8dde1] bg-white px-3 py-2 text-sm cursor-pointer flex items-center justify-between"
                    >
                      <span>{displayValue}</span>
                      <span className="text-[#8696a0]">Calendar</span>
                    </div>
                    <button
                      onClick={handleSearchByDateTime}
                      className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#189754] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={messages.length === 0}
                    >
                      Search
                    </button>
                  </div>
                  {openPicker && (
                    <div
                      style={{
                        display: "inline-flex",
                        position: "absolute",
                        top: 84,
                        left: 16,
                        zIndex: 200,
                        background: "#fff",
                        borderRadius: 12,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ padding: "16px 12px", minWidth: 230 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            <button
                              onClick={() => setShowMonthYearPicker((v) => !v)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: 14,
                                color: "#111",
                                padding: 0,
                              }}
                            >
                              {MONTHS[viewMonth]} {viewYear} ▾
                            </button>
                          </span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#555", padding: "2px 4px", borderRadius: 4, lineHeight: 1 }}>▲</button>
                            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#555", padding: "2px 4px", borderRadius: 4, lineHeight: 1 }}>▼</button>
                          </div>
                        </div>

                        {showMonthYearPicker && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <select
                              value={viewMonth}
                              onChange={(e) => setViewMonth(Number(e.target.value))}
                              style={{
                                flex: 1,
                                border: "1px solid #d8dde1",
                                borderRadius: 8,
                                padding: "6px 8px",
                                fontSize: 13,
                              }}
                            >
                              {MONTHS.map((monthName, index) => (
                                <option key={monthName} value={index}>
                                  {monthName}
                                </option>
                              ))}
                            </select>
                            <select
                              value={viewYear}
                              onChange={(e) => setViewYear(Number(e.target.value))}
                              style={{
                                width: 95,
                                border: "1px solid #d8dde1",
                                borderRadius: 8,
                                padding: "6px 8px",
                                fontSize: 13,
                              }}
                            >
                              {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 30px)", gap: 2, marginBottom: 4 }}>
                          {DAYS.map((d, i) => (
                            <div key={`${d}-${i}`} style={{ textAlign: "center", fontSize: 12, color: "#888", fontWeight: 600, height: 28, lineHeight: "28px" }}>
                              {d}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 30px)", gap: 2 }}>
                          {grid.map((cell, i) => (
                            <div
                              key={`${cell.day}-${i}`}
                              onClick={() => !cell.other && handleDayClick(cell.day)}
                              style={{
                                height: 30,
                                width: 30,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 6,
                                fontSize: 13,
                                cursor: cell.other ? "default" : "pointer",
                                color: cell.other ? "#ccc" : isSelectedDay(cell.day) ? "#fff" : "#333",
                                background:
                                  !cell.other && isSelectedDay(cell.day)
                                    ? "#25D366"
                                    : !cell.other && isToday(cell.day) && !isSelectedDay(cell.day)
                                    ? "#e8f9f0"
                                    : "transparent",
                                fontWeight: isSelectedDay(cell.day) ? 700 : 400,
                                transition: "background 0.12s",
                              }}
                            >
                              {cell.day}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                          <span
                            style={{ fontSize: 13, color: "#25D366", cursor: "pointer", fontWeight: 500 }}
                            onClick={() => {
                              const t = new Date();
                              applyDateToPicker(t);
                              setShowMonthYearPicker(false);
                            }}
                          >
                            Today
                          </span>
                          <span
                            style={{ fontSize: 13, color: "#25D366", cursor: "pointer", fontWeight: 500 }}
                            onClick={() => {
                              setOpenPicker(false);
                              setShowMonthYearPicker(false);
                            }}
                          >
                            Close
                          </span>
                        </div>
                      </div>

                      <div style={{ width: 1, background: "#e5e7eb" }} />

                      <div style={{ display: "flex", padding: "16px 8px", gap: 4 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                            {["hh", "mm", "ss"].map((label) => (
                              <div key={label} style={{ width: 40, textAlign: "center", fontSize: 11, color: "#aaa", fontWeight: 600 }}>
                                {label}
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <ScrollColumn values={Array.from({ length: 24 }, (_, i) => i)} selected={hour} onSelect={setHour} format2 />
                            <ScrollColumn values={Array.from({ length: 60 }, (_, i) => i)} selected={minute} onSelect={setMinute} format2 />
                            <ScrollColumn values={Array.from({ length: 60 }, (_, i) => i)} selected={second} onSelect={setSecond} format2 />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-b border-[#d8dde1] space-y-2">
                  <p className="text-xs font-medium tracking-wide text-[#667781]">Quick jumps</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => jumpToMessageIndex(0)} className="wa-chip">First</button>
                    <button onClick={() => jumpToMessageIndex(messages.length - 1)} className="wa-chip">Last</button>
                    <button onClick={() => startIndex !== null && jumpToMessageIndex(startIndex)} className="wa-chip border-[#66c08a] bg-[#eefaf3] text-[#1f6a45]">Start</button>
                    <button onClick={() => endIndex !== null && jumpToMessageIndex(endIndex)} className="wa-chip border-[#e09595] bg-[#fff2f2] text-[#8a2c2c]">End</button>
                  </div>
                  <div className="mt-2 border-t border-[#d8dde1] pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setStartIndex(0);
                        setEndIndex(messages.length - 1);
                      }}
                      className="wa-chip border-[#f1cf7a] bg-[#fff9e8] text-xs text-[#cf8f00]"
                    >
                      Reset selection
                    </button>
                    <button
                      onClick={() => {
                        setMessages([]);
                        setStartIndex(null);
                        setEndIndex(null);
                        setLoadTime(null);
                        applyDateToPicker(new Date());
                      }}
                      className="wa-chip border-[#f2b2b2] bg-[#fff1f1] text-xs text-[#d10000]"
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
                        className="rounded-md bg-[#ffffff] px-2 py-1 text-xs text-[#3b4a54] hover:bg-[#e4e8eb]"
                        title="Copy all results"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-[#667781]">Messages in selected range</p>
                    <p className="mb-3 text-2xl font-semibold text-[#25D366]">{filteredMessages.length}</p>
                    <div className="mb-3 space-y-1 text-xs text-[#667781]">
                      <p>User messages: <span className="font-semibold text-[#111b21]">{selectedUserCount}</span></p>
                      <p>System messages: <span className="font-semibold text-[#111b21]">{selectedSystemCount}</span></p>
                    </div>
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
            <div className="flex items-center justify-between border-b border-[#d8dde1] bg-[#ffffff] px-5 py-3">
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
                <div>
                  {paginatedEntries.map(({ msg, actualIndex }, i) => {
                    const absoluteRenderedPosition = pageStart + i;
                    const isFirstRegularAfterSystem =
                      firstUserPosition !== -1 && absoluteRenderedPosition === firstUserPosition;
                    return (
                      <div
                        key={actualIndex}
                        id={`msg-${actualIndex}`}
                        className={`w-[98%] border px-3 py-2 shadow-sm group ${getMessageColorClass(actualIndex)} ${getBubbleLayout()} ${getBubbleChainClass(actualIndex)} ${isFirstRegularAfterSystem ? "mt-6" : ""}`}
                      >
                        {isFirstRegularAfterSystem && (
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#667781]">
                            User messages
                          </div>
                        )}
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
              <div className="flex items-center justify-between border-t border-[#d8dde1] bg-[#ffffff] px-5 py-2.5">
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
