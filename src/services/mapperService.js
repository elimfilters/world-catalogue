const skuServ = require('./skuService');

exports.mapToSheet = (raw, sku, duty, inputCode) => {
    const info = skuServ.getBrandInfo(raw.category);
    
    let cleanAlternatives = "N/A";
    if (raw.alternativeProducts && raw.alternativeProducts !== "N/A") {
        cleanAlternatives = raw.alternativeProducts.split('|').map(alt => {
            return skuServ.generateElimSKU(raw.category, alt.trim().split(' ')[0]);
        }).join(", ");
    }

    return {
        "Input Code": inputCode,
        "ELIMFILTERS SKU": sku,
        "Description": `Elimfilters® ${info.tech} for ${duty} applications.`,
        "Filter Type": info.tech,
        "Prefix": info.prefix,
        "ELIMFILTERS Technology": info.tech,
        "Duty": duty,
        "Alternative Products": cleanAlternatives,
        "ELIMFILTERS ADN": info.adn,
        "OEM Codes": raw.partNumber || inputCode
    };
};