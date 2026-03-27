"use server";

import { DISCOS, detectDisco } from "@/lib/disco";
import sparticuz from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

const PITC_BASE = "https://bill.pitc.com.pk";

class FetchError extends Error {
  constructor(message, officialUrl) {
    super(message);
    this.officialUrl = officialUrl;
  }
}

// All PITC-based DISCOs (excluding KE which has its own API)
const PITC_DISCOS = ["LESCO", "MEPCO", "FESCO", "GEPCO", "IESCO", "PESCO", "HESCO", "SEPCO", "QESCO", "TESCO"];

export async function scrapeBill(reference, disco) {
  const code = disco || detectDisco(reference);

  // If we have a specific DISCO (manual or detected), try it first
  if (code === "KE") {
    return scrapeKElectric(reference, DISCOS["KE"]);
  }

  if (code && DISCOS[code]?.pitcEndpoint) {
    try {
      return await scrapePITC(reference, code, DISCOS[code]);
    } catch {
      // Fall through to try all DISCOs
    }
  }

  // Try all PITC DISCOs until we find the bill
  for (const tryCode of PITC_DISCOS) {
    try {
      return await scrapePITC(reference, tryCode, DISCOS[tryCode]);
    } catch {
      continue;
    }
  }

  throw new FetchError(
    `No bill found for reference "${reference}" on any DISCO. Please verify the number or check the official portal.`,
    "https://bill.pitc.com.pk",
  );
}

async function scrapePITC(reference, code, discoInfo) {
  const endpoint = discoInfo.pitcEndpoint;
  const baseUrl = `${PITC_BASE}/${endpoint}`;

  // Local dev: use Helium browser (Chromium-based). Vercel: use @sparticuz/chromium
  const isVercel = !!process.env.VERCEL;
  const localBrowserPath = "/home/omar/AppImages/squashfs-root/opt/helium/helium";
  const executablePath = isVercel
    ? await sparticuz.executablePath()
    : localBrowserPath;

  const browser = await playwrightChromium.launch({
    headless: true,
    args: isVercel
      ? sparticuz.args
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    executablePath,
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // Step 1: Navigate to the DISCO portal
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Step 2: Fill in reference and click Search
    await page.fill('input[name="searchTextBox"]', reference);
    await page.click('input[name="btnSearch"]');

    // Step 3: Wait for the bill page to load (redirect + loading animation)
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(5000);

    // Step 4: Extract the full page text
    const bodyText = await page.evaluate(() => document.body.innerText);

    if (!bodyText || bodyText.length < 100) {
      throw new FetchError(
        `No bill found for reference "${reference}" on ${discoInfo.name}. Please verify the number or check the official portal.`,
        discoInfo.officialUrl,
      );
    }

    return parseBillText(bodyText, code, discoInfo, reference);
  } catch (e) {
    if (e instanceof FetchError) throw e;
    throw new FetchError(
      `Failed to fetch bill: ${e.message}. Please check the official portal.`,
      discoInfo.officialUrl,
    );
  } finally {
    await browser.close();
  }
}

function parseBillText(text, code, discoInfo, reference) {
  const clean = (s) => s?.replace(/\s+/g, " ").trim() || "";

  // ── Consumer Name & Address ──────────────────────────────────────────────
  let consumerName = "N/A";
  let address = "N/A";

  const nameMatch = text.match(/NAME\s*&\s*ADDRESS\s*\n([^\n]+)/i);
  if (nameMatch) {
    consumerName = clean(nameMatch[1]);
    const nameIdx = text.indexOf(nameMatch[0]);
    const afterName = text.slice(nameIdx + nameMatch[0].length, nameIdx + 200);
    const addressLines = afterName
      .split("\n")
      .slice(0, 4)
      .map(clean)
      .filter((l) => l && !l.match(/^(Say No|آپکے)/i));
    if (addressLines.length > 0) {
      address = addressLines.join(", ");
    }
  }

  // ── Bill Month ──────────────────────────────────────────────────────────
  let month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const monthMatch = text.match(
    /BILL MONTH\s*.*?\n\s*([A-Z]{3}\s*\d{2})/i,
  );
  if (monthMatch) month = clean(monthMatch[1]);

  // ── Due Date ────────────────────────────────────────────────────────────
  let dueDate = nextMonthDate(15);
  const dueDateMatch = text.match(
    /DUE DATE\s*.*?\n\s*(\d{2}\s+[A-Z]{3}\s+\d{2})/i,
  );
  if (dueDateMatch) dueDate = normalizeDate(clean(dueDateMatch[1]));

  // ── Current Units ───────────────────────────────────────────────────────
  let currentUnits = 0;
  const unitsMatch = text.match(/UNITS\s+(\d+)/i);
  if (unitsMatch) currentUnits = parseInt(unitsMatch[1], 10);

  if (currentUnits === 0) {
    const unitsAlt = text.match(
      /PRESENT READING\s*\n[^\n]*\n[^\n]*\n\s*(\d+)/i,
    );
    if (unitsAlt) currentUnits = parseInt(unitsAlt[1], 10);
  }

  // ── Previous Units ─────────────────────────────────────────────────────
  let previousUnits = 0;
  const prevMatch = text.match(
    /PREVIOUS READING\s*\n[^\n]*\n\s*(\d+)/i,
  );
  if (prevMatch) previousUnits = parseInt(prevMatch[1], 10);

  // ── Payable Within Due Date ──────────────────────────────────────────────
  let withinDue = 0;
  const withinDueMatch = text.match(
    /PAYABLE WITHIN DUE DATE\s*\n?\s*(\d[\d,]*)/i,
  );
  if (withinDueMatch) {
    withinDue = parseFloat(withinDueMatch[1].replace(/,/g, "")) || 0;
  }

  // ── Payable After Due Date ──────────────────────────────────────────────
  let afterDue = 0;
  const afterDueMatch = text.match(
    /PAYABLE AFTER DUE DATE\s*\n?\s*(\d[\d,]*)/i,
  );
  if (afterDueMatch) {
    afterDue = parseFloat(afterDueMatch[1].replace(/,/g, "")) || 0;
  }
  if (afterDue === 0 && withinDue > 0) {
    afterDue = Math.round(withinDue * 1.04);
  }

  // ── Current Amount ──────────────────────────────────────────────────────
  const currentAmount = withinDue;

  // ── Consumer ID ─────────────────────────────────────────────────────────
  let consumerId = "";
  const consumerIdMatch = text.match(/CONSUMER ID\s*\n\s*(\d+)/i);
  if (consumerIdMatch) consumerId = consumerIdMatch[1];

  // ── Status ─────────────────────────────────────────────────────────────
  const isPaid = /\bPAID\b/i.test(text);

  // ── Consumption diff ────────────────────────────────────────────────────
  const diffPercent =
    previousUnits > 0
      ? Math.round(((currentUnits - previousUnits) / previousUnits) * 1000) / 10
      : 0;

  return {
    id: generateBillId(),
    fetchedAt: new Date().toISOString(),
    meta: {
      disco: code,
      discoName: discoInfo.name,
      consumerName,
      address,
      referenceNo: reference,
      consumerId,
    },
    billing: {
      month,
      currentAmount,
      payableWithinDue: withinDue,
      payableAfterDue: afterDue,
      dueDate,
      status: determineStatus(dueDate, isPaid),
    },
    consumption: { currentUnits, previousUnits, diffPercent },
    pdfUrl: null,
  };
}

async function scrapeKElectric(reference, discoInfo) {
  let response;
  try {
    response = await fetch(
      "https://www.ke.com.pk/api/customer/bill-inquiry",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify({ accountNumber: reference }),
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new FetchError(
      "Could not reach K-Electric. Please check the official portal.",
      discoInfo.officialUrl,
    );
  }

  if (!response.ok) {
    throw new FetchError(
      `K-Electric returned error (${response.status}). Please check the official portal.`,
      discoInfo.officialUrl,
    );
  }

  const data = await response.json().catch(() => null);

  if (!data || data.error || data.status === "error") {
    throw new FetchError(
      data?.message ||
        "Bill not found for this K-Electric account. Please verify at the official portal.",
      discoInfo.officialUrl,
    );
  }

  const currentAmount = parseFloat(data.amount ?? data.netPayable ?? 0);
  const currentUnits = parseInt(data.units ?? data.consumption ?? 0, 10);

  return {
    id: generateBillId(),
    fetchedAt: new Date().toISOString(),
    meta: {
      disco: "KE",
      discoName: "K-Electric",
      consumerName: data.consumerName ?? "N/A",
      address: data.address ?? "N/A",
      referenceNo: reference,
    },
    billing: {
      month:
        data.billMonth ??
        new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      currentAmount,
      payableWithinDue: currentAmount,
      payableAfterDue: data.amountAfterDue
        ? parseFloat(data.amountAfterDue)
        : Math.round(currentAmount * 1.1),
      dueDate: data.dueDate
        ? normalizeDate(data.dueDate)
        : nextMonthDate(15),
      status: determineStatus(data.dueDate ?? "", data.isPaid ?? false),
    },
    consumption: {
      currentUnits,
      previousUnits: data.previousUnits
        ? parseInt(data.previousUnits, 10)
        : 0,
      diffPercent: 0,
    },
    pdfUrl: data.billUrl ?? null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function determineStatus(dueDate, isPaid) {
  if (isPaid) return "Paid";
  try {
    if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
  } catch {
    /**/
  }
  return "Unpaid";
}

function normalizeDate(raw) {
  const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return raw;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function nextMonthDate(day) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, day)
    .toISOString()
    .split("T")[0];
}

function generateBillId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
