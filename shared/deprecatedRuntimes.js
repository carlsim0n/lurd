/* eslint-disable no-shadow */

const axios = require('axios');
const cheerio = require('cheerio');
const hardcodedDeprecatedRuntimes = require('./deprecatedRuntimes.json');

async function scrape() {
  const url = 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html';
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html);
  let deprecatedRuntimes = [];

  try {
    $('table').each((_, tableElement) => {
      const tableTypeHeader = $(tableElement).find('th').eq(0).text();
      if (tableTypeHeader && tableTypeHeader.toLowerCase() === 'deprecated runtimes') {
        $(tableElement).find('tbody tr').each((_, tableRow) => {
          const cells = $(tableRow).find('td');
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
  const deprecatedRuntimes = scrapedDeprecatedRuntimes || hardcodedDeprecatedRuntimes;
  return deprecatedRuntimes;
}

module.exports = {
  get,
};
