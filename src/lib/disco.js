export const DISCOS = {
  LESCO: { code: "LESCO", name: "Lahore Electric Supply Company",     digits: 14, pitcEndpoint: "lescobill",  officialUrl: "https://bill.pitc.com.pk/lescobill"  },
  MEPCO: { code: "MEPCO", name: "Multan Electric Power Company",      digits: 14, pitcEndpoint: "mepcobill",  officialUrl: "https://bill.pitc.com.pk/mepcobill"  },
  FESCO: { code: "FESCO", name: "Faisalabad Electric Supply Company", digits: 14, pitcEndpoint: "fescobill",  officialUrl: "https://bill.pitc.com.pk/fescobill"  },
  GEPCO: { code: "GEPCO", name: "Gujranwala Electric Power Company",  digits: 14, pitcEndpoint: "gepcobill",  officialUrl: "https://bill.pitc.com.pk/gepcobill"  },
  IESCO: { code: "IESCO", name: "Islamabad Electric Supply Company",  digits: 14, pitcEndpoint: "iescobill",  officialUrl: "https://bill.pitc.com.pk/iescobill"  },
  PESCO: { code: "PESCO", name: "Peshawar Electric Supply Company",   digits: 14, pitcEndpoint: "pescobill",  officialUrl: "https://bill.pitc.com.pk/pescobill"  },
  HESCO: { code: "HESCO", name: "Hyderabad Electric Supply Company",  digits: 14, pitcEndpoint: "hescobill",  officialUrl: "https://bill.pitc.com.pk/hescobill"  },
  SEPCO: { code: "SEPCO", name: "Sukkur Electric Power Company",      digits: 14, pitcEndpoint: "sepcobill",  officialUrl: "https://bill.pitc.com.pk/sepcobill"  },
  QESCO: { code: "QESCO", name: "Quetta Electric Supply Company",     digits: 14, pitcEndpoint: "qescobill",  officialUrl: "https://bill.pitc.com.pk/qescobill"  },
  TESCO: { code: "TESCO", name: "Tribal Electric Supply Company",     digits: 14, pitcEndpoint: "tescobill",  officialUrl: "https://bill.pitc.com.pk/tescobill"  },
  KE:    { code: "KE",    name: "K-Electric",                         digits: 13, pitcEndpoint: null,         officialUrl: "https://www.ke.com.pk/customer-services/bill-inquiry" },
};

// Reference number prefix → DISCO mapping
const PREFIX_MAP = {
  ...Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`${210 + i}`, "LESCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${310 + i}`, "MEPCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${410 + i}`, "FESCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${510 + i}`, "GEPCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${610 + i}`, "IESCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${710 + i}`, "PESCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${810 + i}`, "HESCO"])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${910 + i}`, "SEPCO"])),
  ...Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 10).padStart(3, "0"), "QESCO"])),
};

export function detectDisco(reference) {
  if (!reference) return null;
  const ref = reference.toUpperCase().trim();

  if (ref.startsWith("KE")) return "KE";

  if (ref.length >= 3) return PREFIX_MAP[ref.substring(0, 3)] ?? null;

  if (ref.length === 2) {
    const matches = [...new Set(
      Object.entries(PREFIX_MAP)
        .filter(([k]) => k.startsWith(ref))
        .map(([, v]) => v)
    )];
    return matches.length === 1 ? matches[0] : null;
  }

  return null;
}
