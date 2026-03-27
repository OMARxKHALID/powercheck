"use server";

import { DISCOS, detectDisco } from "@/lib/disco";

const PITC_BASE = "https://bill.pitc.com.pk";

// Account type sub-paths to try in order
const ACCOUNT_TYPES = [
  "general",
  "industrial",
  "agriculture",
  "commercial",
  "bulk",
  "residential",
];

class FetchError extends Error {
  constructor(message, officialUrl) {
    super(message);
    this.officialUrl = officialUrl;
  }
}

export async function scrapeBill(reference, disco) {
  const code = disco || detectDisco(reference);

  if (!code) {
    throw new Error(
      "Could not identify your DISCO. Please select it manually.",
    );
  }

  const discoInfo = DISCOS[code];
  if (!discoInfo) throw new Error(`Unknown DISCO code: ${code}`);

  return code === "KE"
    ? scrapeKElectric(reference, discoInfo)
    : scrapePITC(reference, code, discoInfo);
}

async function scrapePITC(reference, code, discoInfo) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: `${PITC_BASE}/${discoInfo.pitcEndpoint}`,
  };

  // The PITC portal uses GET requests with ?refno= at sub-path routes.
  // Try each account type sub-path until we get a valid bill response.
  for (const accountType of ACCOUNT_TYPES) {
    const url = `${PITC_BASE}/${discoInfo.pitcEndpoint}/${accountType}?refno=${encodeURIComponent(reference)}`;

    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      continue; // network error on this sub-path, try next
    }

    if (!response.ok) continue;

    const html = await response.text();

    // Skip clearly empty or error pages
    if (isEmptyResponse(html)) continue;

    // Got a valid HTML page with bill data
    const bill = parsePITCHtml(html, code, discoInfo, reference);

    if (bill.billing.currentAmount > 0 || bill.consumption.currentUnits > 0) {
      return bill;
    }
  }

  // All sub-paths failed — throw with official portal link
  throw new FetchError(
    `No bill found for reference "${reference}" on ${discoInfo.name}. Please verify the number or check the official portal.`,
    discoInfo.officialUrl,
  );
}

function isEmptyResponse(html) {
  if (!html || html.trim().length < 200) return true;
  const lower = html.toLowerCase();
  return (
    lower.includes("no record found") ||
    lower.includes("invalid reference") ||
    lower.includes("record not found") ||
    lower.includes("not found") ||
    lower.includes("error occurred")
  );
}

function parsePITCHtml(html, code, discoInfo, reference) {
  function text(patterns) {
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim().replace(/\s+/g, " ");
    }
    return "";
  }

  function amount(patterns) {
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) {
        const n = parseFloat(m[1].replace(/,/g, "").replace(/[^\d.]/g, ""));
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  }

  function integer(patterns) {
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) {
        const n = parseInt(m[1].replace(/,/g, ""), 10);
        if (!isNaN(n)) return n;
      }
    }
    return 0;
  }

  const consumerName = text([
    /Consumer\s*Name[^>]*>[^<]*<[^>]*>([^<]+)/i,
    /Name\s*:?\s*<\/td>\s*<td[^>]*>([^<]+)/i,
    /<td[^>]*>Consumer Name<\/td>\s*<td[^>]*>([^<]+)/i,
  ]);

  const address = text([
    /Address[^>]*>[^<]*<[^>]*>([^<]+)/i,
    /Address\s*:?\s*<\/td>\s*<td[^>]*>([^<]+)/i,
  ]);

  const month =
    text([
      /Bill\s*(?:Month|Period)[^>]*>[^<]*<[^>]*>([^<]+)/i,
      /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[^<,\d]*\d{4}/i,
    ]) ||
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const withinDue = amount([
    /Payable\s*(?:Within|Before)\s*Due\s*Date[^>]*>[^<]*<[^>]*>([\d,]+(?:\.\d{2})?)/i,
    /Within\s*Due\s*Date[^>]*>[^<]*<[^>]*>([\d,]+(?:\.\d{2})?)/i,
    /Net\s*Payable[^>]*>[^<]*<[^>]*>([\d,]+(?:\.\d{2})?)/i,
    /Amount\s*Payable[^>]*>[^<]*<[^>]*>([\d,]+(?:\.\d{2})?)/i,
    /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{2})?)/i,
  ]);

  const afterDue =
    amount([
      /Payable\s*After\s*Due\s*Date[^>]*>[^<]*<[^>]*>([\d,]+(?:\.\d{2})?)/i,
      /After\s*Due\s*Date[^>]*>[^<]*<[^>]*>([\d,]+(?:\.\d{2})?)/i,
    ]) || Math.round(withinDue * 1.1);

  const rawDue = text([
    /Due\s*Date[^>]*>[^<]*<[^>]*>(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Last\s*Date[^>]*>[^<]*<[^>]*>(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Due\s*Date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ]);

  const dueDate = rawDue ? normalizeDate(rawDue) : nextMonthDate(15);

  const currentUnits = integer([
    /Current\s*(?:Units|Reading)[^>]*>[^<]*<[^>]*>([\d,]+)/i,
    /Units\s*Consumed[^>]*>[^<]*<[^>]*>([\d,]+)/i,
    /Present\s*(?:Reading|Units)[^>]*>[^<]*<[^>]*>([\d,]+)/i,
  ]);

  const previousUnits = integer([
    /Previous\s*(?:Units|Reading)[^>]*>[^<]*<[^>]*>([\d,]+)/i,
    /Last\s*(?:Reading|Units)[^>]*>[^<]*<[^>]*>([\d,]+)/i,
  ]);

  const statusMatch = html.match(/Status[^>]*>[^<]*<[^>]*>([^<]*)/i);
  const isPaid = statusMatch
    ? /\bpaid\b/i.test(statusMatch[1]) && !/unpaid/i.test(statusMatch[1])
    : false;

  const pdfMatch = html.match(/href="([^"]+\.pdf[^"]*)"/i);
  const pdfUrl = pdfMatch
    ? pdfMatch[1].startsWith("http")
      ? pdfMatch[1]
      : `${PITC_BASE}/${pdfMatch[1]}`
    : null;

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
      consumerName: consumerName || "N/A",
      address: address || "N/A",
      referenceNo: reference,
    },
    billing: {
      month,
      currentAmount: withinDue,
      payableWithinDue: withinDue,
      payableAfterDue: afterDue,
      dueDate,
      status: determineStatus(dueDate, isPaid),
    },
    consumption: { currentUnits, previousUnits, diffPercent },
    pdfUrl,
  };
}

async function scrapeKElectric(reference, discoInfo) {
  let response;
  try {
    response = await fetch("https://www.ke.com.pk/api/customer/bill-inquiry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ accountNumber: reference }),
      signal: AbortSignal.timeout(15000),
    });
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
      dueDate: data.dueDate ? normalizeDate(data.dueDate) : nextMonthDate(15),
      status: determineStatus(data.dueDate ?? "", data.isPaid ?? false),
    },
    consumption: {
      currentUnits,
      previousUnits: data.previousUnits ? parseInt(data.previousUnits, 10) : 0,
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
