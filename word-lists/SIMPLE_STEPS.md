# The simple version: Steps 2, 3, and 4

After you have your API key from Step 1, here’s what to do next—in the simplest words possible.

---

## Step 2: Install the Gemini tool (one time)

**What this does:** It downloads a small helper so your computer can talk to Gemini. You only do this once.

**What you do:**

1. **Open the terminal in Cursor**
   - At the top of the screen, click **Terminal**.
   - Click **New Terminal**.
   - A box will open at the bottom of Cursor with a line of text and a blinking cursor. That’s where you type.

2. **Tell the computer which folder you’re in**
   - Click inside that bottom box (so your typing goes there).
   - Type exactly this (or use your own path if Beehive is somewhere else, like Desktop):
     ```
     cd "Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
     ```
   - Press **Enter**.
   - You might not see anything change—that’s okay. You’re now “in” the word-lists folder.

3. **Download the Gemini helper**
   - In that same box, type:
     ```
     pip3 install google-genai
     ```
   - Press **Enter**.
   - Wait. You’ll see a bunch of text. When it’s done, it usually says something like “Successfully installed google-genai”.
   - If it says “pip3” not found, try this instead and press Enter:
     ```
     python3 -m pip install google-genai
     ```

**Done with Step 2.** You don’t need to do this again unless you get a new computer or reinstall things.

---

## Step 3: Save your API key in a file (one time)

**What this does:** The image generator needs your Gemini key to run. You put the key in a tiny file so the script can read it. You only do this once (unless you get a new key).

**What you do:**

1. **Open your project in Cursor** so you can see the list of files on the left (the “file explorer”).

2. **Find the word-lists folder in that list**
   - Click the little arrows to expand folders until you see:  
     **Beehive Speech Therapy** → **Games** → **Speech-Therapy-Games** → **word-lists**
   - Click **word-lists** so that folder is selected (highlighted).

3. **Create a new file inside word-lists**

   Cursor doesn’t always show “New File” when you right‑click a folder. Use one of these ways:

   **Option A – From the menu**
   - Click **File** at the top of the screen.
   - Click **New File** (or **New Text File**).
   - A new tab opens. Press **Ctrl+S** (Windows) or **Cmd+S** (Mac) to save.
   - In the “Save as” window, go to the **word-lists** folder (Beehive Speech Therapy → Games → Speech-Therapy-Games → word-lists).
   - In the box where you type the file name, type: **.env**
   - Click Save.

   **Option B – From the file list**
   - Click the **word-lists** folder once so it’s selected (highlighted).
   - Look at the **top of the file list** (left side)—there’s often a **file icon with a plus** or a **“New File”** icon. Click that.
   - If a new file appears (e.g. “untitled”), type **.env** as the name and press Enter. If it asks where to save, choose the **word-lists** folder.

   **Option C – Using the terminal**
   - Open the terminal (Terminal → New Terminal).
   - Type: `cd "Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"` and press Enter (change the path if your folder is elsewhere).
   - Then type: `echo GEMINI_API_KEY=paste_your_key_here > .env`
   - Replace `paste_your_key_here` with your real API key (the one from Step 1). There are no spaces around the `=`.
   - Press Enter. That creates the file and puts the key in it. You can then open **.env** in Cursor and fix the key if you need to.

   Whichever option you use, the file must be named **exactly** **.env** (dot, then e-n-v) and must live **inside** the **word-lists** folder.

4. **Put your key in that file**
   - Click on **.env** to open it. The file will be empty (or almost empty).
   - Type this on the first line—but **replace** `paste_your_key_here` with the actual key you copied in Step 1 (the one that starts with AIza…):
     ```
     GEMINI_API_KEY=paste_your_key_here
     ```
   - Example (this is fake—use your own key):
     ```
     GEMINI_API_KEY=AIzaSyB1234567890abcdefghijklmnop
     ```
   - There should be **no spaces** around the `=`. Save the file (Ctrl+S or Cmd+S).

**Done with Step 3.** The script will look for this file and use the key inside it.

---

## Step 4: Run the image generator

**What this does:** This is the step where Cursor actually talks to Gemini and creates all the missing word images for you. You can run it whenever you want more images.

**What you do:**

1. **Open the terminal again** (if it’s closed: **Terminal** → **New Terminal**).

2. **Go to the word-lists folder again** (same as in Step 2)
   - In the terminal box, type:
     ```
     cd "Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"
     ```
   - Press **Enter**.

3. **Start the generator**
   - Type:
     ```
     python3 generate_images_gemini.py
     ```
   - Press **Enter**.

4. **Wait**
   - The script will print lines like “Saved: T:K Minimal Pairs - Initial/can.png” as it creates each image. When it’s finished, it will say how many images it made. Your new pictures will be in **Beehive Speech Therapy → Games → Word Images**, in the right folders.

**That’s it.** Next time you want to fill in more missing images, repeat only Step 4 (open terminal, `cd` to word-lists, run `python3 generate_images_gemini.py`).

---

## Quick recap

| Step | In one sentence |
|------|------------------|
| **2** | Open Cursor’s terminal, type `cd "Documents/Beehive Speech Therapy/Games/Speech-Therapy-Games/word-lists"` and press Enter, then type `pip3 install google-genai` and press Enter. |
| **3** | In the file list, right‑click the **word-lists** folder → New File → name it `.env` → open it and type `GEMINI_API_KEY=` then paste your key, then save. |
| **4** | Open terminal, type the same `cd` line as in Step 2 and press Enter, then type `python3 generate_images_gemini.py` and press Enter. |

---

## If you see “429” or “quota exceeded”

That means Google’s free tier limit is hit (only so many requests per minute and per day). The script will now **wait and retry** a few times. If it still stops:

- **Wait about an hour** and run the same command again.
- Or run **fewer images at a time**:  
  `python3 generate_images_gemini.py --limit 5`  
  Run that a few times over the day.
- Or **slow it down**:  
  `python3 generate_images_gemini.py --delay 10`

---

If any step doesn’t work (e.g. “command not found” or “file not found”), tell me exactly what you see and we can fix it.
