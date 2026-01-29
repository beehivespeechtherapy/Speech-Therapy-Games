# Donut Detective

A speech therapy game for practicing the **G** sound. Players help a baker find lost ingredients by clicking donuts, completing word-discrimination tasks (G vs non-G), then putting the ingredients in a bowl to “make” donuts.

## Flow

1. **Intro** – Chef and message: “Welcome to my bakery! I’ve made so many donuts that I’ve lost track of some of my ingredients. Can you help me find them?”
2. **Donut grid** – 15 donuts in a 3×5 grid. Five ingredients (flour, water, oil, eggs, sugar) are randomly hidden under five donuts.
3. **Finding ingredients** – Click a donut that has an ingredient → discrimination task: “Which word has the G sound?” (10 word pairs). Correct answer → that donut disappears. Find all 5 ingredients to continue.
4. **Bowl phase** – Bowl and the 5 found ingredients. Message: “Let’s make some donuts! Put the ingredients in the bowl!” Click an ingredient → discrimination task (5 word pairs). Correct → ingredient animates into the bowl. When all 5 are in the bowl → victory.
5. **Victory** – Finished donut image, message “You did it! Your donuts look delicious”, celebratory music, and **Play again** button.

## Word pairs

- **Finding phase (10 pairs):** mug/mud, bug/bud, bag/bad, egg/Ed, leg/lead, dig/did, beg/bed, rag/rad, hag/had, tag/tad.
- **Bowl phase (5 pairs):** mug/mud, bug/bud, bag/bad, egg/Ed, leg/lead.

## Adding your own images

See **`assets/README.md`** for the list of images to add (chef, 15 donuts, 5 ingredients, bowl, finished donut) and where to put them. Use your own clipart to avoid copyright issues.

## Running locally

Open `index.html` in a browser, or serve the repo with a local server (e.g. `npx serve .`) and go to `games/donut-detective/index.html`. If config fails to load over `file://`, the game falls back to built-in config.
