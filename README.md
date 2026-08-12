# gold-tracker

An India-focused gold **buy / wait** decision-support tool.

The original brief — the data pipelines, scoring model, backtesting and reliability
requirements — lives in the master plan. This repository currently holds the design
work that sits on top of it.

| | |
|---|---|
| **[`docs/UX_DESIGN_TRACKING_PLAN.md`](docs/UX_DESIGN_TRACKING_PLAN.md)** | The UX, visual design and tracking plan. Diagnoses what the master plan under-specifies and proposes concrete fixes, ending with a re-scoped MVP. |
| **[`index.html`](index.html)** | The app — self-contained, no build step. Covers **gold and silver**, with real Indian ETF NAVs when live data is injected. |
| **[`pipeline/fetch.mjs`](pipeline/fetch.mjs)** | Data pipeline: spot gold/silver, USD/INR, ~20 months of daily history, AMFI ETF NAVs → indicators (SMA50/200, RSI14, 52-week drawdown) → transparent 0–100 score → 5-band verdict. No API keys needed. |
| **[`.github/workflows/refresh-data.yml`](.github/workflows/refresh-data.yml)** | Runs the pipeline twice daily at ~8:15 am and ~6:15 pm IST (and on demand), injects the data into the app, and commits. The cron activates once merged to the default branch. |

## Live data

The page runs in two clearly-labelled modes: **sample** (worked examples, orange chip) and
**live** (green chip with the data's age). The page also fetches the live spot price in the browser on every visit
(falling back to the baked data when offline). The GitHub Action fetches the full dataset and bakes it
into the page — sources: api.gold-api.com (spot), open.er-api.com (USD/INR), stooq.com
(history), AMFI (ETF NAVs). "Shop price" is an estimate — world price plus import duty and
GST, with the assumed rates shown in the app; local dealer premium is not included.

To refresh manually from any machine with internet access:

```sh
node pipeline/fetch.mjs --out pipeline/data.json
node pipeline/inject.mjs pipeline/data.json index.html
```

Offline test with fixtures: `node pipeline/fetch.mjs --fixtures pipeline/fixtures --out /tmp/data.json`

## The idea in one line

The master plan's headline output is *"Gold Score: 72/100."* Nobody wants that.
The question a real person has is **"I have ₹50,000 for gold — what do I do today?"**
Same engine, different product.

## Running the prototype

```sh
open index.html      # macOS
xdg-open index.html  # Linux
```

It's a single file with no dependencies. Try the **Simple / Detailed** toggle, change
the amount on **My Plan**, switch the buying route, and tick off ladder steps.

## Note on the numbers

Every figure in both documents is an illustrative worked example used to specify
layout and copy. They are not live prices and nothing here is a forecast. This
describes a decision-support tool, not investment advice — gold prices can fall.
