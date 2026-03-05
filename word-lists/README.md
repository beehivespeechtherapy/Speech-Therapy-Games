# Word lists for speech therapy games

This folder is the **single source of truth** for word pair sets. Games (Sound Ninjas, Candy Mountain, Butterfly Finder, etc.) load from here so you don’t have to edit each game’s config when you add or change words.

## Building word lists from the lexicon (12+ pairs per set)

Word lists can be **generated** from the minimal-pair lexicon so every set has at least 12 pairs:

1. **Edit** `minimal_pair_lexicon.py` to add or change word pairs (key: `(sound_a, sound_b, position)`).
2. **Run**  
   `python3 build_word_lists.py`  
   from this folder. This produces:
   - `word-sets-generated.csv` (row-per-pair) and
   - merges new/expanded sets into `word-sets.json`.
3. If the script can’t write here (e.g. permissions), it may write to `~/speech-therapy-games/word-images/`; copy `word-sets-generated.csv` and `word-sets.json` back into this folder.
4. **Images:** Put one image per word in **Beehive Speech Therapy → Games → Word Images → {folder}**, e.g. `T:K Minimal Pairs - Initial/can.png`. See **IMAGE_GENERATION.md** for using Gemini, ChatGPT, or Cursor to generate clipart. Run `python3 list_words_for_images.py` to list all words (and optional missing list) for image generation.

## Workflow

1. **Edit your list** in Google Sheets (or any spreadsheet).
2. **Export as CSV** (File → Download → Comma-separated values).
3. **Run the Word List Tool** (`tools/word-list-tool.html`): paste the CSV or upload the file, then click **Download word-sets.json**.
4. **Save** the downloaded file as `word-lists/word-sets.json` in this repo (replace the existing file).
5. **Commit and push** to GitHub. All games that use word sets will automatically use the new list.

When you add new word images to a `word-images/` folder, add the matching rows to your sheet, export CSV, regenerate `word-sets.json`, and save it here. Every word in the CSV will be used in the games (they cycle through the list as needed).

## CSV format

The tool supports **two layouts**. Use whichever fits your sheet.

### Layout 1: Transposed (columns = sets) — good for many sets

**Rows** are the field names; **each column** (after the first) is one word set. First column = labels, rest = data.

| Row (first column) | Example value in col B | Description |
|--------------------|------------------------|-------------|
| setID              | tk-k1                  | Unique ID for this set. |
| setLabel           | T/K Minimal Pairs - Initial K | Label in the game. |
| prompt             | Which word has the /k/ sound?   | Question during the challenge. |
| targetSound        | k                      | Sound for the first word of each pair. |
| contrastSound      | t                      | Sound for the second word. |
| folder             | T:K Minimal Pairs - Initial | **Exact** `word-images/` folder name. |
| word1              | can                    | First word of pair 1. |
| word2              | tan                    | Second word of pair 1. |
| word3              | cap                    | First word of pair 2. |
| word4              | tap                    | Second word of pair 2. |
| …                  | …                      | Keep going: word5, word6, … word14, etc. Pairs are (word1,word2), (word3,word4), … |

- You can have as many columns as you need (e.g. A–Z = 26 sets). When you run out of columns, **start a new block below**: leave a blank row, then repeat the same row labels (setID, setLabel, prompt, … word1, word2, …) and add more columns. The tool will treat each block as more sets and merge them all into one `word-sets.json`.

### Layout 2: One row per word pair

One row per **word pair**. Use a header row. Columns: **setId, setLabel, prompt, targetSound, contrastSound, folder, word1, word2**. Rows with the same **setId** form one word set.

- **folder** must match the folder name under `word-images/` exactly.
- Image filenames are the word in lowercase plus `.png`, except special cases like `Ed.png` or `v.png`.

## Example (row-per-pair layout)

```csv
setId,setLabel,prompt,targetSound,contrastSound,folder,word1,word2
tk-k1,T/K Minimal Pairs - Initial K,Which word has the /k/ sound?,k,t,T:K Minimal Pairs - Initial,can,tan
tk-k1,T/K Minimal Pairs - Initial K,Which word has the /k/ sound?,k,t,T:K Minimal Pairs - Initial,cap,tap
```

See `word-lists/word-sets-sample.csv` for a fuller example. For **transposed** layout, the first row’s first cell must be `setID`; the next rows are setLabel, prompt, targetSound, contrastSound, folder, word1, word2, word3, …

## Word sets index (by process / by phoneme)

**word-sets-index.json** is built from `minimal_pairs_by_process.csv` so games can offer two ways to choose word pairs:

- **By phonological process** — e.g. Stopping, Backing, Cluster Reduction. The player picks a process, then a word set (e.g. T/K Initial).
- **By phoneme** — The player picks first sound, second sound, and position (Initial / Medial / Final), then sees matching word sets.

To regenerate the index after editing the CSV, run from the repo root:

```bash
node word-lists/build-index.js
```

Then commit the updated `word-lists/word-sets-index.json`. The CSVs live in `word-lists/` (copied from your `speech-therapy-games/word-images/` folder).

## Where games load from

**All games** that use word sets look for `word-lists/word-sets.json` when they start (Sound Ninjas, Candy Mountain, Butterfly Finder, Donut Detective, Itchy Dragon T/K, and Dragon Eggs F vs TH). If that file loads successfully, it **replaces** (or merges with) the word sets in the game, so one CSV → one JSON → every game stays in sync.
