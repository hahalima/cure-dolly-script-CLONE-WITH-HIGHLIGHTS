**[Read from 1st lesson
](https://kellenok.github.io/cure-script/1-the-basic-types-of-sentences.html)**

# Intro

First and foremost, this project only exists because Mordraug and Nunko spent a lot of time transcribing all of Cure Dolly's videos and sharing them in [this Google Docs](https://docs.google.com/document/d/1XpuXerkGU8waJ4DPDNJA4bGeqOvM-csXjTe57iHARHc/). Many thanks to them!

For my part, [I (Kellen)](https://bento.me/kln) converted script to Markdown, changed the formatting slightly, and published it using Vitepress, which I find more convenient than Google Docs or PDF.

<img src="https://i.imgur.com/YOWRijj.png">

## What's changed

1. Changed the <u>underlined text</u> to **bold** due to personal preference.
2. All text in "quotes" became `highlighted` in color
3. Changed note type from *italic text* to speсial containers
4. I have added a very rough and imprecise grouping of lessons. This was only done to allow the list to be collapsed.
5. Merge line-by-line text into readable paragraph text

Something else may have broken during all the changes, but there shouldn't be any critical breaks.

## Why Highlights? I wanted custom highlights for concise reviewing

I added highlights so I can mark and review the main points while reading the Cure Dolly script. The goal is to collect key text and images and revisit them quickly from a dedicated review page.

## Highlights (local)

There is now a local highlights workflow for reviewing key parts of text and images:

1. Select text in a lesson to create a highlight (multi-paragraph selections supported).
2. Click an image, then use the "Highlight image" button to add a border highlight.
3. Click an existing highlight in a lesson to reveal a "Delete highlight" button.
4. Use the **Highlights** page to review items grouped by page, search, add optional notes, delete items, and export a JSON backup.
5. Use the Prev/Next highlight buttons in the outline area to jump between highlights on a page.

Highlights are stored in your browser's localStorage and only exist on your machine.

To ship a default set of highlights to everyone:

1. Create highlights locally and click **Export JSON** on the Highlights page.
2. Replace `config/docs/public/highlights.json` with the exported JSON contents.
3. Deploy the site. New visitors will load those defaults once, then their changes are saved in their own localStorage.

## Making a private copy (no fork badge)

If you want your own GitHub repo without the “forked from” label:

1. Create a new empty repo on GitHub (no README/license).
2. In your local clone, repoint the remotes:
   - `git remote rename origin upstream`
   - `git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git`
3. Push to your new repo: `git push -u origin main`

You can keep `upstream` if you want to pull updates from the original project later.

To pull updates from the original project (if you kept `upstream`):

1. Fetch latest changes: `git fetch upstream`
2. Merge into your main branch: `git merge upstream/main`
