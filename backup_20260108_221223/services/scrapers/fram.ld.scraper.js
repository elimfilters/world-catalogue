const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function framLD(code) {
    const clean = code.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    const url = `https://www.fram.com/fram-extra-guard-oil-filter-spin-on-${clean}`;
    try {
        const { data: html } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = cheerio.load(html);

        const title = $("h1.product-name, h1").first().text().trim();
        const description = $(".product-description, .description").first().text().trim();
        let descriptionBullets = [];
        $(".product-features li, .features-list li").each((i, el) => {
            const t = $(el).text().trim();
            if (t) descriptionBullets.push(t);
        });
        const applicationsList = [];
        $("#applications li, .applications li").each((i, el) => {
            const t = $(el).text().trim();
            if (t) applicationsList.push(t);
        });
        const comparisonText = $("#comparison, .comparison").text().trim();
        const installationText = $("#installation, .installation").text().trim();

        return {
            skuBuscado: clean.toUpperCase(),
            idReal: clean.toUpperCase(),
            descripcion: description || title,
            title,
            descriptionBullets,
            applicationsList,
            comparisonText,
            installationText,
            urlFinal: url
        };
    } catch {
        return null;
    }
};
