# ECR Trial Links — Outlook add-in

An Outlook button that inserts personalized ECR Research trial links into a prospect
email. The prospect's email address is the access key, so each link logs them straight
into the platform/report. Same logic as the standalone Trial Link Builder, inside Outlook.

Hosted at: `https://peetbos2003-sudo.github.io/triallinks/`

---

## What the panel does

When composing an email, open the **ECR Trial Links** panel (compose ribbon → Apps / "…").

- **Prospect email** — type it, or click **Use recipient** to pull it from the To field.
- **Profiles** — one click pre-ticks a set of reports:
  - **Investment** → Global Financial Markets Outlook, Strategic + Tactical Asset Allocation
  - **Treasury** → Global Financial Markets Outlook, Interest Rates + Currencies Outlook
- **All / None** — tick or clear everything.
- **Insert selected links** — inserts the ticked reports as named links (11pt, ECR blue).
- **Insert full report overview** — inserts every report with its publication frequency and
  a short description (indented, fixed width). Ignores the ticks.
- **Insert selected + latest publication** — inserts the ticked reports with each report's
  latest publication title, date and author (indented from the left margin). Reads from
  `latest.json`, which the scheduled workflow keeps current. Available to all users.
- **Copy selected instead** — copies the selected links if you'd rather paste manually.

Everything starts unchecked on open.

---

## Files in this package

- `manifest.xml` — the add-in definition (what you load into Outlook). URLs already point at the host above.
- `taskpane.html` — permanent redirector, nothing else. Outlook caches this file hard, so it never changes; it bounces to `app.html?ts=<now>` so the real app is always fetched fresh. **Never edit this file.**
- `app.html` — the panel UI + all logic. **Edit this one** for all updates.
- `commands.html` — required init file.
- `latest.json` — the latest-publication data for the power-user button (see "Keeping latest.json fresh").
- `assets/` — button icons.

---

## Deploying an update (IMPORTANT — read this)

Updates only go live when the files on GitHub are replaced. The reliable way:

1. Always start from the **latest zip** (`ECR-Trial-Links-Outlook-Addin.zip`). Unzip it into a
   fresh folder. Do **not** upload from an old desktop copy — that's what causes "it reverted
   to an old version."
2. In the `triallinks` GitHub repo, upload the unzipped files, overwriting the old ones. On
   GitHub's upload page you can **drag all files at once** (app.html, taskpane.html,
   manifest.xml, commands.html, latest.json, and the icons). Keep them at the repo **root**,
   not in a subfolder.
3. Wait ~2 minutes, then **hard-refresh** the page in a browser to confirm:
   `https://peetbos2003-sudo.github.io/triallinks/app.html` (Ctrl+F5 / Cmd+Shift+R).
   You should see the current buttons (Use recipient, Investment, Treasury, …).
4. Done — no Outlook-side refresh needed. The redirector (`taskpane.html`) adds a unique
   `?ts=` on every open, so the next time anyone opens the panel they get the new `app.html`
   automatically. The remove/re-add dance (next section) is only for manifest changes.

---

## Installing / refreshing in Outlook

Custom add-ins are stored in your **mailbox** and sync across your devices (Mac, Windows, web).
Removing it on one device removes it everywhere; re-adding restores it.

**To add it (per person, while sideloading is allowed):**
Outlook → New email → Apps / "…" → Get Add-ins → My add-ins → **Custom Addins** → add the
manifest (URL: `https://peetbos2003-sudo.github.io/triallinks/manifest.xml`, or upload the file).

**To pick up a manifest change (only needed when manifest.xml itself changes):**
1. Remove the add-in from Custom Addins.
2. **Fully quit Outlook** (Cmd+Q on Mac / fully close on Windows) and reopen.
3. Add it again.
A "broken link" or an old-looking panel is almost always this cache — the remove/quit/re-add
clears it.

---

## Team rollout (recommended once piloted)

Have your **M365 admin** deploy it centrally: Microsoft 365 admin center → Settings →
**Integrated apps** → Upload custom apps → Office Add-in → "Provide link to manifest file",
using the hosted `manifest.xml` URL, assigned to the sales team. This pushes it to everyone
automatically (desktop + web, Mac + Windows) and removes the sync/duplicate fragility of manual
sideloading. IT may prefer to move the files to a company-controlled host — only the URLs in
`manifest.xml` change.

---

## The "latest publication" button

The **Insert selected + latest publication** button is available to everyone. It shows the
`Publication list updated <date>` line beneath it, read live from `latest.json`, so users can
see how fresh the titles are. (It was briefly limited to named users during the pilot; that
restriction has been removed.)

---

## Keeping latest.json fresh (the most stale-prone part)

`latest.json` holds each report's latest publication (title, date, author). Titles change every
publication cycle, so it must be refreshed.

- **Scrape while authenticated.** The public report pages show older "teaser" reports. The true
  latest only appears when logged in. The fix is to fetch each report page with a staff email as
  the access key, e.g. `…/research/interest-rates-outlook?email=p.bos@ecrresearch.com`. An
  anonymous scrape returns stale dates.
- **Reproduce titles verbatim**, including any dashes — they're the authors' real titles.
- After regenerating, upload the new `latest.json` to GitHub (same as any other file).

A scheduled refresh aligned to ECR's publication calendar can keep this current automatically.

---

## Editing the report list / descriptions

The report list, slugs, frequencies and descriptions live in the `REPORTS` array near the top of
`app.html`. Slugs are verified against ecrresearch.com. If ECR adds, renames or retires a
report, edit that array (and `latest.json`) and redeploy. (Global Political Analysis was removed
here as it is being phased out for new prospects.)

An entry may carry a `url` field: that full address is then used (with `?email=` appended)
instead of the standard `https://ecrresearch.com/research/<slug>` pattern. **Eddy's Weekly
Market Update** (added 23 Sep 2026, under its own "Newsletter" heading) uses this — it is a
weekly newsletter on the ECR homepage, not a report, so it has no `/research/` page and no
`latest.json` entry (the "latest publication" button inserts it as a plain link).
