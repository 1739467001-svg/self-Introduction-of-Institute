#!/usr/bin/env node
/*
 * 一键验收：每次改完都跑一遍。
 *
 *   node tools/check.cjs                    自带静态服务器，直接读 public/
 *   node tools/check.cjs --url http://…     检查任意地址（本地 nginx、线上站点）
 *   node tools/check.cjs --shots shots/     顺便按章节截图，供人工过目
 *
 * 五种宽度（360 / 375 / 768 / 1280 / 1920）：横向溢出、图片加载、控制台报错、
 * 请求失败与 4xx、页内锚点、重复 id、段落揭示、视频不预载、数字与条目一致；
 * 另测关掉 JS、减少动态效果；装了 axe-core 时再做 WCAG A/AA 检测。
 * 需要 playwright（可选 axe-core）。有失败项时退出码为 1。
 */
"use strict";
const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..", "public");
const WIDTHS = [[360, 740], [375, 812], [768, 1024], [1280, 800], [1920, 1080]];
const CHAPTERS = ["top", "summary", "specimens", "kind-b", "kind-c", "curriculum", "records", "directions", "correspondence"];
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".pdf": "application/pdf",
  ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const failures = [];
const warnings = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://local").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, path.normalize(p));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { "Content-Type": TYPES[".html"] });
        return res.end(fs.readFileSync(path.join(ROOT, "404.html")));
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// 像人一样慢慢滚到底，让懒加载图片和段落揭示都触发
async function slowScroll(page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    for (let y = 0; y < document.body.scrollHeight; y += 150) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(1200);
}

// 页内自检：所有数字都要和条目对得上
function inspect() {
  const num = (el) => parseInt(((el && el.textContent) || "").replace(/[^\d]/g, ""), 10);
  const all = (sel) => [...document.querySelectorAll(sel)];
  const shown = (el) => getComputedStyle(el).display !== "none";
  const ids = all("[id]").map((e) => e.id);
  const anchors = [...new Set(all('a[href^="#"]').map((a) => a.getAttribute("href")).filter((h) => h.length > 1))];
  const r = {
    // html/body 设了 overflow-x: clip，超宽内容被裁掉、不出滚动条；body.scrollWidth 仍会如实报出
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    images: all("img").length,
    broken: all("img").filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute("src")),
    hidden: all(".rv").filter((e) => shown(e) && getComputedStyle(e).opacity === "0").map((e) => e.className),
    missing: anchors.filter((h) => !document.getElementById(h.slice(1))),
    dupIds: [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))],
    mismatch: [],
  };
  const events = all(".ev").length, awards = all(".ev--award").length, roles = all(".chain li").length;
  const linked = all('[id^="no-"] .go').length;
  const tally = all("#records .tally b").map(num);
  const facts = all(".facts dd > b").map((b) => b.textContent.trim());
  const check = (label, stated, actual) => { if (String(stated) !== String(actual)) r.mismatch.push(`${label}：写的是 ${stated}，实际 ${actual}`); };
  if (tally.length >= 4) { check("记录·活动场数", tally[1], events); check("记录·角色数", tally[2], roles); check("记录·获奖次数", tally[3], awards); }
  if (facts.length >= 4) { check("总述·在线作品", facts[1], linked); check("总述·活动场数", facts[2], events); check("总述·获奖", facts[3], awards); }
  for (const a of all(".kinds a")) {
    const sec = document.querySelector(a.getAttribute("href"));
    if (sec) check(`分类 ${a.textContent.trim()}`, num(a.querySelector("span")), sec.querySelectorAll('[id^="no-"]').length);
  }
  const desc = (document.querySelector('meta[name="description"]') || {}).content || "";
  for (const s of [`${linked} 件`, `${events} 场`, `${awards} 次获奖`]) if (!desc.includes(s)) r.mismatch.push(`meta description 里没有「${s}」`);
  return r;
}

async function shoot(page, dir, w) {
  for (const [i, id] of CHAPTERS.entries()) {
    const ok = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      window.scrollTo({ top: id === "top" ? 0 : el.getBoundingClientRect().top + window.scrollY - (window.innerWidth <= 760 ? 104 : 70), behavior: "instant" });
      return true;
    }, id);
    if (!ok) continue;
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(dir, `${w}-${String(i).padStart(2, "0")}-${id}.png`) });
  }
}

(async () => {
  const server = arg("--url") ? null : await serve();
  const base = arg("--url") || `http://127.0.0.1:${server.address().port}/`;
  const shots = arg("--shots");
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  console.log(`验收 ${base}\n`);

  for (const [w, h] of WIDTHS) {
    const where = `${w}px`;
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    const errors = [], requested = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("requestfailed", (q) => { if (!q.url().endsWith(".mp4")) errors.push(`请求失败 ${q.url()}`); });
    page.on("response", (q) => { requested.push(q.url()); if (q.status() >= 400) errors.push(`${q.status()} ${q.url()}`); });
    await page.goto(base, { waitUntil: "networkidle" });
    await slowScroll(page);
    const r = await page.evaluate(inspect);
    const preloaded = requested.some((u) => u.endsWith(".mp4"));

    if (r.overflow > 0) fail(where, `横向溢出 ${r.overflow}px`);
    if (r.broken.length) fail(where, `图片未加载 ${r.broken.join(", ")}`);
    if (errors.length) fail(where, `报错 ${errors.join(" | ")}`);
    if (r.missing.length) fail(where, `锚点找不到目标 ${r.missing.join(", ")}`);
    if (r.dupIds.length) fail(where, `重复 id ${r.dupIds.join(", ")}`);
    if (r.hidden.length) fail(where, `段落未揭示 ${r.hidden.join(", ")}`);
    if (preloaded) fail(where, "视频在点击播放前就开始下载了");
    if (w === 1280) for (const m of r.mismatch) fail("数字核对", m);
    console.log(`${r.overflow || r.broken.length || errors.length || r.missing.length || r.dupIds.length || r.hidden.length || preloaded ? "✗" : "✓"} ${String(w).padStart(4)}px  溢出 ${r.overflow} · 图片 ${r.images - r.broken.length}/${r.images} · 报错 ${errors.length} · 锚点缺失 ${r.missing.length} · 重复 id ${r.dupIds.length} · 未揭示 ${r.hidden.length} · 视频预载 ${preloaded ? "是" : "否"}`);
    if (shots) await shoot(page, shots, w);
    await page.context().close();
  }

  // 关掉 JS：内容完整、没有横向溢出（JS 关闭时无法执行页面脚本，只看整页截图宽度）
  for (const w of [360, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "load" });
    const png = await page.screenshot({ fullPage: true });
    const width = png.readUInt32BE(16);
    if (width !== w) fail(`无 JS ${w}px`, `整页宽 ${width}px，有横向溢出`);
    console.log(`${width === w ? "✓" : "✗"} 无 JS ${w}px  整页 ${width}×${png.readUInt32BE(20)}`);
    if (shots) fs.writeFileSync(path.join(shots, `nojs-${w}-full.png`), png);
    await ctx.close();
  }

  // 减少动态效果：不滚动也全部可见，视频不自动播放
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => ({
      hidden: [...document.querySelectorAll(".rv")].filter((e) => getComputedStyle(e).display !== "none" && getComputedStyle(e).opacity === "0").length,
      autoplay: [...document.querySelectorAll("video")].some((v) => v.autoplay),
    }));
    if (r.hidden) fail("减少动态效果", `${r.hidden} 处内容仍隐藏`);
    if (r.autoplay) fail("减少动态效果", "视频设置了自动播放");
    console.log(`${r.hidden || r.autoplay ? "✗" : "✓"} 减少动态效果  隐藏 ${r.hidden} · 自动播放 ${r.autoplay ? "是" : "否"}`);
    await ctx.close();
  }

  // 无障碍：WCAG 2.x A/AA；serious 及以上算失败，其余只提示
  let axePath = null;
  try { axePath = require.resolve("axe-core/axe.min.js"); } catch (e) { warnings.push("没装 axe-core，跳过无障碍检测（npm i --no-save axe-core）"); }
  if (axePath) {
    const axeSrc = fs.readFileSync(axePath, "utf8");
    for (const [w, h] of [[1280, 800], [375, 812]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      await page.addScriptTag({ content: axeSrc });
      const res = await page.evaluate(() => window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      }));
      for (const v of res.violations) {
        const msg = `${v.id}（${v.nodes.length} 处）${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("；")}`;
        if (v.impact === "serious" || v.impact === "critical") fail(`axe ${w}px`, msg); else warnings.push(`axe ${w}px ${v.impact}：${msg}`);
      }
      console.log(`${res.violations.some((v) => v.impact === "serious" || v.impact === "critical") ? "✗" : "✓"} axe ${w}px  违规 ${res.violations.length} 类`);
      await ctx.close();
    }
  }

  await browser.close();
  if (server) server.close();
  for (const w of warnings) console.log(`· 提示 ${w}`);
  if (failures.length) {
    console.log(`\n✗ ${failures.length} 项未通过：`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n✓ 全部通过${shots ? `，截图在 ${shots}` : ""}`);
})().catch((e) => { console.error(e); process.exit(1); });
