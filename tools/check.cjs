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
 * 另测关掉 JS、减少动态效果；两侧「观察指南 / 采集册」与彩蛋（键盘、显微镜、盖章、控制台、迷路、
 * 进度保存）和匿名统计信标；自带服务器时再用样本日志测统计面板（含 XSS 样本）；
 * 装了 axe-core 时做 WCAG A/AA 检测（含两侧停靠、抽屉展开）。
 * 需要 playwright（可选 axe-core）。有失败项时退出码为 1。
 */
"use strict";
const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..", "public");
const SAMPLE_LOG = path.join(__dirname, "fixtures", "hits.sample.jsonl");
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
      if (p === "/hit") { res.writeHead(204); return res.end(); }            // 统计信标，线上由 nginx 记日志
      if (p === "/stats/hits.log") {                                          // 统计面板读样本日志
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(fs.readFileSync(SAMPLE_LOG));
      }
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
    const errors = [], requested = [], beacons = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("request", (q) => { if (q.url().includes("/hit?")) beacons.push(q.url()); });
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
    if (w === 1280) {
      const views = beacons.filter((u) => u.includes("/hit?e=view")).length;
      if (views !== 1) fail("统计信标", `一次访问发了 ${views} 条 view（应为 1）`);
      if (!beacons.some((u) => u.includes("/hit?e=read"))) fail("统计信标", "滚到底也没有发出「读到某章」");
    }
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

  // 两侧与彩蛋：页边标签、键盘、显微镜、盖章、控制台、迷路，进度要能存下来，并发出匿名信标
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const beacons = [];
    page.on("pageerror", (e) => fail("互动", `脚本报错 ${e}`));
    page.on("request", (q) => { if (q.url().includes("/hit?")) beacons.push(q.url()); });
    const passed = [];
    const step = async (label, fn) => {
      try { await fn(); passed.push(label); } catch (e) { fail("互动", `${label}：${e.message.split("\n")[0]}`); }
    };
    const isOpen = (id) => page.evaluate((id) => document.getElementById(id).classList.contains("is-open"), id);
    await page.goto(base, { waitUntil: "networkidle" });

    await step("页边标签", async () => {
      for (const sel of [".tab--guide", ".tab--eggs"]) if (!(await page.locator(sel).isVisible())) throw new Error(`${sel} 不可见`);
    });
    await step("? 打开指南、Esc 收起", async () => {
      await page.keyboard.press("?");
      if (!(await isOpen("rail-guide"))) throw new Error("没打开");
      await page.keyboard.press("Escape");
      if (await isOpen("rail-guide")) throw new Error("没收起");
    });
    await step("J 翻到下一章", async () => {
      await page.keyboard.press("j");
      await page.waitForTimeout(300);
      const top = await page.evaluate(() => document.getElementById("summary").getBoundingClientRect().top);
      if (Math.abs(top) > 140) throw new Error(`「总述」离视口顶部 ${Math.round(top)}px`);
    });
    await step("敲 cjy 开显微镜", async () => {
      await page.keyboard.type("cjy");
      if (!(await page.locator(".lens").count())) throw new Error("没出现");
      await page.keyboard.press("Escape");
      if (await page.locator(".lens").count()) throw new Error("Esc 没收起");
    });
    await step("盖三枚章、不溢出、不跳转", async () => {
      await page.click(".tab--guide");
      await page.click("[data-act=seal]");
      const before = page.url();
      for (const [x, y] of [[300, 300], [640, 420], [1275, 500]]) await page.mouse.click(x, y);
      const r = await page.evaluate(() => ({
        n: document.querySelectorAll(".stamp").length,
        over: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      }));
      if (r.n !== 3) throw new Error(`盖了 ${r.n} 枚`);
      if (r.over > 0) throw new Error(`横向溢出 ${r.over}px`);
      if (page.url() !== before) throw new Error(`盖章时跳到了 ${page.url()}`);
      await page.keyboard.press("Escape");
    });
    await step("控制台 cjy.hello()", async () => {
      const said = await page.evaluate(() => window.cjy && window.cjy.hello());
      if (!/陈俊烨/.test(said || "")) throw new Error("没有返回问候");
    });
    await step("迷路：404 页记下彩蛋", async () => {
      await page.goto(new URL("no-such-room", base).href, { waitUntil: "load" });
      if (await page.locator("#egg-note").isHidden()) throw new Error("没显示采集提示");
    });
    await step("进度存下来、计数一致", async () => {
      await page.goto(base, { waitUntil: "networkidle" });
      const r = await page.evaluate(() => ({
        eggs: JSON.parse(localStorage.getItem("cjy-eggs") || "[]"),
        count: document.querySelector(".rail__count").textContent,
        found: document.querySelectorAll(".egg.is-found").length,
      }));
      for (const id of ["scope", "seal", "console", "lost"]) if (!r.eggs.includes(id)) throw new Error(`没记下 ${id}`);
      if (!r.count.startsWith(r.found + " ")) throw new Error(`计数「${r.count}」与已采集 ${r.found} 枚不符`);
    });
    await step("匿名信标", async () => {
      const views = beacons.filter((u) => u.includes("e=view")).length;
      if (views !== 1) throw new Error(`同一会话发了 ${views} 条 view`);
      for (const id of ["scope", "seal", "console", "lost"]) {
        if (!beacons.some((u) => u.includes("e=egg") && u.includes("p=" + id))) throw new Error(`没发出彩蛋 ${id}`);
      }
    });
    await ctx.close();

    // 宽屏：过了封面两侧停靠展开、标签收起；手机：底部两枚按钮，点开是底部抽屉
    const wide = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
    const wp = await wide.newPage();
    await wp.goto(base, { waitUntil: "networkidle" });
    const onCover = await wp.evaluate(() => getComputedStyle(document.getElementById("rail-eggs")).visibility);
    await wp.evaluate(() => window.scrollTo(0, document.getElementById("specimens").offsetTop));
    await wp.waitForTimeout(400);
    const docked = await wp.evaluate(() => ({
      rail: getComputedStyle(document.getElementById("rail-eggs")).visibility,
      tab: getComputedStyle(document.querySelector(".tab--eggs")).display,
    }));
    if (onCover !== "hidden") fail("互动", "1920px 封面上两侧不该展开（会压住封面）");
    if (docked.rail !== "visible" || docked.tab !== "none") fail("互动", `1920px 过了封面两侧没有停靠（${JSON.stringify(docked)}）`);
    else passed.push("1920px 两侧停靠");
    await wp.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wp.waitForTimeout(400);
    const atEnd = await wp.evaluate(() => getComputedStyle(document.getElementById("rail-eggs")).visibility);
    if (atEnd !== "hidden") fail("互动", "1920px 读到封底时两侧应收起（会压在深色封底上）");
    await wide.close();

    // 页边标签不能压到正文（881px 起是页边标签，再窄是底部按钮）
    for (const w of [768, 881, 1024]) {
      const ctx2 = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
      const p2 = await ctx2.newPage();
      await p2.goto(base, { waitUntil: "networkidle" });
      const g = await p2.evaluate(() => {
        const t = document.querySelector(".tab--guide").getBoundingClientRect(), b = document.querySelector("#summary .brief").getBoundingClientRect();
        return { side: getComputedStyle(document.querySelector(".tab--guide")).top !== "auto" && t.top < innerHeight - 80, tabRight: t.right, textLeft: b.left };
      });
      if (g.side && g.tabRight > g.textLeft) fail("互动", `${w}px 页边标签压住正文（标签右缘 ${Math.round(g.tabRight)} > 正文左缘 ${Math.round(g.textLeft)}）`);
      await ctx2.close();
    }

    const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    const pp = await phone.newPage();
    await pp.goto(base, { waitUntil: "networkidle" });
    await pp.tap(".tab--eggs");
    const m = await pp.evaluate(() => {
      const t = document.querySelector(".tab--eggs").getBoundingClientRect(), r = document.getElementById("rail-eggs").getBoundingClientRect();
      return { tabBottom: Math.round(innerHeight - t.bottom), open: document.getElementById("rail-eggs").classList.contains("is-open"),
               inside: r.left >= 0 && r.right <= innerWidth, over: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth };
    });
    if (!m.open || !m.inside || m.over > 0 || m.tabBottom > 40) fail("互动", `375px 底部按钮 / 抽屉异常（${JSON.stringify(m)}）`);
    else passed.push("375px 底部抽屉");
    await phone.close();
    console.log(`${failures.some((f) => f.startsWith("互动")) ? "✗" : "✓"} 两侧与彩蛋  ${passed.join(" · ")}`);
  }

  // 统计面板：用样本日志渲染；日志里的 HTML / 脚本只能当文字显示（线上 /stats/ 有密码，只在自带服务器时测）
  if (server) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("dialog", (d) => { errors.push(`弹窗 ${d.message()}`); d.dismiss(); });
    await page.goto(new URL("stats/?range=all", base).href, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => ({
      visits: (document.querySelector("#tiles dd") || {}).textContent,
      recent: document.querySelectorAll("#recent tbody tr").length,
      bars: document.querySelectorAll("#daily .bar").length,
      injected: document.querySelectorAll("main img, main script").length + (window.__pwned || 0),
      shownAsText: [...document.querySelectorAll("#sources td")].some((td) => td.textContent.includes("<img")),
      boss: [...document.querySelectorAll("#sources td")].some((td) => td.textContent === "BOSS 直聘"),
    }));
    if (errors.length) fail("统计面板", `报错 ${errors.join(" | ")}`);
    if (r.visits !== "5" || r.recent !== 5) fail("统计面板", `样本应为 5 次访问（爬虫排除），实际 ${r.visits} / 明细 ${r.recent} 行`);
    if (!r.bars) fail("统计面板", "每日访问图没有画出柱子");
    if (r.injected) fail("统计面板", "日志里的 HTML 被当成了标签执行");
    if (!r.shownAsText) fail("统计面板", "日志里的可疑内容没有按原文显示");
    if (!r.boss) fail("统计面板", "来源没有识别出 BOSS 直聘");
    const bad = failures.some((f) => f.startsWith("统计面板"));
    console.log(`${bad ? "✗" : "✓"} 统计面板  访问 ${r.visits} · 明细 ${r.recent} 行 · 柱 ${r.bars} · 注入 ${r.injected}`);
    if (shots) await page.screenshot({ path: path.join(shots, "stats-1280.png"), fullPage: true });
    await ctx.close();
  }

  // 无障碍：WCAG 2.x A/AA；serious 及以上算失败，其余只提示
  let axePath = null;
  try { axePath = require.resolve("axe-core/axe.min.js"); } catch (e) { warnings.push("没装 axe-core，跳过无障碍检测（npm i --no-save axe-core）"); }
  if (axePath) {
    const axeSrc = fs.readFileSync(axePath, "utf8");
    const scenes = [
      [1280, 800, "", null],
      [375, 812, "", null],
      [1920, 1080, "（两侧停靠）", async (p) => { await p.evaluate(() => window.scrollTo(0, document.getElementById("specimens").offsetTop)); await p.waitForTimeout(400); }],
      [1280, 800, "（采集册展开）", async (p) => { await p.click(".tab--eggs"); await p.waitForTimeout(300); }],
    ];
    for (const [w, h, label, prep] of scenes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      if (prep) await prep(page);
      await page.addScriptTag({ content: axeSrc });
      const res = await page.evaluate(() => window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      }));
      for (const v of res.violations) {
        const msg = `${v.id}（${v.nodes.length} 处）${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("；")}`;
        if (v.impact === "serious" || v.impact === "critical") fail(`axe ${w}px${label}`, msg); else warnings.push(`axe ${w}px${label} ${v.impact}：${msg}`);
      }
      console.log(`${res.violations.some((v) => v.impact === "serious" || v.impact === "critical") ? "✗" : "✓"} axe ${w}px${label}  违规 ${res.violations.length} 类`);
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
