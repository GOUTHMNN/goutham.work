/* Site behaviour: theme toggle, quick menu (Ctrl/⌘ K), copy email, active section in nav. */
(function () {
  "use strict";
  var root = document.documentElement;

  root.classList.add("js");

  /* ---------- bar goes solid once you leave the top ---------- */
  var bar = document.querySelector(".bar");
  function barState() { if (bar) bar.classList.toggle("is-solid", window.scrollY > 40); }
  window.addEventListener("scroll", barState, { passive: true }); barState();

  /* ---------- reveal on scroll (from a visible resting state) ---------- */
  var rev = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(rev, function (n) { ro.observe(n); });
  } else Array.prototype.forEach.call(rev, function (n) { n.classList.add("is-in"); });

  /* ---------- copy email ---------- */
  var EMAIL = "Satheesh-G@ulster.ac.uk";
  var toast = document.getElementById("copy-toast");
  function say(msg) { if (!toast) return; toast.textContent = msg; clearTimeout(say._t); say._t = setTimeout(function () { toast.textContent = ""; }, 2600); }
  function copyEmail() {
    function fallback() {
      var a = document.getElementById("email-link");
      if (a && window.getSelection) { var r = document.createRange(); r.selectNodeContents(a); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      say("Selected. Press Ctrl+C to copy.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(function () { say("Copied to clipboard"); }, fallback);
    } else fallback();
  }
  var copyBtn = document.getElementById("copy-email");
  if (copyBtn) copyBtn.addEventListener("click", copyEmail);

  /* ---------- active section in nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
        var link = byId[en.target.id]; if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- scroll stops: tell the 3D track which project is on screen ---------- */
  var stops = document.querySelectorAll("[data-stop]");
  if ("IntersectionObserver" in window && stops.length) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || !window.__track) return;
        var i = +en.target.getAttribute("data-stop");
        window.__track.setStop(i >= 0 ? i : null);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    Array.prototype.forEach.call(stops, function (n) { so.observe(n); });
  }

  /* ---------- year ---------- */
  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

  /* ---------- quick menu ---------- */
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  Array.prototype.forEach.call(document.querySelectorAll(".kbd__mod"), function (n) { n.textContent = isMac ? "⌘" : "Ctrl"; });

  var dlg = document.getElementById("palette");
  var input = document.getElementById("palette-input");
  var list = document.getElementById("palette-list");
  var openBtn = document.getElementById("open-palette");
  if (!dlg || !input || !list) return;

  function go(id) { return function () { var t = document.getElementById(id); if (t) { t.scrollIntoView(); var f = t.querySelector("h2, h1"); if (f) { f.setAttribute("tabindex", "-1"); f.focus({ preventScroll: true }); } } }; }
  function open(url) { return function () { var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }; }
  var ACTIONS = [
    { label: "Selected work", hint: "Section", run: go("work") },
    { label: "Try the pit-stop simulator", hint: "Section", run: go("pit-wall") },
    { label: "About me", hint: "Section", run: go("about") },
    { label: "Photos: in the room", hint: "Section", run: go("moments") },
    { label: "Experience and leadership", hint: "Section", run: go("experience") },
    { label: "Open the Robork editor", hint: "Link", run: open("https://robork.goutham.work") },
    { label: "Open the trading app", hint: "Link", run: open("https://batman-ai-trading.streamlit.app") },
    { label: "Contact", hint: "Section", run: go("contact") },
    { label: "Download my CV", hint: "PDF", run: open("cv/Goutham-Satheesh-CV.pdf") },
    { label: "Copy my email address", hint: "Action", run: function () { copyEmail(); go("contact")(); } },
    { label: "Highlight soft tyres on the circuit", hint: "3D", run: function () { window.scrollTo(0, 0); var b = document.querySelector('[data-lane="0"]'); if (b) b.click(); } },
    { label: "Open LinkedIn", hint: "Link", run: open("https://www.linkedin.com/in/gouthmn") },
    { label: "Open GitHub", hint: "Link", run: open("https://github.com/GOUTHMNN") },
    { label: "Visit companionsoil.com", hint: "Link", run: open("https://companionsoil.com") }
  ];
  var shown = [], active = 0, lastFocus = null;

  function render() {
    var q = input.value.trim().toLowerCase();
    shown = ACTIONS.filter(function (a) { return !q || a.label.toLowerCase().indexOf(q) !== -1 || a.hint.toLowerCase().indexOf(q) !== -1; });
    if (active >= shown.length) active = Math.max(0, shown.length - 1);
    list.innerHTML = "";
    if (!shown.length) {
      var li = document.createElement("li"); li.className = "palette__empty"; li.textContent = "Nothing matches “" + input.value + "”.";
      list.appendChild(li); input.removeAttribute("aria-activedescendant"); return;
    }
    shown.forEach(function (a, i) {
      var li = document.createElement("li");
      li.className = "palette__item"; li.id = "pal-opt-" + i; li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      li.innerHTML = "<span></span><small></small>";
      li.firstChild.textContent = a.label; li.lastChild.textContent = a.hint;
      li.addEventListener("mousemove", function () { if (active !== i) { active = i; mark(); } });
      li.addEventListener("click", function () { choose(i); });
      list.appendChild(li);
    });
    mark();
  }
  function mark() {
    Array.prototype.forEach.call(list.children, function (li, i) { li.setAttribute("aria-selected", i === active ? "true" : "false"); });
    var cur = document.getElementById("pal-opt-" + active);
    if (cur) { input.setAttribute("aria-activedescendant", cur.id); cur.scrollIntoView({ block: "nearest" }); }
  }
  function choose(i) { var a = shown[i]; if (!a) return; close(); setTimeout(a.run, 10); }
  function openMenu() {
    if (dlg.open) return;
    lastFocus = document.activeElement; input.value = ""; active = 0; render();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    input.focus();
  }
  function close() { if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); } }
  dlg.addEventListener("close", function () { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  input.addEventListener("input", function () { active = 0; render(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (shown.length) { active = (active + 1) % shown.length; mark(); } }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (shown.length) { active = (active - 1 + shown.length) % shown.length; mark(); } }
    else if (e.key === "Enter") { e.preventDefault(); choose(active); }
  });
  if (openBtn) openBtn.addEventListener("click", openMenu);
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); dlg.open ? close() : openMenu(); }
  });
})();
