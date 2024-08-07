### Check out these other [Yomichan dictionaries](https://github.com/MarvNC/yomichan-dictionaries/)

# JPDB Frequency List

<!-- prettier-ignore -->
> [!WARNING]
> Kuuube has released a [more recent and better version of the JPDB frequency list](https://github.com/Kuuuube/yomitan-dictionaries?tab=readme-ov-file#jpdb-v21-frequency) that I recommend using instead.

### [Download](https://github.com/MarvNC/jpdb-freq-list/releases)

A frequency list generated using most of the [jpdb](https://jpdb.io/) corpus can be found in the [releases](https://github.com/MarvNC/jpdb-freq-list/releases). It is not exhaustive, as there is no default deck available for the entire corpus. However it covers about 96% of the top 20,000 entries on JPDB and has over 47 万 entries.

- Frequencies for hiragana versions of kanji dictionary entries will be marked by `㋕`. For example, if you hover 成る, you will see frequencies for both なる and 成る.
- Frequencies for terms that do not appear at all in jpdb's corpus will be marked with `❌`.

### Note

Due to the nature of how this list was generated, it can no longer be updated as jpdb now limits the total amount of entries that can be in a single deck.

If you want to merge multiple frequency lists, you could try adding the media decks to your account and then use [this site](https://kampffrosch94.github.io/jpdb-deck-manager/) to merge them, before creating a frequency list.

# JPDB Deck to Yomichan Frequency List Userscript

### [Install](https://github.com/MarvNC/jpdb-freq-list/raw/master/jpdb-freq-list.user.js)

This userscript generates frequency lists compatible with [Yomichan](https://foosoft.net/projects/yomichan/) using [jpdb](https://jpdb.io).

It is developed and tested on [Violentmonkey](https://violentmonkey.github.io/), which is the recommended way to run the script.

## Usage

![example image](./images/chrome_Deck_contents_–_jpdb_-_httpsjpdb.io_-_Google_C_2022-03-09_16-24-16.png)

Simply navigate to a jpdb deck's vocabulary page, and click on the button that says "Export as frequency list." The script will use the current frequency sort setting applied to the deck page, with the default sort setting being the frequency across the whole corpus.
