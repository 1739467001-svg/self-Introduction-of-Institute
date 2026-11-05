/* 作品博物志 · 渐进增强
   没有这份脚本，页面也完整可读；它只负责：顶栏状态与阅读进度、
   段落揭示、当前章节高亮、Fig.1 的指针视差、封面离屏时暂停动画、
   影像滑出视口时暂停播放、「复制微信号」按钮，以及自建的匿名访问统计。
   互动与彩蛋在 play.js。 */
(function () {
  "use strict";
  window.__cjy = true;

  var doc = document.documentElement;
  var bar = document.getElementById("bar");
  var cover = document.getElementById("top");
  var specimen = document.getElementById("specimen");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---------------------------------------------------- 访问统计（自建、匿名）
     只记录：从哪里来、读到哪一章、点了什么、停留多久、采到哪枚彩蛋。
     不用 Cookie，不记 IP；浏览器开启「请勿追踪」时一条也不发。
     链接带 ?from=标签 可以区分投递渠道；?notrack=1 让这台浏览器不再计入（?notrack=0 恢复）。 */
  function stored(area, key, value) {
    try {
      if (value === undefined) return window[area].getItem(key);
      window[area].setItem(key, value);
    } catch (e) { return null; }
    return value;
  }
  var params = new URLSearchParams(location.search);
  if (params.has("notrack")) stored("localStorage", "cjy-notrack", params.get("notrack") === "0" ? "" : "1");
  var tracking = !(navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) &&
                 stored("localStorage", "cjy-notrack") !== "1";
  var sid = stored("sessionStorage", "cjy-sid");
  var fresh = !sid;
  if (fresh) sid = stored("sessionStorage", "cjy-sid", Math.random().toString(16).slice(2, 10));

  function hit(e, p, extra) {
    if (!tracking) return;
    var url = "hit?e=" + e + "&s=" + sid + (p != null ? "&p=" + encodeURIComponent(String(p).slice(0, 48)) : "") + (extra || "");
    try { if (navigator.sendBeacon && navigator.sendBeacon(url)) return; } catch (err) {}
    new Image().src = url;
  }
  window.cjyHit = hit;

  if (fresh) {
    var ref = "";
    try { var r = new URL(document.referrer); if (r.host !== location.host) ref = r.host; } catch (e) {}
    var seen = stored("localStorage", "cjy-seen");
    stored("localStorage", "cjy-seen", "1");
    hit("view", null, "&n=" + (seen ? 0 : 1) + "&r=" + encodeURIComponent(ref) +
        "&f=" + encodeURIComponent((params.get("from") || "").slice(0, 32)) +
        "&w=" + window.innerWidth + "&l=" + encodeURIComponent(navigator.language || ""));
  }

  var shownAt = Date.now(), spent = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      spent += Date.now() - shownAt;
      hit("time", Math.round(spent / 1000));
    } else {
      shownAt = Date.now();
    }
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a, button");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/\.pdf$/.test(href)) hit("resume");
    else if (href.indexOf("mailto:") === 0) hit("mail");
    else if (a.hasAttribute("data-copy")) hit("wechat");
    else if (a.classList.contains("go")) { var art = a.closest("[id^='no-']"); hit("go", art ? art.id : href); }
    else if (/^https?:/.test(href)) hit("out", href.replace(/^https?:\/\//, ""));
  }, true);

  /* ---------------------------------------------------- 顶栏 + 阅读进度 */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty("--p", p.toFixed(4));
      var over = cover && cover.getBoundingClientRect().bottom > bar.offsetHeight;
      bar.classList.toggle("is-over", !!over);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------------------------------------------------- 复制微信号（没有 JS 时按钮保持隐藏） */
  function copyText(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));   // 以 IP 访问时不是安全上下文，剪贴板接口不可用
    }
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var label = btn.textContent, timer = 0;
    btn.hidden = false;
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy"), function (ok) {
        btn.textContent = ok ? "已复制" : "请长按复制";
        clearTimeout(timer);
        timer = setTimeout(function () { btn.textContent = label; }, 1800);
      });
    });
  });

  /* ---------------------------------------------------- 揭示 */
  var items = document.querySelectorAll(".rv");
  if (!hasIO || reduce) {
    items.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        reveal.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { reveal.observe(el); });
  }

  if (!hasIO) return;

  /* ---------------------------------------------------- 当前章节 */
  var links = {};
  document.querySelectorAll(".bar__nav a").forEach(function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  var current = null, read = {};
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      if (!read[e.target.id]) { read[e.target.id] = 1; hit("read", e.target.id); }
      if (current) current.removeAttribute("aria-current");
      current = links[e.target.id] || null;
      if (current) current.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".ch").forEach(function (s) { spy.observe(s); });
  if (cover) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && current) {
        current.removeAttribute("aria-current");
        current = null;
      }
    }, { rootMargin: "-40% 0px -55% 0px" }).observe(cover);
  }

  /* ---------------------------------------------------- 影像：滑出视口即暂停（无声，省流量） */
  document.querySelectorAll("video").forEach(function (v) {
    v.addEventListener("play", function () { hit("film", "play"); });
    v.addEventListener("ended", function () { hit("film", "end"); });
    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting && !v.paused) v.pause();
    }).observe(v);
  });

  /* ---------------------------------------------------- 封面：离屏暂停 + 指针视差 */
  if (!cover) return;
  var visible = true;
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    cover.classList.toggle("is-paused", !visible);
  }).observe(cover);

  if (reduce || !specimen || !window.matchMedia("(pointer: fine)").matches) return;
  var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  function step() {
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    specimen.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0)";
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(step) : 0;
  }
  cover.addEventListener("pointermove", function (e) {
    if (!visible) return;
    var r = cover.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * -18;
    ty = ((e.clientY - r.top) / r.height - 0.5) * -18;
    if (!raf) raf = requestAnimationFrame(step);
  });
  cover.addEventListener("pointerleave", function () {
    tx = ty = 0;
    if (!raf) raf = requestAnimationFrame(step);
  });
})();
