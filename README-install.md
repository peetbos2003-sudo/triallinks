# ECR Trial Links — Outlook add-in

An Outlook button that inserts personalized ECR Research trial links into a prospect
email. It can read the recipient's address automatically and drop a tidy bulleted list
of report links at your cursor. Same logic as the standalone Trial Link Builder, inside
Outlook.

Files in this folder:

- `manifest.xml` — the add-in definition (this is what you load into Outlook)
- `taskpane.html` — the panel UI + logic
- `commands.html` — required init file
- `assets/` — button icons

---

## Step 1 — Host the files (you can do this yourself)

The add-in needs the four items above served over **HTTPS** from a public URL. No
corporate server needed. Any of these free hosts work:

- **GitHub Pages** (simplest): create a public repo, upload this folder's contents,
  enable Pages. Your base URL becomes something like
  `https://yourname.github.io/ecr-addin`
- Cloudflare Pages, Netlify, or Azure Static Web Apps (free tier) — all fine.

The files contain **no secrets** (only the public report slugs and the insert logic;
the prospect email is typed in at use-time, never stored), so a public URL is safe.

## Step 2 — Point the manifest at your host

Open `manifest.xml` and replace **every** occurrence of:

```
https://REPLACE-ME.example.com
```

with your hosting base URL from Step 1 (no trailing slash), e.g.
`https://yourname.github.io/ecr-addin`. There are several occurrences — replace all.
Re-upload the edited `manifest.xml` to your host too.

## Step 3 — Sideload it into your own Outlook (no admin needed, if your tenant allows)

**Outlook on the web** (easiest to test):
1. New email → compose window.
2. The "**...**" (More apps) menu → **Get Add-ins** → **My add-ins** →
   **Custom Addins** → **Add a custom add-in** → **Add from URL**.
3. Paste the URL to your hosted `manifest.xml` (e.g.
   `https://yourname.github.io/ecr-addin/manifest.xml`) → Install.

**New Outlook for Windows / Mac:** same path — Get Add-ins → My add-ins →
Add a custom add-in → from URL.

> If "Add a custom add-in" is greyed out or blocked, your M365 tenant has disabled
> user sideloading. In that case skip to Step 5 (admin deployment) — that is the only
> route, even for testing.

## Step 4 — Use it

1. Compose an email to a prospect (put their address in **To**).
2. On the ribbon: **ECR Research → ECR Trial Links**. The panel opens.
3. It pre-fills the recipient's email. Tick the reports you want.
4. **Insert links into email** → the bulleted list drops in at your cursor.
   ("Copy instead" is there as a fallback.)

Run it like this for a trial period and gather feedback before going wider.

---

## Step 5 — Roll it out to the whole team (admin step)

When you're ready, your **Microsoft 365 admin** deploys it for everyone:

1. **Microsoft 365 admin center → Settings → Integrated apps → Upload custom apps**.
2. Choose **Office Add-in → Provide link to manifest file**, paste the hosted
   `manifest.xml` URL.
3. Assign to the sales team (or a group) → Deploy.

It then appears in every assigned user's Outlook automatically. Hosting can stay on the
same static host, or your IT may prefer to move the files to a company-controlled host
at that point — only the URLs in `manifest.xml` change.

---

## Notes / troubleshooting

- **Requirement:** Outlook on the web, New Outlook (Win/Mac), or Microsoft 365 desktop
  Outlook. Old perpetual Outlook 2016/2019 may need the desktop file rather than URL.
- **Slugs are current** as of build (verified against ecrresearch.com). If ECR adds or
  renames a report, edit the `REPORTS` list near the top of `taskpane.html`.
- **Changed a file?** Re-upload it to your host; Outlook may cache, so remove and
  re-add the add-in (or clear the Office cache) to pick up changes.
