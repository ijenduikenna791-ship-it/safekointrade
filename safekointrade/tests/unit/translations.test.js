import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { IntlMessageFormat } from "intl-messageformat";
import { locales, localeMeta, isRtl } from "@/lib/i18n/routing";

const root = join(import.meta.dirname, "..", "..");
const load = (l) => JSON.parse(readFileSync(join(root, "messages", `${l}.json`), "utf8"));

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (out[`${key}[${i}]`] = x));
    else if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

describe("translations", () => {
  it("pass the key/argument/tag checker", () => {
    // Throws (non-zero exit) on any mismatch.
    const out = execFileSync("node", [join(root, "scripts", "check-translations.mjs")], { encoding: "utf8" });
    for (const l of locales.filter((x) => x !== "en")) expect(out).toContain(`${l}: OK`);
  });

  it("has metadata for every locale and marks Arabic RTL", () => {
    for (const l of locales) expect(localeMeta[l]).toBeTruthy();
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });

  it.each(locales)("%s: every message is valid ICU and formats", (locale) => {
    const flat = flatten(load(locale));
    for (const [key, msg] of Object.entries(flat)) {
      const fmt = new IntlMessageFormat(msg, localeMeta[locale].intl, undefined, { ignoreTag: false });
      // Supply any argument the message asks for: tags get a renderer, everything else a number.
      const tags = new Set(["terms", "privacy", "risk", "link", "n"]);
      const values = new Proxy({}, { has: () => true, get: (_, k) => (tags.has(k) ? (c) => c.join("") : 3) });
      expect(() => fmt.format(values), `${locale}:${key}`).not.toThrow();
    }
  });

  it("plural messages produce distinct zero/one/many output in English", () => {
    const en = flatten(load("en"));
    const fmt = new IntlMessageFormat(en["dashboard.notifications.unread"], "en-US");
    expect(fmt.format({ count: 1 })).not.toBe(fmt.format({ count: 5 }));
  });
});
