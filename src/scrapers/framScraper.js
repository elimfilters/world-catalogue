// src/scrapers/framScraper.js
// Scraper factual FRAM (LD)
// Rol: confirmar autoridad técnica y extraer facts publicados

const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeFram(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;

  // URL oficial FRAM (estructura puede variar)
  const url = `https://www.fram.com/parts/${encodeURIComponent(normalized)}`;

  let res;
  try {
    res = await axios.get(url, {
      timeout: 9000,
      headers: { "User-Agent": "ELIMFILTERS-BOT/1.0" }
    });
  } catch {
    return null; // sin fallback
  }

  if (!res || res.status !== 200 || !res.data) return null;

  const $ = cheerio.load(res.data);

  // -------------------------------
  // Confirmación dura de existencia
  // -------------------------------
  const title = $("h1, .product-title").first().text().trim().toUpperCase();
  if (!title || !title.includes(normalized)) {
    return null;
  }

  // -------------------------------
  // Extracción de FACTS explícitos
  // -------------------------------
  const facts = {
    categories: [],
    applications: [],
    standards: [],
    product_types: [],
    domain: ""
  };

  // Categoría / tipo publicado
  const category = $('[data-spec="category"], .product-category')
    .first()
    .text()
    .trim();
  if (category) facts.categories.push(category);

  // Tipo de producto
  const ptype = $('[data-spec="product-type"], .product-type')
    .first()
    .text()
    .trim();
  if (ptype) facts.product_types.push(ptype);

  // Aplicaciones (vehículos ligeros)
  $('[data-spec="application"], .applications li').each((_, el) => {
    const t = $(el).text().trim();
    if (t) facts.applications.push(t);
  });

  // Estándares (si existen)
  $('[data-spec="standard"], .standards li').each((_, el) => {
    const t = $(el).text().trim();
    if (t) facts.standards.push(t);
  });

  // Dominio explícito
  const domain = $('[data-spec="domain"], .product-domain')
    .first()
    .text()
    .trim();
  if (domain) facts.domain = domain;

  // Limpieza mínima
  facts.categories = [...new Set(facts.categories)];
  facts.applications = [...new Set(facts.applications)];
  facts.standards = [...new Set(facts.standards)];
  facts.product_types = [...new Set(facts.product_types)];

  const hasFacts =
    facts.categories.length ||
    facts.applications.length ||
    facts.product_types.length ||
    facts.domain;

  if (!hasFacts) return null;

  // -------------------------------
  // Salida contractual
  // -------------------------------
  return {
    confirmed: true,
    source: "FRAM",
    facts
  };
}

module.exports = {
  scrapeFram
};
