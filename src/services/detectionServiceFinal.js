// src/services/detectionService.js

import { scrapeDonaldson } from "../scrapers/donaldsonScraper.js";
import { scrapeFram } from "../scrapers/framScraper.js";
import { scrapeGenericOEM } from "../scrapers/genericScraper.js";

export async function detectProduct({ partNumber, brandHint }) {
  if (!partNumber) {
    throw new Error("partNumber is required");
  }

  let result = null;

  // === 1. DONALDSON HD (fuente autoritativa) ===
  if (brandHint === "DONALDSON") {
    result = await scrapeDonaldson(partNumber);
  }

  // === 2. FRAM LD (fuente autoritativa) ===
  if (!result && brandHint === "FRAM") {
    result = await scrapeFram(partNumber);
  }

  // === 3. OEM genérico (último recurso) ===
  if (!result) {
    result = await scrapeGenericOEM(partNumber);
  }

  // === VALIDACIÓN DURA ===
  if (!result || !result.source) {
    throw new Error(
      "Detection failed: no authoritative source found"
    );
  }

  return {
    source: result.source,
    duty: result.duty ?? null,
    family: result.family ?? null,
    raw: result
  };
}
