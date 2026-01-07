const descriptions = require("../config/product-descriptions.json");

class DescriptionService {
  /**
   * Obtiene descripción completa para un SKU ELIMFILTERS
   */
  getDescription(sku, variant = "STANDARD") {
    const prefix = sku.substring(0, 3);
    const prefixData = descriptions.descriptions_by_prefix[prefix];
    
    if (!prefixData) {
      return this.getGenericDescription(prefix);
    }
    
    // Si tiene TRILOGY, devolver descripción específica de variante
    if (prefixData.trilogy && prefixData.trilogy[variant]) {
      return {
        ...prefixData,
        variant_details: prefixData.trilogy[variant],
        prefix: prefix,
        sku: sku
      };
    }
    
    // Si no tiene TRILOGY, devolver descripción general
    return {
      ...prefixData,
      prefix: prefix,
      sku: sku
    };
  }
  
  /**
   * Obtiene todas las descripciones de TRILOGY para un prefijo
   */
  getTrilogyDescriptions(prefix) {
    const prefixData = descriptions.descriptions_by_prefix[prefix];
    
    if (!prefixData || !prefixData.trilogy) {
      return null;
    }
    
    return {
      title: prefixData.title,
      hero_statement: prefixData.hero_statement,
      general_features: prefixData.general_features,
      trilogy: prefixData.trilogy
    };
  }
  
  /**
   * Enriquece un SKU con su descripción
   */
  enrichSKU(skuData) {
    const description = this.getDescription(skuData.sku, skuData.variant);
    
    return {
      ...skuData,
      product_description: {
        title: description.variant_details?.title || description.title,
        tagline: description.variant_details?.tagline || description.tagline,
        description: description.variant_details?.description || description.description,
        key_benefits: description.variant_details?.key_benefits || description.key_benefits,
        ideal_for: description.variant_details?.ideal_for || description.ideal_for,
        media: description.variant_details?.media || description.media,
        technology: description.technology || description.variant_details?.technology
      }
    };
  }
  
  /**
   * Descripción genérica para prefijos sin descripción específica
   */
  getGenericDescription(prefix) {
    return {
      prefix: prefix,
      title: `Filtros ELIMFILTERS ${prefix}`,
      description: "Filtro ELIMFILTERS de alta calidad diseñado para máximo rendimiento y protección.",
      key_benefits: [
        "Alta eficiencia de filtración",
        "Construcción robusta y duradera",
        "Cumple especificaciones OEM",
        "Disponibilidad garantizada"
      ]
    };
  }
}

module.exports = new DescriptionService();
