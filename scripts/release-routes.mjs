import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const BASE_ROUTES = [
  "/",
  "/planner",
  "/warehouse",
  "/packing",
  "/container",
  "/fba",
  "/answers",
  "/api-docs",
  "/api-pricing",
  "/cubing-software",
  "/box-catalog",
  "/order-quote",
  "/about",
  "/privacy",
  "/terms",
  "/guides",
  "/guides/mixed-pallet-height",
  "/reality-checks",
  "/warehouse-space-calculator",
  "/forklift-aisle-width-calculator",
  "/dimensional-weight-calculator",
  "/cbm-calculator",
  "/pallet-calculator",
  "/pallet-storage-cost-calculator",
  "/freight-class-calculator",
  "/ti-hi-calculator",
  "/pallet-builder",
  "/pallet-height-calculator",
  "/pallets-per-container",
  "/guides/fba-size-tiers-2025",
  "/guides/cbm-calculator-shipping",
  "/guides/container-loading-optimization",
  "/guides/dimensional-weight-calculator",
  "/guides/products-per-carton",
  "/guides/amazon-dimensional-weight",
  "/guides/fba-fee-calculator",
  "/guides/pallet-calculator",
];

// programmatic answer pages — same single source as src/lib/answers.ts
// (containers/trucks pack cartons IN; pallets stack cartons ON)
const answersData = JSON.parse(readFileSync(new URL("../src/data/answers.json", import.meta.url), "utf8"));
const ANSWER_ROUTES = [];
const vesselGroups = [
  { list: answersData.containers, prep: "in" },
  { list: answersData.pallets ?? [], prep: "on" },
  { list: answersData.trucks ?? [], prep: "in" },
];
for (const { list, prep } of vesselGroups) {
  for (const v of list) {
    ANSWER_ROUTES.push(`/answers/cartons-${prep}-${v.slug}`);
    for (const c of answersData.cartons) {
      ANSWER_ROUTES.push(
        `/answers/how-many-${c.l}x${c.w}x${c.h}-cartons-fit-${prep}-a-${v.slug}`
      );
    }
  }
}

// competitor comparison pages — single source src/data/competitors.json
const competitorsData = JSON.parse(
  readFileSync(new URL("../src/data/competitors.json", import.meta.url), "utf8")
);
const COMPARE_ROUTES = competitorsData.competitors.map(
  (c) => `/compare/${c.slug}`
);

export const EN_ROUTES = [...BASE_ROUTES, ...ANSWER_ROUTES, ...COMPARE_ROUTES];
// prerendered but noindex + kept out of the sitemap: without a snapshot the
// SPA fallback serves the HOMEPAGE snapshot (three.js tag and all) for /embed
const NOSITEMAP_ROUTES = ["/embed"];
// every page exists in both locales; /zh/* serves Traditional Chinese
export const ROUTES = [...EN_ROUTES, ...NOSITEMAP_ROUTES].flatMap((r) => [
  r,
  r === "/" ? "/zh" : `/zh${r}`,
]);

export const ORDER_ROUTES = [
  "/pallet-height-calculator",
  "/zh/pallet-height-calculator",
  ...["de", "fr", "es", "pt"].map((l) => `/${l}/pallet-height-calculator`),
];
ROUTES.push(...ORDER_ROUTES.slice(2));
export const INDEXABLE_ROUTES = ROUTES.filter((r) => !r.endsWith("/embed"));
export const outputPath = (route, dir = "dist") =>
  join(dir, route === "/" ? "index.html" : `${route.slice(1)}.html`);

const SITE = "https://www.dimpack3d.com";
export function writeSitemap(dir = "dist") {
  const alt = (route, lang) =>
    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${route}"/>`;
  const urls = INDEXABLE_ROUTES.map((route) => {
    const isOrder = ORDER_ROUTES.includes(route);
    const en = route === "/zh" ? "/" : route.replace(/^\/zh(?=\/)/, "");
    const alternates = isOrder
      ? ORDER_ROUTES.map((r, i) =>
          alt(r, ["en", "zh-Hant", "de", "fr", "es", "pt"][i])
        )
      : [alt(en, "en"), alt(en === "/" ? "/zh" : `/zh${en}`, "zh-Hant")];
    alternates.push(alt(isOrder ? ORDER_ROUTES[0] : en, "x-default"));
    return `  <url><loc>${SITE}${route}</loc>\n${alternates.join(
      "\n"
    )}\n  </url>`;
  });
  writeFileSync(
    join(dir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join(
      "\n"
    )}\n</urlset>\n`
  );
}
export function fixMeta(html, route) {
  const desc = [...html.matchAll(/<meta[^>]*>/g)]
    .find(
      (m) => /name="description"/.test(m[0]) && /data-rh="true"/.test(m[0])
    )?.[0]
    .match(/content="([^"]*)"/)?.[1];
  if (!desc && route.endsWith('/embed')) return html;
  if (!desc) throw new Error(`${route}: missing route description`);
  html = html.replace(/<meta name="description"(?![^>]*data-rh)[^>]*>\s*/g, "");
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1];
  for (const [kind, key, value] of [
    ["property", "og:title", title],
    ["property", "og:description", desc],
    ["property", "og:url", SITE + route],
    ["name", "twitter:title", title],
    ["name", "twitter:description", desc],
  ]) {
    html = html.replace(
      new RegExp(`<meta ${kind}="${key}" content="[^"]*"`),
      () => `<meta ${kind}="${key}" content="${value}"`
    );
  }
  return html;
}
export function validateSnapshot(html, route) {
  const tags = html.match(/<link[^>]*>/g) || [];
  const canonicals = tags.filter((s) => /rel="canonical"/.test(s));
  const expected = SITE + route;
  if (!route.endsWith("/embed") && (canonicals.length !== 1 || !canonicals[0].includes(`href="${expected}"`)))
    throw new Error(`${route}: invalid canonical`);
  if ((html.match(/name="description"/g) || []).length !== 1)
    throw new Error(`${route}: duplicate/missing description`);
  if (
    !html.includes("</body>") ||
    html.length < 5000 ||
    (!route.endsWith("/embed") && !/<main[ >]/.test(html))
  )
    throw new Error(`${route}: incomplete snapshot`);
  const noindex = /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(
    html
  );
  if (noindex !== route.endsWith("/embed"))
    throw new Error(`${route}: unexpected indexing directive`);
  if (ORDER_ROUTES.includes(route)) {
    for (const r of ORDER_ROUTES)
      if (
        !tags.some(
          (s) => /rel="alternate"/.test(s) && s.includes(`href="${SITE}${r}"`)
        )
      )
        throw new Error(`${route}: missing language ${r}`);
  }
  for (const asset of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))
    if (!existsSync(new URL(`../dist${asset[1]}`, import.meta.url)))
      throw new Error(`${route}: missing asset ${asset[1]}`);
}
export function validateRelease(dir = "dist") {
  for (const route of ROUTES)
    validateSnapshot(readFileSync(outputPath(route, dir), "utf8"), route);
  const sitemap = readFileSync(join(dir, "sitemap.xml"), "utf8");
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  if (
    locs.length !== INDEXABLE_ROUTES.length ||
    new Set(locs).size !== locs.length ||
    INDEXABLE_ROUTES.some((r) => !locs.includes(SITE + r))
  )
    throw new Error("Incomplete sitemap");
  return { snapshots: ROUTES.length, indexed: INDEXABLE_ROUTES.length };
}
