# Gold Tracker India — UX, Design & Tracking Plan (v2)

**Companion to:** `Gold_Tracker_India_Master_Plan.md`
**Scope of this document:** the three things the master plan under-specifies — how it *feels* to use, how it *looks*, and what it *tracks*.
**Governing constraint:** a person who has never heard the words "real yield" must be able to open this app, understand it in ten seconds, and act on it correctly.

---

## 0. The diagnosis

The master plan is excellent at describing a machine. It is 61 sections of data pipelines, scoring weights, backtests and regime models — and one screen (§53).

That imbalance is the whole problem. **Users never meet the machine. They only ever meet the screen.**

Three specific failures follow from it:

| # | Problem | Evidence in the master plan | Consequence |
|---|---|---|---|
| 1 | **It answers a question nobody asked.** | The headline output is "Gold Score: 72/100, Confidence 78%" (§53, §56). | Nobody wakes up wanting a score. They want to know what to do with the ₹50,000 sitting in their account. |
| 2 | **It speaks the builder's language, not the buyer's.** | Z-score, real yields, RSI 14, ATR, COT positioning, basis points, 1.8 standard deviations above the 50-day mean (§10, §11, §22). | A person buying gold for a wedding will bounce. The app becomes a tool for the one person who built it. |
| 3 | **It tracks the market obsessively and the person barely at all.** | 60 sections of market data; the user's own holdings are §43, labelled "Optional phase 2". | Backwards. The personal ledger is what makes people return daily *and* what makes the signal accountable. |

Everything below fixes these three, in order.

> **One reframe to carry through the whole document.** The master plan's §49 says the right question is *"is the expected risk/reward attractive enough to buy now?"* That is the right question for the **engine**. It is the wrong question for the **screen**. On the screen the question is: **"I have ₹50,000 for gold. What do I do today?"** Same engine. Completely different product.

---

# Part 1 — User experience

## 1.1 Make it amount-first, not score-first

The single highest-leverage change in this document.

The app should know one number about the user — **how much they intend to put into gold** — and express every output in rupees, not in points.

**Before (master plan §53):**
```
🟡 BUY PARTIAL
Score        72 / 100
Confidence   78%
₹ XXXXX / 10g
```

**After:**
```
Buy about ₹15,000 of gold today.
Keep the other ₹35,000 ready — we'll tell you when.

That's roughly 1 gram today, at ₹15,240 per gram.
```

The score still exists. It runs the engine, it appears in the detail layer, it is stored for accountability. It simply stops being the headline, because it is not what the user came for.

**Why this works:** it converts an abstract probability into a concrete, completable action. People cannot act on "72". Everyone can act on "₹15,000".

## 1.2 One screen, one decision — five layers of depth

Every piece of information gets a layer. Nothing from a deeper layer is allowed to surface above it.

| Layer | Contains | Who sees it | Default |
|---|---|---|---|
| **1 — The answer** | One sentence, plain words, ends with a full stop. | Everyone, in the first 2 seconds. | Always visible |
| **2 — The action** | Rupee amounts, the buying ladder, the next trigger price. | Everyone. | Always visible |
| **3 — The reason** | 3 reasons to buy, 3 reasons to wait, in plain English. | Anyone who scrolls. | Always visible, below the fold |
| **4 — The evidence** | The numbers behind the reasons: price vs. average, drawdown, USD/INR, event calendar. | Curious users. | Collapsed, one tap |
| **5 — The machinery** | Score breakdown by factor, weights, z-score, RSI, model version, raw data timestamps. | Power users and the builder. | Behind "Detailed view" |

**The rule:** if you can't say it in Layer 1 without a technical word, it does not belong in Layer 1.

## 1.3 A plain-language contract

This is not a style preference. It is a product requirement with a test attached.

**Target:** every Layer 1–3 sentence readable at Indian Class 6–7 reading level. Sentences under 20 words. No sentence containing two numbers.

**Banned from Layers 1–3 entirely** (they may appear in Layer 4–5 with a tap-to-explain):

> real yield · basis points · z-score · standard deviation · RSI · MACD · ATR · DMA · momentum · positioning · COT · open interest · mean reversion · drawdown · percentile · Sharpe ratio · regime · hawkish · dovish · risk-on · overbought · oversold · headwind · tailwind

**The translation table.** Every technical concept ships with a plain twin. The app stores both and renders whichever the current view calls for.

| Engine says | Screen says |
|---|---|
| RSI is 34 — oversold | Gold has fallen enough that buyers usually start returning |
| Price is 1.8σ above the 50-day mean | Gold is priced unusually high compared with the last two months |
| Real yields are falling | Bank deposits and bonds are earning less after inflation, which usually helps gold |
| USD/INR at 88.4, rupee weakening | The rupee is getting weaker, which pushes up gold prices in India even if world prices don't move |
| Drawdown −5.6% from 30-day high | Gold is ₹8,600 cheaper per 10g than it was three weeks ago |
| Central bank demand supportive | Governments around the world are still buying gold |
| Elevated event risk — US CPI T-18h | Big US inflation news comes out tomorrow. Prices often jump either way |
| Confidence 61% due to conflicting signals | The signals disagree with each other today, so treat this as a rough guide |

**Enforcement:** the banned-word list becomes a lint rule in CI that scans every user-facing string in the `simple` locale bundle. A build fails if a banned word reaches Layer 1–3. This costs an afternoon to build and permanently prevents the app drifting back into jargon.

## 1.4 Kill the naked score

"72/100" implies a precision the model does not have. Worse, users anchor on it and start watching it move by one point.

**Replace with a five-band meter.** Band + word + shape + direction of change — never a bare number in the headline.

| Band | Label shown | Shape | What it means, in the app's own words |
|---|---|---|---|
| 80–100 | **Good time to buy** | ● filled circle | Prices look attractive and conditions support gold. |
| 65–79 | **Buy a part now** | ◕ three-quarter | Reasonable, but not a bargain. Split your buying. |
| 45–64 | **Wait for a better price** | ◑ half | Nothing is wrong. Nothing is compelling either. |
| 30–44 | **Not now** | ◔ quarter | Prices have run ahead. Don't chase. |
| 0–29 | **Avoid buying today** | ○ hollow | Conditions are actively poor for a new purchase. |

Additional rules:
- **Never show a decimal.** The model's real resolution is roughly ±5 points; showing 72.4 is a lie about precision.
- **Show direction, not just level:** "Buy a part now — improved from *Wait* yesterday" is more useful than either number alone.
- **Add hysteresis.** A band must hold for two consecutive readings before the headline changes. This prevents a score wobbling 64↔66 from flipping the headline twice a day and destroying trust.

## 1.5 The Ladder — the core UI object

The master plan's best idea is buried at §23: buy in staged tranches instead of hunting the bottom. It deserves to be the spine of the interface, not a sub-section.

Normal people understand a staircase. Turn the recommendation into one:

```
YOUR ₹50,000 PLAN                          ▸ 1 of 5 steps done

 ✓  Step 1   ₹15,000   buy today         at ₹1,52,400   ✓ bought 9 Aug
 ○  Step 2   ₹10,000   if price drops 2%  ≈ ₹1,49,350
 ○  Step 3   ₹10,000   if price drops 4%  ≈ ₹1,46,300
 ○  Step 4    ₹7,500   if price drops 6%  ≈ ₹1,43,250
 ○  Step 5    ₹7,500   only on a big fall ≈ ₹1,37,150

 We'll message you when a step is ready. You never have to watch prices.
```

Why this is the right primitive:

- **It removes the impossible task.** The user is no longer asked to time the market; they are asked to tick a box when told.
- **It converts a probability into a checklist.** Checklists are the most legible form of instruction that exists.
- **It makes tracking free.** Each rung is a state (`pending → ready → bought → skipped`). Progress, average cost and remaining cash all fall out of the ladder automatically — see §3.5.
- **It is honest about uncertainty.** Staging money *is* the correct behaviour when you don't know the future, and the UI now says so structurally rather than in a disclaimer.
- **It survives a wrong signal.** If today's call is wrong, the user has only committed 30%. The design absorbs model error instead of amplifying it.

## 1.6 Say how sure you are — in words

The master plan is right that score ≠ confidence (§38). But "Confidence: 61%" is another number nobody can act on. Use sentences that change the recommended behaviour:

| Internal confidence | What the app says |
|---|---|
| ≥ 75% | **We're fairly confident.** The signals mostly agree today. |
| 55–74% | **Mixed picture.** Some signals point one way, some the other. Treat this as a rough guide. |
| 40–54% | **Low confidence.** Big news is due, or the signals conflict. Consider waiting a day. |
| < 40% or data quality below threshold | **We're not giving a call today.** *(Reason stated plainly: "Our price data hasn't updated since 9:40 am.")* |

That last row is the most important one in this document. **An app that admits it doesn't know is the only kind that earns long-term trust.** The master plan already specifies signal suspension (§39) — the UX contribution is to make suspension look deliberate and calm, not broken.

## 1.7 Onboarding: four questions, forty seconds

Every question must earn its place by changing an output. Four do:

1. **"Why are you buying gold?"** → *Wedding or festival in the next year · Long-term savings · Trying to buy at a good price*
   This silently selects Mode A (long-term) or Mode B (tactical) from §6. **The user never sees a "mode toggle"** — they will not know which to choose, and choosing wrong ruins the product. Intent picks the mode; a small always-visible label states which view they're in and lets them change it.
2. **"How much do you want to put into gold?"** → drives every rupee figure in the app.
3. **"How do you buy gold?"** → *Jewellery · Coins/bars · Gold ETF · Digital gold · Not sure yet*
   Drives the real-cost calculation (§3.3) — this is what makes the numbers true rather than theoretical.
4. **"Already own some gold?"** (skippable) → *approximate grams* → enables allocation tracking.

Everything is skippable, everything is editable later, and skipping shows sensible defaults rather than an empty state.

## 1.8 Notifications that don't nag

A gold accumulation tool that pings like a trading app will train exactly the behaviour it exists to prevent.

**Defaults:**
- **One message per day maximum**, at a time the user chooses (default 8:30 am IST).
- **Only send when something changed.** No "your daily update" when the answer is identical to yesterday's. Silence is a valid, respectful output.
- **Ladder steps are the only interrupt-worthy alerts** — "Step 2 is ready: gold is at ₹1,49,300" — because those are the only messages with a specific action attached.
- **Event warnings go out the evening before**, once, not as a countdown.
- **Hard cap: 3 pushes per week**, enforced in code, not in settings.

**Never send:** price-move-only alerts, "gold is trending", streaks, re-engagement nudges, or anything with a countdown timer.

## 1.9 "What changed since yesterday" is the daily habit

Master plan §41 identifies this correctly and then buries it. It should be the second card on the home screen, written as a story rather than a diff:

> **Since yesterday**
> Gold fell ₹1,150 per 10g overnight, and the rupee weakened slightly.
> That moved us from *Wait* to *Buy a part now* — Step 2 of your plan is now close.

This is the only reason to open the app on a day when nothing needs doing. It is the retention mechanic, and it costs nothing extra because the engine already computes both days' state.

## 1.10 Anti-patterns — things this app must never do

The failure mode for this product is not being wrong. It is being *engaging* — turning careful savers into anxious traders.

Banned by design:
- ❌ Countdown timers on buy signals
- ❌ Streaks, badges, confetti, "you're on fire"
- ❌ Red/green flashing prices or tick animations
- ❌ The words *surge, plunge, crash, rally, soar, opportunity of the year*
- ❌ Any leaderboard or social comparison
- ❌ Push notifications on price movement alone
- ❌ Dark patterns around "you missed this dip"
- ❌ Any language implying certainty about future prices

**Positive test:** if a feature would make a user check the app more than once a day, it is probably wrong for this product.

---

# Part 2 — Visual design

## 2.1 What it should feel like

The master plan says "professional financial terminal rather than a trading-gambling app" (§52). Correct instinct, wrong reference. A Bloomberg terminal is designed for someone who looks at it eight hours a day.

**Better reference: a jeweller's bill and a BIS hallmark.** Both are objects Indian gold buyers already trust, both are built to be read once and filed, and both are fundamentally about *verified purity* — which is precisely what a decision-support tool with a data-quality score is claiming to offer.

Practical consequences:
- Hairline rules and generous whitespace instead of boxed widgets
- A stamped, certificate-like verdict block at the top
- Money set like a receipt: right-aligned, tabular figures, Indian digit grouping
- Nearly no animation; nothing that moves on its own
- Square-ish corners (3–4px), not pill-shaped cards

## 2.2 Colour — and the problem with the current palette

The master plan (§52) specifies navy `#0C3A6B`, orange `#E97E26`, white, light blue `#F3F8FF`, and says *"use orange for important actions/alerts"*.

**That instruction contains a collision.** If orange means "primary button" *and* "caution", then a user cannot tell whether an orange thing is something to press or something to worry about. On a financial screen that ambiguity is a real cost.

**The fix — separate the brand scale from the semantic scale:**

| Role | Colour | Used for | Never used for |
|---|---|---|---|
| **Interactive** | Navy `#0C3A6B` | Buttons, links, anything tappable | Status |
| **Attention** | Orange `#E97E26` | Event warnings, stale data, caution states | Buttons |
| **Favourable** | Teal `#0B6E5F` | Buy bands, gains, good conditions | Decoration |
| **Unfavourable** | Rust `#A03426` | Avoid bands, losses, poor conditions | Errors in forms |
| **Neutral** | Slate `#6E7C91` | Wait band, secondary text | Emphasis |
| **Ground / Ink** | `#F4F7FC` / `#0A2138` | Page and text | — |

**The five-band decision scale** runs teal → steel → slate → orange → rust. This is deliberately a **blue-to-orange axis, not red-to-green**: red/green is invisible to roughly 1 in 12 Indian men (deuteranopia/protanopia), and this is exactly the audience — men aged 30–60 making household gold decisions. Blue vs. orange survives the common colour-vision deficiencies intact.

**Three hard rules:**
1. **Colour is never the only channel.** Every band ships with a word *and* a distinct fill shape (● ◕ ◑ ◔ ○). Screenshot the app in greyscale — if it still reads, it's correct.
2. **Minimum contrast 4.5:1** for all text, including the coloured band labels.
3. **Design for sunlight.** People check gold prices standing outside a jewellery shop. Test the light theme at 30% screen brightness; if the band colours merge, they're too subtle.

## 2.3 Type and numbers

**Typefaces.** A serif for headline verdicts (certificate vernacular, and it separates "what we're telling you" from "what the data says"); a clean sans for body; a tabular mono for every price. Three roles, three faces, no more. Fonts must be self-hosted or system stacks — a webfont CDN that fails leaves the app in a silent fallback, which on a money screen is unacceptable.

**Numbers are the actual typography problem here.** Get these right:

- **Indian digit grouping, always.** `₹1,52,400` — not `₹152,400`. Use `Intl.NumberFormat('en-IN')`. Getting this wrong signals "built for someone else" faster than anything else on the screen.
- **Tabular numerals everywhere** (`font-variant-numeric: tabular-nums`) so figures line up in the ladder and price history.
- **Both units, always.** Indians quote gold per 10 grams; they *buy* per gram. Show `₹1,52,400 / 10g` with `₹15,240 per gram` beneath it.
- **Show grams, not just rupees.** "Your ₹50,000 buys **3.28 g** today (it bought 3.41 g a month ago)." This is the most intuitive value signal that exists for this audience and the master plan doesn't mention it once.
- **Round to what's real.** ₹15,240, not ₹15,240.37. Grams to two decimals. Percentages to one.
- **Prefix the sign on changes** (`+0.4%` / `−1.8%`) and use a true minus `−`, not a hyphen.

## 2.4 The hero card, specified

The one block that must be perfect. Reading order top to bottom, largest to smallest:

1. **Band shape + verdict word** — largest element on the screen, serif, e.g. ◕ **Buy a part now**
2. **The plain sentence** — "Gold has come down a little. Buying a part of your amount today looks reasonable."
3. **The money line** — "Buy about **₹15,000** today · keep ₹35,000 ready"
4. **The price line** — ₹1,52,400 / 10g · ₹15,240 per gram · ▾ 2.1% below last month's high
5. **Confidence in words** — "Mixed picture — some signals disagree today."
6. **Freshness chip** — "Prices updated 4 minutes ago" (turns orange past 15 min, and the card is replaced entirely past the suspension threshold)

The score (`71`) appears once, small, at the bottom edge, as a link into the detail layer. It is a footnote, not a headline.

## 2.5 Charts a normal person can read

The master plan implies TradingView-style charting (§26). That is the wrong default for this audience — candlesticks are a professional notation and communicate nothing to a first-time viewer.

**Default chart rules:**
- **One line, one message.** Price only. No candles, no volume, no indicator overlays in the default view.
- **Annotate the line, don't legend it.** Labels sit on the chart: "last month's high", "your Step 2 price", "your average buying price".
- **Show the user's own purchases as dots on the line.** Instantly answers "am I doing okay?" without a single number.
- **Default range 6 months**, because 1-day charts invite trading behaviour.
- **No live tick animation.**
- Candlesticks, moving averages and indicators live in Detailed view, where the user has asked for them.

## 2.6 Layout

- **Mobile-first, one thumb.** Every primary action inside the bottom third of the screen. Minimum tap target 44×44px.
- **Three tabs, no more:** **Today · My Plan · Track Record.** (Master plan §51 lists ten pages; ten pages is a website, not an app. Everything else lives one level down.)
- **Single column always.** Desktop is the same column, centred, with the extra width used for margin annotations — not a second column of widgets.
- **No horizontal scrolling** except inside explicitly scrollable tables.

## 2.7 Accessibility and Indian realities

| Requirement | Why it matters here |
|---|---|
| **Hindi + at least Tamil, Telugu, Marathi, Bengali, Gujarati** | Gold buying is not an English-first activity in India. The plain-language layer makes translation genuinely feasible; the jargon layer would not. |
| **Works on a ₹8,000 Android on 3G** | Target < 150 KB initial payload; the Today screen must render from cache instantly and update after. |
| **Installable PWA with offline last-known state** | Users check prices in shops with poor signal. Show yesterday's answer clearly stamped with its time rather than a spinner. |
| **Respects OS text size up to 200%** | The audience skews 40+. Layouts must reflow, not clip. |
| **Full screen-reader labels on the band meter** | The shape/colour meter needs an `aria-label` that states the verdict in words. |
| **`prefers-reduced-motion` honoured** | Trivial to implement, and this app barely animates anyway. |
| **Festival and wedding awareness** | Akshaya Tritiya, Dhanteras and the wedding season drive real buying. A calm note — "Dhanteras is in 9 days; premiums at shops usually rise beforehand" — is genuinely useful and unique to this market. |

## 2.8 Two themes, both designed

Light is the primary theme (sunlight use). Dark must be a real design, not an inversion — coloured bands need re-tuned lightness to keep 4.5:1 on a dark ground, and gold-toned accents that look warm on white go muddy on near-black.

## 2.9 Micro-copy: before and after

| Before (master-plan voice) | After |
|---|---|
| ⚠️ HIGH EVENT RISK — US CPI in 18 hours | Big US inflation news tomorrow morning. Prices often move sharply either way — worth waiting a day unless you're buying for the long term. |
| Price is currently 1.8 standard deviations above its 50-day mean. | Gold is priced unusually high compared with the last two months. |
| SIGNAL SUSPENDED — DATA QUALITY TOO LOW | **No call today.** Our price feed hasn't updated since 9:40 am, so we'd rather say nothing than guess. Showing you yesterday's prices below. |
| Buy 25% now; retain 75% for better entry levels. | Buy about ₹12,500 today. Keep ₹37,500 aside — we'll tell you when to use it. |
| Confidence: 78% | We're fairly confident. Most signals agree today. |
| Current correction: −5.6%; historical median: −4.2% | Gold is ₹8,600 cheaper per 10g than three weeks ago. Falls this size happen a few times a year. |

---

# Part 3 — Tracking

"Tracking" means two different things and the master plan only builds one of them.

| | Market tracking | Personal tracking |
|---|---|---|
| Question | What is gold doing? | What am **I** doing? |
| Master plan | §7–§21, §25, §28–§29 — thorough | §43, one page, "optional phase 2" |
| Reality | Table stakes; a dozen apps do it | The reason to open *this* app; nobody else has it |

Both must be first-class. Below, market tracking is tightened and personal tracking is promoted.

## 3.1 Market tracking: make data quality a visible product feature

The master plan specifies a data-quality score (§39) as an internal safety mechanism. Surface it — an app that shows its own uncertainty is more trustworthy, not less.

- **Freshness chip on every screen.** "Prices updated 4 minutes ago." Grey under 15 min, orange 15–60, and past the threshold the verdict card is *replaced* by a suspension card, not merely annotated. Never render a buy recommendation over stale data.
- **Two sources minimum for every price**, with disagreement made visible: *"Our two price sources differ by ₹340 today; we're showing the lower one."* Silent averaging destroys trust the first time someone cross-checks against their jeweller.
- **Store the vintage of every macro number.** US CPI gets revised; a backtest run against revised data is a fantasy. Persist `as_of` (when we saw it) alongside `period` (what it describes).
- **One row per input per day, immutable.** Never update in place. Corrections are new rows with a supersede pointer.

## 3.2 Track the price you'd *actually pay*

This is the biggest single gap in the master plan. Transaction costs appear only in the backtesting section (§36) — but a normal user's real cost is wildly different from the screen price, and that difference is far larger than any edge the scoring model could ever produce.

| Route | Real cost on ₹50,000 (illustrative) | What the user actually gets |
|---|---|---|
| Gold ETF | ~0.5% brokerage + ~0.5%/yr expense | ≈ ₹49,750 of gold |
| Sovereign-style / fund route | expense ratio only | ≈ ₹49,800 of gold |
| Coins & bars | 3% GST + 2–6% dealer premium | ≈ ₹47,500 of gold |
| Digital gold | 3% GST + platform spread | ≈ ₹47,000 of gold |
| Jewellery (22K) | 3% GST + 8–20% making charges, largely unrecoverable on resale | ≈ ₹41,000 of gold |

**Design implication:** the app must show, for the user's chosen route, *"₹50,000 buys you about 2.7 g as jewellery, or 3.26 g as an ETF."* That single comparison is worth more to a normal buyer than the entire scoring model, and it is honest in a way the industry generally isn't.

**Model implication:** the buy/wait threshold should scale with the user's route. A 12% making charge dwarfs a 2% timing edge, so for jewellery buyers the app should say so plainly and lean toward "buy when you need it" rather than implying timing matters much.

## 3.3 Personal tracking: logging a purchase in under ten seconds

The failure mode of every portfolio tracker is data entry. Design against it:

- **Pre-fill everything.** When a ladder step is marked done, the amount, date, price and route are already known. One tap: **"Yes, I bought this."**
- **Two fields maximum** for a manual entry: amount paid, and grams received. Everything else is derived; the implied price per gram is computed and shown back as a check — *"That works out to ₹16,900 per gram, about 11% above the market rate. Making charges, most likely."* That feedback alone is a feature.
- **Photograph the bill** and attach it. Storage is cheap; a searchable record of gold purchases is genuinely valuable to an Indian household.
- **Never require login to start.** Local-first storage, with sync offered later.

Derived automatically, never asked for: total grams, average cost per gram, current value, gain/loss, share of the target allocation, and progress through the ladder.

## 3.4 The ladder as a state machine

Each rung: `pending → ready → bought | skipped | expired`

- **ready** fires when the trigger price is hit → this is the one push notification worth sending.
- **skipped** is a first-class, guilt-free option ("Not this time"). The app must never scold.
- **expired** when a plan's horizon passes. The app then asks one question: *"You've got ₹22,500 left from your plan. Roll it into a new plan, or leave it?"*
- Every transition is logged with the market state at the time — this is what later powers "your plan worked / didn't work".

## 3.5 Accountability tracking — the feature that separates this from every competitor

Master plan §46–§47 gets this right: store every signal, never overwrite, measure what happened after. The UX contribution is to **put it in the main navigation and make it unflattering when it should be**.

A **Track Record** tab, always one tap away, showing:

> **How we've done**
> *Since we started, 14 months ago.*
>
> We said **"buy"** 47 times.
> 20 trading days later, gold was higher **31 times out of 47** (66%).
> Typical result: **+1.9%**. Worst: **−6.1%**.
>
> **Did it beat just buying every month?**
> Following our plan: average cost **₹1,44,900** per 10g.
> Buying a fixed amount monthly: average cost **₹1,46,300** per 10g.
> Difference: **₹1,400 better per 10g** — about 1%.
> *After the costs of buying. Past results don't guarantee future ones.*

Three principles behind that block:

1. **Publish the benchmark comparison prominently.** §35 says compare against a monthly SIP; the UX rule is that this comparison is *always visible*, not buried in a backtest page. If the system doesn't beat a simple monthly purchase after costs, the honest product decision is to say so — and the app that says so is the one people trust with real money.
2. **Report all four horizons (5/20/60/120 days), always together.** Selecting the flattering horizon is the classic self-deception; showing all four makes it impossible.
3. **Every signal is stamped with its model version** (§45), and the track record is filterable by version, so "we changed the model" can't be used to quietly erase a bad run.

## 3.6 What to track about the product itself

Privacy-respecting, aggregate, no third-party analytics on a page displaying someone's finances:

| Metric | What it tells you |
|---|---|
| % of users who complete the amount question | Whether onboarding earns its place |
| % of "ready" alerts acted on within 48h | Whether the ladder is actually usable |
| Time from open to first scroll on the Today screen | Whether Layer 1 is answering the question |
| Ratio of Simple to Detailed view usage | Whether the jargon layer is even needed |
| Ladder steps skipped vs. bought | Whether the recommendations are realistic |
| Return rate on days with no notification | Whether the "what changed" card works |

## 3.7 Schema additions to master plan §25

```text
user_profile        -- intent, mode, budget, route, target_allocation, locale, notify_window

plans               -- id, user_id, total_amount, route, created_at, horizon,
                       status, model_version_at_creation

plan_steps          -- plan_id, step_no, amount, trigger_type(now|pct_drop|price|time),
                       trigger_value, state, ready_at, actioned_at

purchases           -- user_id, plan_step_id (nullable), date, amount_paid, grams,
                       implied_price_per_gram, route, gst, making_charges,
                       bill_image_ref, source(auto|manual)

signal_outcomes     -- signal_date, model_version, action, score, band,
                       return_5d, return_20d, return_60d, return_120d,
                       max_drawdown_20d, computed_at
                       -- append-only; back-filled as horizons mature

data_quality        -- ts, feed, freshness_seconds, sources_agreeing,
                       max_source_divergence, quality_score, suspended(bool), reason

copy_strings        -- key, layer(1..5), locale, simple_text, detailed_text
                       -- the plain/technical pairing lives in data, not in components
```

The last table matters more than it looks: keeping the plain-English and technical wording as **paired data** rather than hardcoded strings is what makes the Simple/Detailed toggle and the multi-language requirement tractable instead of a rewrite.

---

# Part 4 — A revised MVP

The master plan's Phase 1 (§50) is roughly right on data and roughly silent on product. Revised, with the cuts made explicit:

**Build (4–5 weeks):**
1. Daily gold price (two sources) + USD/INR, with the freshness and suspension logic — **the honesty layer ships first, not last**
2. A deliberately simple score: trend, distance from recent high, and one macro input. Three inputs, transparent, defensible.
3. The five-band verdict, written in plain English, with the translation table populated
4. The amount question and the **Ladder** — this is the MVP's actual product
5. Manual purchase logging with derived average cost and grams
6. One daily notification, opt-in, only on band change or ladder step ready
7. The **Track Record** tab, live from day one and empty at first — *"We've made 3 calls so far. Too early to judge us."*

**Explicitly defer:** AI news analysis, historical analogues, regime detection, COT positioning, ETF flows, backtesting UI, portfolio page, intraday alerts, best-time-of-day.

**Rationale for the cuts:** items 1–7 are sufficient to answer "I have ₹50,000, what do I do today?" Everything deferred makes the *answer* marginally better while making the *product* substantially later. And the deferred list is where most of the recurring data cost sits (§57), so this MVP is also the cheap one to run.

**Ship criteria — the app is working if:**
- A person who has never invested can read the Today screen aloud and correctly explain what to do.
- Nothing in Layers 1–3 requires a definition.
- The app has said "no call today" at least once, visibly and calmly.
- The Track Record tab is honest enough to be uncomfortable.

---

# Part 5 — The screens, rewritten

## 5.1 Master plan §53, rewritten

```text
┌──────────────────────────────────────────────┐
│  GOLD INDIA          Sun, 9 Aug · 8:32 am    │
│  Long-term view                    change ›  │
├──────────────────────────────────────────────┤
│                                              │
│              ◕                               │
│        Buy a part now                        │
│                                              │
│   Gold has come down a little this week.     │
│   Buying part of your amount today looks     │
│   reasonable — but keep some back.           │
│                                              │
│   ┌────────────────────────────────────┐     │
│   │  Buy about  ₹15,000  today         │     │
│   │  Keep ready  ₹35,000               │     │
│   │  That's about 0.98 g of gold       │     │
│   └────────────────────────────────────┘     │
│                                              │
│   ₹1,52,400 / 10g    ₹15,240 per gram        │
│   ▾ 2.1% below last month's high             │
│                                              │
│   Mixed picture — some signals disagree.     │
│   ● Prices updated 4 minutes ago             │
├──────────────────────────────────────────────┤
│  SINCE YESTERDAY                             │
│  Gold fell ₹1,150 per 10g overnight.         │
│  We moved from "Wait" to "Buy a part now".   │
├──────────────────────────────────────────────┤
│  WHY BUY SOME                                │
│  ✓ Gold is cheaper than it was three weeks   │
│    ago, but the long-term rise is intact     │
│  ✓ The rupee is weak, which supports Indian  │
│    gold prices                               │
│  ✓ Governments are still buying gold         │
│                                              │
│  WHY NOT BUY EVERYTHING                      │
│  • Gold is still above its long-term average │
│  • Big US inflation news tomorrow morning    │
│  • Prices have been jumpy this week          │
├──────────────────────────────────────────────┤
│  COMING UP                                   │
│  US inflation figures — tomorrow, 6:00 pm    │
│  Prices often move sharply either way.       │
├──────────────────────────────────────────────┤
│  See the numbers behind this  ›   Score 71   │
└──────────────────────────────────────────────┘
     Today          My Plan        Track Record
```

## 5.2 Master plan §56, rewritten

```text
TODAY'S ANSWER

Buy a part of your amount now.

What to do
  Buy about ₹15,000 of gold today.
  Keep ₹35,000 ready for the next steps in your plan.

Where prices are
  ₹1,52,400 per 10 grams — about 2% below last month's high.
  Gold is still expensive compared with its five-year average.

Why buying some makes sense
  • Prices have eased, but the long-term rise hasn't broken
  • The rupee is weak, which supports gold prices in India
  • In similar situations in the past, gold was higher a month
    later about 7 times out of 10

Why not to buy everything today
  • Big US inflation news lands tomorrow evening
  • Prices have moved around a lot this week
  • Gold is still above its long-term average

What happens next
  If gold falls to about ₹1,49,350, we'll tell you to buy the
  next ₹10,000.
  If it rises above ₹1,55,700 instead, we'll hold and wait.

How sure we are
  Mixed picture. Some signals disagree today. Treat this as a
  guide, not a rule.

This is information, not investment advice. Gold prices can fall.
```

---

# Part 6 — Summary of changes to the master plan

| Master plan section | Change |
|---|---|
| §3, §53, §56 | Lead with the rupee answer, not the score; five layers of depth; plain-language contract enforced in CI |
| §4, §5 | Score becomes a five-band meter with shapes and hysteresis; never shown bare |
| §6 | Mode is chosen by *intent* during onboarding, never presented as a toggle |
| §23 | The buying ladder is promoted from a sub-section to the core UI object and the primary tracking primitive |
| §36 | Real transaction costs move from backtesting into the main UI — the honest "what your money actually buys" comparison |
| §38, §39 | Confidence and data quality are expressed in sentences and made visible; suspension is a designed state |
| §43 | Personal tracking is promoted from "optional phase 2" into the MVP |
| §46, §47 | The track record becomes a main navigation tab, always showing all four horizons and the monthly-SIP benchmark |
| §50, §51 | MVP re-scoped around the ladder; ten pages reduced to three tabs |
| §52 | Brand colours separated from semantic colours; blue-orange scale for colour-vision safety; jeweller's-bill vernacular |
| — (new) | Notification restraint rules, anti-pattern list, Indian number formatting, grams-per-rupee framing, festival awareness, language support |

---

*All figures in this document are illustrative examples used to specify layout and copy. They are not live prices or forecasts. This describes a decision-support tool; it is not investment advice, and any public release needs review against Indian regulatory requirements as noted in master plan §58.*
