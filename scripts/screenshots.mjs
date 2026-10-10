// Responsive QA: captures desktop / tablet / mobile screenshots of a running
// SAVLINO build and records console errors and route status codes.
// Usage: BASE_URL=http://localhost:2736 node scripts/screenshots.mjs
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:2736";
const OUT = "screenshots";

const viewports = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "tablet", width: 834, height: 1194, isMobile: true },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const routes = [
  "/",
  "/collections",
  "/lookbook",
  "/our-story",
  "/craftsmanship",
  "/size-guide",
  "/faq",
  "/contact",
  "/shipping-returns",
  "/privacy",
  "/terms",
  "/collections/designer-blouses",
  "/collections/sarees",
  "/custom-stitching",
  "/login",
  "/register",
  "/partner",
  "/partner/login",
  "/partner/register",
  "/account",
  "/account/orders",
  "/partner/dashboard",
  "/partner/dashboard/commissions",
  "/admin",
  "/admin/orders",
  "/admin/payments",
  "/admin/partners",
  "/admin/analytics",
  "/admin/products",
  "/admin/apps",
  "/admin/studio",
  "/admin/settings",
  "/admin/stitching",
  "/admin/leads",
  "/admin/expenses",
  "/sitemap.xml",
  "/robots.txt",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
}

async function shot(page, path, opts = {}) {
  try {
    await page.screenshot({ path, timeout: 90000, ...opts });
  } catch (e) {
    report.screenshotFailures.push(`${path}: ${e.message.split("\n")[0]}`);
  }
}

const report = { base: BASE, consoleErrors: [], pageErrors: [], screenshotFailures: [], routes: [], layoutShift: {} };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(`[${vp.name}] ${m.text()}`));
  page.on("pageerror", (e) => report.pageErrors.push(`[${vp.name}] ${e.message}`));

  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(4500);
  await shot(page, `${OUT}/${vp.name}-hero.png`);
  report.layoutShift[vp.name] = await page.evaluate(() => window.__cls);

  await scrollThrough(page);
  for (const id of ["designer-blouses", "showcase", "collections", "lookbook", "partners"]) {
    await page.evaluate((s) => document.getElementById(s)?.scrollIntoView({ block: "start" }), id);
    await sleep(2200);
    await shot(page, `${OUT}/${vp.name}-${id}.png`);
  }
  await shot(page, `${OUT}/${vp.name}-full.png`, { fullPage: true, animations: "disabled" });

  if (vp.name === "mobile") {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await page.getByRole("button", { name: "Open menu" }).click();
    await sleep(900);
    await shot(page, `${OUT}/mobile-menu.png`);
  }
  await context.close();
}

// Reduced motion: hero must fall back to the static approved monogram.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(1500);
  await shot(page, `${OUT}/desktop-reduced-motion.png`);
  report.reducedMotionCanvasCount = await page.evaluate(() => document.querySelectorAll("#top canvas").length);
  await context.close();
}

// Light templates: website (forced via attribute) and CRM (via saved preference).
for (const mode of ["light", "porcelain"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((m) => {
    try {
      localStorage.setItem("savlino-crm-prefs", JSON.stringify({ mode: m }));
    } catch {}
  }, mode);
  const page = await context.newPage();
  page.on("pageerror", (e) => report.pageErrors.push(`[${mode}] ${e.message}`));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate((m) => document.documentElement.setAttribute("data-theme", m), mode);
  await sleep(4000);
  await shot(page, `${OUT}/${mode}-site-hero.png`);
  await page.evaluate(() => document.getElementById("custom-stitching")?.scrollIntoView());
  await sleep(2200);
  await shot(page, `${OUT}/${mode}-site-stitching.png`);
  for (const r of ["/admin", "/admin/stitching", "/admin/settings"]) {
    await page.goto(BASE + r, { waitUntil: "networkidle" });
    await sleep(2200);
    await shot(page, `${OUT}/${mode}-crm${r.replace(/\//g, "_")}.png`);
  }
  await context.close();
}

// Route health.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  for (const r of routes) {
    const res = await page.goto(BASE + r, { waitUntil: "domcontentloaded" });
    report.routes.push({ route: r, status: res?.status() ?? 0 });
    if (["/collections", "/our-story", "/size-guide", "/faq", "/contact", "/shipping-returns", "/collections/sarees", "/login", "/admin", "/admin/apps", "/admin/studio", "/admin/settings", "/admin/stitching", "/admin/leads"].includes(r)) {
      await sleep(1200);
      await shot(page, `${OUT}/route${r.replace(/\//g, "_")}.png`);
    }
  }
  await context.close();
}

await browser.close();
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const badRoutes = report.routes.filter((r) => r.status >= 400);
if (badRoutes.length || report.pageErrors.length) {
  console.error("QA failed:", { badRoutes, pageErrors: report.pageErrors });
  process.exit(1);
}
