// /src/utils/messages.js
const dict = {
    en: {
        INVALID_CODE:  q => `The code ${q} is invalid.`,
        UNKNOWN_EQUIVALENT: q => `The code ${q} has no verified equivalent.`,
        NO_SCRAPER_DATA: q => `No manufacturer data was found for ${q}.`,
        CREATED_FROM_OEM: q => `Generated from OEM code ${q}.`,
    },
    es: {
        INVALID_CODE:  q => `El código ${q} es inválido.`,
        UNKNOWN_EQUIVALENT: q => `El código ${q} no posee equivalente verificable.`,
        NO_SCRAPER_DATA: q => `No se encontraron datos del fabricante para ${q}.`,
        CREATED_FROM_OEM: q => `Generado desde el código OEM ${q}.`,
    }
};

function t(key, lang = "en", query) {
    return dict[lang]?.[key]?.(query) || dict["en"][key](query);
}

module.exports = { t };
