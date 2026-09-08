# REELHOUSE — setup guide

Your site is 4 files:
- `index.html` — the page
- `style.css` — the look
- `app.js` — the logic (lock screen + catalog + player)
- `videos.json` — **your video list — edit this whenever you add a film**
- `apps-script-code.gs` — goes into Google, not into your website folder

Do the three sections below in order.

---

## 1. Set up the code list in Google Sheets

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet.
2. Rename the first tab to **`Codes`** (bottom-left tab name — must match exactly).
3. In column A, list your access codes, one per row: `123456`, `482910`, etc. No header row needed.
4. Open **Extensions → Apps Script**. Delete anything in the editor, then paste in the full contents of `apps-script-code.gs`.
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" → choose **Web app**.
   - Description: anything.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
6. Click **Deploy**. Google will ask you to authorize it — click through (it's your own script on your own sheet).
7. Copy the **Web app URL** it gives you (ends in `/exec`).

**To add or remove someone later:** just add or delete a row in the `Codes` sheet. No redeploying needed — takes effect immediately.

---

## 2. Wire the site to your sheet

Open `app.js`, find this line near the top:

```js
const CODE_CHECK_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
```

Replace the placeholder with the URL you copied in step 1.7. Save the file.

---

## 3. Add your videos

1. Upload your finished video to Playtube.
2. On Playtube, find the **Share → Embed** option for that video — it should give you an `<iframe>` code snippet with a `src="..."` URL inside it.
3. Open `videos.json` and copy that `src` URL into the matching video's `"embedUrl"` field.
4. Fill in the `title`, `description`, `poster` (a thumbnail image URL — you can grab a frame from your video or use any image), `year`, and `duration`.
5. Add or remove whole video entries or categories freely — it's just a list.

If you're not sure what Playtube's embed URL looks like yet, paste one here and I'll double check the `app.js` player code matches it exactly (some hosts need extra parameters for autoplay, etc.).

---

## 4. Put it online (free hosting)

Any static host works. Easiest option:

**Netlify (drag-and-drop, no account setup beyond signing in):**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the whole site folder (all 4 site files — not the `.gs` file) into the browser window.
3. You'll get a live URL in seconds. You can add a custom domain later for free too.

**Alternatives:** GitHub Pages, Cloudflare Pages, Vercel — all free, all work the same way for plain HTML/CSS/JS.

---

## How the lock screen works

- Someone visits the site → sees the PIN screen.
- They type a code → the browser asks your Google Sheet "is this valid?" → Sheet says yes/no.
- If yes, they're let in and stay logged in on that device for 12 hours (edit `SESSION_HOURS` in `app.js` to change that).
- You never touch code to add/remove someone — just edit the Sheet.

## Notes

- This blocks casual visitors, not a determined person with developer tools — there's no way to make a pure front-end site fully un-crackable without a real login/account backend. For a private catalog shared with friends/family, this is proportionate.
- Keep your Apps Script deployment set to "Anyone" access for the code-check to work, but nobody can read your code *list* from it — the endpoint only ever answers true/false.
