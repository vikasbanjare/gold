# Make the website live — 5 minutes

You'll end up with a free public website at
`https://<your-username>.github.io/<repo-name>/` that refreshes itself two ways: the **headline price is fetched
live every time someone opens the site**, and the full dataset (history,
averages, ETF prices) rebuilds **twice a day, ~8:15 am and ~6:15 pm IST**.

## Step 1 — Put the files on GitHub

**If this repo already exists on GitHub** (it does — `gold-tracker`): just merge
the pull request. Skip to Step 2.

**If you're starting from the zip:**

1. On github.com click **New repository**, name it (e.g. `gold-tracker`), keep it
   Public, and create it.
2. Unzip the file. Upload everything — the easiest reliable ways:
   - **GitHub Desktop**: add the unzipped folder as a repo and push, or
   - **Command line**:
     ```sh
     cd gold-tracker
     git init && git add -A && git commit -m "go live"
     git branch -M main
     git remote add origin https://github.com/<your-username>/<repo-name>.git
     git push -u origin main
     ```
   - **Web upload** (drag & drop): works, but browsers sometimes skip the hidden
     `.github` folder. After uploading, check that
     `.github/workflows/refresh-data.yml` exists in the repo. If it's missing,
     use **Add file → Create new file**, type
     `.github/workflows/refresh-data.yml` as the name, and paste that file's
     contents in.

## Step 2 — Turn on the website

1. In the repo: **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

That's the only setting. (First-time repos may also need
**Settings → Actions → General → Workflow permissions → Read and write** —
the workflow declares its own permissions, so usually nothing to change.)

## Step 3 — First run

Go to the **Actions** tab → **Refresh market data & deploy site** →
**Run workflow**. In about a minute it fetches today's real prices, bakes them
into the page, commits, and publishes the site. The website address appears in
the run's `deploy` job, and in **Settings → Pages**.

From then on it runs by itself at ~8:15 am and ~6:15 pm IST every day
(the schedule only runs from the `main` branch, so it starts once the files are
on `main`).

## How to know it's working

Open the site: the chip at the top should be green — **"● Live data · updated
X h ago"**. If prices ever stop updating, the same chip turns orange and says
how old the data is; check the **Actions** tab for a red run to see why.

## Costs

Nothing. GitHub Pages and the data sources used (gold-api.com, open.er-api.com,
Yahoo Finance, AMFI) are all free, no API keys, at this usage level.
