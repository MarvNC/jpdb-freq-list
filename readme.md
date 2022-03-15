# JPDB Frequency List

A frequency list generated using most of the jpdb corpus can be found in the [releases](https://github.com/MarvNC/jpdb-freq-list/releases). It is not exhaustive, as there is no deck available for the entire corpus and it does not include names. However it covers about 95% of the entries on JPDB and has over 34万 entries.

# JPDB Deck to Yomichan Frequency List Userscript

### [Install](https://github.com/MarvNC/jpdb-freq-list/raw/master/jpdb-freq-list.user.js)

This userscript generates frequency lists compatible with [Yomichan](https://foosoft.net/projects/yomichan/) using [jpdb](https://jpdb.io).

## Usage

![example image](./images/chrome_Deck_contents_–_jpdb_-_httpsjpdb.io_-_Google_C_2022-03-09_16-24-16.png)

Simply navigate to a jpdb deck's vocabulary page, and click on the button that says "Export as frequency list." The script will use the current frequency sort setting applied to the deck page.

## Result

The script will export a .zip file to be imported to Yomichan.

- Frequencies for hiragana versions of kanji dictionary entries will be marked by `㋕`. For example, if you hover 成る, you will see frequencies for both なる and 成る.
- Frequencies for terms that do not appear at all in jpdb's corpus will be marked with `❌`.
