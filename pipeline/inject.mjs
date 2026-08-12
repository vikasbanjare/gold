#!/usr/bin/env node
/**
 * Injects pipeline/data.json into prototype/index.html.
 * The page carries <script id="live-data" type="application/json">null</script>;
 * this script replaces its body. Idempotent — safe to run on an already-injected page.
 */
import { readFileSync, writeFileSync } from "node:fs";

const dataPath = process.argv[2] || "pipeline/data.json";
const pagePath = process.argv[3] || "index.html";

const data = JSON.parse(readFileSync(dataPath, "utf8")); // validates JSON
const payload = JSON.stringify(data).replace(/</g, "\\u003c"); // keep </script> impossible

const page = readFileSync(pagePath, "utf8");
const re = /(<script id="live-data" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!re.test(page)) { console.error("marker <script id=\"live-data\"> not found in " + pagePath); process.exit(1); }
writeFileSync(pagePath, page.replace(re, `$1${payload}$2`));
console.log(`injected ${dataPath} (generated_at ${data.generated_at}) into ${pagePath}`);
