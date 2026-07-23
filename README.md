# The Year of the Salmon

A shared tracker for a year-long challenge: from a near-zero start to five rungs
of the salmon ladder, 22 July 2026 → 22 July 2027.

Everyone in the challenge opens the same page, logs their days, and ticks off
milestones. All entries are shared — the board shows the whole group.

## What's here

| Path | What it is |
| --- | --- |
| [`index.html`](index.html) | The whole site. One file, no build step, no dependencies. |
| [`backend/Code.gs`](backend/Code.gs) | Google Apps Script that stores everything in a Google Sheet. |
| [`backend/SETUP.md`](backend/SETUP.md) | How to create the sheet and deploy the script. |
| `year-of-the-salmon.html` | Body-only copy used for publishing as a Claude artifact. |

## How it works

The page is static. Data lives in a Google Sheet, reached through an Apps Script
web app deployed as "anyone can access". Because Apps Script can't send CORS
headers, the page talks to it with JSONP.

A shared passphrase gates the board. It's checked server-side by the script, so
the passphrase isn't in this repo — but treat the board as semi-public: anyone
with both the link and the passphrase can read and write the whole log, and
entries aren't tied to a verified identity.

**This will not work as a Claude artifact.** Artifact pages run under a strict
Content Security Policy that blocks requests to external hosts, so the call to
`script.google.com` never leaves the page. It needs hosting that permits the
request — GitHub Pages, Netlify, or similar.

## The plan

Five tracks, 48 milestones, calibrated for someone starting from close to zero:

- **Base** — steps and lifting. Stands alone; plenty of people do only this.
- **Hang** — grip and connective tissue. Deliberately unhurried, because tendons
  adapt slower than muscle and rushing this is how the year gets lost to elbow
  tendinopathy.
- **Pull** — rows first and heavy, then negatives, then the first strict pull-up
  around day 210. Reps stop at five.
- **Explosive** — power rather than endurance, starting day 180 while strict work
  is still going.
- **Ladder** — the actual goal. Roughly four months on the skill, with five rungs
  landing day 350 so a bad fortnight doesn't cost the year.

Milestone dates assume about three sessions a week. Missing a week doesn't put
you behind — it moves everything right by a week.

## Changing things

Milestones, phases, and the step ramp are plain data near the top of the script
block in `index.html` (`PHASES`, `TRACKS`, `targetFor`). Edit and commit; Pages
redeploys on push.

If you change the passphrase, edit `PASSPHRASE` in the Apps Script and redeploy
as a **new version** — see [`backend/SETUP.md`](backend/SETUP.md). Returning
visitors are prompted for the new one automatically.
