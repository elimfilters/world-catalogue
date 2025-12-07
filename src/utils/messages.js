// ============================================================================
// MESSAGES UTILITY - v5.0.0
// Standardized response messages
// ============================================================================

const MESSAGES = {
    en: {
        noEquivalent: 'No equivalent filter found in ELIMFILTERS catalog',
        invalidCode: 'Invalid filter code format',
        success: 'Filter found successfully',
        error: 'An error occurred while processing your request'
    },
    es: {
        noEquivalent: 'No se encontró filtro equivalente en el catálogo ELIMFILTERS',
        invalidCode: 'Formato de código de filtro inválido',
        success: 'Filtro encontrado exitosamente',
        error: 'Ocurrió un error al procesar su solicitud'
    }
};

/**
 * No equivalent found response
 * @param {string} query - The search query
 * @param {string} lang - Language code (en/es)
 * @returns {object} - Standardized error response
 */
function noEquivalentFound(query, lang = 'en') {
    const message = MESSAGES[lang]?.noEquivalent || MESSAGES.en.noEquivalent;

    return {
        status: 'NOT_FOUND',
        query,
        message,
        suggestions: [
            'Verify the part number is correct',
            'Try searching without special characters',
            'Contact ELIMFILTERS support for assistance'
        ]
    };
}

/**
 * Invalid code response
 * @param {string} query - The search query
 * @param {string} lang - Language code (en/es)
 * @returns {object} - Standardized error response
 */
function invalidCode(query, lang = 'en') {
    const message = MESSAGES[lang]?.invalidCode || MESSAGES.en.invalidCode;

    return {
        status: 'INVALID',
        query,
        message
    };
}

/**
 * Success response
 * @param {object} data - Response data
 * @param {string} lang - Language code (en/es)
 * @returns {object} - Standardized success response
 */
function success(data, lang = 'en') {
    const message = MESSAGES[lang]?.success || MESSAGES.en.success;

    return {
        status: 'OK',
        message,
        ...data
    };
}

/**
 * Error response
 * @param {string} error - Error message
 * @param {string} lang - Language code (en/es)
 * @returns {object} - Standardized error response
 */
function error(errorMsg, lang = 'en') {
    const message = MESSAGES[lang]?.error || MESSAGES.en.error;

    return {
        status: 'ERROR',
        message,
        details: errorMsg
    };
}

module.exports = {
    noEquivalentFound,
    invalidCode,
    success,
    error,
    MESSAGES
};
