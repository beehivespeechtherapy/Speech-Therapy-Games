# Generating clipart for minimal-pair words

You want **at least 12 word pairs per set** and clipart for each word. Here are practical ways to get images, including using **Gemini** and **ChatGPT** from outside Cursor, and how **Cursor** can help.

## 1. Cursor (built-in image generation)

**Cursor can generate images** from text descriptions via the built-in image tool. You can ask in chat, for example:

- *“Generate a simple clipart image of a can (tin can) for a speech therapy game, friendly and clear.”*

The assistant can create one image at a time and save it (e.g. as `can.png`) in a folder you specify. This is best for **one-off or missing images**, not for batch-generating hundreds.

- **Pros:** No API key, works inside Cursor.  
- **Cons:** One image per request; you’d need to run many requests for full coverage.

---

## 2. Gemini (Google)

You’re already using **Gemini to generate clipart**. You can keep that workflow and scale it with a bit of structure.

### Manual workflow

1. From **word-sets.json** or **word-sets-generated.csv**, list the words for a folder (e.g. “T:K Minimal Pairs - Initial” → can, tan, cap, tap, …).
2. In Gemini, ask for **one image per word**, e.g.:  
   *“Generate simple, friendly clipart for the word ‘can’ (tin can), white/transparent background, suitable for a children’s speech game.”*
3. Download each image and save as `can.png`, `tan.png`, etc. in the matching **Word Images** folder (e.g. `T:K Minimal Pairs - Initial`).

### Bulk generation with Gemini (recommended)

A **ready-made script** lets Cursor “talk” to Gemini and generate all missing images in one run:

1. **One-time setup:** See **SETUP_GEMINI_IMAGES.md** in this folder. You’ll:
   - Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey),
   - Install the Gemini package (`pip3 install google-genai`),
   - Put your key in a `.env` file in this folder.
2. **Whenever you want to fill in missing images:** In Cursor’s terminal, from the `word-lists` folder, run:
   ```bash
   python3 generate_images_gemini.py
   ```
   The script reads your word list, finds words that don’t have an image yet, calls Gemini for each one, and saves the image in the correct **Word Images** subfolder. No coding required after setup.

---

## 3. ChatGPT / OpenAI (DALL·E)

**ChatGPT** (or **DALL·E** via API) can also generate clipart. Same idea as Gemini:

- **Manual:** Paste a list of words, ask for one image per word (or a grid), then download and rename to `word.png`.
- **Automated:** Use the **OpenAI API** (DALL·E) with a script that:
  - Reads your word list (from **word-sets.json** or CSV),
  - Calls the image API for each word with a prompt like: *“Simple, friendly clipart of [word], white background, for a children’s speech therapy game.”*
  - Saves as `{word}.png` in the right **Word Images** subfolder.

Again, Cursor can help you write the script; you run it locally and add your OpenAI API key (e.g. in env or a config file).

---

## 4. Script to collect “missing” words (for any tool)

To know **which images you still need**, you can use a small script that:

1. Reads **word-sets.json**.
2. For each set, looks at `folder` and `pairs`.
3. Lists every word that should have an image (e.g. `can`, `tan`, …).
4. Checks **Word Images/{folder}** and reports which `word.png` (or `word.jpg`) are missing.

You can then paste that list into Gemini or ChatGPT, or use it to drive an API script. The `tools/` folder can hold a small **Node or Python script** that does this; if you want, we can add it next.

---

## Summary

| Method | Best for | Link to Cursor? |
|--------|----------|------------------|
| **Cursor image tool** | Single images, fill-in gaps | Yes (ask in chat) |
| **Gemini (manual)** | Your current workflow | No; use Gemini in browser |
| **Gemini API script** | Batch images from word list | No; script uses your key |
| **ChatGPT / DALL·E** | Manual or batch images | No; use OpenAI key in script |

There is **no built-in “link” from Cursor to Gemini or ChatGPT**. You use Cursor to:

- Generate the **word lists** (CSV/JSON) and folder structure.
- Optionally **generate a few images** via the built-in tool.
- **Write scripts** that call Gemini or OpenAI with your API keys for batch image generation.

If you tell me your preference (e.g. “Python script for Gemini” or “list of missing words per folder”), I can outline or write that next.
