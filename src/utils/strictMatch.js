// /src/utils/strictMatch.js
module.exports.strictMatch = function (input, scraped) {
    if (!input || !scraped) return false;

    const i = input.replace(/[^A-Z0-9]/g, '');
    const s = scraped.replace(/[^A-Z0-9]/g, '');

    // Solo aceptar si comparten núcleo numérico
    const numI = i.replace(/\D/g, '');
    const numS = s.replace(/\D/g, '');

    return numI === numS || i === s;
};
