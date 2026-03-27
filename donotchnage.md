# Do Not Change

This document lists critical parts of the codebase that **must not be changed**. These decisions were made after extensive debugging and testing. Changing them will break the application.

---

## 1. Playwright + @sparticuz/chromium Setup (scrape.js)

### Import Pattern (MUST STAY EXACTLY THIS)
```javascript
import sparticuz from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
```

**Why:** `playwright-core` uses a **named export** `chromium`, NOT a default export. `@sparticuz/chromium` uses a **default export**. Using `import playwrightCore from "playwright-core"` causes `playwrightCore.launch is not a function` error.

### Launch Pattern (MUST STAY EXACTLY THIS)
```javascript
const browser = await playwrightChromium.launch({
  headless: true,
  args: isVercel ? sparticuz.args : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  executablePath: isVercel ? await sparticuz.executablePath() : localBrowserPath,
});
```

**Why:** 
- `playwrightChromium.launch()` is the correct way to launch via `playwright-core`
- `sparticuz.args` provides serverless-compatible Chromium flags
- `sparticuz.executablePath()` extracts and returns the path to the bundled Chromium binary
- On Vercel, `@sparticuz/chromium` provides a ~50MB headless Chromium
- Locally, use your system browser path (e.g., Helium: `/home/omar/AppImages/squashfs-root/opt/helium/helium`)

### Browser Context Pattern (MUST STAY EXACTLY THIS)
```javascript
const context = await browser.newContext({ ... });
const page = await context.newPage();
```

**Why:** Creating a fresh context per request ensures clean cookies/session state. Do NOT reuse contexts across requests.

### Browser Close Pattern (MUST ALWAYS BE IN FINALLY)
```javascript
try {
  // ... scraping logic ...
} catch (e) {
  // ... error handling ...
} finally {
  await browser.close();
}
```

**Why:** Chromium can hang/timeout. Always close in `finally` to prevent resource leaks.

---

## 2. PITC Portal Flow (scrape.js)

### The Flow That Works
1. **Navigate** to `https://bill.pitc.com.pk/{disco}/` (e.g., `/gepcobill/`)
2. **Fill** `input[name="searchTextBox"]` with reference number
3. **Click** `input[name="btnSearch"]`
4. **Wait** for `networkidle` load state (POST redirects to `?refno=` URL)
5. **Wait** 5 seconds for loading animation + AJAX bill fetch
6. **Extract** `document.body.innerText`

### Why NOT Raw HTTP Requests
The PITC portal uses:
- ASP.NET ViewState tokens (expire per session)
- Form POST that returns a 302 redirect to `?refno=` URL
- JavaScript-loaded bill content (loading bar animation + AJAX)

Raw `fetch()` POST returns the form page (9292 bytes), NOT the bill. Only a real browser can execute the JavaScript that loads the bill data.

### Why 5-Second Wait is Needed
The portal shows "Your bill is loading..." with a progress bar for 2-4 seconds while JavaScript fetches the bill data. Without the wait, the page text will only contain the loading message, not the bill.

---

## 3. DISCO Fallback Logic (scrape.js)

### The Flow
1. If user selects a DISCO, try that DISCO first
2. If that fails, try ALL PITC DISCOs in order: LESCO, MEPCO, FESCO, GEPCO, IESCO, PESCO, HESCO, SEPCO, QESCO, TESCO
3. Throw error only if ALL DISCOs fail

### Why This is Needed
Reference number prefix mapping (first 3 digits) is **incomplete**. The `detectDisco` function in `disco.js` cannot reliably identify DISCO from reference alone. The server-side lookup is the only reliable method.

---

## 4. Theme Toggle Hydration Fix

### The Pattern
```javascript
// layout.js
<html lang="en" suppressHydrationWarning>

// ThemeToggle.jsx
const [dark, setDark] = useState(false); // Always false for SSR

useEffect(() => {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = stored === "dark" || (!stored && prefersDark);
  setDark(isDark);
  document.documentElement.classList.toggle("dark", isDark);
}, []);

return (
  <span suppressHydrationWarning>
    {dark ? <Sun /> : <Moon />}
  </span>
);
```

### Why This Pattern
- Server renders `false` (Moon icon) consistently
- Client updates to actual value in `useEffect`
- `suppressHydrationWarning` prevents React hydration mismatch errors
- Do NOT use inline `<script>` in `<head>` — Next.js App Router does not support it

---

## 5. Bill Text Parsing (parseBillText)

### Regex Patterns That Work
These patterns match the actual PITC portal bill text format:

| Field | Pattern |
|-------|---------|
| Name | `/NAME\s*&\s*ADDRESS\s*\n([^\n]+)/i` |
| Month | `/BILL MONTH\s*.*?\n\s*([A-Z]{3}\s*\d{2})/i` |
| Due Date | `/DUE DATE\s*.*?\n\s*(\d{2}\s+[A-Z]{3}\s+\d{2})/i` |
| Units | `/UNITS\s+(\d+)/i` |
| Within Due | `/PAYABLE WITHIN DUE DATE\s*\n?\s*(\d[\d,]*)/i` |
| After Due | `/PAYABLE AFTER DUE DATE\s*\n?\s*(\d[\d,]*)/i` |
| Consumer ID | `/CONSUMER ID\s*\n\s*(\d+)/i` |

### Why Text-Based Parsing
The browser extracts `document.body.innerText`, which is plain text with newlines. The patterns above match the human-readable format, NOT HTML. Do NOT revert to HTML regex parsing.

---

## 6. Package Dependencies

### Critical Dependencies (DO NOT REMOVE)
- `@sparticuz/chromium` — Provides headless Chromium for Vercel serverless
- `playwright-core` — Provides `chromium` browser launcher (NOT `playwright`)
- `next` — Framework
- `react` / `react-dom` — UI

### Dev Dependencies (DO NOT REMOVE)
- `tailwindcss` — Styling
- `@tailwindcss/postcss` — PostCSS integration

---

## 7. Local Development Setup

### Chromium Binary Path (Local)
```
/home/omar/AppImages/squashfs-root/opt/helium/helium
```

This is the extracted Helium browser (Chromium-based). If this path changes, update `localBrowserPath` in `scrape.js` line ~37.

To re-extract Helium:
```bash
cd /home/omar/AppImages
./helium.appimage --appimage-extract
```

---

## 8. Vercel Deployment Notes

- `@sparticuz/chromium` adds ~50MB to deployment size
- First request may be slow (cold start + Chromium extraction)
- Subsequent requests reuse the extracted binary
- The `VERCEL` environment variable is auto-set by Vercel
- Chromium requires 512MB+ RAM; 1600MB recommended

---

## Last Updated
2026-03-27
