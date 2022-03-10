### [Install](https://github.com/MarvNC/jpdb-freq-list/raw/master/jpdb-freq-list.user.js)

# JPDB Deck to Yomichan Frequency List Userscript

This userscript generates frequency lists compatible with Yomichan using [jpdb](https://jpdb.io).

## Usage

![example image](./images/chrome_Deck_contents_–_jpdb_-_httpsjpdb.io_-_Google_C_2022-03-09_16-24-16.png)

Simply navigate to a jpdb deck's vocabulary page, and click on the button that says "Export as frequency list." The script will use the current frequency sort setting applied to the deck page.

## Result

The script will export a .zip file to be imported to Yomichan.

- Frequencies for hiragana versions of kanji dictionary entries will be marked by `㋕`. For example, if you hover 成る, you will see frequencies for both なる and 成る.
- Frequencies for terms that do not appear in jpdb's corpus will be marked with `❌`.