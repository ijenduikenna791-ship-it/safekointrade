#!/usr/bin/env node
/**
 * Compares every messages/<locale>.json with messages/en.json:
 *  - missing / extra keys
 *  - ICU arguments ({name}, {count, plural, …}) must match exactly
 *  - rich-text tags (<terms>…</terms>) must match exactly
 * Exit code 1 on any mismatch. Run: node scripts/check-translations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "messages");
const en = JSON.parse(readFileSync(join(dir, "en.json"), "utf8"));

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (out[`${key}[${i}]`] = x));
    else if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

// Top-level ICU argument names only (ignores words inside plural branches).
function args(s) {
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") {
      if (depth === 0) {
        const m = s.slice(i + 1).match(/^\s*([A-Za-z_][\w]*)\s*(,\s*(\w+))?/);
        if (m) names.add(m[3] ? `${m[1]}:${m[3]}` : m[1]);
      }
      depth++;
    } else if (s[i] === "}") depth--;
  }
  return [...names].sort().join("|");
}
const tags = (s) => [...s.matchAll(/<\/?([a-z]+)>/g)].map((m) => m[0]).sort().join("|");

export function checkLocale(locale) {
  const base = flatten(en);
  const data = flatten(JSON.parse(readFileSync(join(dir, `${locale}.json`), "utf8")));
  const problems = [];
  for (const key of Object.keys(base)) {
    if (!(key in data)) problems.push(`missing ${key}`);
    else if (typeof data[key] !== "string" || !data[key].trim()) problems.push(`empty ${key}`);
    else {
      if (args(base[key]) !== args(data[key])) problems.push(`args ${key}: en=[${args(base[key])}] ${locale}=[${args(data[key])}]`);
      if (tags(base[key]) !== tags(data[key])) problems.push(`tags ${key}`);
    }
  }
  for (const key of Object.keys(data)) if (!(key in base)) problems.push(`extra ${key}`);
  return problems;
}

if (process.argv[1] === import.meta.filename) {
  const locales = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json").map((f) => f.replace(".json", ""));
  let failed = false;
  for (const l of locales) {
    const p = checkLocale(l);
    console.log(`${l}: ${p.length ? `${p.length} problem(s)` : "OK"}`);
    p.slice(0, 25).forEach((x) => console.log(`   ${x}`));
    if (p.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
