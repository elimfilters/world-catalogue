const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function framScraper(code) {
    const url = https://www.fram.com/fram-extra-guard-oil-filter-spin-on-;
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const title = h1.product-name.text().trim();
        const description = #description.text().trim() || .description.text().trim();
        const bullets = [];
        #description li, .description li.each((i, el) => {
            const val = .text().trim();
            if (val) bullets.push(val);
        });

        const applicationsText = #applications.text().trim() || .applications.text().trim();
        const applicationsList = [];
        #applications li, .applications li.each((i, el) => {
            const val = .text().trim();
            if (val) applicationsList.push(val);
        });

        const comparisonText = #comparison.text().trim() || .comparison.text().trim();
        const installationText = #installation.text().trim() || .installation.text().trim();

        return {
            skuBuscado: code,
            idReal: code,
            title,
            description,
            descriptionBullets: bullets,
            applicationsText,
            applicationsList,
            comparisonText,
            installationText,
            urlFinal: url,
            timestamp: new Date().toISOString(),
            v: "FRAM_SCRAPER_v1"
        };
    } catch (error) {
        console.error("❌ Error en FRAM scraper:", error.message);
        return { error: true, message: error.message };
    }
};
