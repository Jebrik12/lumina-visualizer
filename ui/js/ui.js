/* Lumina v2 — UI layer: flat minimal chrome, themes, layout controls, FX presets,
   curve editors, color pickers, middle-click reset, full-setup sharing. */
(function () {
  'use strict';
  const LUM = window.LUM;
  const ui = LUM.ui = LUM.ui || {};
  ui.userPresets = [];
  ui.userFxPresets = [];
  ui.userThemes = [];
  ui.activeTab = 'scene';

  const $ = s => document.querySelector(s);
  function el(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ================= themes ================= */
  const BUILTIN_THEMES = {
    dark: { name: 'Dark', vars: { bg: '#0c0c0c', panel2: '#141414', border: '#232323', tx: '#e6e6e6', tx2: '#8a8a8a', ctl: '#1f1f1f' } },
    black: { name: 'Black OLED', vars: { bg: '#000000', panel2: '#0c0c0c', border: '#1d1d1d', tx: '#e4e4e4', tx2: '#7c7c7c', ctl: '#151515' } },
    light: { name: 'Light', vars: { bg: '#f4f4f5', panel2: '#ffffff', border: '#e3e3e6', tx: '#191919', tx2: '#8b8b90', ctl: '#e9e9ec' } }
  };
  const THEME_TOKENS = [
    ['bg', 'Background'], ['panel2', 'Panels'], ['border', 'Borders'],
    ['tx', 'Text'], ['tx2', 'Muted text'], ['ctl', 'Controls']
  ];

  function hexA(hex, a) {
    const c = LUM.hex2rgb(hex);
    return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')';
  }
  function isLightColor(hex) {
    const c = LUM.hex2rgb(hex);
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 0.55;
  }

  ui.themeList = function () {
    const list = Object.keys(BUILTIN_THEMES).map(id => ({ id, name: BUILTIN_THEMES[id].name, vars: BUILTIN_THEMES[id].vars, builtin: true }));
    return list.concat(ui.userThemes.map(t => ({ id: t.id, name: t.name, vars: t.vars, builtin: false })));
  };

  function themeVarsFor(st) {
    const base = BUILTIN_THEMES[st.ui.theme]
      || ui.userThemes.find(t => t.id === st.ui.theme)
      || BUILTIN_THEMES.dark;
    return Object.assign({}, BUILTIN_THEMES.dark.vars, base.vars, st.ui.themeVars || {});
  }

  LUM.applyTheme = function () {
    const st = LUM.state;
    const v = themeVarsFor(st);
    const r = document.documentElement.style;
    const light = isLightColor(v.bg);
    r.setProperty('--bg', v.bg);
    r.setProperty('--panel2', v.panel2);
    r.setProperty('--panel', hexA(v.panel2, st.ui.panelAlpha !== undefined ? st.ui.panelAlpha : 0.92));
    r.setProperty('--border', v.border);
    r.setProperty('--tx', v.tx);
    r.setProperty('--tx2', v.tx2);
    r.setProperty('--ctl', v.ctl);
    r.setProperty('--accent', st.ui.accent || '#5b8cff');
    r.setProperty('--accent-tx', isLightColor(st.ui.accent || '#5b8cff') ? '#111111' : '#ffffff');
    r.setProperty('--hover', light ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.05)');
    r.setProperty('--active', light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.09)');
    r.setProperty('--curve-grid', light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)');
    r.setProperty('--curve-diag', light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.10)');
    r.setProperty('--shadow', light ? '0 6px 22px rgba(0,0,0,0.10)' : '0 6px 24px rgba(0,0,0,0.35)');
    document.body.classList.toggle('blurOn', !!st.ui.blur);
    const z = st.ui.scale || 1;
    ['#chrome', '#toastWrap', '#modalWrap'].forEach(sel => { const e = $(sel); if (e) e.style.zoom = z; });
  };

  /* ================= generic controls ================= */
  function ctlSlider(parent, def, get, set, resetTo) {
    const row = el('div', 'ctl', parent);
    const top = el('div', 'ctlTop', row);
    el('label', '', top).textContent = def.n;
    const val = el('span', 'ctlVal', top);
    const inp = el('input', '', row);
    inp.type = 'range';
    inp.min = def.min; inp.max = def.max;
    inp.step = def.step !== undefined ? def.step : (def.max - def.min) / 200;
    const dp = (def.step !== undefined && def.step >= 1) ? 0 : ((def.max - def.min) > 4 ? 1 : 2);
    const fmt = v => (+v).toFixed(dp) + (def.unit || '');
    const paint = () => {
      const p = (inp.value - def.min) / (def.max - def.min) * 100;
      inp.style.setProperty('--p', p + '%');
      val.textContent = fmt(inp.value);
    };
    inp.value = get();
    paint();
    inp.addEventListener('input', () => { set(parseFloat(inp.value)); paint(); LUM.persist(); });
    const doReset = () => {
      const rv = resetTo !== undefined ? resetTo : def.def;
      if (rv === undefined) return;
      inp.value = rv; set(parseFloat(inp.value)); paint(); LUM.persist();
    };
    inp.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); doReset(); } });
    inp.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
    return row;
  }

  function ctlSelect(parent, def, get, set) {
    const row = el('div', 'ctl', parent);
    const top = el('div', 'ctlTop', row);
    el('label', '', top).textContent = def.n;
    const sel = el('select', 'ctlSel', row);
    def.opts.forEach((o, i) => {
      const op = el('option', '', sel);
      op.value = i; op.textContent = o;
    });
    const vals = def.vals || def.opts.map((o, i) => i);
    let idx = vals.indexOf(get());
    if (idx < 0) { let best = 0, bd = 1e9; vals.forEach((v, i) => { const d = Math.abs(v - get()); if (d < bd) { bd = d; best = i; } }); idx = best; }
    sel.value = idx;
    sel.addEventListener('change', () => { set(vals[+sel.value]); LUM.persist(); });
    return row;
  }

  function ctlToggle(parent, def, get, set) {
    const row = el('div', 'ctl ctlRow', parent);
    el('label', '', row).textContent = def.n;
    const sw = el('div', 'switch' + (get() ? ' on' : ''), row);
    el('div', 'knob', sw);
    sw.addEventListener('click', () => {
      const nv = get() ? 0 : 1;
      set(nv); sw.classList.toggle('on', !!nv); LUM.persist();
    });
    return row;
  }

  function group(parent, title, action) {
    const g = el('div', 'group', parent);
    const t = el('div', 'groupTitle', g);
    t.appendChild(document.createTextNode(title));
    if (action) t.appendChild(action);
    return g;
  }

  function iconBtn(parent, icon, title, cb, id) {
    const b = el('button', 'ibtn', parent);
    b.innerHTML = LUM.icon(icon);
    b.title = title;
    if (id) b.id = id;
    b.addEventListener('click', cb);
    return b;
  }

  /* ================= defs ================= */
  const SCENE_ICONS = {
    bars: 'sc-bars', rings: 'sc-rings', waterfall: 'sc-waterfall', terrain: 'sc-terrain',
    scope: 'sc-scope', tunnel: 'sc-tunnel', harmono: 'sc-harmono', cymatics: 'sc-cymatics',
    julia: 'sc-julia', temple: 'sc-temple', warp: 'sc-warp', mandala: 'sc-mandala',
    particles: 'sc-particles', ink: 'sc-ink', hyper: 'sc-hyper', metaballs: 'sc-metaballs',
    voronoi: 'sc-voronoi', reaction: 'sc-reaction', plasma: 'sc-plasma', retro: 'sc-retro',
    linescape: 'sc-linescape', dotmatrix: 'sc-dotmatrix', ringseq: 'sc-ringseq', ribbons: 'sc-ribbons',
    vu: 'sc-vu', meters: 'sc-meters', readout: 'sc-readout'
  };

  const BLEND_OPTS = { n: '', type: 'select', opts: ['Normal', 'Overlay', 'Screen', 'Color Dodge', 'Multiply', 'Soft Light'], vals: [0, 1, 2, 3, 4, 5] };

  const FX_DEFS = [
    { group: 'Motion Trails', items: [
      { k: 'trail', n: 'Persistence', min: 0, max: 0.97 },
      { k: 'fbZoom', n: 'Echo Zoom', min: -0.6, max: 0.6 },
      { k: 'fbRot', n: 'Echo Spin', min: -1, max: 1 },
      { k: 'fbHue', n: 'Echo Hue Drift', min: -2, max: 2 },
      { k: 'fbShiftX', n: 'Drift X', min: -0.08, max: 0.08 },
      { k: 'fbShiftY', n: 'Drift Y', min: -0.08, max: 0.08 }
    ]},
    { group: 'Bloom', items: [
      { k: 'bloom', n: 'Amount', min: 0, max: 1.5 },
      { k: 'bloomThr', n: 'Threshold', min: 0.2, max: 0.9 },
      { k: 'bloomRad', n: 'Radius', min: 0.5, max: 3 }
    ]},
    { group: 'Threshold & Mono', items: [
      { k: 'thresh', n: 'Threshold Mix', min: 0, max: 1 },
      { k: 'threshLvl', n: 'Level', min: 0.02, max: 0.98 },
      { k: 'threshSoft', n: 'Softness', min: 0.001, max: 0.4 },
      { k: 'threshInv', n: 'Invert', type: 'toggle' },
      { k: 'threshKeep', n: 'Keep Color', type: 'toggle' },
      { k: 'mono', n: 'Monochrome', min: 0, max: 1 },
      { k: 'monoTint', n: 'Mono Tint', type: 'color' }
    ]},
    { group: 'Noise Overlay', items: [
      { k: 'noise2', n: 'Amount', min: 0, max: 1 },
      { k: 'noise2Scale', n: 'Scale', min: 0.5, max: 12 },
      { k: 'noise2Type', n: 'Type', type: 'select', opts: ['Blotch', 'White', 'Lines'], vals: [0, 1, 2] },
      { k: 'noise2Blend', n: 'Blend', type: 'select', opts: BLEND_OPTS.opts.slice(1), vals: [1, 2, 3, 4, 5] },
      { k: 'noise2React', n: 'Audio React', min: 0, max: 1 }
    ]},
    { group: 'Texture', items: [
      { k: 'texOn', n: 'Texture', type: 'select', opts: ['Off', 'Paper', 'Halftone', 'Hatching'], vals: [0, 1, 2, 3] },
      { k: 'texAmt', n: 'Amount', min: 0, max: 1 },
      { k: 'texScale', n: 'Scale', min: 0.3, max: 4 },
      { k: 'texBlend', n: 'Blend', type: 'select', opts: BLEND_OPTS.opts.slice(1), vals: [1, 2, 3, 4, 5] }
    ]},
    { group: 'Grunge & Grain', items: [
      { k: 'grain', n: 'Grain Amount', min: 0, max: 1 },
      { k: 'grainSize', n: 'Grain Size', min: 1, max: 4 },
      { k: 'grainType', n: 'Grain Type', type: 'select', opts: ['Fine Mono', 'Color RGB', 'TV Static'], vals: [0, 1, 2] },
      { k: 'grainReact', n: 'Grain Audio React', min: 0, max: 1 },
      { k: 'dirt', n: 'Film Dirt', min: 0, max: 1 }
    ]},
    { group: 'Glitch & Analog', items: [
      { k: 'glitch', n: 'Block Glitch', min: 0, max: 1 },
      { k: 'glitchBeat', n: 'Glitch On Beats Only', type: 'toggle' },
      { k: 'vhs', n: 'VHS Tracking', min: 0, max: 1 },
      { k: 'vhsJit', n: 'VHS Line Jitter', min: 0, max: 1 },
      { k: 'scan', n: 'Scanlines', min: 0, max: 1 },
      { k: 'pixel', n: 'Pixelate (0 = off)', min: 0, max: 220, step: 1 },
      { k: 'poster', n: 'Posterize (0 = off)', min: 0, max: 24, step: 1 },
      { k: 'dither', n: 'Dither', min: 0, max: 1 }
    ]},
    { group: 'Lens & Distort', items: [
      { k: 'ca', n: 'Chromatic Aberration', min: 0, max: 1 },
      { k: 'lens', n: 'Fisheye ↔ Pinch', min: -1, max: 1 },
      { k: 'warp', n: 'Wave Warp', min: 0, max: 1 },
      { k: 'warpReact', n: 'Warp Audio React', min: 0, max: 1 },
      { k: 'vig', n: 'Vignette', min: 0, max: 1 }
    ]},
    { group: 'Symmetry', items: [
      { k: 'kaleido', n: 'Kaleidoscope', type: 'select', opts: ['Off', '3', '4', '5', '6', '8', '10', '12', '16'], vals: [0, 3, 4, 5, 6, 8, 10, 12, 16] },
      { k: 'mirror', n: 'Mirror', type: 'select', opts: ['Off', 'Mirror X', 'Mirror Y', 'Quad'], vals: [0, 1, 2, 3] }
    ]},
    { group: 'Color Grade', items: [
      { k: 'exposure', n: 'Exposure (EV)', min: -2, max: 2 },
      { k: 'expo', n: 'Brightness', min: 0.6, max: 2.6 },
      { k: 'contrast', n: 'Contrast', min: 0.6, max: 1.6 },
      { k: 'satur', n: 'Saturation', min: 0, max: 2 },
      { k: 'temp', n: 'Temperature', min: -1, max: 1 },
      { k: 'tint', n: 'Tint', min: -1, max: 1 },
      { k: 'hueSpeed', n: 'Hue Rotate (°/s)', min: -120, max: 120 },
      { k: 'gamma', n: 'Gamma', min: 0.6, max: 1.6 }
    ]}
  ];

  const AUD_REACT_DEFS = [
    { k: 'react', n: 'Reaction Amount', min: 0, max: 2 },
    { k: 'floor', n: 'Reaction Floor', min: 0, max: 0.5 },
    { k: 'dyn', n: 'Dynamics (quiet ↔ loud)', min: 0, max: 1 }
  ];
  const AUD_DEFS = [
    { k: 'sens', n: 'Input Gain (dB)', min: -18, max: 18 },
    { k: 'attack', n: 'Attack (ms)', min: 1, max: 80, step: 1 },
    { k: 'release', n: 'Release (ms)', min: 40, max: 800, step: 1 },
    { k: 'tilt', n: 'Spectrum Tilt (dB/oct)', min: -3, max: 9 },
    { k: 'beat', n: 'Beat Sensitivity', min: 0, max: 1 },
    { k: 'gate', n: 'Noise Gate', min: 0, max: 0.15 }
  ];

  /* ================= build ================= */
  ui.build = function () {
    buildTopbar();
    buildScenePanel();
    buildCtrlPanel();
    bindGlobal();
    LUM.applyTheme();
    ui.refresh();
  };

  function buildTopbar() {
    const tb = $('#topbar');
    tb.innerHTML = '';
    const logo = el('div', 'logo', tb);
    logo.innerHTML = 'LUMINA<span>v2</span>';

    const nav = el('div', 'presetNav', tb);
    iconBtn(nav, 'chevron-left', 'Previous preset (←)', () => stepPreset(-1));
    const sel = el('select', 'presetSel', nav);
    sel.id = 'presetSel';
    sel.addEventListener('change', () => {
      const v = sel.value;
      if (v.startsWith('f:')) LUM.applyPreset(LUM.factoryPresets[+v.slice(2)]);
      else if (v.startsWith('u:')) LUM.applyPreset(ui.userPresets[+v.slice(2)]);
    });
    iconBtn(nav, 'chevron-right', 'Next preset (→)', () => stepPreset(1));
    iconBtn(nav, 'plus', 'Save preset', savePresetFlow, 'btnSave');
    iconBtn(nav, 'trash', 'Delete user preset', deleteUserPreset, 'btnDel');
    iconBtn(nav, 'download', 'Export preset (clipboard + file)', exportPreset);
    iconBtn(nav, 'upload', 'Import preset / setup', importPresetFlow);

    el('div', 'spacer', tb);
    const src = el('div', 'srcLabel', tb); src.id = 'srcLabel';
    const fps = el('div', 'fps', tb); fps.id = 'fps';
    iconBtn(tb, 'dice', 'Randomize look (R) — Shift-click: random scene too', e => LUM.randomize(e.shiftKey), 'btnDice');
    iconBtn(tb, 'shuffle', 'Shuffle presets on beat (S)', toggleShuffle, 'btnShuffle');
    iconBtn(tb, 'maximize', 'Fullscreen (F)', () => LUM.toggleFullscreen());
    iconBtn(tb, 'help', 'Help & shortcuts (H)', helpModal);
  }

  function buildScenePanel() {
    const sp = $('#scenePanel');
    sp.innerHTML = '';
    el('div', 'panelTitle', sp).textContent = 'SCENES';
    const cats = [];
    LUM.scenes.forEach(s => { if (!cats.includes(s.cat)) cats.push(s.cat); });
    cats.forEach(cat => {
      el('div', 'catLabel', sp).textContent = cat;
      LUM.scenes.filter(s => s.cat === cat).forEach(s => {
        const b = el('button', 'sceneBtn', sp);
        b.dataset.scene = s.id;
        b.innerHTML = '<span class="sIcon">' + LUM.icon(SCENE_ICONS[s.id] || 'sc-rings') + '</span><span>' + s.name + '</span>';
        b.addEventListener('click', () => { LUM.assignScene(s.id); LUM.persist(); });
      });
    });
  }

  function buildCtrlPanel() {
    const cp = $('#ctrlPanel');
    cp.innerHTML = '';
    const tabs = el('div', 'tabs', cp);
    [['scene', 'Scene'], ['fx', 'FX'], ['color', 'Color'], ['audio', 'Audio'], ['ui', 'UI']].forEach(([id, label]) => {
      const t = el('button', 'tab', tabs);
      t.dataset.tab = id; t.textContent = label;
      t.addEventListener('click', () => { ui.activeTab = id; ui.refresh(); });
    });
    const body = el('div', 'tabBody', cp);
    body.id = 'tabBody';
  }

  /* ================= tabs ================= */
  function renderSceneTab(body) {
    const st = LUM.state;
    const L = st.layout;

    /* layout */
    const gl = group(body, 'Layout');
    const lr = el('div', 'layoutRow', gl);
    LUM.layoutModes.forEach(m => {
      const b = el('button', 'layoutBtn' + (L.mode === m.id ? ' active' : ''), lr);
      b.innerHTML = LUM.icon(m.icon);
      b.title = m.n;
      b.addEventListener('click', () => { L.mode = m.id; L.active = Math.min(L.active, LUM.layoutModeById[m.id].panes - 1); LUM.syncActiveScene(); LUM.persist(); ui.refresh(); });
    });
    const nPanes = LUM.layoutModeById[L.mode].panes;
    if (nPanes > 1) {
      const pr = el('div', 'paneRow', gl);
      for (let i = 0; i < nPanes; i++) {
        const sc = LUM.sceneById[L.panes[i]] || LUM.scenes[0];
        const b = el('button', 'paneBtn' + (L.active === i ? ' active' : ''), pr);
        b.textContent = (i + 1) + ' · ' + sc.name;
        b.title = 'Edit pane ' + (i + 1) + ' (click a scene to assign)';
        b.addEventListener('click', () => { L.active = i; LUM.syncActiveScene(); ui.refresh(); });
      }
      if (L.mode === '2h' || L.mode === '3h' || L.mode === 'quad')
        ctlSlider(gl, { n: 'Split', min: 0.15, max: 0.85 }, () => L.split, v => { L.split = v; }, 0.5);
      if (L.mode === '2v' || L.mode === 'quad')
        ctlSlider(gl, { n: 'Split Vertical', min: 0.15, max: 0.85 }, () => L.splitV, v => { L.splitV = v; }, 0.5);
      if (L.mode === '3h')
        ctlSlider(gl, { n: 'Split 2', min: 0.15, max: 0.85 }, () => L.splitV, v => { L.splitV = v; }, 0.5);
      ctlSlider(gl, { n: 'Gap', min: 0, max: 12, step: 1 }, () => L.gap, v => { L.gap = v; }, 2);
      el('div', 'hint', gl).textContent = 'Click a pane above (or click inside a pane on the canvas), then pick its scene from the list.';
    }

    /* active scene params */
    const sc = LUM.sceneById[st.scene];
    const P = LUM.paramsOf(sc.id);
    const head = el('div', 'sceneHead', body);
    el('div', 'sceneName', head).textContent = sc.name + (nPanes > 1 ? '  ·  pane ' + (L.active + 1) : '');
    const rnd = el('button', 'miniBtn', head);
    rnd.innerHTML = LUM.icon('dice') + 'randomize';
    rnd.addEventListener('click', () => LUM.randomize(false));
    if (!sc.params.length) { el('div', 'hint', body).textContent = 'This scene has no extra parameters.'; return; }
    sc.params.forEach(def => {
      const get = () => P[def.k];
      const set = v => { P[def.k] = v; };
      if (def.type === 'select') ctlSelect(body, def, get, set);
      else if (def.type === 'toggle') ctlToggle(body, def, get, set);
      else ctlSlider(body, def, get, set);
    });
  }

  function fxPresetRow(body) {
    const st = LUM.state;
    const g = group(body, 'FX Preset');
    const row = el('div', 'btnRow', g);
    const sel = el('select', 'ctlSel', row);
    sel.style.flex = '1';
    const og1 = el('optgroup', '', sel); og1.label = 'Factory';
    LUM.factoryFxPresets.forEach((p, i) => { const o = el('option', '', og1); o.value = 'f:' + i; o.textContent = p.name; });
    if (ui.userFxPresets.length) {
      const og2 = el('optgroup', '', sel); og2.label = 'User';
      ui.userFxPresets.forEach((p, i) => { const o = el('option', '', og2); o.value = 'u:' + i; o.textContent = p.name; });
    }
    const cur = el('option', '', sel); cur.value = 'x'; cur.textContent = '— current —';
    sel.value = 'x';
    sel.addEventListener('change', () => {
      const v = sel.value;
      let p = null;
      if (v.startsWith('f:')) p = LUM.factoryFxPresets[+v.slice(2)];
      else if (v.startsWith('u:')) p = ui.userFxPresets[+v.slice(2)];
      if (p) {
        st.fx = Object.assign({}, LUM.DEFAULT_FX, p.fx);
        LUM.syncCurveLUT();
        LUM.persist(); ui.refresh();
        ui.toast('FX preset: ' + p.name);
      }
    });
    const save = el('button', 'iconBtn', row);
    save.innerHTML = LUM.icon('save'); save.title = 'Save current FX as preset';
    save.addEventListener('click', () => {
      showModal('Save FX preset', b => {
        const inp = el('input', 'txtInp', b);
        inp.placeholder = 'FX preset name…';
        setTimeout(() => inp.focus(), 40);
        return () => inp.value.trim();
      }, [
        { label: 'Cancel' },
        { label: 'Save', primary: true, cb: getVal => {
          const name = getVal();
          if (!name) return false;
          const np = { name, fx: Object.assign({}, st.fx) };
          const ex = ui.userFxPresets.findIndex(p => p.name === name);
          if (ex >= 0) ui.userFxPresets[ex] = np; else ui.userFxPresets.push(np);
          saveUserStore();
          ui.refresh();
          ui.toast('FX preset saved: ' + name);
          return true;
        }}
      ]);
    });
    const reset = el('button', 'iconBtn', row);
    reset.innerHTML = LUM.icon('reset'); reset.title = 'Reset all FX to defaults';
    reset.addEventListener('click', () => {
      st.fx = Object.assign({}, LUM.DEFAULT_FX);
      LUM.syncCurveLUT();
      LUM.persist(); ui.refresh();
    });
  }

  function renderFxTab(body) {
    const st = LUM.state;
    const fx = st.fx;
    fxPresetRow(body);

    FX_DEFS.forEach(gd => {
      const g = group(body, gd.group);
      gd.items.forEach(def => {
        const get = () => fx[def.k];
        const set = v => { fx[def.k] = v; };
        if (def.type === 'select') ctlSelect(g, def, get, set);
        else if (def.type === 'toggle') ctlToggle(g, def, get, set);
        else if (def.type === 'color') LUM.colorControl(g, def.n, () => fx[def.k], v => { fx[def.k] = v; LUM.persist(); });
        else ctlSlider(g, def, get, set, LUM.DEFAULT_FX[def.k]);
      });
    });

    /* curves */
    const resetBtn = el('button', 'iconBtn', null);
    resetBtn.innerHTML = LUM.icon('reset'); resetBtn.title = 'Reset curve';
    const gc = group(body, 'Curves (luminance)', resetBtn);
    const ce = LUM.CurveEditor(gc, {
      points: fx.curvePts,
      height: 150,
      onChange(pts, lut) {
        fx.curvePts = pts;
        const ident = pts.every(p => Math.abs(p[1] - p[0]) < 0.004);
        fx.curveOn = ident ? 0 : 1;
        LUM.setCurveLUT(lut);
        LUM.persist();
      }
    });
    resetBtn.addEventListener('click', () => ce.reset());
    el('div', 'hint', gc).textContent = 'Drag points to shape output luminance. Middle-click or double-click to reset.';

    /* media layer */
    const gm = group(body, 'Media Layer');
    const info = el('div', 'hint', gm);
    info.id = 'mediaInfo';
    info.textContent = LUM.media.ready ? 'Loaded: ' + (LUM.media.name || LUM.media.type) : 'Load your own image, GIF or video and blend it with the visuals.';
    const row = el('div', 'btnRow', gm);
    const load = el('button', 'miniBtn', row);
    load.innerHTML = LUM.icon('image') + 'Load media';
    load.addEventListener('click', () => LUM.media.pick());
    const clr = el('button', 'miniBtn', row);
    clr.innerHTML = LUM.icon('trash') + 'Clear';
    clr.addEventListener('click', () => LUM.media.remove());
    ctlSelect(gm, { n: 'Placement', type: 'select', opts: ['Background', 'Overlay'], vals: [0, 1] }, () => fx.mediaLayer, v => { fx.mediaLayer = v; });
    ctlSelect(gm, { n: 'Fit', type: 'select', opts: ['Cover', 'Contain', 'Tile'], vals: [0, 1, 2] }, () => fx.mediaFit, v => { fx.mediaFit = v; });
    ctlSelect(gm, Object.assign({}, BLEND_OPTS, { n: 'Blend' }), () => fx.mediaBlend, v => { fx.mediaBlend = v; });
    ctlSlider(gm, { n: 'Opacity', min: 0, max: 1 }, () => fx.mediaOp, v => { fx.mediaOp = v; }, 1);
    ctlSlider(gm, { n: 'Beat Motion', min: 0, max: 1 }, () => fx.mediaMotion, v => { fx.mediaMotion = v; }, 0.3);
  }

  function renderColorTab(body) {
    const pal = LUM.state.pal;
    const g = group(body, 'Palette');
    const grid = el('div', 'swGrid', g);
    LUM.palettes.forEach(p => {
      const b = el('button', 'sw' + (pal.id === p.id ? ' active' : ''), grid);
      b.title = p.name;
      const stops = [];
      for (let i = 0; i <= 6; i++) {
        const c = LUM.evalPalette(p, i / 6);
        stops.push(LUM.rgb2hex(c) + ' ' + Math.round(i / 6 * 100) + '%');
      }
      b.style.background = 'linear-gradient(90deg,' + stops.join(',') + ')';
      b.addEventListener('click', () => { pal.id = p.id; LUM.persist(); ui.refresh(); });
    });
    const gc = group(body, 'Custom Palette');
    if (!pal.custom) pal.custom = { c1: '#5b8cff', c2: '#e6e6e6' };
    LUM.colorControl(gc, 'Color A', () => pal.custom.c1, v => { pal.custom.c1 = v; if (pal.id === 'custom') LUM.persist(); });
    LUM.colorControl(gc, 'Color B', () => pal.custom.c2, v => { pal.custom.c2 = v; if (pal.id === 'custom') LUM.persist(); });
    const useBtn = el('button', 'miniBtn wide' + (pal.id === 'custom' ? ' activeBtn' : ''), gc);
    useBtn.style.marginTop = '8px';
    useBtn.textContent = pal.id === 'custom' ? 'Using custom palette' : 'Use custom palette';
    useBtn.addEventListener('click', () => { pal.id = 'custom'; LUM.persist(); ui.refresh(); });
    const gm = group(body, 'Palette Motion');
    ctlSlider(gm, { n: 'Palette Shift', min: 0, max: 1 }, () => pal.shift || 0, v => { pal.shift = v; }, 0);
    ctlSlider(gm, { n: 'Palette Cycle (/s)', min: 0, max: 0.08 }, () => pal.cycle || 0, v => { pal.cycle = v; }, 0);
  }

  function renderAudioTab(body) {
    const aud = LUM.state.aud;
    const gm = group(body, 'Levels');
    const meters = el('div', 'meters', gm);
    [['Bass', 'mBass'], ['Mid', 'mMid'], ['Treble', 'mTreb']].forEach(([n, id]) => {
      const m = el('div', 'meter', meters);
      el('span', '', m).textContent = n;
      const tr = el('div', 'mTrack', m);
      el('div', 'mFill', tr).id = id;
    });

    const gr0 = group(body, 'Reactivity');
    AUD_REACT_DEFS.forEach(def => ctlSlider(gr0, def, () => aud[def.k], v => { aud[def.k] = v; }, LUM.DEFAULT_AUD[def.k]));

    const rstC = el('button', 'iconBtn', null);
    rstC.innerHTML = LUM.icon('reset'); rstC.title = 'Reset response curve';
    const gcv = group(body, 'Response Curve', rstC);
    const ce = LUM.CurveEditor(gcv, {
      points: aud.respPts || [[0, 0], [0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [1, 1]],
      height: 130,
      onChange(pts, lut) {
        const ident = pts.every(p => Math.abs(p[1] - p[0]) < 0.004);
        aud.respPts = ident ? null : pts;
        aud.respLut = ident ? null : Array.from(LUM.curveLut(pts, 64));
        LUM.persist();
      }
    });
    rstC.addEventListener('click', () => ce.reset());
    el('div', 'hint', gcv).textContent = 'How input level maps to visual reaction. Bow it down for calm-until-loud, up for always-lively.';

    const g = group(body, 'Input & Analysis');
    AUD_DEFS.forEach(def => ctlSlider(g, def, () => aud[def.k], v => { aud[def.k] = v; }, LUM.DEFAULT_AUD[def.k]));
    ctlToggle(g, { n: 'Auto Gain (AGC)' }, () => aud.agc ? 1 : 0, v => { aud.agc = !!v; });
    ctlSlider(g, { n: 'Auto-Gain Strength', min: 0, max: 1 }, () => aud.agcAmt !== undefined ? aud.agcAmt : 0.75, v => { aud.agcAmt = v; }, 0.75);

    if (!LUM.bridge.plugin) {
      const gs = group(body, 'Input Source');
      const wrap = el('div', 'srcBtns', gs);
      [['sim', 'Simulation', 'play'], ['mic', 'Microphone', 'mic'], ['tab', 'Tab / System', 'monitor'], ['file', 'Audio File', 'music']].forEach(([kind, label, ic]) => {
        const b = el('button', 'miniBtn srcBtn', wrap);
        b.dataset.kind = kind;
        b.innerHTML = LUM.icon(ic) + label;
        b.addEventListener('click', () => pickSource(kind));
      });
      el('div', 'hint', gs).textContent = 'In the plugin, audio comes straight from your Ableton track.';
    }
  }

  function renderUiTab(body) {
    const st = LUM.state;

    const gt = group(body, 'Theme');
    const themes = ui.themeList();
    ctlSelect(gt, {
      n: 'Theme',
      type: 'select',
      opts: themes.map(t => t.name),
      vals: themes.map(t => t.id)
    }, () => st.ui.theme, v => { st.ui.theme = v; st.ui.themeVars = null; LUM.applyTheme(); ui.refresh(); });
    LUM.colorControl(gt, 'Accent color', () => st.ui.accent || '#5b8cff', v => { st.ui.accent = v; LUM.applyTheme(); LUM.persist(); });
    const row = el('div', 'btnRow', gt);
    const edit = el('button', 'miniBtn', row);
    edit.innerHTML = LUM.icon('palette') + 'Edit theme colors';
    edit.addEventListener('click', themeEditor);
    const cur = themes.find(t => t.id === st.ui.theme);
    if (cur && !cur.builtin) {
      const del = el('button', 'miniBtn', row);
      del.innerHTML = LUM.icon('trash') + 'Delete theme';
      del.addEventListener('click', () => {
        ui.userThemes = ui.userThemes.filter(t => t.id !== st.ui.theme);
        st.ui.theme = 'dark'; st.ui.themeVars = null;
        saveUserStore(); LUM.applyTheme(); LUM.persist(); ui.refresh();
      });
    }

    const ga = group(body, 'Appearance');
    ctlSlider(ga, { n: 'UI Scale', min: 0.75, max: 1.35 }, () => st.ui.scale || 1, v => { st.ui.scale = v; LUM.applyTheme(); }, 1);
    ctlToggle(ga, { n: 'Panel Blur' }, () => st.ui.blur ? 1 : 0, v => { st.ui.blur = !!v; LUM.applyTheme(); });
    ctlSlider(ga, { n: 'Panel Opacity', min: 0.5, max: 1 }, () => st.ui.panelAlpha !== undefined ? st.ui.panelAlpha : 0.92, v => { st.ui.panelAlpha = v; LUM.applyTheme(); }, 0.92);
    ctlToggle(ga, { n: 'Auto-hide UI' }, () => st.ui.autohide ? 1 : 0, v => { st.ui.autohide = !!v; });
    ctlToggle(ga, { n: 'Show FPS' }, () => st.ui.showFps ? 1 : 0, v => { st.ui.showFps = !!v; ui.refresh(); });

    const gq = group(body, 'Render');
    ctlSelect(gq, { n: 'Quality', type: 'select', opts: ['Auto', 'Low', 'Medium', 'High'], vals: ['auto', 'low', 'med', 'high'] },
      () => st.ui.quality, v => { st.ui.quality = v; LUM.qualityChanged(); });

    const gx = group(body, 'Share Setup');
    const rowx = el('div', 'btnRow', gx);
    const exp = el('button', 'miniBtn', rowx);
    exp.innerHTML = LUM.icon('download') + 'Export full setup';
    exp.addEventListener('click', () => {
      const json = JSON.stringify({ luminaSetup: 1, state: LUM.serialize() }, null, 2);
      LUM.copyText(json);
      LUM.exportPresetFile('lumina-setup', json);
      ui.toast('Full setup copied + saved as file');
    });
    const imp = el('button', 'miniBtn', rowx);
    imp.innerHTML = LUM.icon('upload') + 'Import';
    imp.addEventListener('click', importPresetFlow);
    el('div', 'hint', gx).textContent = 'A setup includes scenes, panes, FX, palette, audio response and theme — everything.';
  }

  function themeEditor() {
    const st = LUM.state;
    const vars = themeVarsFor(st);
    showModal('Theme editor', body => {
      el('div', 'hint', body).textContent = 'Click any color to edit it live. Save it as a named theme to reuse and share.';
      THEME_TOKENS.forEach(([k, label]) => {
        const row = el('div', 'themeTokenRow', body);
        el('label', '', row).textContent = label;
        const chip = el('button', 'colorChip', row);
        chip.style.background = vars[k];
        chip.addEventListener('click', () => {
          LUM.openColorPicker(chip, (st.ui.themeVars && st.ui.themeVars[k]) || vars[k], hx => {
            chip.style.background = hx;
            st.ui.themeVars = st.ui.themeVars || {};
            st.ui.themeVars[k] = hx;
            LUM.applyTheme();
            LUM.persist();
          });
        });
      });
      const nameRow = el('div', '', body);
      nameRow.style.marginTop = '14px';
      const inp = el('input', 'txtInp', nameRow);
      inp.placeholder = 'Save as theme… (name)';
      return () => inp.value.trim();
    }, [
      { label: 'Close' },
      { label: 'Save theme', primary: true, cb: getVal => {
        const name = getVal();
        if (!name) { ui.toast('Give the theme a name to save it'); return false; }
        const id = 'user_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const vars2 = Object.assign({}, themeVarsFor(LUM.state));
        const ex = ui.userThemes.findIndex(t => t.id === id);
        const t = { id, name, vars: vars2 };
        if (ex >= 0) ui.userThemes[ex] = t; else ui.userThemes.push(t);
        LUM.state.ui.theme = id;
        LUM.state.ui.themeVars = null;
        saveUserStore();
        LUM.applyTheme(); LUM.persist(); ui.refresh();
        ui.toast('Theme saved: ' + name);
        return true;
      }}
    ]);
  }

  ui.refresh = function () {
    const st = LUM.state;
    document.querySelectorAll('.sceneBtn').forEach(b =>
      b.classList.toggle('active', b.dataset.scene === st.scene));
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === ui.activeTab));
    const body = $('#tabBody');
    if (body) {
      body.innerHTML = '';
      if (ui.activeTab === 'scene') renderSceneTab(body);
      else if (ui.activeTab === 'fx') renderFxTab(body);
      else if (ui.activeTab === 'color') renderColorTab(body);
      else if (ui.activeTab === 'audio') renderAudioTab(body);
      else renderUiTab(body);
    }
    refreshPresetSelect();
    const sh = $('#btnShuffle');
    if (sh) sh.classList.toggle('activeBtn', !!st.ui.shuffle);
    const fpsEl = $('#fps');
    if (fpsEl) fpsEl.style.display = st.ui.showFps ? '' : 'none';
    ui.onSourceChanged();
  };

  ui.onMediaChanged = function () {
    const e = document.getElementById('mediaInfo');
    if (e) e.textContent = LUM.media.ready ? 'Loaded: ' + (LUM.media.name || LUM.media.type) : 'Load your own image, GIF or video and blend it with the visuals.';
  };

  ui.onSourceChanged = function () {
    const lbl = $('#srcLabel');
    if (lbl) {
      const names = { sim: 'SIM', mic: 'MIC', tab: 'TAB', file: 'FILE', plugin: 'LIVE' };
      lbl.textContent = LUM.source ? (names[LUM.source.name] || LUM.source.name) : '';
    }
    document.querySelectorAll('.srcBtn').forEach(b =>
      b.classList.toggle('activeBtn', LUM.source && LUM.source.name === b.dataset.kind));
  };

  /* ================= presets ================= */
  function refreshPresetSelect() {
    const sel = $('#presetSel');
    if (!sel) return;
    sel.innerHTML = '';
    const ogF = el('optgroup', '', sel); ogF.label = 'Factory';
    LUM.factoryPresets.forEach((p, i) => {
      const o = el('option', '', ogF); o.value = 'f:' + i; o.textContent = p.name;
    });
    if (ui.userPresets.length) {
      const ogU = el('optgroup', '', sel); ogU.label = 'User';
      ui.userPresets.forEach((p, i) => {
        const o = el('option', '', ogU); o.value = 'u:' + i; o.textContent = p.name;
      });
    }
    const name = LUM.state.presetName;
    let val = null;
    const fi = LUM.factoryPresets.findIndex(p => p.name === name);
    if (fi >= 0) val = 'f:' + fi;
    else {
      const uIdx = ui.userPresets.findIndex(p => p.name === name);
      if (uIdx >= 0) val = 'u:' + uIdx;
    }
    if (val === null) {
      const o = el('option', '', sel);
      o.value = 'x'; o.textContent = (name || 'Custom') + ' •';
      val = 'x';
    }
    sel.value = val;
    const del = $('#btnDel');
    if (del) del.style.display = (val && val.startsWith('u:')) ? '' : 'none';
  }

  function allPresets() { return LUM.factoryPresets.concat(ui.userPresets); }

  function stepPreset(dir) {
    const list = allPresets();
    let idx = list.findIndex(p => p.name === LUM.state.presetName);
    idx = (idx + dir + list.length) % list.length;
    LUM.applyPreset(list[idx]);
  }
  ui.stepPreset = stepPreset;

  function snapshotPreset(name) {
    const s = LUM.state;
    const out = {
      name,
      scene: s.scene,
      p: Object.assign({}, LUM.paramsOf(s.scene)),
      fx: JSON.parse(JSON.stringify(s.fx)),
      pal: JSON.parse(JSON.stringify(s.pal))
    };
    if (s.layout.mode !== 'single') {
      out.layout = JSON.parse(JSON.stringify(s.layout));
      out.paneParams = {};
      const n = LUM.layoutModeById[s.layout.mode].panes;
      for (let i = 0; i < n; i++) out.paneParams[s.layout.panes[i]] = Object.assign({}, LUM.paramsOf(s.layout.panes[i]));
    }
    return out;
  }

  function savePresetFlow() {
    showModal('Save preset', body => {
      const inp = el('input', 'txtInp', body);
      inp.placeholder = 'Preset name…';
      inp.value = LUM.state.presetName && !LUM.factoryPresets.some(p => p.name === LUM.state.presetName)
        ? LUM.state.presetName : '';
      setTimeout(() => inp.focus(), 50);
      return () => inp.value.trim();
    }, [
      { label: 'Cancel' },
      { label: 'Save', primary: true, cb: getVal => {
        let name = getVal();
        if (!name) { ui.toast('Give it a name'); return false; }
        if (LUM.factoryPresets.some(p => p.name === name)) name += ' (mine)';
        const np = snapshotPreset(name);
        const ex = ui.userPresets.findIndex(p => p.name === name);
        if (ex >= 0) ui.userPresets[ex] = np; else ui.userPresets.push(np);
        saveUserStore();
        LUM.state.presetName = name;
        LUM.persist(); ui.refresh();
        ui.toast('Preset saved: ' + name);
        return true;
      }}
    ]);
  }

  function deleteUserPreset() {
    const name = LUM.state.presetName;
    const idx = ui.userPresets.findIndex(p => p.name === name);
    if (idx < 0) return;
    ui.userPresets.splice(idx, 1);
    saveUserStore();
    ui.toast('Deleted: ' + name);
    ui.refresh();
  }

  function exportPreset() {
    const json = JSON.stringify(snapshotPreset(LUM.state.presetName || 'My Preset'), null, 2);
    LUM.copyText(json);
    LUM.exportPresetFile(LUM.state.presetName || 'lumina-preset', json);
    ui.toast('Preset copied to clipboard + saved as file');
  }

  function importPresetFlow() {
    showModal('Import preset or setup', body => {
      el('div', 'hint', body).textContent = 'Paste preset/setup JSON below, or import a file.';
      const ta = el('textarea', 'txtArea', body);
      ta.placeholder = '{ ... }';
      const fb = el('button', 'miniBtn', body);
      fb.innerHTML = LUM.icon('upload') + 'Import from file…';
      fb.addEventListener('click', () => { closeModal(); LUM.importPresetFile(); });
      return () => ta.value.trim();
    }, [
      { label: 'Cancel' },
      { label: 'Import', primary: true, cb: getVal => {
        const t = getVal();
        if (!t) return false;
        ui.onImportedPreset(t);
        return true;
      }}
    ]);
  }

  ui.onImportedPreset = function (json) {
    if (!json) return;
    try {
      const p = JSON.parse(json);
      if (p && p.luminaSetup && p.state) {
        LUM.applyState(p.state);
        LUM.applyTheme();
        LUM.persist();
        ui.toast('Full setup imported');
        return;
      }
      if (!p || !p.scene || !LUM.sceneById[p.scene]) { ui.toast('Import failed: unknown scene'); return; }
      p.name = p.name || 'Imported';
      LUM.applyPreset(p);
      const ex = ui.userPresets.findIndex(q => q.name === p.name);
      if (ex >= 0) ui.userPresets[ex] = p; else ui.userPresets.push(p);
      saveUserStore();
      ui.refresh();
      ui.toast('Imported preset: ' + p.name);
    } catch (e) { ui.toast('Import failed: invalid JSON'); }
  };

  ui.onPasteText = function (t) { ui.onImportedPreset(t); };

  function saveUserStore() {
    LUM.saveUserPresets({ v: 2, presets: ui.userPresets, fxPresets: ui.userFxPresets, themes: ui.userThemes });
  }

  ui.onUserPresets = function (json) {
    if (!json) return;
    try {
      const o = JSON.parse(json);
      if (o) {
        if (Array.isArray(o.presets)) ui.userPresets = o.presets;
        if (Array.isArray(o.fxPresets)) ui.userFxPresets = o.fxPresets;
        if (Array.isArray(o.themes)) ui.userThemes = o.themes;
      }
      refreshPresetSelect();
    } catch (e) {}
  };

  /* ================= shuffle / focus / keys ================= */
  function toggleShuffle() {
    LUM.state.ui.shuffle = !LUM.state.ui.shuffle;
    ui.toast(LUM.state.ui.shuffle ? 'Shuffle ON — new look every 32 beats' : 'Shuffle off');
    LUM.persist(); ui.refresh();
  }

  let hideTimer = null;
  function pokeChrome() {
    document.body.classList.remove('chromeHidden');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (LUM.state.ui.autohide && !modalOpen) document.body.classList.add('chromeHidden');
    }, 3500);
  }

  function bindGlobal() {
    window.addEventListener('mousemove', pokeChrome);
    window.addEventListener('mousedown', pokeChrome);
    pokeChrome();
    const cv = $('#glcanvas');
    cv.addEventListener('dblclick', () => LUM.toggleFullscreen());
    cv.addEventListener('click', e => {
      const L = LUM.state.layout;
      if (LUM.layoutModeById[L.mode].panes > 1) {
        const r = cv.getBoundingClientRect();
        const i = LUM.paneAt(L, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
        if (i !== L.active) {
          L.active = i;
          LUM.syncActiveScene();
          ui.refresh();
          ui.toast('Editing pane ' + (i + 1) + ' — ' + (LUM.sceneById[L.panes[i]] || {}).name);
        }
      }
    });
    window.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      pokeChrome();
      switch (e.key) {
        case 'f': case 'F': LUM.toggleFullscreen(); break;
        case 'Escape': if (modalOpen) closeModal(); else LUM.exitFullscreen(); break;
        case 'r': LUM.randomize(false); break;
        case 'R': LUM.randomize(true); break;
        case 's': case 'S': toggleShuffle(); break;
        case 'ArrowLeft': stepPreset(-1); break;
        case 'ArrowRight': stepPreset(1); break;
        case 'ArrowUp': stepScene(-1); e.preventDefault(); break;
        case 'ArrowDown': stepScene(1); e.preventDefault(); break;
        case 'h': case 'H': case '?': helpModal(); break;
        default: break;
      }
    });
  }

  function stepScene(dir) {
    const ids = LUM.scenes.map(s => s.id);
    let i = ids.indexOf(LUM.state.scene);
    i = (i + dir + ids.length) % ids.length;
    LUM.assignScene(ids[i]);
    LUM.persist();
  }

  /* ================= modal / toast ================= */
  let modalOpen = false, modalGetVal = null;
  function showModal(title, buildBody, buttons) {
    const wrap = $('#modalWrap');
    wrap.innerHTML = '';
    wrap.classList.remove('hidden');
    modalOpen = true;
    const card = el('div', 'modalCard', wrap);
    el('div', 'modalTitle', card).textContent = title;
    const body = el('div', 'modalBody', card);
    modalGetVal = buildBody(body) || (() => null);
    const btns = el('div', 'modalBtns', card);
    buttons.forEach(b => {
      const be = el('button', 'miniBtn' + (b.primary ? ' primary' : ''), btns);
      be.textContent = b.label;
      be.addEventListener('click', () => {
        if (b.cb) { if (b.cb(modalGetVal) === false) return; }
        closeModal();
      });
    });
    wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(); }, { once: true });
  }
  function closeModal() {
    $('#modalWrap').classList.add('hidden');
    $('#modalWrap').innerHTML = '';
    modalOpen = false;
    LUM.closePopover();
  }
  ui.showModal = showModal;

  function helpModal() {
    showModal('Lumina — help', body => {
      body.innerHTML = [
        '<div class="helpRow"><b>F</b> fullscreen · <b>Esc</b> exit</div>',
        '<div class="helpRow"><b>R</b> randomize look · <b>Shift+R</b> random scene too</div>',
        '<div class="helpRow"><b>S</b> shuffle presets on beat</div>',
        '<div class="helpRow"><b>← →</b> previous / next preset · <b>↑ ↓</b> scene</div>',
        '<div class="helpRow"><b>Middle-click</b> any slider or curve → reset to default</div>',
        '<div class="helpRow"><b>Click a pane</b> in multi-layouts to edit it</div>',
        '<div class="hint" style="margin-top:10px">27 scenes · multi-pane layouts · FX presets · media layer · themeable UI. Everything lives in Scene / FX / Color / Audio / UI tabs.</div>',
        '<div class="hint">Lumina v2.0 — open source (AGPL-3.0)</div>'
      ].join('');
      return () => null;
    }, [{ label: 'Close', primary: true }]);
  }

  ui.toast = function (msg) {
    const wrap = $('#toastWrap');
    const t = el('div', 'toast', wrap);
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2600);
  };

  /* ================= sources (web demo) ================= */
  let fileInput = null;
  async function pickSource(kind) {
    try {
      if (kind === 'sim') { LUM.setSource(LUM.simSource); ui.toast('Simulation audio'); return; }
      if (kind === 'file') {
        if (!fileInput) {
          fileInput = document.createElement('input');
          fileInput.type = 'file'; fileInput.accept = 'audio/*';
          fileInput.addEventListener('change', async () => {
            const f = fileInput.files && fileInput.files[0];
            if (!f) return;
            try {
              const src = await LUM.makeMediaSource('file', f);
              LUM.setSource(src); ui.toast('Playing: ' + f.name);
            } catch (e) { ui.toast('File failed: ' + e.message); }
          });
        }
        fileInput.click();
        return;
      }
      const src = await LUM.makeMediaSource(kind);
      LUM.setSource(src);
      ui.toast(kind === 'mic' ? 'Microphone connected' : 'Tab/system audio connected');
    } catch (e) {
      ui.toast((kind === 'mic' ? 'Mic' : 'Capture') + ' failed: ' + (e && e.message ? e.message : 'permission denied'));
    }
  }

  /* ================= per-frame ================= */
  let fpsAcc = 0, fpsN = 0, fpsTimer = 0, meterTimer = 0;
  ui.tick = function (dt, fps) {
    fpsAcc += fps; fpsN++; fpsTimer += dt; meterTimer += dt;
    if (fpsTimer > 0.5) {
      const f = $('#fps');
      if (f && LUM.state.ui.showFps) f.textContent = Math.round(fpsAcc / fpsN) + ' fps';
      fpsAcc = 0; fpsN = 0; fpsTimer = 0;
    }
    if (meterTimer > 0.05 && ui.activeTab === 'audio' && !document.body.classList.contains('chromeHidden')) {
      meterTimer = 0;
      const A = LUM.audio;
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.style.transform = 'scaleX(' + Math.min(1, v) + ')'; };
      set('mBass', A.bass); set('mMid', A.mid); set('mTreb', A.treb);
    }
  };
})();
