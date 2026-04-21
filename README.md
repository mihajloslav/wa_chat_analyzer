# WhatsApp Chat Analyzer

A modern, fast, and privacy-focused web application for analyzing WhatsApp chat exports. Built completely from the ground up using **Next.js**, **React**, and **Tailwind CSS** to replace previous flutter/python implementations.

![WhatsApp Analyzer Preview](public/preview.png) *(Note: this is a placeholder if you wish to add a screenshot)*

## Features

- **100% Private (Local Processing):** Your chats never leave your device. The entire `_chat.txt` file is parsed and analyzed locally in your browser.
- **Accurate Counting Algorithm:** The parsing Regex has been carefully tuned to match proven Python-based analytics precisely. It handles both 12h and 24h formats, date variations (Android/iOS), left-to-right invisible marks (`\u200E`), unknown contacts (with `~` prefix), and multiline messages.
- **Precision Range Selection:** Filter the exact conversation range you want to analyze down to the specific second. 
- **Message Pagination:** View the entire chat history without freezing your browser. Hundreds of thousands of rows render smoothly utilizing controlled page size.
- **Contextual Syntax Highlighting:** Start and End selection brackets are visually distinct. Messages inside the selected timestamp range are highlighted differently from the background chatter.
- **Quick Jump Navigation:** Use UI control buttons to skip to the absolute beginning or the exact end of the conversation seamlessly.
- **Copy Statistics:** Instantly copy the tabulated results of the analysis straight to the clipboard to share with friends.

## Getting Started

First, make sure you have [Node.js](https://nodejs.org/) installed.

1. Clone or download this repository.
2. Install the application dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How to export a WhatsApp Chat

1. Open the WhatsApp chat you want to analyze.
2. Tap the three dots (More options) > **More** > **Export chat**.
3. Choose **Without media** (faster and only exports the text file).
4. Save the generated `_chat.txt` to your computer.
5. Upload the `.txt` file directly into the Web Analyzer. Note: `_chat.txt` is added to `.gitignore` to prevent any accidental uploads of your private data to GitHub.

## Technologies Used

* [Next.js (App Router)](https://nextjs.org/)
* [React](https://reactjs.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [TypeScript](https://www.typescriptlang.org/)

## Privacy

The file strictly operates on the Client-Side using JavaScript `FileReader`. There are no API requests, telemetry, or server-side logs running in the background. What you analyze is strictly between you and your computer.
