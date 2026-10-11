/* The pit wall: a one-stop strategy simulator.
   Lap time = base pace + compound offset + wear rate x tyre age (linear, no curvature).
   Fuel burn is omitted because it affects every strategy equally.
   All parameters are ILLUSTRATIVE, not fitted values from the real model. */
(function () {
  "use strict";

  var RACE_LAPS = 57;
  var BASE = 95.0;       // seconds
  var PIT_LOSS = 22.0;   // seconds lost driving through the pit lane
  var COMPOUNDS = {
    S: { name: "Soft",   offset: 0.0,  wear: 0.110, cssVar: "--soft-c" },
    M: { name: "Medium", offset: 0.55, wear: 0.060, cssVar: "--med-c" },
    H: { name: "Hard",   offset: 1.0,  wear: 0.035, cssVar: "--hard-c" }
  };

  var form = document.getElementById("pit-form");
  if (!form) return;
  var slider = document.getElementById("pit-lap");
  var out = document.getElementById("pit-lap-out");
  var svg = document.getElementById("pit-chart");
  var ruleNote = document.getElementById("pit-rule");
  var elTotal = document.getElementById("r-total");
  var elDelta = document.getElementById("r-delta");
  var elBest = document.getElementById("r-best");
  document.getElementById("race-laps").textContent = RACE_LAPS;
  slider.max = RACE_LAPS - 1;

  // Closed-form cost of a stint of n laps: offset*n + wear*n(n+1)/2 (tyre age starts at 1).
  function stintCost(c, n) { var k = COMPOUNDS[c]; return k.offset * n + k.wear * n * (n + 1) / 2; }
  function raceTime(c1, c2, pitLap) {
    return BASE * RACE_LAPS + stintCost(c1, pitLap) + stintCost(c2, RACE_LAPS - pitLap) + PIT_LOSS;
  }
  function bestLapFor(c1, c2) {
    var best = 1, bestT = Infinity;
    for (var p = 1; p < RACE_LAPS; p++) { var t = raceTime(c1, c2, p); if (t < bestT) { bestT = t; best = p; } }
    return { lap: best, time: bestT };
  }
  function globalBest() {
    var keys = Object.keys(COMPOUNDS), best = { time: Infinity };
    keys.forEach(function (a) { keys.forEach(function (b) {
      if (a === b) return; var r = bestLapFor(a, b);
      if (r.time < best.time) best = { time: r.time, lap: r.lap, c1: a, c2: b };
    }); });
    return best;
  }
  var GLOBAL = globalBest();

  function fmtRace(t) {
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return h + ":" + String(m).padStart(2, "0") + ":" + s.toFixed(1).padStart(4, "0");
  }
  function selected(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : "S"; }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#9aa1ad"; }

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function draw(c1, c2, pitLap, bestLap) {
    var W = Math.max(280, Math.round(svg.parentNode.clientWidth || 640));
    var H = Math.round(Math.max(210, Math.min(300, W * 0.44)));
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.parentNode.style.aspectRatio = W + " / " + H;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var pad = { l: 48, r: 14, t: 26, b: 30 };
    var laps = [];
    for (var i = 1; i <= RACE_LAPS; i++) {
      var inFirst = i <= pitLap, c = inFirst ? c1 : c2, age = inFirst ? i : i - pitLap, k = COMPOUNDS[c];
      laps.push({ lap: i, c: c, t: BASE + k.offset + k.wear * age });
    }
    var tMin = Math.min.apply(null, laps.map(function (d) { return d.t; }));
    var tMax = Math.max.apply(null, laps.map(function (d) { return d.t; }));
    var lo = Math.floor((tMin - 0.4) * 2) / 2, hi = Math.ceil((tMax + 0.4) * 2) / 2;
    if (hi - lo < 2) hi = lo + 2;
    var x = function (lap) { return pad.l + (lap - 1) / (RACE_LAPS - 1) * (W - pad.l - pad.r); };
    var y = function (t) { return pad.t + (hi - t) / (hi - lo) * (H - pad.t - pad.b); };

    // y grid + labels
    var step = (hi - lo) > 6 ? 2 : (hi - lo) > 3 ? 1 : 0.5;
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      svg.appendChild(el("line", { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: "gridline" }));
      svg.appendChild(el("text", { x: pad.l - 8, y: y(v) + 4, "text-anchor": "end", class: "ax" }, v.toFixed(1) + "s"));
    }
    // x labels
    (W < 480 ? [1, 20, 40, RACE_LAPS] : [1, 10, 20, 30, 40, 50, RACE_LAPS]).forEach(function (lap) {
      svg.appendChild(el("text", { x: x(lap), y: H - 8, "text-anchor": lap === 1 ? "start" : lap === RACE_LAPS ? "end" : "middle", class: "ax" }, "L" + lap));
    });

    // best-lap marker
    var bx = x(bestLap + 0.5), px = x(pitLap + 0.5);
    if (bestLap !== pitLap) {
      svg.appendChild(el("line", { x1: bx, x2: bx, y1: pad.t - 4, y2: H - pad.b, class: "bestline" }));
      var bAnchor = bx > W - 120 ? "end" : "start";
      svg.appendChild(el("text", { x: bx + (bAnchor === "start" ? 6 : -6), y: H - pad.b - 8, "text-anchor": bAnchor, class: "lbl lbl--best" }, "FASTEST L" + bestLap));
    }
    // pit marker
    svg.appendChild(el("line", { x1: px, x2: px, y1: pad.t - 4, y2: H - pad.b, class: "pitline" }));
    var pAnchor = px > W - 150 ? "end" : "start";
    svg.appendChild(el("text", { x: px + (pAnchor === "start" ? 6 : -6), y: pad.t - 10, "text-anchor": pAnchor, class: "lbl lbl--pit" },
      "PIT L" + pitLap + (bestLap === pitLap ? " · FASTEST" : "") + " · STOP +" + PIT_LOSS.toFixed(0) + "s"));

    // stint lines
    [c1, c2].forEach(function (c, idx) {
      var pts = laps.filter(function (d) { return idx === 0 ? d.lap <= pitLap : d.lap > pitLap; });
      if (!pts.length) return;
      var colour = cssVar(COMPOUNDS[c].cssVar);
      var dPath = pts.map(function (d, j) { return (j ? "L" : "M") + x(d.lap).toFixed(1) + " " + y(d.t).toFixed(1); }).join(" ");
      svg.appendChild(el("path", { d: dPath, fill: "none", stroke: colour, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      var last = pts[pts.length - 1];
      svg.appendChild(el("circle", { cx: x(last.lap), cy: y(last.t), r: 3.5, fill: colour }));
      var mid = pts[Math.floor(pts.length / 2)];
      svg.appendChild(el("text", { x: x(mid.lap), y: y(mid.t) - 9, "text-anchor": "middle", class: "lbl", fill: colour }, COMPOUNDS[c].name.toUpperCase()));
    });
  }

  function update() {
    var c1 = selected("c1"), c2 = selected("c2"), pitLap = +slider.value;
    out.textContent = pitLap;
    var legal = c1 !== c2;
    ruleNote.hidden = legal;
    var best = bestLapFor(c1, c2);
    var total = raceTime(c1, c2, pitLap);
    elTotal.textContent = fmtRace(total);
    elBest.textContent = "Lap " + best.lap;
    elDelta.classList.remove("is-best", "is-slow");
    if (!legal) {
      elDelta.textContent = "Not legal";
      elDelta.classList.add("is-slow");
    } else {
      var d = total - GLOBAL.time;
      if (d < 0.05) { elDelta.textContent = "Fastest"; elDelta.classList.add("is-best"); }
      else { elDelta.textContent = "+" + d.toFixed(1) + "s"; elDelta.classList.add("is-slow"); }
    }
    draw(c1, c2, pitLap, best.lap);
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  document.getElementById("pit-optimise").addEventListener("click", function () {
    var best = bestLapFor(selected("c1"), selected("c2"));
    slider.value = best.lap; update();
  });
  var lastW = 0;
  if ("ResizeObserver" in window) new ResizeObserver(function (entries) {
    var w = Math.round(entries[0].contentRect.width);
    if (w !== lastW) { lastW = w; requestAnimationFrame(update); }
  }).observe(svg.parentNode);
  else window.addEventListener("resize", update);
  // Redraw when the theme changes so compound colours follow it.
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (window.matchMedia) { var mq = window.matchMedia("(prefers-color-scheme: dark)"); (mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update)); }
  update();
})();
