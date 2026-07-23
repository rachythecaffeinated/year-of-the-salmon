# Backend setup — about 5 minutes

The tracker page stores everything in a Google Sheet you own. You do these steps
once; after that the page just works for everyone you send it to.

## 1. Make the sheet

1. Go to <https://sheets.new> — that creates a blank spreadsheet.
2. Name it something like **Year of the Salmon — log**.

You don't need to add any columns. The script creates the `entries` and `goals`
tabs with the right headers the first time it runs.

## 2. Add the script

1. In the sheet: **Extensions → Apps Script**. A new tab opens with a file
   called `Code.gs` containing a stub `myFunction`.
2. Select everything in that editor and delete it.
3. Paste in the entire contents of [`Code.gs`](Code.gs) from this folder.
4. Find this line near the top:

   ```js
   var PASSPHRASE = 'CHANGE-ME';
   ```

   Replace `CHANGE-ME` with the passphrase you want to give out with the link.
   Keep the quotes. Something like `'sockeye-run-2026'` — easy to type on a
   phone, since everyone will enter it once.

5. Click the save icon.

## 3. Deploy it as a web app

1. Top right: **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set:
   - **Description**: anything, e.g. `salmon v1`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
4. Click **Deploy**.
5. Google will ask you to authorize. Click through **Review permissions**, pick
   your account, then on the "Google hasn't verified this app" screen click
   **Advanced → Go to (your project name)**, then **Allow**.

   That warning is expected — it's your own script, and it's unverified only
   because it hasn't been through Google's public-app review.

6. Copy the **Web app URL**. It looks like:

   ```
   https://script.google.com/macros/s/AKfycb.....................­/exec
   ```

**Paste that URL back to Claude**, along with the passphrase you chose. That's
the only thing needed to finish the site.

## "Who has access: Anyone" — is that safe?

The URL is unguessable, and every request must carry the passphrase, so the
sheet isn't readable without both. "Anyone" here means the script doesn't demand
a Google login — which is what lets your family open the page without hassle.

The honest limit: anyone who has *both* the link and the passphrase can read and
write the whole log. That's the right level for a family challenge, but treat it
as semi-public — the log is not the place for anything genuinely private.

## Changing the passphrase later

Edit `PASSPHRASE` in the script, save, then **Deploy → Manage deployments →**
pencil icon **→ Version: New version → Deploy**. The URL stays the same. Anyone
using the old passphrase gets locked out until you tell them the new one.

## If you ever need to reset

Delete the rows in the `entries` or `goals` tab (keep row 1, the headers). The
page reads whatever is there next time it loads.
