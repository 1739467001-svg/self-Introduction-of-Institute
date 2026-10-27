/* 作品博物志 · 渐进增强
   没有这份脚本，页面也完整可读；它只负责：顶栏状态与阅读进度、
   段落揭示、当前章节高亮、Fig.1 的指针视差，以及封面离屏时暂停动画。 */
(function () {
  "use strict";
  window.__cjy = true;

  var doc = document.documentElement;
  var bar = document.getElementById("bar");
  var cover = document.getElementById("top");
  var specimen = document.getElementById("specimen");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

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
  var current = null;
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
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
