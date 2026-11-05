/* 作品博物志 · 互动与彩蛋
   两侧是「观察指南」（左）与「采集册」（右）：宽屏时停在页边，窄屏时收成页边的标签，
   手机上是底部两枚小按钮。九枚彩蛋的进度只存在访客自己的浏览器里。
   没有这份脚本时两侧整体不出现，页面照常可读；尊重「减少动态效果」。 */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = window.matchMedia("(min-width: 1640px)");
  var hit = window.cjyHit || function () {};
  var KEY = "cjy-eggs";

  var EGGS = [
    { id: "nucleus", name: "细胞核", hint: "放射虫的正中心，可以点一下。", note: "好奇心，是最好的简历。" },
    { id: "spin", name: "离心力", hint: "把封面的放射虫转上三圈。", note: "网络转起来，每个节点都会亮。" },
    { id: "seal", name: "三枚印", hint: "印章不只盖一次。", note: "盖了章，就算数。" },
    { id: "scope", name: "显微镜", hint: "在键盘上敲出我的名字缩写；手机上长按封面的放射虫。", note: "凑近看，细节都在。按 Esc 收起。" },
    { id: "film", name: "九十秒", hint: "把 Film 1 看完。", note: "九十秒，谢谢你看完。" },
    { id: "end", name: "封底", hint: "一直读到最后一页。", note: "从封面到封底，你读完了整本博物志。" },
    { id: "lost", name: "迷路", hint: "走进一间不存在的展厅。", note: "迷路也是参观的一部分。" },
    { id: "night", name: "夜读", hint: "深夜来访的人，会收到一句话。", note: "夜深了，谢谢你还在看。早点休息。" },
    { id: "console", name: "控制台", hint: "开发者知道该去哪里找。", note: "我们大概是同类。" }
  ];

  function load() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (e) {} }
  var found = load();

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------------------------------------------------- 两侧：观察指南 · 采集册 */
  function rail(id, kicker, title) {
    var a = el("aside", "rail rail--" + id);
    a.id = "rail-" + id;
    a.setAttribute("aria-labelledby", a.id + "-title");
    var close = el("button", "rail__close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "收起" + title);
    a.appendChild(close);
    a.appendChild(el("p", "rail__kicker", kicker));
    var h = el("h2", "rail__title", title);
    h.id = a.id + "-title";
    h.tabIndex = -1;
    a.appendChild(h);
    return a;
  }

  var guide = rail("guide", "Field Guide", "观察指南");
  var list = el("ol", "rail__list");
  [
    ["拖动放射虫", "封面的 Fig. 1 会跟着你转，点一下会泛起涟漪。"],
    ["盖一枚章", null],
    ["键盘翻页", "J 下一章 · K 上一章 · ? 打开这份指南。"],
    ["采集彩蛋", "九枚彩蛋藏在页面里，提示在右侧的采集册。"]
  ].forEach(function (row, i) {
    var li = el("li");
    if (i === 2) li.className = "only-keys";
    li.appendChild(el("b", null, row[0]));
    if (row[1]) {
      li.appendChild(el("span", null, row[1]));
    } else {
      var btn = el("button", "rail__btn", "拿起印章");
      btn.type = "button";
      btn.setAttribute("data-act", "seal");
      btn.setAttribute("aria-pressed", "false");
      li.appendChild(btn);
      li.appendChild(el("span", null, "再点页面任意处，盖下朱砂印。Esc 收起。"));
    }
    list.appendChild(li);
  });
  guide.appendChild(list);

  var book = rail("eggs", "Collection", "采集册");
  var count = el("span", "rail__count");
  book.querySelector(".rail__title").appendChild(count);
  var eggList = el("ol", "eggs");
  book.appendChild(eggList);
  var allNote = el("p", "eggs__all");
  allNote.hidden = true;
  allNote.appendChild(document.createTextNode("九枚全部采集。能找齐的人，我很想认识你——"));
  var mail = el("a", null, "写信给我");
  mail.href = "mailto:chenjunyepro@gmail.com?subject=" + encodeURIComponent("九枚");
  allNote.appendChild(mail);
  allNote.appendChild(document.createTextNode("，标题写「九枚」。"));
  book.appendChild(allNote);
  book.appendChild(el("p", "rail__foot", "进度只存在你的浏览器里。"));

  function tab(id, label, controls) {
    var b = el("button", "tab tab--" + id);
    b.type = "button";
    b.setAttribute("aria-controls", controls.id);
    b.setAttribute("aria-expanded", "false");
    var word = el("span", "tab__word");
    label.split("").forEach(function (ch) { word.appendChild(el("span", null, ch)); });
    b.appendChild(word);
    return b;
  }
  var guideTab = tab("guide", "观察指南", guide);
  var eggsTab = tab("eggs", "采集册", book);
  var tabCount = el("span", "tab__n");    // 读屏读到的就是可见的「采集册 3/9」
  eggsTab.appendChild(tabCount);

  var toast = el("div", "toast");
  toast.setAttribute("role", "status");
  toast.hidden = true;

  var footer = document.querySelector(".colophon");
  [guide, book, guideTab, eggsTab, toast].forEach(function (n) { document.body.insertBefore(n, footer); });

  function render() {
    eggList.textContent = "";
    EGGS.forEach(function (egg) {
      var got = found.indexOf(egg.id) >= 0;
      var li = el("li", "egg" + (got ? " is-found" : ""));
      li.appendChild(el("span", got ? "seal seal--xs egg__mark" : "egg__mark", got ? "藏" : "?"));
      var text = el("span", "egg__text");
      text.appendChild(el("b", null, got ? egg.name : "？？？"));
      text.appendChild(el("small", null, got ? egg.note : egg.hint));
      li.appendChild(text);
      eggList.appendChild(li);
    });
    var n = found.filter(function (id) { return EGGS.some(function (e) { return e.id === id; }); }).length;
    count.textContent = n + " / " + EGGS.length;
    tabCount.textContent = n + "/" + EGGS.length;
    allNote.hidden = n < EGGS.length;
  }
  render();

  var toastTimer = 0;
  function say(title, body) {
    toast.hidden = false;                  // 先显示再写字，读屏才会播报
    toast.textContent = "";
    toast.appendChild(el("b", null, title));
    toast.appendChild(el("span", null, body));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 5200);
  }

  function find(id) {
    if (found.indexOf(id) >= 0) return false;
    var egg = EGGS.filter(function (e) { return e.id === id; })[0];
    if (!egg) return false;
    found.push(id);
    save();
    render();
    hit("egg", id);
    var n = Math.min(found.length, EGGS.length);
    say("采集到一枚彩蛋 · " + egg.name + "（" + n + "/" + EGGS.length + "）", egg.note);
    if (n === EGGS.length) {
      hit("egg", "all");
      setTimeout(function () { say("九枚全部采集", "能找齐的人，我很想认识你。采集册底部有我的邮箱。"); }, 5400);
    }
    return true;
  }

  /* 打开 / 收起抽屉；宽屏停靠时两侧本来就展开 */
  function docked() { return wide.matches && doc.classList.contains("past-cover") && !doc.classList.contains("at-end"); }
  var lastTab = null;
  function openRail(r, t) {
    closeRails();
    r.classList.add("is-open");
    t.setAttribute("aria-expanded", "true");
    lastTab = t;
    r.querySelector(".rail__title").focus({ preventScroll: true });
    hit("ui", r.id);
  }
  function closeRails(back) {
    [[guide, guideTab], [book, eggsTab]].forEach(function (p) {
      if (!p[0].classList.contains("is-open")) return;
      p[0].classList.remove("is-open");
      p[1].setAttribute("aria-expanded", "false");
      if (back && lastTab === p[1]) p[1].focus({ preventScroll: true });
    });
  }
  guideTab.addEventListener("click", function () { guide.classList.contains("is-open") ? closeRails(true) : openRail(guide, guideTab); });
  eggsTab.addEventListener("click", function () { book.classList.contains("is-open") ? closeRails(true) : openRail(book, eggsTab); });
  [guide, book].forEach(function (r) {
    r.querySelector(".rail__close").addEventListener("click", function () { closeRails(true); });
  });
  document.addEventListener("click", function (e) {
    if (docked() || stamping) return;
    if (!e.target.closest(".rail, .tab")) closeRails(false);
  });

  /* 宽屏两侧只在纸面上停靠展开：封面与封底是深色整版，那里收回成页边标签 */
  var cover = document.getElementById("top");
  if (cover && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      doc.classList.toggle("past-cover", !entries[0].isIntersecting);
    }).observe(cover);
    if (footer) new IntersectionObserver(function (entries) {
      doc.classList.toggle("at-end", entries[0].isIntersecting);
    }).observe(footer);
  } else {
    doc.classList.add("past-cover");
  }

  /* ---------------------------------------------------- Fig. 1：拖动旋转、点按涟漪、细胞核 */
  var spec = document.getElementById("specimen");
  var svg = spec && spec.querySelector("svg");
  if (svg) {
    var angle = 0, vel = 0, last = 0, lastT = 0, travelled = 0, spinRaf = 0;
    var dragging = false, moved = false, downX = 0, downY = 0, pressTimer = 0;
    var center = function () {
      var r = spec.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, left: r.left, top: r.top };
    };
    var bearing = function (e) { var c = center(); return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; };
    var apply = function () { svg.style.transform = "rotate(" + angle.toFixed(2) + "deg)"; };
    var spun = function () {
      if (travelled < 1080) return;
      travelled = -1e9;                      // 只触发一次
      find("spin");
      spec.classList.add("is-bloom");
      setTimeout(function () { spec.classList.remove("is-bloom"); }, 1500);
    };
    var coast = function () {
      vel *= 0.95;
      angle += vel;
      travelled += Math.abs(vel);
      apply();
      spun();
      spinRaf = Math.abs(vel) > 0.05 ? requestAnimationFrame(coast) : 0;
    };
    var ripple = function (x, y, core) {
      if (reduce) return;
      var c = center();
      var r = el("span", "ripple" + (core ? " ripple--core" : ""));
      r.style.left = (x - c.left) + "px";
      r.style.top = (y - c.top) + "px";
      spec.appendChild(r);
      setTimeout(function () { r.remove(); }, 1700);
    };

    spec.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      dragging = true; moved = false;
      downX = e.clientX; downY = e.clientY;
      last = bearing(e); lastT = performance.now(); vel = 0;
      cancelAnimationFrame(spinRaf);
      spec.classList.add("is-grabbing");
      try { spec.setPointerCapture(e.pointerId); } catch (err) {}
      clearTimeout(pressTimer);
      if (e.pointerType !== "mouse") pressTimer = setTimeout(function () { if (!moved) { dragging = false; toggleLens(downX, downY); } }, 650);
    });
    spec.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) { moved = true; clearTimeout(pressTimer); }
      if (!moved) return;
      var a = bearing(e), d = a - last, now = performance.now();
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      vel = d / Math.max(16, now - lastT) * 16;
      last = a; lastT = now;
      angle += d; travelled += Math.abs(d);
      apply();
      spun();
    });
    spec.addEventListener("pointerup", function (e) {
      clearTimeout(pressTimer);
      if (!dragging) return;
      dragging = false;
      spec.classList.remove("is-grabbing");
      if (moved) { if (!reduce) spinRaf = requestAnimationFrame(coast); return; }
      var c = center(), dist = Math.hypot(e.clientX - c.x, e.clientY - c.y);
      var core = dist < c.w * 0.06;
      ripple(e.clientX, e.clientY, core);
      if (core) find("nucleus");
    });
    spec.addEventListener("pointercancel", function () {
      clearTimeout(pressTimer);
      dragging = false;
      spec.classList.remove("is-grabbing");
    });
  }

  /* ---------------------------------------------------- 盖章：拿起印章，点哪儿盖哪儿 */
  var stamping = false, stamps = 0;
  var sealBtn = guide.querySelector("[data-act=seal]");
  function setStamping(on) {
    stamping = on;
    doc.classList.toggle("is-stamping", on);
    sealBtn.setAttribute("aria-pressed", on ? "true" : "false");
    sealBtn.textContent = on ? "放下印章" : "拿起印章";
    if (on) {
      if (!docked()) closeRails(false);
      say("印章在手", "点页面任意处盖章；再点一次「放下印章」或按 Esc 收起。");
    }
  }
  sealBtn.addEventListener("click", function (e) { e.stopPropagation(); setStamping(!stamping); });
  document.addEventListener("click", function (e) {
    if (!stamping || e.target.closest(".rail, .tab, .toast")) return;
    e.preventDefault();
    e.stopPropagation();
    var s = el("span", "stamp", "陈");
    s.setAttribute("aria-hidden", "true");
    var size = 52, maxX = doc.clientWidth - size - 4;
    s.style.left = Math.max(4, Math.min(maxX, e.pageX - size / 2)) + "px";
    s.style.top = (e.pageY - size / 2) + "px";
    s.style.setProperty("--r", (Math.random() * 20 - 10).toFixed(1) + "deg");
    document.body.appendChild(s);
    var all = document.querySelectorAll(".stamp");
    if (all.length > 24) all[0].remove();
    if (++stamps === 3) find("seal");
  }, true);

  /* ---------------------------------------------------- 显微镜：敲 cjy，或手机上长按放射虫 */
  var lens = null;
  function moveLens(x, y) {
    if (!lens) return;
    lens.style.setProperty("--lx", x + "px");
    lens.style.setProperty("--ly", y + "px");
  }
  function toggleLens(x, y) {
    if (lens) { lens.remove(); lens = null; return; }
    lens = el("div", "lens");
    lens.setAttribute("aria-hidden", "true");
    var ns = "http://www.w3.org/2000/svg";
    var ring = document.createElementNS(ns, "svg");
    ring.setAttribute("viewBox", "-130 -130 260 260");
    var d = "";
    for (var deg = 0; deg < 360; deg += 10) {
      var a = deg * Math.PI / 180, r0 = 121, r1 = deg % 30 ? 126 : 130;
      d += "M" + (r0 * Math.cos(a)).toFixed(1) + "," + (r0 * Math.sin(a)).toFixed(1) + "L" + (r1 * Math.cos(a)).toFixed(1) + "," + (r1 * Math.sin(a)).toFixed(1);
    }
    ring.innerHTML = '<circle r="120" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
      '<path d="' + d + '" stroke="currentColor" stroke-width="1"/>' +
      '<path d="M-8,0H8M0,-8V8" stroke="currentColor" stroke-width=".8" opacity=".7"/>';
    lens.appendChild(ring);
    document.body.appendChild(lens);
    moveLens(x != null ? x : window.innerWidth / 2, y != null ? y : window.innerHeight / 2);
    find("scope");
    say("显微镜已就位", "移动鼠标或手指观察，按 Esc 收起；再敲一次 cjy 也能收起。");
  }
  document.addEventListener("pointermove", function (e) { if (lens) moveLens(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener("pointerdown", function (e) { if (lens && e.pointerType !== "mouse") moveLens(e.clientX, e.clientY); }, { passive: true });

  /* ---------------------------------------------------- 键盘：J / K 翻章，? 打开指南，Esc 收起一切 */
  var typed = "", typedAt = 0;
  function sections() {
    return [cover].concat([].slice.call(document.querySelectorAll(".ch")), [footer]).filter(Boolean);
  }
  function jump(dir) {
    var list = sections(), y = window.scrollY + 90, i = 0;
    for (var k = 0; k < list.length; k++) if (list[k].getBoundingClientRect().top + window.scrollY <= y) i = k;
    var next = list[Math.max(0, Math.min(list.length - 1, i + dir))];
    next.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "Escape") {
      if (lens) toggleLens();
      if (stamping) setStamping(false);
      closeRails(true);
      return;
    }
    var key = (e.key || "").toLowerCase();
    var now = Date.now();
    typed = (now - typedAt < 1200 ? typed : "") + key;
    typed = typed.slice(-3);
    typedAt = now;
    if (typed === "cjy") { typed = ""; toggleLens(); return; }
    if (key === "j" && typed !== "cj") jump(1);
    else if (key === "k") jump(-1);
    else if (e.key === "?") {
      if (docked()) guide.querySelector(".rail__title").focus({ preventScroll: true });
      else guide.classList.contains("is-open") ? closeRails(true) : openRail(guide, guideTab);
    }
  });

  /* ---------------------------------------------------- 其余彩蛋：看完影片、读到封底、深夜来访、控制台 */
  var film = document.querySelector(".film video");
  if (film) film.addEventListener("ended", function () { find("film"); });

  if (footer && "IntersectionObserver" in window) {
    var endSeen = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      find("end");
      endSeen.disconnect();
    }, { threshold: 0.4 });
    endSeen.observe(footer);
  }

  var hour = new Date().getHours();
  if (hour >= 23 || hour < 5) setTimeout(function () { find("night"); }, 2500);

  window.cjy = {
    hello: function () {
      find("console");
      return "你好，我是陈俊烨。能找到这里，我们大概是同类——chenjunyepro@gmail.com";
    }
  };
  try {
    console.log("%c陈俊烨 · 作品博物志", "font: 600 15px serif; color: #7A4F12");
    console.log("你打开了控制台。试试输入 cjy.hello()");
  } catch (e) {}
})();
