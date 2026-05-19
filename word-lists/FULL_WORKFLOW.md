# Word lists and clipart — complete guide

This is the **only guide you need** for updating words from Google Sheets, generating clipart, and checking what is still missing.

**You do not need to know how to code.** You will copy short commands into Cursor’s terminal and press Enter.

---

## What these files are for

| File or folder | What it does |
|----------------|--------------|
| [Google Sheet](https://docs.google.com/spreadsheets/d/169UhNunHHP75-5hwpPOBCGd-a1NJTG7eHr8EGZuEZ7M/edit?usp=sharing) | Where you edit word sets |
| `word-lists/word-sets.json` | Master word list — **all games** read this file |
| `word-images/_library/` | **Only place games load clipart from** — one PNG per word (e.g. `can.png`) |
| `folder` in Google Sheet | **Menu group key** (not a Finder folder). Keeps sets organized in game menus. |
| `tools/missing-library-words.csv` | Report of words that still need a picture in `_library/` |
| `tools/image-prompts.xlsx` | Your custom prompts for **OpenAI** batch generation (optional) |

**Important:** The JSON file is named **`word-sets.json`**, not `word-lists.json`. It lives in the **`word-lists`** folder.

---

## How to open the terminal in Cursor

You will use the terminal for several steps.

1. At the top of Cursor, click **Terminal**.
2. Click **New Terminal**.
3. A panel opens at the bottom with a blinking cursor. That is where you type commands.
4. After each command, press **Enter**.

**Path to this project** (change it if your Beehive folder is somewhere else, e.g. Desktop):

```text
cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games"
```

Run that line whenever a step says “go to the project folder.”

---

# Part 1 — Update `word-sets.json` from Google Sheets

Do this whenever you add or change words in the spreadsheet.

### Step 1.1 — Edit the spreadsheet

Open your master sheet:

**https://docs.google.com/spreadsheets/d/169UhNunHHP75-5hwpPOBCGd-a1NJTG7eHr8EGZuEZ7M/edit?usp=sharing**

Add or change words there. The **`folder`** row must match the folder name under `word-images/` **exactly** (including colons and spaces).

### Step 1.2 — Download a CSV

In Google Sheets:

1. **File → Download → Comma-separated values (.csv)**
2. Save the file somewhere you can find it (Downloads is fine).

### Step 1.3 — Convert CSV to JSON

1. Open **`tools/word-list-tool.html`** in your browser (double-click it in Finder, or drag it into Chrome).
2. Either **paste** the CSV into the box, or click to **upload** the file you downloaded.
3. Click **Download word-sets.json**.
4. In Cursor’s file list, go to **`word-lists`** and **replace** the existing **`word-sets.json`** with the file you just downloaded (same name, same folder).

### Step 1.4 — (Optional) Put the games online

If you use GitHub Pages, commit and push so the live games pick up the new list. If you only play locally, saving the JSON file is enough.

**Done.** Every game that uses the central list (Sound Ninjas, Candy Mountain, Butterfly Finder, Donut Detective, Itchy Dragon T/K, Dragon Eggs F vs TH) will use the new words.

---

# Part 2 — See which words still need clipart

After you update `word-sets.json`, run this **from the project folder** (see “How to open the terminal” above).

```text
cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games"
python3 tools/list_missing_library_words.py --no-xlsx-compare
```

**What you get:**

- **`tools/missing-library-words.csv`** — open in Excel or Google Sheets; columns: `word`, `example_folder`
- **`tools/missing-library-words.txt`** — same list, one word per line

This means: the word is in `word-sets.json` but there is **no** matching `word-images/_library/{word}.png` yet.

Run Part 2 again after you generate images to confirm the list shrinks (ideally to zero).

---

# Part 3 — Generate clipart

Pick **one** method (or use both for different batches). Both save to **`word-images/_library/`** and copy into each set folder that needs the word.

---

## Option A — OpenAI (paid, batch, uses your prompt sheet)

Best when you want consistent style and already maintain **`tools/image-prompts.xlsx`** with custom prompts. Yellow-highlighted rows in that spreadsheet are **skipped**.

### One-time setup (OpenAI)

1. Open the terminal and go to the project folder (command above).
2. Install helpers (only needed once):

   ```text
   pip3 install openai python-dotenv openpyxl
   ```

3. Create or edit a file named **`.env`** in the **project root** (`Speech-Therapy-Games`, same level as `word-lists` and `tools`). Add one line (use your real key):

   ```text
   OPENAI_API_KEY=sk-your-key-here
   ```

   No spaces around the `=`. Save the file. **Do not share this file or put it on the internet.**

### Prepare prompts (if needed)

| Situation | What to do |
|-----------|------------|
| You already use `tools/image-prompts.xlsx` | Edit that file; add rows for new words |
| You want auto-generated starter prompts for new words only | `python3 tools/generate_missing_prompt_sheet.py` → use `tools/missing-not-in-prompts-with-prompts.xlsx` |
| You want a simple CSV of all missing words | `python3 tools/export_image_prompts.py` → `tools/image-prompts.csv` |

### Generate images (OpenAI)

Always start from the **project folder**:

```text
cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games"
```

**Preview** (no API calls, no charge):

```text
python3 tools/batch_generate_openai.py --dry-run
```

**Generate** (uses `tools/image-prompts.xlsx` if it exists, otherwise `tools/image-prompts.csv`):

```text
python3 tools/batch_generate_openai.py
```

**Generate only from the auto-built sheet for new words:**

```text
python3 tools/batch_generate_openai.py --csv tools/missing-not-in-prompts-with-prompts.xlsx
```

The script waits about **12 seconds** between images to stay under rate limits. Skips words that already have a PNG in `_library/`. By default it saves to **`_library/` only** (not per-set folders). Add `--mirror-sets` only if you still want copies in old set folders.

When it finishes, run **Part 2** again to refresh `missing-library-words.csv`.

---

## Option B — Gemini (free tier, good for filling gaps)

Best when you want free bulk generation without editing a prompt spreadsheet first.

### One-time setup (Gemini)

1. Get a free API key: **https://aistudio.google.com/app/apikey** → Create API key → copy it (starts with `AIza...`).

2. Open the terminal. Go to the **`word-lists`** folder:

   ```text
   cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
   ```

3. Install the Gemini helper (only once):

   ```text
   pip3 install google-genai
   ```

   If that fails, try: `python3 -m pip install google-genai`

4. In the **`word-lists`** folder, create a file named **`.env`** (dot, then env). One line only:

   ```text
   GEMINI_API_KEY=AIzaYourKeyHere
   ```

   Save. Keep this file private.

**Note:** Gemini in the **browser** (gemini.google.com) and Gemini via the **API** (this script) have **separate** limits. You can hit “quota exceeded” in the script while the website still works. Check: https://ai.dev/rate-limit

### Generate images (Gemini)

```text
cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
```

**See what’s missing (no images created):**

```text
python3 generate_images_gemini.py --dry-run
```

**Create all missing images:**

```text
python3 generate_images_gemini.py
```

**Useful extras:**

| Goal | Command |
|------|---------|
| Only one set folder | `python3 generate_images_gemini.py --folder "T:K Minimal Pairs - Initial"` |
| Test with 5 images | `python3 generate_images_gemini.py --limit 5` |
| Slower (rate limits) | `python3 generate_images_gemini.py --delay 10` |
| Checklist for manual browser work | `python3 generate_images_gemini.py --list-for-browser` |

Images are saved to **`_library/`** only unless you pass `--mirror-sets`.

When it finishes, run **Part 2** again from the project folder.

### In games (after you pick a word set)

1. Choose **Minimal pairs** or **Single words** (then browse sets).
2. Pick how many words appear per challenge: **1, 2, or 3**.
3. Play — clipart loads from **`word-images/_library/`**.

---

# Part 4 — Quick checklist (every time you update the sheet)

1. Edit [Google Sheet](https://docs.google.com/spreadsheets/d/169UhNunHHP75-5hwpPOBCGd-a1NJTG7eHr8EGZuEZ7M/edit?usp=sharing) → download CSV → **`word-list-tool.html`** → save **`word-lists/word-sets.json`**
2. `python3 tools/list_missing_library_words.py --no-xlsx-compare` → open **`tools/missing-library-words.csv`**
3. Generate: **OpenAI** `python3 tools/batch_generate_openai.py` **or** **Gemini** `python3 generate_images_gemini.py` (from `word-lists/`)
4. Run step 2 again — confirm missing list is empty (or fix failures)

---

# Appendix A — Google Sheet / CSV format

The word list tool supports **two layouts**. Use whichever matches your sheet.

### Layout 1: Transposed (columns = sets)

**Rows** are field names; **each column** is one word set. The first cell in the first row must be **`setID`**.

| Row label (column A) | Example (column B) |
|----------------------|--------------------|
| setID | tk-k1 |
| setLabel | T/K Minimal Pairs - Initial K |
| prompt | Which word has the /k/ sound? |
| targetSound | k |
| contrastSound | t |
| folder | T:K Minimal Pairs - Initial |
| word1 | can |
| word2 | tan |
| word3 | cap |
| word4 | tap |
| … | … (word5, word6, … pairs are word1+word2, word3+word4, …) |

When you run out of columns, leave a **blank row**, repeat the row labels, and add more columns in a new block.

### Layout 2: One row per word pair

Header row, then one row per pair. Columns:

**setId, setLabel, prompt, targetSound, contrastSound, folder, word1, word2**

Example:

```csv
setId,setLabel,prompt,targetSound,contrastSound,folder,word1,word2
tk-k1,T/K Minimal Pairs - Initial K,Which word has the /k/ sound?,k,t,T:K Minimal Pairs - Initial,can,tan
```

See **`word-lists/word-sets-sample.csv`** for a longer example.

**Rules:**

- **`folder`** is a **menu group key** (not a Finder path).
- **`setType`**: `single` for word lists, `pairs` (or omit) for minimal pairs.
- Image files live in **`word-images/_library/{word}.png`** (special cases: `Ed.png`, `v.png`).

### Single-word sets

In transposed layout, add row **`setType`** = **`single`** and list words in `word1`, `word2`, …

| Words on screen in game | Prompt |
|-------------------------|--------|
| 1 | Your sheet `prompt` |
| 2 or 3 | **Make a sentence with the words!** |

---

# Appendix B — Other helpful tools

| Tool | Use |
|------|-----|
| `tools/find-missing-images.html` | Paste a word list; checks `_library/` in Chrome/Edge (**Find Missing Images.command**) |
| `python3 tools/mirror_library_to_sets.py` | Legacy: copy `_library/` into old per-set folders (optional) |
| `python3 tools/backfill_library.py` | Pull existing PNGs from set folders **into** `_library/` (recovery) |

---

# Appendix C — Advanced (optional)

### Build word lists from the lexicon script

If you use **`minimal_pair_lexicon.py`** instead of only the Google Sheet:

```text
cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
python3 build_word_lists.py
```

This updates `word-sets-generated.csv` and merges into `word-sets.json`.

### Regenerate `word-sets-index.json`

For games that browse sets by phonological process or phoneme:

```text
cd "/Users/Amelia/Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games"
node word-lists/build-index.js
```

Then commit the updated `word-lists/word-sets-index.json`.

---

# Troubleshooting

| Problem | What to try |
|---------|-------------|
| `command not found: python3` | Install Python 3, or try `python` instead of `python3` |
| `word-sets.json not found` | Complete Part 1; file must be in `word-lists/word-sets.json` |
| OpenAI: `OPENAI_API_KEY is not set` | Add key to **project root** `.env`, not only `word-lists/.env` |
| Gemini: quota / 429 | Wait an hour; `python3 generate_images_gemini.py --limit 5`; or use OpenAI for that batch |
| Images exist in a set folder but Part 2 still lists the word | Run `python3 tools/backfill_library.py`, or generate into `_library/` |
| Wrong folder in games | Check **`folder`** in the sheet matches `word-images/` exactly |

---

# Where images are saved

```
Speech-Therapy-Games/
  word-images/
    _library/          ← all clipart lives here (games load from here)
      can.png
      tan.png
      …
```

You do **not** need per-set folders under `word-images/` anymore. The `folder` column in your sheet is only for organizing menus.
