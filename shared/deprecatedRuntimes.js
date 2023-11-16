const axios = require('axios');
const cheerio = require('cheerio');
const hardcodedDeprecatedRuntimes = require("./deprecatedRuntimes.json");

async function scrape() {
  const url = 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html';
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);
  const deprecatedRuntimes = [];

  try {
    $('table').each((_, element) => {
      const tableTypeHeader = $(element).find('th').eq(0).text()
      if (tableTypeHeader && tableTypeHeader.toLowerCase() === 'deprecated runtimes') {
        const table = element;

        $(table).find('tbody tr').each((_, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 5) {
            const identifier = cells.eq(1).text().trim(); // Second column for "Identifier"
            deprecatedRuntimes.push(identifier);
          }
        });
      }
    });
  } catch (e) {
    deprecatedRuntimes = null;
  }
 
  return deprecatedRuntimes;
}

async function get() {
  const scrapedDeprecatedRuntimes = await scrape();
  const deprecatedRuntimes = scrapedDeprecatedRuntimes ? scrapedDeprecatedRuntimes : hardcodedDeprecatedRuntimes;
  return deprecatedRuntimes;
}

module.exports = {
  get
};