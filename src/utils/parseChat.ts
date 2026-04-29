export interface ChatMessage {
  dateStr: string;
  parsedDate: Date | null;
  sender: string;
  text: string;
}

export function parseChat(text: string): ChatMessage[] {
  const cleanedText = text.replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E\uFEFF]/g, '');
  const lines = cleanedText.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  
  // Match date/time and everything after the dash (system message or sender: text)
  const dateTimeRegex = /^\[?(\d{1,2}[./]\s*\d{1,2}[./]\s*\d{2,4}\.?)[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*-\s*(.+)$/;

  let currentMessage: ChatMessage | null = null;

  const pushIfValid = (message: ChatMessage | null) => {
    if (!message) return;

    // Keep system rows, but drop sender rows that have no actual text content.
    if (message.sender !== 'System' && message.text.trim() === '') return;

    messages.push(message);
  };

  for (const line of lines) {
    const match = line.match(dateTimeRegex);
    
    if (match) {
      pushIfValid(currentMessage);
      
      const dateStr = match[1].trim();
      const timeStr = match[2].trim();
      const afterDash = match[3];

      // Check if this is a regular message (sender: text) or system message (no colon)
      const colonIndex = afterDash.indexOf(':');
      let sender = '';
      let content = afterDash;

      if (colonIndex !== -1) {
        // Regular message with sender: text
        sender = afterDash.substring(0, colonIndex).replace(/^~?\s*/, '').trim();
        content = afterDash.substring(colonIndex + 1).trim();
      } else {
        // System message without sender
        sender = 'System';
        content = afterDash;
      }

      const fullDateStr = `${dateStr} ${timeStr}`;
      const parsedDate = parseDateStr(dateStr, timeStr);
      
      currentMessage = {
        dateStr: fullDateStr,
        parsedDate,
        sender,
        text: content,
      };
    } else if (currentMessage) {
      currentMessage.text += '\n' + line;
    }
  }

  pushIfValid(currentMessage);

  return messages;
}

function parseDateStr(dateStr: string, timeStr: string): Date | null {
  try {
    let day = 1;
    let month = 1;
    let year = 1970;

    const normalizedDateStr = dateStr.replace(/\.$/, '').trim();

    if (normalizedDateStr.includes('.')) {
      // Dot-separated WhatsApp dates are usually D.M.YYYY
      const parts = normalizedDateStr.split('.').map((p) => p.trim()).filter(Boolean);
      if (parts.length !== 3) return null;
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else if (normalizedDateStr.includes('/')) {
      const parts = normalizedDateStr.split('/').map((p) => p.trim()).filter(Boolean);
      if (parts.length !== 3) return null;

      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);

      // Slash-separated exports vary by locale.
      // If one side cannot be a month, use the only valid interpretation.
      // If both are <= 12 (ambiguous), default to M/D/YY (Android EN export).
      if (first > 12 && second <= 12) {
        day = first;
        month = second;
      } else if (second > 12 && first <= 12) {
        month = first;
        day = second;
      } else {
        month = first;
        day = second;
      }
    } else {
      return null;
    }

    if (year < 100) year += 2000;

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    
    let hour = 0, min = 0, sec = 0;
    if (timeStr) {
      const timeParts = timeStr.replace(/[^0-9:]/g, '').split(':');
      hour = parseInt(timeParts[0] || '0', 10);
      min = parseInt(timeParts[1] || '0', 10);
      sec = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
    }

    if (hour < 0 || hour > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) return null;

    const parsed = new Date(year, month - 1, day, hour, min, sec);
    // Protect against JS date overflow (e.g. month 19 becomes next year).
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
