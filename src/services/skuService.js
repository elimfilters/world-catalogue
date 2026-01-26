const ADN_TABLE = {
    'AIRE':        { prefix: 'EA1', tech: 'MACROCORE™',   adn: 'Aire 100% puro al motor.' },
    'CARCASAS':    { prefix: 'EA2', tech: 'INTEKCORE™',   adn: 'Estructura de flujo optimizado y máxima resistencia.' },
    'FUEL':        { prefix: 'EF9', tech: 'SYNTEPORE™',   adn: 'Armadura sintética, combustible 100% puro.' },
    'SEPARADOR':   { prefix: 'ES9', tech: 'AQUAGUARD™',   adn: 'Protección total contra la humedad y el agua.' },
    'LUBE':        { prefix: 'EL8', tech: 'SINTRAX™',     adn: 'Lubricación extrema para el sistema.' },
    'HIDRAULICO':  { prefix: 'EH6', tech: 'NANOFORCE™',   adn: 'Flujo optimizado para alta presión.' },
    'TURBINA':     { prefix: 'ET9', tech: 'AQUAGUARD™',   adn: 'Protección máxima y suavidad en el flujo.' },
    'COOLANT':     { prefix: 'EW7', tech: 'COOLTECH™',    adn: 'Control de corrosión y equilibrio térmico.' },
    'CABINA':      { prefix: 'EC1', tech: 'MICROKAPPA™',  adn: 'Protección contra alérgenos y aire puro.' },
    'DRYER':       { prefix: 'ED4', tech: 'DRYCORE™',     adn: 'Eliminación total de humedad en frenos.' },
    'DEF':         { prefix: 'ED3', tech: 'BLUECLEAN™',   adn: 'Pureza máxima para sistemas de urea.' },
    'GAS':         { prefix: 'EG3', tech: 'GASULTRA™',    adn: 'Filtración de precisión para motores a gas.' },
    'KITS_HD':     { prefix: 'EK5', tech: 'DURATECH™',    adn: 'Solución completa en una caja (Heavy Duty).' },
    'KITS_LD':     { prefix: 'EK3', tech: 'DURATECH™',    adn: 'Solución completa en una caja (Light Duty).' },
    'MARINO':      { prefix: 'EM9', tech: 'MARINECLEAN™', adn: 'Protección anticorrosiva y máxima pureza en mar abierto.' }
};

exports.getBrandInfo = (category) => {
    const key = category ? category.toUpperCase() : 'AIRE';
    return ADN_TABLE[key] || ADN_TABLE['AIRE'];
};

exports.generateElimSKU = (category, manufacturerCode) => {
    const info = this.getBrandInfo(category);
    const cleanCode = manufacturerCode.replace(/[^0-9]/g, '');
    const lastFour = cleanCode.length >= 4 ? cleanCode.slice(-4) : cleanCode.padStart(4, '0');
    return `${info.prefix}${lastFour}`;
};