// ==UserScript==
// @name        JPDB Deck to frequency
// @namespace   https://github.com/MarvNC
// @match       https://jpdb.io/deck
// @match       https://jpdb.io/*/vocabulary-list
// @version     1.08
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @author      Marv
// @description Exports a JPDB deck to a Yomichan compatible frequency list.
// ==/UserScript==

let delayMs = 1200;

const kanaSymbol = '㋕';

const fileName = (deckname) => `[Freq] ${deckname}_${new Date().toISOString()}.zip`;

const buildUrl = (domain, paramSymbol, sort, offset) =>
  `${domain}${paramSymbol}sort_by=${sort}&offset=${offset}`;

const defaultSort = 'by-frequency-global';

const buttonHTML = /* html */ `
<div class="dropdown" style="margin-bottom: 1rem; display: flex; justify-content: flex-end;">
  <details>
    <summary style="padding: 0.5rem 1rem;">Export as frequency list</summary>
  </details>
</div>`;

// https://github.com/FooSoft/yomichan/blob/master/ext/data/schemas/dictionary-index-schema.json
const jsonIndex = (name, sort) => {
  return {
    title: name,
    format: 3,
    revision: `JPDB_${sort}_${new Date().toISOString()}`,
    author: 'jpdb, Marv',
    url: 'https://jpdb.io',
    description: 'Generated via userscript: https://github.com/MarvNC/jpdb-freq-list',
  };
};

const entriesPerPage = 50;

(async function () {
  const domain = document.URL.match(/.+jpdb.io\/.+(id=\d+|vocabulary-list)/)[0];
  if (!domain) return;
  let paramSymbol = '&';
  if (domain.includes('vocabulary-list')) {
    paramSymbol = '?';
  }

  const sort = document.URL.match(/sort_by=([\w\-]+)/);
  const sortOrder = sort ? sort[1] : defaultSort;

  const browseDeckElem = [...document.querySelectorAll('div')].find(
    (elem) => elem.innerText === 'Browse deck'
  );
  const deckName =
    browseDeckElem?.nextElementSibling?.innerText ?? document.querySelector('h4').innerText;

  const entriesAmountTextElem = [...document.querySelectorAll('p')].find(
    (elem) => elem.innerText.startsWith('Showing') && elem.innerText.endsWith('entries')
  );
  const entriesAmount = parseInt(entriesAmountTextElem.innerText.match(/from (\d+) entries/)[1]);

  console.log(`${deckName}
  ${entriesAmount} entries
  Sort order: ${sortOrder}`);

  const button = createElementFromHTML(buttonHTML);
  const buttonText = button.querySelector('summary');
  entriesAmountTextElem.parentNode.insertBefore(button, entriesAmountTextElem);

  let exporting = false;
  const termEntries = {};
  let currentFreq = 1;
  button.addEventListener('click', async () => {
    if (exporting) return;
    exporting = true;

    // prevent accidental closing tab
    window.addEventListener('beforeunload', (e) => {
      e.returnValue = 'Are you sure you want to stop exporting?';
    });

    for (let i = 0; i < entriesAmount; i += entriesPerPage) {
      let msRemaining = ((entriesAmount - i) / entriesPerPage) * delayMs;
      buttonText.innerHTML = `${deckName}: ${entriesAmount} entries<br>
      Sort: ${sortOrder}<br>
      Scraping page ${Math.floor(i / entriesPerPage) + 1} of ${Math.ceil(
        entriesAmount / entriesPerPage
      )}.<br>
      ${currentFreq} entries scraped.<br>
       <strong>${formatMs(msRemaining)}</strong> remaining.`;

      const url = buildUrl(domain, paramSymbol, sortOrder, i);
      const html = await getUrl(url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const entries = [...doc.querySelectorAll('.vocabulary-list .entry .vocabulary-spelling a')];

      for (const entry of entries) {
        const kanji = decodeURIComponent(entry.href).split('/')[5].replace('#a', '');
        const entryID = entry.href.split('/')[4];
        const isKana = !entry.querySelector('rt');
        const furi = [...entry.querySelectorAll('ruby')]
          .map((ruby) => {
            if (ruby.childElementCount > 0) {
              return ruby.firstElementChild.innerText;
            } else {
              return ruby.innerText;
            }
          })
          .join('');

        const termData = [kanji, furi, currentFreq];

        if (!termEntries[entryID]) {
          termEntries[entryID] = {};
        }
        if (isKana) {
          termEntries[entryID].kana = termData;
        } else {
          if (!termEntries[entryID].kanji) {
            termEntries[entryID].kanji = [];
          }
          termEntries[entryID].kanji.push(termData);
        }

        currentFreq++;
      }
    }

    buttonText.innerHTML = `Finished scraping ${currentFreq} entries, generating zip file.`;

    const freqList = [];

    // convert termEntries into array to export
    // https://github.com/FooSoft/yomichan/blob/master/ext/data/schemas/dictionary-term-meta-bank-v3-schema.json
    const termEntryData = (kanji, reading, freqValue, isKana = false) => [
      kanji,
      'freq',
      {
        reading: reading,
        frequency: {
          value: freqValue,
          displayValue: freqValue + (isKana ? kanaSymbol : ''),
        },
      },
    ];

    for (const entryID in termEntries) {
      const entry = termEntries[entryID];
      for (const kanji of entry.kanji) {
        freqList.push(termEntryData(kanji[0], kanji[1], kanji[2]));
        if (entry.kana) {
          freqList.push(termEntryData(kanji[0], kanji[1], entry.kana[2], true));
        }
      }
      if (entry.kana) {
        freqList.push(termEntryData(entry.kana[0], entry.kana[1], entry.kana[2]));
      }
    }

    buttonText.innerHTML = `Exporting as ${deckName}.zip<br>
    Sorted by ${sortOrder}`;

    console.log(`Scraped ${freqList.length} entries`);

    const zip = new JSZip();

    zip.file('index.json', JSON.stringify(jsonIndex(deckName, sortOrder)));
    zip.file('term_meta_bank_1.json', JSON.stringify(freqList));

    zip
      .generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9,
        },
      })
      .then(function (content) {
        saveAs(content, fileName(deckName));
      });
  });
})();

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

async function getUrl(url) {
  let response = await fetch(url);
  let waitMs = delayMs;
  await timer(waitMs);
  while (!response.ok) {
    response = await fetch(url);
    waitMs *= 2;
    delayMs *= 1.2;
    delayMs = Math.round(delayMs);
    console.log('Failed response, new wait:' + waitMs);
    await timer(waitMs);
  }
  return await response.text();
}

function timer(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// seconds to HH:MM:SS
function formatMs(ms) {
  return new Date(ms).toISOString().substr(11, 8);
}
