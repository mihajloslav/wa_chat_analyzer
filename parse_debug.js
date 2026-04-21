const fs = require('fs');

// We don't have the user's `_chat.txt` so we have to guess it.
// But we know that changing from `:\s*(.*)$` to `[:]\s(.*)$` reduced the count by 118.
// So let's restore `:\s*(.*)$`.

const regexOld = /^\[?(\d{1,2}[./]\s*\d{1,2}[./]\s*\d{2,4}\.?)[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:-\s*)?([^:]+?):\s*(.*)$/;
const regexNoCarat = /\[?(\d{1,2}[./]\s*\d{1,2}[./]\s*\d{2,4}\.?)[,\s]+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:-\s*)?([^:]+?):\s*(.*)$/;
