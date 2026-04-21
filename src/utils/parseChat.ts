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
  
  const waRegex = /^\[?(\d{1,2}[./]\s*\d{1,2}[./]\s*\d{2,4}\.?)[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:-\s*)?([^:]+?):\s*(.*)$/;

  let currentMessage: ChatMessage | null = null;

  for (const line of lines) {
    const match = line.match(waRegex);
    
    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      
      const dateStr = match[1].trim();
      const timeStr = match[2].trim();
      const sender = match[3].replace(/^~?\s*/, '').trim(); 
      const content = match[4];

      const fullDateStr = `${dateStr} ${timeStr}`;
      let parsedDate = parseDateStr(dateStr, timeStr);
      
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

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

function parseDateStr(dateStr: string, timeStr: string): Date | null {
  try {
    let day = 1, month = 1, year = 1970;
    
    if (dateStr.includes('.')) {
      const parts = dateStr.replace(/\./g, ' ').split(' ').filter(p => p.trim());
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    if (year < 100) year += 2000;
    
    let hour = 0, min = 0, sec = 0;
    if (timeStr) {
      const timeParts = timeStr.replace(/[^0-9:]/g, '').split(':');
      hour = parseInt(timeParts[0] || '0', 10);
      min = parseInt(timeParts[1] || '0', 10);
      sec = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
    }
    
    return new Date(year, month - 1, day, hour, min, sec);
  } catch (e) {
    return null;
  }
}
