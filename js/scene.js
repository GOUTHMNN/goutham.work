/* The hero scene: 21,124 points, one for every lap in the F1 dataset, laid out
   as a three-lane circuit (soft, medium, hard). Three "cars" light up their lane
   as they pass. Drag to spin, scroll to fly over it. Positions are artistic. */
(function () {
  "use strict";
  var canvas = document.getElementById("scene");
  var root = document.documentElement;
  if (!canvas || !window.THREE) { root.classList.add("no-gl"); return; }

  var THREE = window.THREE;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = Math.min(window.innerWidth, window.innerHeight) < 600;
  var N = small ? 14000 : 21124;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) { root.classList.add("no-gl"); return; }
  if (!renderer.getContext()) { root.classList.add("no-gl"); return; }

  var BG = 0x0a0c10;
  renderer.setClearColor(BG, 1);
  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 12, 30);
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  var world = new THREE.Group();
  scene.add(world);

  /* ---------- the circuit ---------- */
  var ctrl = [
    [-5.6, 1.4], [-5.9, -1.3], [-4.7, -3.0], [-2.1, -3.4], [0.4, -2.7], [1.5, -1.3],
    [3.0, -1.7], [4.9, -3.1], [6.1, -1.9], [5.7, 0.5], [3.9, 1.5], [2.7, 3.0],
    [0.6, 3.4], [-1.2, 2.1], [-3.1, 2.9], [-4.8, 3.0]
  ].map(function (p, i) { return new THREE.Vector3(p[0], Math.sin(i * 0.9) * 0.18, p[1]); });
  var curve = new THREE.CatmullRomCurve3(ctrl, true, "centripetal");
  var S = 2400;
  var samples = curve.getSpacedPoints(S);
  var tangents = [];
  for (var s = 0; s <= S; s++) tangents.push(curve.getTangentAt(Math.min(s / S, 1)));

  function sampleAt(u, out, tan) {
    var f = ((u % 1) + 1) % 1 * S, i = Math.floor(f), t = f - i;
    out.copy(samples[i]).lerp(samples[i + 1] || samples[0], t);
    if (tan) tan.copy(tangents[i]);
    return out;
  }
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // Lane colours follow the compounds: soft red, medium yellow, hard white.
  var LANES = [
    { off: -0.34, col: new THREE.Color("#ff4b4b") },
    { off: 0.0, col: new THREE.Color("#ffc53d") },
    { off: 0.34, col: new THREE.Color("#e9edf3") }
  ];

  var pos = new Float32Array(N * 3), aU = new Float32Array(N), aLane = new Float32Array(N), aSeed = new Float32Array(N), aCol = new Float32Array(N * 3);
  var p = new THREE.Vector3(), tg = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (var k = 0; k < N; k++) {
    var u = (k + Math.random()) / N;
    var lane = k % 3;
    sampleAt(u, p, tg);
    nrm.set(-tg.z, 0, tg.x).normalize();
    var lat = LANES[lane].off + gauss() * 0.06;
    var lift = Math.abs(gauss()) * 0.05 + (Math.random() < 0.08 ? Math.random() * 0.5 : 0);
    pos[k * 3] = p.x + nrm.x * lat;
    pos[k * 3 + 1] = p.y + lift;
    pos[k * 3 + 2] = p.z + nrm.z * lat;
    aU[k] = u; aLane[k] = lane; aSeed[k] = Math.random();
    var c = LANES[lane].col;
    aCol[k * 3] = c.r; aCol[k * 3 + 1] = c.g; aCol[k * 3 + 2] = c.b;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
  geo.setAttribute("aLane", new THREE.BufferAttribute(aLane, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(aCol, 3));

  var uniforms = {
    uTime: { value: 0 },
    uCars: { value: new THREE.Vector3(0.0, 0.33, 0.66) },
    uFocus: { value: -1 },
    uSize: { value: small ? 46 : 40 },
    uPR: { value: DPR }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      "attribute float aU; attribute float aLane; attribute float aSeed; attribute vec3 aColor;",
      "uniform float uTime; uniform vec3 uCars; uniform float uFocus; uniform float uSize; uniform float uPR;",
      "varying vec3 vColor; varying float vAlpha;",
      "void main(){",
      "  float car = aLane < 0.5 ? uCars.x : (aLane < 1.5 ? uCars.y : uCars.z);",
      "  float d = fract(car - aU);",
      "  float glow = exp(-d * 26.0) + 0.6 * exp(-(1.0 - d) * 160.0);",
      "  float tw = 0.72 + 0.28 * sin(uTime * 1.6 + aSeed * 40.0);",
      "  float focus = uFocus < 0.0 ? 1.0 : (abs(uFocus - aLane) < 0.5 ? 1.35 : 0.1);",
      "  vec3 p = position; p.y += glow * 0.32 * (0.35 + aSeed);",
      "  vAlpha = (0.55 * tw + glow * 1.6) * focus;",
      "  vColor = mix(aColor, vec3(1.0), clamp(glow * 0.45, 0.0, 0.6));",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_PointSize = uSize * uPR * (0.55 + glow * 1.4 + aSeed * 0.45) / -mv.z;",
      "  gl_Position = projectionMatrix * mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying vec3 vColor; varying float vAlpha;",
      "void main(){",
      "  float r = length(gl_PointCoord - 0.5);",
      "  if (r > 0.5) discard;",
      "  float a = smoothstep(0.5, 0.0, r);",
      "  gl_FragColor = vec4(vColor, a * a * vAlpha);",
      "}"
    ].join("\n")
  });
  world.add(new THREE.Points(geo, mat));

  // Kerb lines on both edges and a start line, drawn faintly.
  [-0.62, 0.62].forEach(function (off) {
    var pts = [];
    for (var i = 0; i <= S; i += 4) {
      p.copy(samples[i]); tg.copy(tangents[i]); nrm.set(-tg.z, 0, tg.x).normalize();
      pts.push(new THREE.Vector3(p.x + nrm.x * off, p.y - 0.02, p.z + nrm.z * off));
    }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2b313d, transparent: true, opacity: 0.9, fog: true })));
  });
  (function () {
    p.copy(samples[0]); tg.copy(tangents[0]); nrm.set(-tg.z, 0, tg.x).normalize();
    var a = p.clone().addScaledVector(nrm, -0.7), b = p.clone().addScaledVector(nrm, 0.7);
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xb18cff })));
  })();

  var grid = new THREE.GridHelper(48, 48, 0x1a1f29, 0x12161d);
  grid.position.y = -0.25;
  world.add(grid);

  // Car heads: one bright point per lane.
  var headPos = new Float32Array(9), headCol = new Float32Array(9);
  LANES.forEach(function (l, i) { headCol[i * 3] = l.col.r; headCol[i * 3 + 1] = l.col.g; headCol[i * 3 + 2] = l.col.b; });
  var headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute("position", new THREE.BufferAttribute(headPos, 3));
  headGeo.setAttribute("color", new THREE.BufferAttribute(headCol, 3));
  var dot = document.createElement("canvas"); dot.width = dot.height = 64;
  var g = dot.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(255,255,255,1)"); rg.addColorStop(0.25, "rgba(255,255,255,.85)"); rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  var heads = new THREE.Points(headGeo, new THREE.PointsMaterial({ size: 0.55, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  world.add(heads);

  /* ---------- camera rig ---------- */
  var rig = { az: -0.6, pol: 0.98, basePol: 0.98, rad: 16.5, vAz: 0, vPol: 0, touched: false };
  var scrollK = 0, focusLane = -1, offsetX = 0, far = false, frame = 0;

  /* ---------- scroll fly-through: inside the work section the camera rides the track,
     reaching a marked point for each project as its heading crosses the screen ---------- */
  var STOPS = [0.06, 0.31, 0.56, 0.81];
  var stop = null, ride = null, inWork = false, viewWork = null;
  var camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), dPos = new THREE.Vector3(), dTgt = new THREE.Vector3();
  var camInit = false;
  var markers = STOPS.map(function (u) {
    var m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 48), new THREE.MeshBasicMaterial({ color: 0xb18cff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    sampleAt(u, p); m.position.set(p.x, p.y + 0.03, p.z);
    world.add(m);
    return m;
  });
  var work = document.getElementById("work");
  var gaps = Array.prototype.slice.call(document.querySelectorAll(".stop-gap"));
  function setStop(i) { stop = (i === null || i < 0 || i >= STOPS.length) ? null : i; }
  function applyOpacity() {
    canvas.style.opacity = String(inWork ? 1 : 1 - scrollK * 0.72);
  }
  // Map the middle of the screen to a position on the track, piecewise between the stop headings.
  function rideFromScroll() {
    if (!work || !gaps.length) return null;
    var mid = window.scrollY + window.innerHeight * 0.5;
    var wr = work.getBoundingClientRect(), top = wr.top + window.scrollY, bottom = wr.bottom + window.scrollY;
    if (mid < top - window.innerHeight * 0.25 || mid > bottom) return null;
    var ys = [top - window.innerHeight * 0.25], us = [STOPS[0] - 0.08];
    gaps.forEach(function (g, i) { var r = g.getBoundingClientRect(); ys.push(r.top + window.scrollY + r.height / 2); us.push(STOPS[i]); });
    ys.push(bottom); us.push(STOPS[STOPS.length - 1] + 0.16);
    for (var i = 0; i < ys.length - 1; i++) {
      if (mid <= ys[i + 1]) {
        var k = Math.max(0, Math.min(1, (mid - ys[i]) / (ys[i + 1] - ys[i])));
        k = k * k * (3 - 2 * k); // ease so the camera settles at each stop
        return us[i] + (us[i + 1] - us[i]) * k;
      }
    }
    return us[us.length - 1];
  }
  window.__track = { setStop: setStop };

  function applyView() {
    if (viewWork === inWork) return;
    viewWork = inWork;
    var w = window.innerWidth, h = window.innerHeight, wide = w > 900;
    if (inWork) camera.setViewOffset(w, h, 0, 0, w, h);
    else camera.setViewOffset(w, h, offsetX, wide ? 0 : h * 0.2, w, h);
    camera.updateProjectionMatrix();
  }
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Wide screens: push the circuit right of the headline. Narrow: lift it above the text.
    var wide = w > 900;
    offsetX = wide ? -w * 0.2 : 0;
    viewWork = null; applyView();
    rig.rad = w < 600 ? 25 : w < 900 ? 18 : 18.5;
    rig.basePol = wide ? 0.98 : 0.62;
    if (!rig.touched) { rig.pol = rig.basePol; if (!rig.init) rig.az = wide ? -0.5 : 1.45; }
    rig.init = true;
    camera.updateProjectionMatrix();
    if (reduce) render(0);
  }

  // Drag to spin. On touch, only horizontal drags spin so the page still scrolls.
  var drag = null;
  canvas.addEventListener("pointerdown", function (e) { rig.touched = true; drag = { x: e.clientX, y: e.clientY, touch: e.pointerType === "touch", id: e.pointerId }; canvas.classList.add("is-drag"); });
  window.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    rig.vAz = -dx * 0.005;
    if (!drag.touch) rig.vPol = -dy * 0.004;
    if (reduce) { rig.az += rig.vAz; rig.pol = clampPol(rig.pol + rig.vPol); rig.vAz = rig.vPol = 0; render(0); }
  });
  function endDrag() { drag = null; canvas.classList.remove("is-drag"); }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  function clampPol(v) { return Math.max(0.35, Math.min(1.32, v)); }

  var hero = document.querySelector(".hero");
  function onScroll() {
    var h = hero ? hero.offsetHeight : window.innerHeight;
    scrollK = Math.max(0, Math.min(1, window.scrollY / h));
    ride = rideFromScroll();
    inWork = ride !== null;
    far = window.scrollY > h * 1.6 && !inWork;
    applyView();
    applyOpacity();
    if (reduce) render(0);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- HUD ---------- */
  var lapEl = document.getElementById("hud-lap");
  var lastLap = -1;
  var RACE_LAPS = 57, LAP_SECONDS = 9;

    function render(t) {
    var cars = uniforms.uCars.value;
    if (!reduce) {
      cars.x = (t / LAP_SECONDS) % 1;
      cars.y = (t / (LAP_SECONDS * 1.04) + 0.33) % 1;
      cars.z = (t / (LAP_SECONDS * 1.08) + 0.66) % 1;
    }
    [cars.x, cars.y, cars.z].forEach(function (u, i) {
      sampleAt(u, p, tg); nrm.set(-tg.z, 0, tg.x).normalize();
      headPos[i * 3] = p.x + nrm.x * LANES[i].off; headPos[i * 3 + 1] = p.y + 0.12; headPos[i * 3 + 2] = p.z + nrm.z * LANES[i].off;
    });
    headGeo.attributes.position.needsUpdate = true;
    uniforms.uTime.value = t;

    if (inWork) {
      // Chase view: low, behind and to the side of the point we're riding, looking down the track.
      sampleAt(ride, p, tg); nrm.set(-tg.z, 0, tg.x).normalize();
      var narrow = window.innerWidth < 700;
      dTgt.copy(p).addScaledVector(tg, 2.0);
      dPos.copy(p).addScaledVector(tg, narrow ? -4.4 : -3.4).addScaledVector(nrm, narrow ? 2.0 : 1.7); dPos.y += narrow ? 2.6 : 1.9;
    } else {
      var pol = clampPol(rig.pol) * (1 - scrollK * 0.6);
      var rad = rig.rad + scrollK * 3;
      dPos.set(Math.sin(rig.az) * Math.sin(pol) * rad, Math.cos(pol) * rad, Math.cos(rig.az) * Math.sin(pol) * rad);
      dTgt.set(0, -scrollK * 1.2, 0);
    }
    markers.forEach(function (m, i) {
      var near = inWork ? Math.max(0, 1 - Math.abs(ride - STOPS[i]) / 0.07) : 0;
      var target = near * (0.6 + 0.35 * Math.sin(t * 3));
      m.material.opacity += (target - m.material.opacity) * 0.15;
      m.scale.setScalar(1 + near * 0.25 + 0.06 * Math.sin(t * 3));
    });
    if (!camInit || reduce) { camPos.copy(dPos); camTgt.copy(dTgt); camInit = true; }
    else { var k = inWork ? 0.09 : 0.06; camPos.lerp(dPos, k); camTgt.lerp(dTgt, k); }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    renderer.render(scene, camera);

    if (lapEl) {
      var lap = reduce ? 20 : Math.floor(t / LAP_SECONDS) % RACE_LAPS + 1;
      if (lap !== lastLap) { lapEl.textContent = String(lap).padStart(2, "0"); lastLap = lap; }
    }
  }

  var start = performance.now(), running = true;
  function loop(now) {
    if (!running) return;
    var t = (now - start) / 1000;
    if (!drag) { rig.vAz *= 0.94; rig.vPol *= 0.9; rig.az += 0.0009; }
    rig.az += rig.vAz; rig.pol = clampPol(rig.pol + rig.vPol);
    if (drag) { rig.vAz *= 0.5; rig.vPol *= 0.5; }
    frame++;
    if (!far || frame % 3 === 0) render(t);  // the track is dim behind content, so save battery
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", function () {
    if (reduce) return;
    if (document.hidden) running = false;
    else if (!running) { running = true; requestAnimationFrame(loop); }
  });

  /* ---------- compound focus buttons ---------- */
  var btns = Array.prototype.slice.call(document.querySelectorAll("[data-lane]"));
  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      var lane = +b.getAttribute("data-lane");
      focusLane = focusLane === lane ? -1 : lane;
      uniforms.uFocus.value = focusLane;
      btns.forEach(function (o) { o.setAttribute("aria-pressed", String(+o.getAttribute("data-lane") === focusLane)); });
      if (reduce) render(0);
    });
  });

  var to;
  window.addEventListener("resize", function () { clearTimeout(to); to = setTimeout(resize, 80); });
  resize(); onScroll();
  window.addEventListener("load", onScroll);
  root.classList.add("gl-ready");
  if (reduce) render(0); else requestAnimationFrame(loop);
})();
