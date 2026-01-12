/**
 * ELIMFILTERS TURBOSHIELD™ - Catálogo de Turbinas ET9
 */

const TURBINE_CATALOG = {
  "500FH": {
    model: "500FH",
    housing: { sku: "ET90500", description: "Housing Completo Sistema Turbina 500FH", racor_equivalent: "500FG / 500MA", flow_rate: "60 GPH (227 LPH)", type: "housing" },
    cartridges: [
      { sku: "ET92010S", micron_rating: 2, micron_suffix: "S", description: "Cartucho 2 Micrones - Filtración Final", racor_equivalent: "2010SM-OR", application: "Secondary/Final filtration", efficiency: "98% @ 2 micron", compatible_housing: "ET90500" },
      { sku: "ET92010T", micron_rating: 10, micron_suffix: "T", description: "Cartucho 10 Micrones - Filtración Estándar", racor_equivalent: "2010TM-OR", application: "Primary/Secondary filtration", efficiency: "98% @ 10 micron", compatible_housing: "ET90500" },
      { sku: "ET92010P", micron_rating: 30, micron_suffix: "P", description: "Cartucho 30 Micrones - Pre-Filtración", racor_equivalent: "2010PM-OR", application: "Primary filtration", efficiency: "98% @ 30 micron", compatible_housing: "ET90500" }
    ]
  },
  "900FH": {
    model: "900FH",
    housing: { sku: "ET90900", description: "Housing Completo Sistema Turbina 900FH", racor_equivalent: "900FG / 900MA", flow_rate: "90 GPH (341 LPH)", type: "housing" },
    cartridges: [
      { sku: "ET92040S", micron_rating: 2, micron_suffix: "S", description: "Cartucho 2 Micrones - Filtración Final", racor_equivalent: "2040SM-OR / 2040N-02", application: "Secondary/Final filtration", efficiency: "98% @ 2 micron", compatible_housing: "ET90900" },
      { sku: "ET92040T", micron_rating: 10, micron_suffix: "T", description: "Cartucho 10 Micrones - Filtración Estándar", racor_equivalent: "2040TM-OR / 2040N-10", application: "Primary/Secondary filtration", efficiency: "98% @ 10 micron", compatible_housing: "ET90900" },
      { sku: "ET92040P", micron_rating: 30, micron_suffix: "P", description: "Cartucho 30 Micrones - Pre-Filtración", racor_equivalent: "2040PM-OR / 2040N-30", application: "Primary filtration", efficiency: "98% @ 30 micron", compatible_housing: "ET90900" }
    ]
  },
  "1000FH": {
    model: "1000FH",
    housing: { sku: "ET91000", description: "Housing Completo Sistema Turbina 1000FH", racor_equivalent: "1000FG / 1000MA", flow_rate: "180 GPH (681 LPH)", type: "housing" },
    cartridges: [
      { sku: "ET92020S", micron_rating: 2, micron_suffix: "S", description: "Cartucho 2 Micrones - Filtración Final", racor_equivalent: "2020SM-OR / 2020N-02", application: "Secondary/Final filtration", efficiency: "98% @ 2 micron", compatible_housing: "ET91000" },
      { sku: "ET92020T", micron_rating: 10, micron_suffix: "T", description: "Cartucho 10 Micrones - Filtración Estándar", racor_equivalent: "2020TM-OR / 2020N-10", application: "Primary/Secondary filtration", efficiency: "98% @ 10 micron", compatible_housing: "ET91000" },
      { sku: "ET92020P", micron_rating: 30, micron_suffix: "P", description: "Cartucho 30 Micrones - Pre-Filtración", racor_equivalent: "2020PM-OR / 2020N-30", application: "Primary filtration", efficiency: "98% @ 30 micron", compatible_housing: "ET91000" }
    ]
  }
};

const SKU_INDEX = {
  "ET90500": { type: "housing", model: "500FH" }, "ET90900": { type: "housing", model: "900FH" }, "ET91000": { type: "housing", model: "1000FH" },
  "ET92010S": { type: "cartridge", model: "500FH", micron: 2 }, "ET92010T": { type: "cartridge", model: "500FH", micron: 10 }, "ET92010P": { type: "cartridge", model: "500FH", micron: 30 },
  "ET92040S": { type: "cartridge", model: "900FH", micron: 2 }, "ET92040T": { type: "cartridge", model: "900FH", micron: 10 }, "ET92040P": { type: "cartridge", model: "900FH", micron: 30 },
  "ET92020S": { type: "cartridge", model: "1000FH", micron: 2 }, "ET92020T": { type: "cartridge", model: "1000FH", micron: 10 }, "ET92020P": { type: "cartridge", model: "1000FH", micron: 30 }
};

const TURBINE_TECHNOLOGY = {
  brand: "ELIMFILTERS TURBOSHIELD™",
  media: "AQUABLOC®",
  stages: 3,
  water_separation: "99% efficiency",
  features: ["Filtración de tres etapas", "Media Aquabloc® corrugada", "Separación de agua 99%", "Compatible UL marino"]
};

module.exports = { TURBINE_CATALOG, SKU_INDEX, TURBINE_TECHNOLOGY };
