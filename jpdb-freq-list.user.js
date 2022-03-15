// ==UserScript==
// @name        JPDB Deck to frequency
// @namespace   https://github.com/MarvNC
// @match       https://jpdb.io/deck
// @match       https://jpdb.io/*/vocabulary-list*
// @version     1.18
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @author      Marv
// @description Exports a JPDB deck to a Yomichan compatible frequency list.
// ==/UserScript==

let delayMs = 1200;

const kanaSymbol = '㋕';
const unusedSymbol = '❌';
const hiraganaRegex = /^[\u3040-\u309F]+$/;

const isHiragana = (str) => hiraganaRegex.test(str);

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
    frequencyMode: 'rank-based',
    author: 'jpdb, Marv',
    url: 'https://jpdb.io',
    description: `Generated via userscript: https://github.com/MarvNC/jpdb-freq-list
    ${kanaSymbol} is used to indicate a frequency for a hiragana reading.
    ${unusedSymbol} is used to indicate that a term does not appear in the JPDB corpus.`,
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

  button.addEventListener('click', async () => {
    if (exporting) return;
    exporting = true;

    // prevent accidental closing tab
    window.addEventListener('beforeunload', (e) => {
      e.returnValue = 'Are you sure you want to stop exporting?';
    });

    // get terms
    const termEntries = {};
    const usedInURLsList = [];
    let currentFreq = 1;
    for (let i = 0; i < entriesAmount; i += entriesPerPage) {
      let msRemaining = ((entriesAmount - i) / entriesPerPage) * delayMs;
      buttonText.innerHTML = `${deckName}: ${entriesAmount} entries<br>
      Sort: ${sortOrder}<br>
      Scraping page ${Math.floor(i / entriesPerPage) + 1} of ${Math.ceil(
        entriesAmount / entriesPerPage
      )}.<br>
      ${currentFreq - 1} entries scraped.<br>
       <strong>${formatMs(msRemaining)}</strong> remaining.`;

      const url = buildUrl(domain, paramSymbol, sortOrder, i);
      const doc = await getUrl(url);
      const entries = [...doc.querySelectorAll('.vocabulary-list .entry .vocabulary-spelling a')];

      for (const entry of entries) {
        usedInURLsList.push(entry.href.replace('#a', '/used-in'));
        const kanji = decodeURIComponent(entry.href).split('/')[5].replace('#a', '');
        const entryID = entry.href.split('/')[4];
        const isKana = !entry.querySelector('rt') ? isHiragana(kanji) : false;
        const furi = [...entry.querySelectorAll('ruby')]
          .map((ruby) => {
            if (ruby.childElementCount > 0) {
              return ruby.firstElementChild.innerText;
            } else {
              return ruby.innerText;
            }
          })
          .join('');

        const termData = {
          reading: furi,
          freq: currentFreq,
          isKana: isKana,
        };

        if (!termEntries[entryID]) {
          termEntries[entryID] = {};
        }
        termEntries[entryID][kanji] = termData;

        currentFreq++;
      }
    }

    // check if unused, get first unused
    const isUnused = async (entryNumber) => {
      let doc = await getUrl(usedInURLsList[entryNumber - 1]);
      return [...doc.querySelectorAll('p')].some((elem) =>
        elem.innerText.includes('No matching entries were found.')
      );
    };
    buttonText.innerHTML = `Checking for unused entries.`;
    let firstUnused = 0;
    // premade vocab decks can't have unused entries
    if (document.URL.match('vocabulary-list') || !(await isUnused(entriesAmount))) {
      console.log('No unused entries.');
      firstUnused = entriesAmount;
    } else {
      let top = entriesAmount;
      while (top - firstUnused > 1) {
        const mid = Math.floor((top + firstUnused) / 2);
        buttonText.innerHTML = `Checking for unused: ${mid}`;
        console.log(mid);
        if (await isUnused(mid)) {
          top = mid;
        } else {
          firstUnused = mid;
        }
      }
    }
    firstUnused++;
    console.log(`First unused: ${firstUnused}`);

    buttonText.innerHTML = `Finished scraping ${currentFreq - 1} entries, generating zip file.<br>
    First unused entry: ${firstUnused}`;

    const freqList = [];

    // convert termEntries into array to export
    // https://github.com/FooSoft/yomichan/blob/master/ext/data/schemas/dictionary-term-meta-bank-v3-schema.json
    const termEntryData = (kanji, reading, freqValue, isKana = false) => {
      let unused = freqValue >= firstUnused;
      freqValue = Math.min(freqValue, firstUnused);
      return [
        kanji,
        'freq',
        {
          reading: reading,
          frequency: {
            value: freqValue,
            displayValue: freqValue + (isKana ? kanaSymbol : '') + (unused ? unusedSymbol : ''),
          },
        },
      ];
    };

    for (const entryID in termEntries) {
      const entry = termEntries[entryID];
      for (const kanji of Object.keys(entry)) {
        const termData = entry[kanji];
        freqList.push(termEntryData(kanji, termData.reading, termData.freq, termData.isKana));
        // if the entry isn't kana, and if the reading exists, and it's used
        if (
          kanji !== termData.reading &&
          entry[termData.reading] &&
          entry[termData.reading].freq < firstUnused
        ) {
          freqList.push(termEntryData(kanji, termData.reading, entry[termData.reading].freq, true));
        }
      }
    }

    freqList.sort((a, b) => {
      return a[2].frequency.value - b[2].frequency.value;
    });

    let exportFileName = fileName(deckName);

    buttonText.innerHTML = `Exporting as ${exportFileName}<br>
    Total entries: ${freqList.length}<br>
    Sorted by ${sortOrder}<br>
    First unused entry: ${firstUnused}`;

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
        saveAs(content, exportFileName);
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
  const parser = new DOMParser();
  return parser.parseFromString(await response.text(), 'text/html');
}

function timer(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// seconds to HH:MM:SS
function formatMs(ms) {
  return new Date(ms).toISOString().substr(11, 8);
}
