#!/usr/bin/env node
/**
 * Gold Tracker India — data pipeline (MVP phase 1)
 *
 * Fetches, with no API keys:
 *   - Spot gold (XAU/USD) and silver (XAG/USD)      — api.gold-api.com
 *   - USD/INR                                        — open.er-api.com (fallback: frankfurter.app)
 *   - Daily history for XAUUSD, XAGUSD, USDINR       — stooq.com CSV
 *   - Indian gold & silver ETF NAVs                  — AMFI NAVAll.txt
 *
 * Computes per asset: INR price series, SMA50/200, RSI14, 52-week drawdown,
 * an interpretable 0-100 score, and a 5-band verdict.
 *
 * Usage:
 *   node pipeline/fetch.mjs --out pipeline/data.json
 *   node pipeline/fetch.mjs --fixtures pipeline/fixtures --out /tmp/data.json   (offline test)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const FIXTURES = opt("fixtures", null);
const OUT = opt("out", "pipeline/data.json");

const OZT_GRAMS = 31.1034768;

/* Assumptions shown to the user, not hidden in code. Rates change with
   budgets — the page displays these values and their as-of date. */
const INDIA_COSTS = {
  as_of: "2026-08",
  import_duty: 0.06,
  gst: 0.03,
  note: "Estimated landed retail price = international price × (1 + import duty) × (1 + GST). Local dealer premium/discount not included.",
};

async function getText(url) {
  if (FIXTURES) {
    const f = url.includes("gold-api") ? (url.endsWith("XAU") ? "xau.json" : "xag.json")
      : url.includes("er-api") || url.includes("frankfurter") ? "fx.json"
      : url.includes("s=xauusd") ? "xauusd.csv"
      : url.includes("s=xagusd") ? "xagusd.csv"
      : url.includes("s=usdinr") ? "usdinr.csv"
      : url.includes("amfiindia") ? "navall.txt"
      : null;
    if (!f) throw new Error("no fixture for " + url);
    return readFileSync(join(FIXTURES, f), "utf8");
  }
  const res = await fetch(url, { headers: { "user-agent": "gold-tracker-pipeline/1.0" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}
const getJson = async (url) => JSON.parse(await getText(url));

/* ── sources ────────────────────────────────────────────────────── */
async function spot(symbol) {
  const j = await getJson("https://api.gold-api.com/price/" + symbol);
  if (!j || typeof j.price !== "number" || !(j.price > 0)) throw new Error(symbol + ": bad spot payload");
  return { usd: j.price, at: j.updatedAt || j.updated_at || null };
}

async function usdinr() {
  try {
    const j = await getJson("https://open.er-api.com/v6/latest/USD");
    const r = j?.rates?.INR;
    if (!(r > 0)) throw new Error("no INR rate");
    return { rate: r, at: j.time_last_update_utc || null, source: "open.er-api.com" };
  } catch (e) {
    const j = await getJson("https://api.frankfurter.app/latest?from=USD&to=INR");
    const r = j?.rates?.INR;
    if (!(r > 0)) throw e;
    return { rate: r, at: j.date || null, source: "frankfurter.app" };
  }
}

function parseStooqCsv(text) {
  // Date,Open,High,Low,Close,Volume
  const rows = [];
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [d, , , , close] = line.split(",");
    const c = parseFloat(close);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && c > 0) rows.push({ d, c });
  }
  if (rows.length < 220) throw new Error("stooq: too short (" + rows.length + "): " + text.slice(0, 80).replace(/\n/g, " "));
  return rows.slice(-420); // ~20 months of trading days
}

function parseYahooChart(json) {
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp, closes = r?.indicators?.quote?.[0]?.close;
  if (!ts || !closes) throw new Error("yahoo: unexpected shape");
  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c > 0) rows.push({ d: new Date(ts[i] * 1000).toISOString().slice(0, 10), c });
  }
  if (rows.length < 220) throw new Error("yahoo: too short (" + rows.length + ")");
  return rows.slice(-420);
}

/* Stooq rate-limits cloud/CI IP ranges (returns an empty or "daily hits
   limit" body), so Yahoo's chart API is primary and stooq is the fallback. */
const HIST_SYMBOLS = {
  xauusd: { yahoo: "GC%3DF", stooq: "xauusd" },   // COMEX gold front month tracks spot closely
  xagusd: { yahoo: "SI%3DF", stooq: "xagusd" },
  usdinr: { yahoo: "INR%3DX", stooq: "usdinr" },
};
const HIST_USED = {};   // records which source actually served each series
async function history(key) {
  if (FIXTURES) {
    HIST_USED[key] = "fixtures";
    return parseStooqCsv(await getText(`https://stooq.com/q/d/l/?s=${HIST_SYMBOLS[key].stooq}&i=d`));
  }
  try {
    const rows = parseYahooChart(await getJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${HIST_SYMBOLS[key].yahoo}?range=2y&interval=1d`));
    HIST_USED[key] = "yahoo";
    return rows;
  } catch (e) {
    console.error(`history(${key}): yahoo failed (${e.message}), trying stooq`);
    const rows = parseStooqCsv(await getText(`https://stooq.com/q/d/l/?s=${HIST_SYMBOLS[key].stooq}&i=d`));
    HIST_USED[key] = "stooq";
    return rows;
  }
}

function parseAmfi(text) {
  // Scheme Code;ISIN...;ISIN...;Scheme Name;NAV;Date
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const p = line.split(";");
    if (p.length < 6) continue;
    const name = p[3], nav = parseFloat(p[4]);
    if (!(nav > 0)) continue;
    const isGold = /gold\s*etf/i.test(name), isSilver = /silver\s*etf/i.test(name);
    if (!isGold && !isSilver) continue;
    if (/fof|fund of fund/i.test(name)) continue;
    out.push({ name: name.trim(), nav, date: p[5].trim(), metal: isGold ? "gold" : "silver" });
  }
  // keep the recognisable AMCs first, then alphabetical; cap the list
  const rank = (n) => ["nippon", "sbi", "hdfc", "icici", "kotak", "axis", "uti", "mirae", "tata", "aditya"]
    .findIndex((k) => n.toLowerCase().includes(k));
  out.sort((a, b) => ((rank(a.name) + 99) % 99) - ((rank(b.name) + 99) % 99) || a.name.localeCompare(b.name));
  return { gold: out.filter((e) => e.metal === "gold").slice(0, 6), silver: out.filter((e) => e.metal === "silver").slice(0, 4) };
}

/* ── indicators ─────────────────────────────────────────────────── */
const sma = (a, n) => a.length >= n ? a.slice(-n).reduce((s, v) => s + v, 0) / n : null;
function rsi14(a) {
  const n = 14;
  if (a.length < n + 1) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = a[i] - a[i - 1]; d >= 0 ? (g += d) : (l -= d); }
  let ag = g / n, al = l / n;
  for (let i = n + 1; i < a.length; i++) {
    const d = a[i] - a[i - 1];
    ag = (ag * (n - 1) + Math.max(d, 0)) / n;
    al = (al * (n - 1) + Math.max(-d, 0)) / n;
  }
  return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── scoring: interpretable, weights in the open ─────────────────── */
export const WEIGHTS = { valuation: 0.35, drawdown: 0.25, trend: 0.20, rsi: 0.10, fx: 0.10 };
export function componentScores(price, stats) {
  const val = clamp(50 - (price / stats.sma200 - 1) * 250, 5, 95);
  const dd = clamp(35 + (1 - price / stats.high52w) * 400, 5, 95);
  const trend = price > stats.sma200 ? (stats.sma50 > stats.sma200 ? 65 : 55) : 40;
  const r = stats.rsi14;
  const rsi = r == null ? 50 : r < 30 ? 80 : r < 45 ? 65 : r < 60 ? 50 : r < 70 ? 40 : 25;
  const fx = stats.fxChange20d > 0.004 ? 60 : stats.fxChange20d < -0.004 ? 40 : 50;
  return { valuation: val, drawdown: dd, trend, rsi, fx };
}
export const totalScore = (c) => Math.round(Object.entries(WEIGHTS).reduce((s, [k, w]) => s + c[k] * w, 0));
export const bandOf = (s) => s >= 80 ? 1 : s >= 65 ? 2 : s >= 45 ? 3 : s >= 30 ? 4 : 5;

/* ── build one asset ────────────────────────────────────────────── */
function buildAsset({ key, unitGrams, spotUsd, spotAt, fxRate, metalHist, fxHist }) {
  const fxByDate = new Map(fxHist.map((r) => [r.d, r.c]));
  let lastFx = fxHist[0].c;
  const inr = [];
  for (const r of metalHist) {
    if (fxByDate.has(r.d)) lastFx = fxByDate.get(r.d);
    inr.push({ d: r.d, v: (r.c * lastFx / OZT_GRAMS) * unitGrams });
  }
  const closes = inr.map((r) => r.v);
  const live = (spotUsd * fxRate / OZT_GRAMS) * unitGrams;
  const seriesWithLive = [...closes.slice(0, -1), live]; // replace last close with live spot
  /* The 52-week range is computed on a median-of-3 smoothed series: a single
     bad tick in a free feed would otherwise set a phantom high and inflate
     the "distance from high" component for a year. Real multi-day peaks
     survive the median. */
  const med3 = seriesWithLive.map((v, i, a) =>
    i === 0 || i === a.length - 1 ? v : [a[i - 1], v, a[i + 1]].sort((x, y) => x - y)[1]);
  const y252 = med3.slice(-252);
  const fx20 = fxHist.slice(-21);
  const stats = {
    sma50: sma(seriesWithLive, 50),
    sma200: sma(seriesWithLive, 200),
    rsi14: rsi14(seriesWithLive.slice(-120)),
    high52w: Math.max(...y252),
    low52w: Math.min(...y252),
    fxChange20d: fx20[fx20.length - 1].c / fx20[0].c - 1,
  };
  const comps = componentScores(live, stats);
  const score = totalScore(comps);
  const monthAgo = closes[closes.length - 22] ?? closes[0];
  const landed = live * (1 + INDIA_COSTS.import_duty) * (1 + INDIA_COSTS.gst);
  return {
    key,
    unit_grams: unitGrams,
    intl_inr: Math.round(live),
    landed_inr_est: Math.round(landed),
    intl_inr_month_ago: Math.round(monthAgo),
    spot_usd_ozt: spotUsd,
    spot_at: spotAt,
    stats: {
      sma50: Math.round(stats.sma50), sma200: Math.round(stats.sma200),
      rsi14: stats.rsi14 == null ? null : Math.round(stats.rsi14 * 10) / 10,
      high52w: Math.round(stats.high52w), low52w: Math.round(stats.low52w),
      fx_change_20d: Math.round(stats.fxChange20d * 10000) / 10000,
      off_high_pct: Math.round((live / stats.high52w - 1) * 1000) / 10,
    },
    components: Object.fromEntries(Object.entries(comps).map(([k, v]) => [k, Math.round(v)])),
    score,
    band: bandOf(score),
    history: inr.slice(-130).map((r) => ({ d: r.d, v: Math.round(r.v) })),
  };
}

/* ── main ───────────────────────────────────────────────────────── */
async function main() {
  const [xau, xag, fx, xauHist, xagHist, fxHist, amfiText] = await Promise.all([
    spot("XAU"), spot("XAG"), usdinr(),
    history("xauusd"), history("xagusd"), history("usdinr"),
    getText("https://www.amfiindia.com/spages/NAVAll.txt").catch((e) => (console.error("AMFI failed:", e.message), null)),
  ]);
  const etfs = amfiText ? parseAmfi(amfiText) : { gold: [], silver: [] };

  const data = {
    generated_at: new Date().toISOString(),
    sources: {
      spot: "api.gold-api.com",
      fx: fx.source,
      history: [...new Set(Object.values(HIST_USED))].map((s) => ({ yahoo: "Yahoo Finance", stooq: "stooq.com", fixtures: "fixtures" }[s] || s)).join(" + ") + " (daily closes)",
      etf_nav: amfiText ? "AMFI NAVAll.txt" : "unavailable this run",
    },
    india_costs: INDIA_COSTS,
    weights: WEIGHTS,
    usd_inr: Math.round(fx.rate * 100) / 100,
    assets: {
      gold: buildAsset({ key: "gold", unitGrams: 10, spotUsd: xau.usd, spotAt: xau.at, fxRate: fx.rate, metalHist: xauHist, fxHist }),
      silver: buildAsset({ key: "silver", unitGrams: 1000, spotUsd: xag.usd, spotAt: xag.at, fxRate: fx.rate, metalHist: xagHist, fxHist }),
    },
    etfs,
  };

  // sanity: refuse to publish numbers that are obviously broken
  const g = data.assets.gold, s = data.assets.silver;
  if (!(g.intl_inr > 20000 && g.intl_inr < 1000000)) throw new Error("gold price sanity check failed: " + g.intl_inr);
  if (!(s.intl_inr > 20000 && s.intl_inr < 2000000)) throw new Error("silver price sanity check failed: " + s.intl_inr);

  writeFileSync(OUT, JSON.stringify(data, null, 1));
  console.log(`ok: gold ₹${g.intl_inr}/10g (score ${g.score}, band ${g.band}) · silver ₹${s.intl_inr}/kg (score ${s.score}, band ${s.band}) · USD/INR ${data.usd_inr}`);
  console.log(`etfs: ${etfs.gold.length} gold, ${etfs.silver.length} silver · wrote ${OUT}`);
}

main().catch((e) => { console.error("PIPELINE FAILED:", e.message); process.exit(1); });
