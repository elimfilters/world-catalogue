const masterScraper = require("./master.scraper");

module.exports = {
  scrape: (code) => masterScraper.scrape(code)
};
