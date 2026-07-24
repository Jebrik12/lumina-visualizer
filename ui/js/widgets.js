/* Lumina — premium widgets: interactive curve editor (monotone cubic + LUT) and pro color picker. */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* =============== monotone cubic interpolation (Fritsch–Carlson) =============== */
  function monotoneCubic(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0]);
    const n = pts.length;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(Math.max(1e-6, xs[i + 1] - xs[i]));
      dy.push(ys[i + 1] - ys[i]);
      m.push(dy[i] / dx[i]);
    }
    const c1 = [m[0]];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) c1.push(0);
      else {
        const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        c1.push((w1 + w2) / (w1 / m[i - 1] + w2 / m[i]));
      }
    }
    c1.push(m[n - 2]);
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (i < n - 2 && x > xs[i + 1]) i++;
      const h = dx[i], t = (x - xs[i]) / h;
      const t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      return h00 * ys[i] + h10 * h * c1[i] + h01 * ys[i + 1] + h11 * h * c1[i + 1];
    };
  }

  LUM.curveLut = function (points, size) {
    const f = monotoneCubic(points);
    const lut = new Float32Array(size || 256);
    for (let i = 0; i < lut.length; i++) {
      const v = f(i / (lut.length - 1));
      lut[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    return lut;
  };

  /* =============== Curve Editor =============== */
  /* opts: { points, defaults, height, onChange(points, lut), diagonal:true } */
  LUM.CurveEditor = function (parent, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'curveWrap';
    const cv = document.createElement('canvas');
    cv.className = 'curveCanvas';
    wrap.appendChild(cv);
    parent.appendChild(wrap);

    const self = {
      points: (opts.points || [[0, 0], [0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [1, 1]]).map(p => p.slice()),
      defaults: (opts.defaults || [[0, 0], [0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [1, 1]]).map(p => p.slice())
    };

    const H = opts.height || 150;
    let drag = -1;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth || 240;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      cv.style.width = '100%';
      draw();
    }

    function px(p) { return [p[0] * cv.width, (1 - p[1]) * cv.height]; }

    function draw() {
      const ctx = cv.getContext('2d');
      const w = cv.width, h = cv.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.clearRect(0, 0, w, h);

      const grid = cssVar('--curve-grid', 'rgba(255,255,255,0.07)');
      const diag = cssVar('--curve-diag', 'rgba(255,255,255,0.10)');
      const line = cssVar('--accent', '#5b8cff');
      const ptFill = cssVar('--panel2', '#161616');

      ctx.lineWidth = dpr;
      ctx.strokeStyle = grid;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(w * i / 4, 0); ctx.lineTo(w * i / 4, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4); ctx.stroke();
      }
      if (opts.diagonal !== false) {
        ctx.strokeStyle = diag;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, 0); ctx.stroke();
        ctx.setLineDash([]);
      }

      const f = monotoneCubic(self.points);
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = i / 120;
        const y = Math.min(1, Math.max(0, f(x)));
        const [cx, cy] = px([x, y]);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      self.points.forEach((p, i) => {
        const [cx, cy] = px(p);
        ctx.beginPath();
        ctx.arc(cx, cy, (i === drag ? 5.5 : 4.5) * dpr, 0, 6.2832);
        ctx.fillStyle = ptFill;
        ctx.fill();
        ctx.lineWidth = 1.6 * dpr;
        ctx.strokeStyle = line;
        ctx.stroke();
      });
    }

    function evPos(e) {
      const r = cv.getBoundingClientRect();
      return [
        Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))
      ];
    }

    function nearest(pos) {
      let best = -1, bd = 0.06;
      self.points.forEach((p, i) => {
        const d = Math.hypot(p[0] - pos[0], (p[1] - pos[1]) * (H / (wrap.clientWidth || 240)) * 0 + (p[1] - pos[1]) * 0.6);
        const dd = Math.hypot(p[0] - pos[0], (p[1] - pos[1]) * 0.6);
        if (dd < bd) { bd = dd; best = i; }
      });
      return best;
    }

    function commit() {
      if (opts.onChange) opts.onChange(self.points.map(p => p.slice()), LUM.curveLut(self.points));
    }

    cv.addEventListener('pointerdown', e => {
      if (e.button === 1) { self.reset(); e.preventDefault(); return; }
      const pos = evPos(e);
      drag = nearest(pos);
      if (drag >= 0) { cv.setPointerCapture(e.pointerId); draw(); }
    });
    cv.addEventListener('pointermove', e => {
      if (drag < 0) return;
      const pos = evPos(e);
      const p = self.points[drag];
      const first = drag === 0, last = drag === self.points.length - 1;
      if (!first && !last) {
        const lo = self.points[drag - 1][0] + 0.03;
        const hi = self.points[drag + 1][0] - 0.03;
        p[0] = Math.min(hi, Math.max(lo, pos[0]));
      }
      p[1] = pos[1];
      draw();
    });
    const end = e => {
      if (drag < 0) return;
      drag = -1;
      draw();
      commit();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('dblclick', () => self.reset());
    cv.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });

    self.reset = function () {
      self.points = self.defaults.map(p => p.slice());
      draw();
      commit();
    };
    self.set = function (points) {
      if (Array.isArray(points) && points.length >= 2) self.points = points.map(p => p.slice());
      draw();
    };
    self.redraw = draw;

    requestAnimationFrame(size);
    new ResizeObserver(() => size()).observe(wrap);
    return self;
  };

  /* =============== Color Picker =============== */
  function hex2hsv(hex) {
    const c = LUM.hex2rgb(hex);
    const r = c[0], g = c[1], b = c[2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d > 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, mx === 0 ? 0 : d / mx, mx];
  }
  function hsv2hex(h, s, v) {
    const f = n => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return LUM.rgb2hex([f(5), f(3), f(1)]);
  }

  let openPop = null;
  function closePopover() {
    if (openPop) { openPop.remove(); openPop = null; document.removeEventListener('pointerdown', outside, true); }
  }
  function outside(e) {
    if (openPop && !openPop.contains(e.target)) closePopover();
  }
  LUM.closePopover = closePopover;

  /* LUM.openColorPicker(anchorEl, hex, onChange) */
  LUM.openColorPicker = function (anchor, hex, onChange) {
    closePopover();
    const pop = document.createElement('div');
    pop.className = 'popover colorPop';
    openPop = pop;

    let [h, s, v] = hex2hsv(hex || '#ffffff');

    const sv = document.createElement('canvas'); sv.className = 'cpSV'; sv.width = 220; sv.height = 140;
    const hue = document.createElement('canvas'); hue.className = 'cpHue'; hue.width = 220; hue.height = 12;
    const row = document.createElement('div'); row.className = 'cpRow';
    const chip = document.createElement('div'); chip.className = 'cpChip';
    const inp = document.createElement('input'); inp.className = 'txtInp cpHex'; inp.spellcheck = false;
    row.appendChild(chip); row.appendChild(inp);

    if (window.EyeDropper) {
      const eye = document.createElement('button'); eye.className = 'iconBtn'; eye.innerHTML = LUM.icon('image');
      eye.title = 'Pick color from screen';
      eye.addEventListener('click', async () => {
        try {
          const r = await new window.EyeDropper().open();
          const c = r.sRGBHex;
          [h, s, v] = hex2hsv(c);
          sync(true);
        } catch (e) {}
      });
      row.appendChild(eye);
    }

    const sw = document.createElement('div'); sw.className = 'cpSwatches';
    ['#ffffff', '#0c0c0c', '#5b8cff', '#ff5b5b', '#ffd75b', '#59d499', '#c07bff', '#ff8f4d'].forEach(c => {
      const b = document.createElement('button'); b.className = 'cpSw'; b.style.background = c;
      b.addEventListener('click', () => { [h, s, v] = hex2hsv(c); sync(true); });
      sw.appendChild(b);
    });

    pop.appendChild(sv); pop.appendChild(hue); pop.appendChild(row); pop.appendChild(sw);
    document.body.appendChild(pop);

    const ar = anchor.getBoundingClientRect();
    const pw = 244, ph = 246;
    let px = Math.min(window.innerWidth - pw - 8, Math.max(8, ar.left));
    let py = ar.bottom + 8;
    if (py + ph > window.innerHeight - 8) py = Math.max(8, ar.top - ph - 8);
    pop.style.left = px + 'px';
    pop.style.top = py + 'px';

    function drawSV() {
      const ctx = sv.getContext('2d');
      const base = hsv2hex(h, 1, 1);
      const gx = ctx.createLinearGradient(0, 0, sv.width, 0);
      gx.addColorStop(0, '#ffffff'); gx.addColorStop(1, base);
      ctx.fillStyle = gx; ctx.fillRect(0, 0, sv.width, sv.height);
      const gy = ctx.createLinearGradient(0, 0, 0, sv.height);
      gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(1, '#000000');
      ctx.fillStyle = gy; ctx.fillRect(0, 0, sv.width, sv.height);
      const x = s * sv.width, y = (1 - v) * sv.height;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.2832);
      ctx.strokeStyle = v > 0.55 ? '#000' : '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    function drawHue() {
      const ctx = hue.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, hue.width, 0);
      for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsv2hex(i * 60, 1, 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, hue.width, hue.height);
      const x = (h / 360) * hue.width;
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, 0, 4, hue.height);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, 0.5, 5, hue.height - 1);
    }
    function sync(fire) {
      const hx = hsv2hex(h, s, v);
      chip.style.background = hx;
      if (document.activeElement !== inp) inp.value = hx;
      drawSV(); drawHue();
      if (fire && onChange) onChange(hx);
    }

    function bindDrag(cvs, fn) {
      let on = false;
      cvs.addEventListener('pointerdown', e => { on = true; cvs.setPointerCapture(e.pointerId); fn(e); });
      cvs.addEventListener('pointermove', e => { if (on) fn(e); });
      cvs.addEventListener('pointerup', () => { on = false; });
    }
    bindDrag(sv, e => {
      const r = sv.getBoundingClientRect();
      s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
      sync(true);
    });
    bindDrag(hue, e => {
      const r = hue.getBoundingClientRect();
      h = Math.min(359.9, Math.max(0, (e.clientX - r.left) / r.width * 360));
      sync(true);
    });
    inp.addEventListener('input', () => {
      if (/^#?[0-9a-fA-F]{6}$/.test(inp.value.trim())) {
        [h, s, v] = hex2hsv(inp.value.trim().replace(/^#?/, '#'));
        chip.style.background = hsv2hex(h, s, v);
        drawSV(); drawHue();
        if (onChange) onChange(hsv2hex(h, s, v));
      }
    });

    setTimeout(() => document.addEventListener('pointerdown', outside, true), 10);
    sync(false);
    return pop;
  };

  /* Small color control (chip button that opens the picker) */
  LUM.colorControl = function (parent, label, get, set) {
    const row = document.createElement('div');
    row.className = 'ctl ctlRow';
    const lb = document.createElement('label'); lb.textContent = label;
    const chip = document.createElement('button'); chip.className = 'colorChip';
    chip.style.background = get();
    chip.addEventListener('click', () => {
      LUM.openColorPicker(chip, get(), hx => { chip.style.background = hx; set(hx); });
    });
    row.appendChild(lb); row.appendChild(chip);
    parent.appendChild(row);
    return row;
  };
})();
