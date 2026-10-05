# ICC Trial Links — Outlook add-in

The ICC Consultants sister of **ECR Trial Links**. An Outlook button that inserts personalised
links to ICC's reports on icc-consultants.nl into a prospect email. The prospect's email address
is the access key (`?email=…`), exactly as on ecrresearch.com. The panel and all inserted email
text are in Dutch, in ICC's purple house style.

Hosted at: `https://peetbos2003-sudo.github.io/triallinks/icc/`
(the `icc` **subfolder** of the same GitHub Pages repo as the ECR add-in, which stays at the root)

---

## What's in the panel

| Heading | Item | Link (+ `?email=`) |
|---|---|---|
| Rapporten | ICC Renterapport | `https://icc-consultants.nl/nl/research/icc-renterapport` |
| Rapporten | ICC Valutarapport | `https://icc-consultants.nl/nl/research/icc-valutarapport` |
| Rapporten | ICC Global Financial Markets | `https://icc-consultants.nl/nl/research/icc-global-financial-markets` |
| Nieuwsbrief van Eddy Markus | Weekupdate voor CFO's & treasurers | `https://icc-consultants.nl/nl/weekupdate-voor-cfos-treasurers` |

All four pages are evergreen (they always show the current edition), so the links themselves never
need maintenance.

Buttons:

- **Gebruik ontvanger** — pulls the prospect's address from the To field. **Alles / Geen** — tick or clear all.
  (No Investment/Treasury presets — not needed for ICC.)
- **Geselecteerde links invoegen** — the ticked items as a bulleted list of named links. No
  "platform access" line (ICC has no general platform page).
- **Volledig rapportoverzicht invoegen** — all four items with frequency and a one-line
  description, under their headings (Rapporten / Nieuwsbrief van Eddy Markus). The Weekupdate was
  left out until 5 Oct 2026 and is now included; to exclude an item again, give its `REPORTS` entry
  `noOverview:true` in `app.html`.
- **Selectie + laatste publicatie invoegen** — the ticked items with each one's latest edition
  headline, date and author, read live from `latest.json`.
- **Of kopieer de selectie** — copies the bulleted links to paste manually.

Report names, descriptions and frequencies live in the `REPORTS` array near the top of `app.html`.

---

## Files

`manifest.xml` (own unique Id — never reuse the ECR one), `taskpane.html` (permanent cache-busting
redirector — never edit), `app.html` (all UI + logic — edit this), `commands.html`, `latest.json`,
`icon-16/32/64/80/128.png` (from the ICC hexagon logo), this README.

---

## First-time deployment (GitHub)

1. Unzip `ICC-Trial-Links-Outlook-Addin.zip`. It contains one folder, **`icc`**.
2. In the `triallinks` repo on GitHub: **Add file → Upload files**, and **drag the whole `icc`
   folder** onto the page (Chrome/Edge keep the folder structure). Commit.
   Check that the files ended up in `triallinks/icc/…`, NOT at the root — at the root they would
   overwrite the ECR add-in's files.
3. Wait ~2 minutes, then open `https://peetbos2003-sudo.github.io/triallinks/icc/app.html` with a
   hard refresh — you should see the purple ICC panel.

Later updates: upload just the changed file(s) into the `icc` folder (open the folder on GitHub
first, then Add file → Upload files). No Outlook-side action needed; the redirector always loads
the newest `app.html`.

---

## Installing in Outlook

Outlook → New email → Apps / "…" → Get Add-ins → My add-ins → **Custom Addins** → add from URL:
`https://peetbos2003-sudo.github.io/triallinks/icc/manifest.xml`

It appears next to ECR Trial Links as its own button (group "ICC Consultants"). Team rollout via the
M365 admin center works exactly as described in the ECR README, with the ICC manifest URL.
If the manifest ever changes: remove the add-in, fully quit Outlook, re-add.

---

## Keeping latest.json fresh

Refreshed by the same weekday-evening scheduled task as the ECR file (see project doc
`RUNBOOK-latest-json-refresh.md`). ICC-specific scrape rules:

- Fetch each page **with the staff email key** (`?email=p.bos@ecrresearch.com`).
- The page's big heading is the **series name** ("ICC Renterapport") — that is NOT the title. The
  title is the current edition's own headline below it (e.g. "Markten te enthousiast met inprijzen
  renteverhogingen"). Copy verbatim, in Dutch.
- Dates in the site's Dutch format: `woensdag, 30 september 2026`.
- **Weekupdate:** its headline is the first heading after "Weekupdate voor CFO's & treasurers"
  (e.g. "Hoe ver moeten de rentes nog stijgen?"). The page names no author — it is Eddy's, so
  author is always **Eddy Markus**. New edition every week (dated Friday, sent Saturday morning).
- Set `updated` to today and upload `latest.json` into the `icc` folder.
