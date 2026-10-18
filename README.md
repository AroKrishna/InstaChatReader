# InstaChatReader

A clean, searchable, Instagram-inspired web viewer for Instagram JSON direct-message exports.

## 🚀 Overview

Instagram allows users to download their personal account data, but direct messages are exported as raw, multi-part JSON files (`message_1.json`, `message_2.json`, etc.) that are difficult to read and search.

**InstaChatReader** provides a modern, fast, read-only chat interface to browse your Instagram message archives with full search, date filtering, and conversation merging.

---

## 🔒 100% Private & In-Memory

- **No Server Uploads**: Files are parsed locally in the browser using the native `FileReader` API. Nothing leaves your device.
- **No Persistent Storage**: Messages are kept strictly in browser memory. No data is written to `localStorage`, `sessionStorage`, IndexedDB, or cookies.
- **Instant Clean Slate**: Refreshing the page or clicking "Clear Archive" immediately wipes all chat data from memory.

---

## ✨ Features

- **Multi-File & Split-File Merging**: Automatically combines split files (`message_1.json`, `message_2.json`) belonging to the same conversation into a single, chronologically sorted thread.
- **Explicit Account-Owner Selection**: Select which participant you are to align sent (blue, right-aligned) and received (gray, left-aligned) messages accurately.
- **Compact Shared Reel & Media Cards**: Embedded Instagram reels and shared posts are rendered as compact cards, isolating sender commentary from long embedded captions.
- **Full-Text Search & Jump-to-Message**: Search across all conversations or within the active chat. Clicking a search result jumps directly to the matching message with a highlight pulse.
- **Date Navigation & Filtering**: Filter messages by single day or custom date ranges with accurate local timezone boundaries.
- **Encoding & Mojibake Repair**: Transparently fixes UTF-8 mojibake commonly present in Instagram JSON exports, accurately restoring non-English text, accents, and emojis.
- **Theme Support**: Includes both Light and Dark themes styled after Instagram's modern design language.
- **Fully Responsive**: Optimized for desktop, tablet, and mobile browsers.

---

## 🛠️ Tech Stack

- **Core**: Vanilla JavaScript (ES Modules)
- **Styling**: Vanilla CSS with modern custom design tokens
- **Build Tool**: [Vite](https://vite.dev/)
- **Testing**: Node.js Native Test Runner (`node --test`)
- **Zero Runtime Dependencies**: No heavy frameworks, no external tracking or remote font CDNs.

---

## 💻 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm`

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/AroKrishna/InstaChatReader.git
cd InstaChatReader
npm install
```

### Running Locally

Start the local development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173/`.

### Running Tests

Run the automated test suite (47 unit and integration tests):

```bash
npm test
```

### Production Build

Create an optimized static build in `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 📥 How to Export Your Instagram Messages

1. Go to **Instagram Settings** > **Accounts Center** > **Your information and permissions**.
2. Select **Download your information**.
3. Choose **Export some of your information** and select **Messages**.
4. Set the format to **JSON** (HTML format is not supported).
5. When ready, download and extract the `.zip` archive on your computer.
6. In **InstaChatReader**, click **Import Messages** and select the `.json` files inside `your_activity/messages/inbox/`.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
