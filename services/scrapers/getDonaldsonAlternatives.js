const puppeteer = require("puppeteer");

module.exports = async function getDonaldsonAlternatives(productUrl) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto(productUrl, { waitUntil: "networkidle2", timeout: 60000 });

        const altTabSelector = [
            "button[aria-controls*='alternateProducts']",
            "button[aria-controls*='crossReference']",
            "a[href*='#alternateProducts']"
        ];

        let foundTab = null;
        for (const selector of altTabSelector) {
            const exists = await page.$(selector);
            if (exists) {
                foundTab = selector;
                break;
            }
        }

        if (foundTab) {
            await page.click(foundTab);
            await page.waitForTimeout(1500);
        }

        const productItemSelector = ".product-info, .alternate-product-card, .item-alternate";
        const items = await page.$$eval(productItemSelector, elements => {
            return elements.map(el => {
                const codeEl = el.querySelector(".product-number, .prod-code, .name-code");
                const descEl = el.querySelector(".product-name, .prod-title, .name-description");
                const linkEl = el.querySelector("a");

                const codigo = codeEl?.innerText?.trim() || "";
                const descripcion = descEl?.innerText?.trim() || "";
                const url = linkEl ? linkEl.href : "";

                return { codigo, descripcion, url };
            }).filter(x => x.codigo);
        });

        return items;

    } catch (err) {
        console.error("❌ Error en getDonaldsonAlternatives:", err.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
};
