/* Lumina — boot, state management, render loop, quality scaling, shuffle */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ---------- state ---------- */
  function defaultState() {
    return {
      v: 1, scene: 'rings', params: {},
      fx: Object.assign({}, LUM.DEFAULT_FX),
      pal: { id: 'neon', shift: 0, cycle: 0.01, custom: { c1: '#7c5cff', c2: '#00e5ff' } },
      aud: Object.assign({}, LUM.DEFAULT_AUD),
      ui: Object.assign({}, LUM.DEFAULT_UI),
      presetName: 'Neon Halo'
    };
  }

  LUM.paramsOf = function (id) {
    const sc = LUM.sceneById[id];
    let P = LUM.state.params[id];
    if (!P) P = LUM.state.params[id] = {};
    sc.params.forEach(d => { if (P[d.k] === undefined) P[d.k] = d.def; });
    return P;
  };

  LUM.serialize = function () { return LUM.state; };

  LUM.applyState = function (s) {
    if (!s || typeof s !== 'object') return;
    const d = defaultState();
    LUM.state = {
      v: 1,
      scene: LUM.sceneById[s.scene] ? s.scene : d.scene,
      params: (s.params && typeof s.params === 'object') ? s.params : {},
      fx: Object.assign({}, d.fx, s.fx || {}),
      pal: Object.assign({}, d.pal, s.pal || {}),
      aud: Object.assign({}, d.aud, s.aud || {}),
      ui: Object.assign({}, d.ui, s.ui || {}),
      presetName: s.presetName || 'Custom'
    };
    fadeKick();
    LUM.ui.refresh();
  };

  LUM.applyPreset = function (p) {
    if (!p || !LUM.sceneById[p.scene]) return;
    const st = LUM.state;
    st.scene = p.scene;
    const defs = {};
    LUM.sceneById[p.scene].params.forEach(d => { defs[d.k] = d.def; });
    st.params[p.scene] = Object.assign(defs, p.p || {});
    st.fx = Object.assign({}, LUM.DEFAULT_FX, p.fx || {});
    st.pal = Object.assign({ id: 'neon', shift: 0, cycle: 0, custom: st.pal.custom }, p.pal || {});
    if (p.aud) st.aud = Object.assign({}, st.aud, p.aud);
    st.presetName = p.name;
    fadeKick();
    LUM.persist();
    LUM.ui.refresh();
  };

  LUM.switchScene = function (id) {
    if (!LUM.sceneById[id] || id === LUM.state.scene) return;
    LUM.state.scene = id;
    LUM.state.presetName = 'Custom';
    fadeKick();
    LUM.ui.refresh();
  };

  LUM.randomize = function (full) {
    const st = LUM.state;
    if (full) st.scene = LUM.scenes[Math.floor(Math.random() * LUM.scenes.length)].id;
    const sc = LUM.sceneById[st.scene];
    const P = {};
    sc.params.forEach(d => {
      if (d.type === 'select') P[d.k] = Math.floor(Math.random() * d.opts.length);
      else if (d.type === 'toggle') P[d.k] = Math.random() < 0.65 ? d.def : (d.def > 0.5 ? 0 : 1);
      else {
        let v = d.min + (d.max - d.min) * (0.12 + 0.76 * Math.random());
        if (d.step !== undefined && d.step >= 1) v = Math.round(v);
        P[d.k] = v;
      }
    });
    st.params[st.scene] = P;
    st.pal.id = LUM.palettes[Math.floor(Math.random() * LUM.palettes.length)].id;
    st.pal.cycle = Math.random() < 0.45 ? Math.random() * 0.025 : 0;
    const fx = st.fx;
    fx.trail = Math.pow(Math.random(), 0.8) * 0.85;
    fx.fbZoom = (Math.random() * 2 - 1) * 0.25;
    fx.fbRot = (Math.random() * 2 - 1) * 0.3;
    fx.bloom = 0.35 + Math.random() * 0.75;
    fx.ca = Math.random() * 0.3;
    fx.kaleido = Math.random() < 0.16 ? [3, 4, 5, 6, 8][Math.floor(Math.random() * 5)] : 0;
    fx.mirror = Math.random() < 0.1 ? 1 + Math.floor(Math.random() * 3) : 0;
    fx.hueSpeed = Math.random() < 0.3 ? (Math.random() * 2 - 1) * 45 : 0;
    st.presetName = 'Random ✦';
    fadeKick();
    LUM.persist();
    LUM.ui.refresh();
    LUM.ui.toast(full ? 'Random: ' + sc.name : 'Randomized ' + sc.name);
  };

  /* ---------- fade (scene transitions) ---------- */
  let fadeT = 1;
  function fadeKick() { fadeT = 0; }

  /* ---------- quality / resolution ---------- */
  let autoScale = 1, fpsAvg = 60, lowT = 0, highT = 0;
  LUM.qualityChanged = function () { autoScale = 1; lowT = 0; highT = 0; };
  function targetScale() {
    switch (LUM.state.ui.quality) {
      case 'low': return 0.55;
      case 'med': return 0.75;
      case 'high': return 1.0;
      default: return autoScale;
    }
  }
  function dprCap() {
    switch (LUM.state.ui.quality) {
      case 'high': return 2.0;
      case 'auto': return 1.5;
      default: return 1.0;
    }
  }
  function qualityAuto(dt) {
    if (LUM.state.ui.quality !== 'auto') return;
    if (fpsAvg < 46) { lowT += dt; highT = 0; } else lowT = 0;
    if (fpsAvg > 57) highT += dt; else highT = 0;
    if (lowT > 2.0 && autoScale > 0.45) { autoScale = Math.max(0.45, autoScale * 0.82); lowT = 0; }
    if (highT > 6.0 && autoScale < 1) { autoScale = Math.min(1, autoScale * 1.1); highT = 0; }
  }

  function resizeCheck() {
    const c = LUM.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap());
    const cw = Math.max(2, Math.floor(c.clientWidth * dpr));
    const ch = Math.max(2, Math.floor(c.clientHeight * dpr));
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const s = targetScale();
    const iw = Math.max(2, Math.floor(cw * s));
    const ih = Math.max(2, Math.floor(ch * s));
    if (LUM.frame.w !== iw || LUM.frame.h !== ih) {
      LUM.frame.w = iw; LUM.frame.h = ih;
      LUM.postResize(iw, ih);
    }
  }

  /* ---------- shuffle ---------- */
  let lastShufBeat = 0, lastShufT = 0;
  function shuffleCheck() {
    const st = LUM.state, A = LUM.audio, F = LUM.frame;
    if (!st.ui.shuffle) { lastShufBeat = A.beatCount; lastShufT = F.t; return; }
    const beats = st.ui.shuffleBeats || 32;
    if (A.beatCount >= lastShufBeat + beats || F.t - lastShufT > 26) {
      lastShufBeat = A.beatCount; lastShufT = F.t;
      let p;
      for (let tries = 0; tries < 6; tries++) {
        p = LUM.factoryPresets[Math.floor(Math.random() * LUM.factoryPresets.length)];
        if (p.name !== LUM.state.presetName) break;
      }
      LUM.applyPreset(p);
    }
  }

  /* ---------- error surfacing ---------- */
  let errShown = false;
  function errCheck() {
    if (errShown || !LUM.shaderErrors.length) return;
    errShown = true;
    const tb = document.getElementById('topbar');
    if (tb) {
      const b = document.createElement('button');
      b.id = 'errBadge';
      b.textContent = '⚠ ' + LUM.shaderErrors.length;
      b.title = 'Shader compile errors — click for details';
      b.addEventListener('click', () => {
        LUM.ui.showModal('Shader errors', body => {
          const pre = document.createElement('pre');
          pre.className = 'errPre';
          pre.textContent = LUM.shaderErrors.join('\n\n');
          body.appendChild(pre);
          return () => null;
        }, [{ label: 'Close', primary: true }]);
      });
      tb.appendChild(b);
    }
  }

  /* ---------- QA hud (?qa=1) ---------- */
  let qaHud = null, qaTimer = 0;
  function qaTick(dt) {
    if (!qaHud) return;
    qaTimer += dt;
    if (qaTimer < 0.5) return;
    qaTimer = 0;
    qaHud.textContent = 'v9 scene:' + LUM.state.scene +
      ' fps:' + Math.round(fpsAvg) +
      ' err:' + LUM.shaderErrors.length +
      ' beat:' + LUM.audio.beatCount +
      ' bpm:' + Math.round(LUM.audio.bpm) +
      ' rms:' + LUM.audio.rms.toFixed(2);
  }

  /* ---------- main loop ---------- */
  let last = 0, palCycleAcc = 0;
  LUM.frame.hue = 0;

  function loop(ts) {
    requestAnimationFrame(loop);
    let dt = (ts - last) / 1000; last = ts;
    if (!(dt > 0) || dt > 0.25) dt = 0.016;
    const F = LUM.frame, st = LUM.state;
    F.t += dt; F.dt = dt;

    resizeCheck();
    LUM.audio.update(dt);
    LUM.bandTex.update(LUM.audio.sm);
    LUM.waveTex.update(LUM.audio.waveRG);
    LUM.histTex.push(LUM.audio.sm);
    LUM.waveHistTex.push(LUM.audio.waveRG);

    palCycleAcc += (st.pal.cycle || 0) * dt;
    F.pal = LUM.resolvePalette(st.pal);
    F.palShift = (st.pal.shift || 0) + palCycleAcc;
    F.hue += (st.fx.hueSpeed || 0) * dt * Math.PI / 180;

    fadeT = Math.min(1, fadeT + dt * 2.6);
    const fade = Math.pow(fadeT, 0.85);

    const sc = LUM.sceneById[st.scene];
    if (!sc._inited) { sc.init(); sc._inited = true; }
    LUM.post.begin();
    sc.render(LUM.paramsOf(sc.id), dt);
    LUM.post.run(st.fx, fade, LUM.canvas.width, LUM.canvas.height);

    const fps = 1 / Math.max(dt, 1e-3);
    fpsAvg += (fps - fpsAvg) * 0.04;
    qualityAuto(dt);
    shuffleCheck();
    errCheck();
    qaTick(dt);
    LUM.ui.tick(dt, fpsAvg);
  }

  /* ---------- fatal ---------- */
  function fatal(msg) {
    const f = document.getElementById('fatal');
    const m = document.getElementById('fatalMsg');
    if (m) m.textContent = msg;
    if (f) f.classList.remove('hidden');
  }
  LUM.fatal = fatal;

  /* ---------- boot ---------- */
  function boot() {
    const canvas = document.getElementById('glcanvas');
    const gl = LUM.glInit(canvas);
    if (!gl) { fatal('WebGL2 is not available. Lumina needs GPU acceleration (any 2015+ GPU). In the plugin this is provided by the Microsoft Edge WebView2 runtime.'); return; }

    LUM.bandTex = LUM.dataTex(LUM.NB, 1);
    LUM.waveTex = LUM.dataTex(LUM.NW, 2);
    LUM.histTex = LUM.history(LUM.NB, 240, 1);
    LUM.waveHistTex = LUM.history(LUM.NW, 72, 2);
    LUM.postInit();

    LUM.state = defaultState();
    const q = new URLSearchParams(location.search);

    LUM.simSource = LUM.makeSimSource();
    if (LUM.bridge.plugin) {
      LUM.juceSource = LUM.makeJuceSource();
      LUM.setSource(LUM.juceSource);
    } else {
      LUM.setSource(LUM.simSource);
      const loc = LUM.loadLocalState();
      if (loc && !q.get('scene') && !q.get('preset')) LUM.applyState(loc);
      else LUM.applyPreset(LUM.factoryPresets[0]);
    }

    if (q.get('preset')) {
      const p = LUM.factoryPresets.find(x => x.name.toLowerCase() === String(q.get('preset')).toLowerCase());
      if (p) LUM.applyPreset(p);
    }
    if (q.get('scene') && LUM.sceneById[q.get('scene')]) {
      LUM.state.scene = q.get('scene');
      LUM.state.presetName = 'Custom';
    }

    LUM.ui.build();

    if (q.get('qa')) {
      qaHud = document.createElement('div');
      qaHud.id = 'qaHud';
      document.body.appendChild(qaHud);
    }

    LUM.onInit = d => {
      if (d && d.state) { try { LUM.applyState(JSON.parse(d.state)); } catch (e) {} }
      LUM.requestUserPresets();
    };
    LUM.bridgeReady();
    if (!LUM.bridge.plugin) {
      LUM.requestUserPresets();
      LUM.ui.toast('Simulated audio playing — pick Mic / Tab / File in the Audio tab');
    }

    requestAnimationFrame(ts => { last = ts; requestAnimationFrame(loop); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
