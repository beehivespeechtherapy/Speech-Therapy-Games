# Set up bulk image generation with Gemini (no coding required)

This guide gets **Cursor + Gemini** working so you can generate many word images in one go instead of one by one. You’ll do a few one-time setup steps, then run one command whenever you want to fill in missing images.

**If steps 2–4 feel confusing,** see **SIMPLE_STEPS.md** in this same folder for a shorter, step-by-step version with “click here, type this” instructions.

---

## Why “quota exceeded” when I can still use Gemini in the browser?

The **script uses the Gemini API** (with your API key). The **website** (gemini.google.com) is a different product. They have **separate quotas**:

- **Browser:** Your normal Gemini usage in the browser has its own limits.
- **API (script):** Developers get a separate, smaller free allowance (requests per minute and per day) for the API. Image generation in the API often has stricter or different limits than the website.

So you can have “quota left” in the browser and still hit “quota exceeded” when the script calls the API. To see or manage API usage, go to: https://ai.dev/rate-limit (and your Google Cloud / AI Studio project if you use one).

---

## Where are the generated images saved?

The script saves every image here:

**Beehive Speech Therapy → Games → Word Images**

Inside that folder, each **minimal-pair set** has its own folder (e.g. **T:K Minimal Pairs - Initial**). Each word’s image is saved as **word.png** in the right set folder (e.g. `can.png`, `tan.png` in **T:K Minimal Pairs - Initial**).

When you run the script, it also prints the full path, for example:  
`Images are saved to: /Users/Amelia/Documents/Beehive Speech Therapy/Games/Word Images`

So that’s the same **Word Images** folder you’ve been using; the script adds new `.png` files into the existing set folders.

---

## What you need

1. **A Google account** (for the free Gemini API key)  
2. **Cursor** (you already have this)  
3. **About 10 minutes** for the one-time setup  

---

## Step 1: Get a Gemini API key (free)

1. Open your web browser and go to:  
   **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account if asked.
3. Click **“Create API key”** (or “Get API key”).
4. Choose “Create API key in new project” (or pick an existing project).
5. **Copy the key** (it starts with `AIza...`).  
   - Store it somewhere safe (e.g. a Notes app).  
   - **Don’t share it** or put it in a public place.

You’ll use this key in Step 3 so the script can talk to Gemini for you.

---

## Step 2: Install the Gemini tool (one time)

You need to install the small “connector” that lets your computer call Gemini. In Cursor:

1. **Open the terminal**  
   - Menu: **Terminal → New Terminal**  
   - Or shortcut: **Ctrl+`** (Control + backtick) or **Cmd+`** on Mac.
2. **Go to the word-lists folder**  
   Type this and press Enter (use your real path if it’s different):

   ```text
   cd "Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
   ```

   If your **Beehive Speech Therapy** folder is somewhere else (e.g. Desktop), change the path:

   ```text
   cd "Desktop/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
   ```

3. **Install the Gemini package**  
   Type this and press Enter:

   ```text
   pip3 install google-genai
   ```

   Wait until it says “Successfully installed …”. If you see a “not found” error, try:

   ```text
   python3 -m pip install google-genai
   ```

After this, you usually don’t need to run Step 2 again.

---

## Step 3: Tell the script your API key (one time)

The script needs your API key so it can use Gemini. You do this once.

**Option A – Using a small file (recommended)**

1. In Cursor’s file list, go to:  
   **Beehive Speech Therapy → Games → Speech-Therapy-Games → word-lists**
2. **Create a new file** in that folder named exactly: **`.env`**
   - If right‑clicking the folder doesn’t show “New File”, use **File → New File**, then **Save As** and choose the **word-lists** folder and name the file **.env**.
   - Or open the terminal, `cd` to **word-lists**, and run:  
     `echo GEMINI_API_KEY=your_key_here > .env`  
     (replace `your_key_here` with your real key, no spaces around `=`).
3. Open `.env` and type this on the first line (paste **your** key where it says YOUR_KEY_HERE):

   ```text
   GEMINI_API_KEY=YOUR_KEY_HERE
   ```

   Example (fake key):

   ```text
   GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. Save the file.  
   The script will read this file automatically. **Keep `.env` private** (don’t put it on the internet or in shared folders).

**Option B – Using the terminal (same computer, current session only)**

In the same terminal where you’ll run the script, type (paste your real key):

- **Mac/Linux:**

  ```text
  export GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

- **Windows (Command Prompt):**

  ```text
  set GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

You’ll need to do this again each time you open a new terminal, so Option A is easier long term.

---

## Step 4: Run the bulk image generator

Whenever you want to generate **all missing images** for the words in your word list:

1. **Open the terminal** in Cursor (Terminal → New Terminal).
2. **Go to word-lists** (same as in Step 2):

   ```text
   cd "Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
   ```

3. **Run the script:**

   ```text
   python3 generate_images_gemini.py
   ```

What happens:

- The script looks at your **word list** and your **Word Images** folders.
- For every word that **doesn’t** already have an image (e.g. `can.png`), it asks Gemini to create one and saves it in the right folder (e.g. **T:K Minimal Pairs - Initial**).
- It will print something like: `Saved: T:K Minimal Pairs - Initial/can.png` for each new image.
- It waits a short time between images so it doesn’t overload the API.

When it finishes, it will say how many images it generated. New images will be in:

**Beehive Speech Therapy → Games → Word Images → [folder name]**

---

## Useful options (same script, different commands)

You can add these to the same command if you want.

**Only see what’s missing (no images generated yet):**

```text
python3 generate_images_gemini.py --dry-run
```

**Only generate images for one folder** (e.g. “T:K Minimal Pairs - Initial”):

```text
python3 generate_images_gemini.py --folder "T:K Minimal Pairs - Initial"
```

**Generate only the first 5 missing images** (to test):

```text
python3 generate_images_gemini.py --limit 5
```

**Slower (if you hit rate limits):** add a longer delay between calls (e.g. 3 seconds):

```text
python3 generate_images_gemini.py --delay 3
```

---

## If something goes wrong

- **“word-sets.json not found”**  
  Run the word list builder first (see the main word-lists README), or make sure you’re in the **word-lists** folder when you run the script.

- **“Set GEMINI_API_KEY”**  
  The script didn’t find your key. Check that:
  - Your `.env` file is in the **word-lists** folder and has a line: `GEMINI_API_KEY=your_key`
  - Or you ran `export GEMINI_API_KEY=...` in the same terminal before `python3 generate_images_gemini.py`.

- **“Install the Gemini SDK: pip install google-genai”**  
  Run the install command from Step 2 again in the same folder.

- **“429” or “quota exceeded” or “limit: 0, model: gemini-2.0-flash-exp”**  
  **“limit: 0”** means that specific model has **no free-tier quota** (or none left). The script used to call `gemini-2.0-flash-exp-image-generation`, which often has 0 free requests. Try a model that has free image quota:
  ```bash
  python3 generate_images_gemini.py --model gemini-2.5-flash-preview-05-20
  ```
  If that still gives 429, try:
  ```bash
  python3 generate_images_gemini.py --model gemini-2.5-flash-image
  ```
  (Gemini 2.5 Flash Image is documented with a free tier of hundreds of images per day.)  
  Other options: wait an hour or try tomorrow; run with `--limit 5`; or use a longer `--delay 10`. Check usage: https://ai.dev/rate-limit

- **“image generation not available”**  
  Your API key or region might not have image generation enabled yet. You can still use Gemini in the browser and save images manually; the script just won’t be able to do it via the API.

- **Images in the wrong place**  
  The script expects **Word Images** to be next to **Speech-Therapy-Games**, e.g.:  
  `Beehive Speech Therapy/Games/Word Images`  
  and  
  `Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists`  
  If your folders are different, the script may need a small path change (someone with a bit of coding experience can adjust the path at the top of `generate_images_gemini.py`).

---

## Summary

1. **Get key:** https://aistudio.google.com/app/apikey → Create API key → copy it.  
2. **Install:** In Cursor’s terminal, `cd` to **word-lists**, then run `pip3 install google-genai`.  
3. **Save key:** In **word-lists**, create a file named `.env` with one line: `GEMINI_API_KEY=your_key`.  
4. **Generate:** In the same folder, run `python3 generate_images_gemini.py`.  

After that, Cursor is “talking” to Gemini for you: the script runs inside Cursor’s terminal and uses your key to call Gemini and save each image into the right folder in bulk.
