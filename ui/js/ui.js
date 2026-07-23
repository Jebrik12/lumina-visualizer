/* Lumina — UI layer: topbar, scene browser, parameter tabs, presets, focus mode, shortcuts */
(function () {
  'use strict';
  const LUM = window.LUM;
  const ui = LUM.ui = LUM.ui || {};
  ui.userPresets = [];
  ui.activeTab = 'scene';

  const $ = s => document.querySelector(s);
  function el(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ============ generic controls ============ */
  function ctlSlider(parent, def, get, set) {
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
    inp.value = get();
    val.textContent = fmt(get());
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      set(v); val.textContent = fmt(v); LUM.persist();
    });
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

  function group(parent, title) {
    const g = el('div', 'group', parent);
    el('div', 'groupTitle', g).textContent = title;
    return g;
  }

  /* ============ FX + audio definitions ============ */
  const FX_DEFS = [
    { group: 'Motion Trails', items: [
      { k: 'trail', n: 'Persistence', min: 0, max: 0.97, },
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
    { group: 'Lens & Texture', items: [
      { k: 'ca', n: 'Chromatic Aberration', min: 0, max: 1 },
      { k: 'vig', n: 'Vignette', min: 0, max: 1 },
      { k: 'grain', n: 'Film Grain', min: 0, max: 1 },
      { k: 'scan', n: 'Scanlines', min: 0, max: 1 },
      { k: 'pixel', n: 'Pixelate (0 = off)', min: 0, max: 220, step: 1 }
    ]},
    { group: 'Symmetry', items: [
      { k: 'kaleido', n: 'Kaleidoscope', type: 'select', opts: ['Off', '3', '4', '5', '6', '8', '10', '12', '16'], vals: [0, 3, 4, 5, 6, 8, 10, 12, 16] },
      { k: 'mirror', n: 'Mirror', type: 'select', opts: ['Off', 'Mirror X', 'Mirror Y', 'Quad'], vals: [0, 1, 2, 3] }
    ]},
    { group: 'Color Grade', items: [
      { k: 'hueSpeed', n: 'Hue Rotate (°/s)', min: -120, max: 120 },
      { k: 'satur', n: 'Saturation', min: 0, max: 2 },
      { k: 'contrast', n: 'Contrast', min: 0.6, max: 1.6 },
      { k: 'gamma', n: 'Gamma', min: 0.6, max: 1.6 },
      { k: 'expo', n: 'Brightness', min: 0.6, max: 2.6 }
    ]}
  ];

  const AUD_DEFS = [
    { k: 'sens', n: 'Input Gain (dB)', min: -18, max: 18 },
    { k: 'attack', n: 'Attack (ms)', min: 1, max: 80, step: 1 },
    { k: 'release', n: 'Release (ms)', min: 40, max: 800, step: 1 },
    { k: 'tilt', n: 'Spectrum Tilt (dB/oct)', min: -3, max: 9 },
    { k: 'beat', n: 'Beat Sensitivity', min: 0, max: 1 },
    { k: 'gate', n: 'Noise Gate', min: 0, max: 0.15 }
  ];

  /* ============ build ============ */
  ui.build = function () {
    buildTopbar();
    buildScenePanel();
    buildCtrlPanel();
    bindGlobal();
    ui.refresh();
  };

  function iconBtn(parent, txt, title, cb, id) {
    const b = el('button', 'ibtn', parent);
    b.textContent = txt; b.title = title;
    if (id) b.id = id;
    b.addEventListener('click', cb);
    return b;
  }

  function buildTopbar() {
    const tb = $('#topbar');
    tb.innerHTML = '';
    const logo = el('div', 'logo', tb);
    logo.innerHTML = 'LUMINA<span class="logoSub">visualizer</span>';

    const nav = el('div', 'presetNav', tb);
    iconBtn(nav, '‹', 'Previous preset (←)', () => stepPreset(-1));
    const sel = el('select', 'presetSel', nav);
    sel.id = 'presetSel';
    sel.addEventListener('change', () => {
      const v = sel.value;
      if (v.startsWith('f:')) LUM.applyPreset(LUM.factoryPresets[+v.slice(2)]);
      else if (v.startsWith('u:')) LUM.applyPreset(ui.userPresets[+v.slice(2)]);
    });
    iconBtn(nav, '›', 'Next preset (→)', () => stepPreset(1));
    iconBtn(nav, '+', 'Save preset', savePresetFlow, 'btnSave');
    iconBtn(nav, '🗑', 'Delete user preset', deleteUserPreset, 'btnDel');
    iconBtn(nav, '⇓', 'Export preset (clipboard + file)', exportPreset);
    iconBtn(nav, '⇑', 'Import preset', importPresetFlow);

    el('div', 'spacer', tb);
    const src = el('div', 'srcLabel', tb); src.id = 'srcLabel';
    const fps = el('div', 'fps', tb); fps.id = 'fps';
    iconBtn(tb, '🎲', 'Randomize look (R) — Shift-click: random scene too', e => LUM.randomize(e.shiftKey), 'btnDice');
    iconBtn(tb, '🔀', 'Shuffle presets on beat (S)', toggleShuffle, 'btnShuffle');
    iconBtn(tb, '⛶', 'Focus mode — pure visuals (F)', () => setFocus(true));
    iconBtn(tb, '？', 'Help & shortcuts (H)', helpModal);
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
        b.innerHTML = '<span class="sIcon">' + s.icon + '</span><span>' + s.name + '</span>';
        b.addEventListener('click', () => { LUM.switchScene(s.id); LUM.persist(); });
      });
    });
  }

  function buildCtrlPanel() {
    const cp = $('#ctrlPanel');
    cp.innerHTML = '';
    const tabs = el('div', 'tabs', cp);
    [['scene', 'Scene'], ['fx', 'FX'], ['color', 'Color'], ['audio', 'Audio']].forEach(([id, label]) => {
      const t = el('button', 'tab', tabs);
      t.dataset.tab = id; t.textContent = label;
      t.addEventListener('click', () => { ui.activeTab = id; ui.refresh(); });
    });
    const body = el('div', 'tabBody', cp);
    body.id = 'tabBody';
  }

  /* ============ tab renderers ============ */
  function renderSceneTab(body) {
    const sc = LUM.sceneById[LUM.state.scene];
    const P = LUM.paramsOf(sc.id);
    const head = el('div', 'sceneHead', body);
    el('div', 'sceneName', head).textContent = sc.name;
    const rnd = el('button', 'miniBtn', head);
    rnd.textContent = '🎲 randomize';
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

  function renderFxTab(body) {
    const fx = LUM.state.fx;
    FX_DEFS.forEach(gd => {
      const g = group(body, gd.group);
      gd.items.forEach(def => {
        const get = () => fx[def.k];
        const set = v => { fx[def.k] = v; };
        if (def.type === 'select') ctlSelect(g, def, get, set);
        else ctlSlider(g, def, get, set);
      });
    });
    const g2 = group(body, 'Reset');
    const rb = el('button', 'miniBtn wide', g2);
    rb.textContent = 'Reset FX to defaults';
    rb.addEventListener('click', () => { LUM.state.fx = Object.assign({}, LUM.DEFAULT_FX); LUM.persist(); ui.refresh(); });
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
    const row = el('div', 'colorRow', gc);
    if (!pal.custom) pal.custom = { c1: '#7c5cff', c2: '#00e5ff' };
    ['c1', 'c2'].forEach(k => {
      const inp = el('input', 'colorInp', row);
      inp.type = 'color'; inp.value = pal.custom[k];
      inp.addEventListener('input', () => { pal.custom[k] = inp.value; if (pal.id === 'custom') LUM.persist(); });
    });
    const useBtn = el('button', 'miniBtn' + (pal.id === 'custom' ? ' activeBtn' : ''), row);
    useBtn.textContent = pal.id === 'custom' ? 'Using custom' : 'Use custom';
    useBtn.addEventListener('click', () => { pal.id = 'custom'; LUM.persist(); ui.refresh(); });
    const gm = group(body, 'Motion');
    ctlSlider(gm, { n: 'Palette Shift', min: 0, max: 1 }, () => pal.shift || 0, v => { pal.shift = v; });
    ctlSlider(gm, { n: 'Palette Cycle (/s)', min: 0, max: 0.08 }, () => pal.cycle || 0, v => { pal.cycle = v; });
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
    const g = group(body, 'Response');
    AUD_DEFS.forEach(def => ctlSlider(g, def, () => aud[def.k], v => { aud[def.k] = v; }));
    ctlToggle(g, { n: 'Auto Gain (AGC)' }, () => aud.agc ? 1 : 0, v => { aud.agc = !!v; });

    if (!LUM.bridge.plugin) {
      const gs = group(body, 'Input Source');
      const wrap = el('div', 'srcBtns', gs);
      [['sim', 'Simulation'], ['mic', 'Microphone'], ['tab', 'Tab / System'], ['file', 'Audio File']].forEach(([kind, label]) => {
        const b = el('button', 'miniBtn srcBtn', wrap);
        b.dataset.kind = kind; b.textContent = label;
        b.addEventListener('click', () => pickSource(kind));
      });
      el('div', 'hint', gs).textContent = 'Tab/System: pick a tab or screen and enable "share audio". In the plugin, audio comes from your Ableton track automatically.';
    }

    const gr = group(body, 'Render');
    ctlSelect(gr, { n: 'Quality', type: 'select', opts: ['Auto', 'Low', 'Medium', 'High'], vals: ['auto', 'low', 'med', 'high'] },
      () => LUM.state.ui.quality, v => { LUM.state.ui.quality = v; LUM.qualityChanged(); });
    ctlToggle(gr, { n: 'Auto-hide UI' }, () => LUM.state.ui.autohide ? 1 : 0, v => { LUM.state.ui.autohide = !!v; });
    ctlToggle(gr, { n: 'Show FPS' }, () => LUM.state.ui.showFps ? 1 : 0, v => { LUM.state.ui.showFps = !!v; ui.refresh(); });
  }

  ui.refresh = function () {
    document.querySelectorAll('.sceneBtn').forEach(b =>
      b.classList.toggle('active', b.dataset.scene === LUM.state.scene));
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === ui.activeTab));
    const body = $('#tabBody');
    if (body) {
      body.innerHTML = '';
      if (ui.activeTab === 'scene') renderSceneTab(body);
      else if (ui.activeTab === 'fx') renderFxTab(body);
      else if (ui.activeTab === 'color') renderColorTab(body);
      else renderAudioTab(body);
    }
    refreshPresetSelect();
    const sh = $('#btnShuffle');
    if (sh) sh.classList.toggle('activeBtn', !!LUM.state.ui.shuffle);
    const fpsEl = $('#fps');
    if (fpsEl) fpsEl.style.display = LUM.state.ui.showFps ? '' : 'none';
    ui.onSourceChanged();
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

  /* ============ presets ============ */
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
      const uiIdx = ui.userPresets.findIndex(p => p.name === name);
      if (uiIdx >= 0) val = 'u:' + uiIdx;
    }
    if (val === null) {
      const o = el('option', '', sel);
      o.value = 'x'; o.textContent = (name || 'Custom') + ' •';
      o.disabled = false; val = 'x';
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
    return {
      name,
      scene: s.scene,
      p: Object.assign({}, LUM.paramsOf(s.scene)),
      fx: Object.assign({}, s.fx),
      pal: JSON.parse(JSON.stringify(s.pal))
    };
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
        LUM.saveUserPresets({ v: 1, presets: ui.userPresets });
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
    LUM.saveUserPresets({ v: 1, presets: ui.userPresets });
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
    showModal('Import preset', body => {
      el('div', 'hint', body).textContent = 'Paste preset JSON below, or import a .luminapreset file.';
      const ta = el('textarea', 'txtArea', body);
      ta.placeholder = '{ "name": "...", "scene": "...", ... }';
      const fb = el('button', 'miniBtn', body);
      fb.textContent = 'Import from file…';
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
      if (!p || !p.scene || !LUM.sceneById[p.scene]) { ui.toast('Import failed: unknown scene'); return; }
      p.name = p.name || 'Imported';
      LUM.applyPreset(p);
      const ex = ui.userPresets.findIndex(q => q.name === p.name);
      if (ex >= 0) ui.userPresets[ex] = p; else ui.userPresets.push(p);
      LUM.saveUserPresets({ v: 1, presets: ui.userPresets });
      ui.refresh();
      ui.toast('Imported preset: ' + p.name);
    } catch (e) { ui.toast('Import failed: invalid JSON'); }
  };

  ui.onPasteText = function (t) { ui.onImportedPreset(t); };

  ui.onUserPresets = function (json) {
    if (!json) return;
    try {
      const o = JSON.parse(json);
      if (o && Array.isArray(o.presets)) ui.userPresets = o.presets;
      refreshPresetSelect();
    } catch (e) {}
  };

  /* ============ shuffle / focus / autohide / keys ============ */
  function toggleShuffle() {
    LUM.state.ui.shuffle = !LUM.state.ui.shuffle;
    ui.toast(LUM.state.ui.shuffle ? 'Shuffle ON — new look every 32 beats' : 'Shuffle off');
    LUM.persist(); ui.refresh();
  }

  let focusOn = false;
  function setFocus(on) {
    focusOn = on;
    document.body.classList.toggle('focus', on);
    if (on) ui.toast('Focus mode — press F or Esc to exit');
  }
  ui.setFocus = setFocus;

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
    $('#glcanvas').addEventListener('dblclick', () => setFocus(!focusOn));
    window.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      pokeChrome();
      switch (e.key) {
        case 'f': case 'F': setFocus(!focusOn); break;
        case 'Escape': if (modalOpen) closeModal(); else setFocus(false); break;
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
    LUM.switchScene(ids[i]);
    LUM.persist();
  }

  /* ============ modal / toast ============ */
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
  }
  ui.showModal = showModal;

  function helpModal() {
    showModal('Lumina — help', body => {
      body.innerHTML = [
        '<div class="helpRow"><b>F</b> focus mode (pure visuals) · <b>Esc</b> exit</div>',
        '<div class="helpRow"><b>R</b> randomize look · <b>Shift+R</b> random scene too</div>',
        '<div class="helpRow"><b>S</b> shuffle presets on beat</div>',
        '<div class="helpRow"><b>← →</b> previous / next preset</div>',
        '<div class="helpRow"><b>↑ ↓</b> previous / next scene</div>',
        '<div class="helpRow"><b>Double-click</b> canvas → focus mode</div>',
        '<div class="hint" style="margin-top:10px">20 scenes · full FX chain · 44 factory presets. Every control is live — tweak while the music plays. The UI auto-hides when idle.</div>',
        '<div class="hint">Lumina v1.0 — open source (AGPL-3.0)</div>'
      ].join('');
      return () => null;
    }, [{ label: 'Close', primary: true }]);
  }

  const toasts = [];
  ui.toast = function (msg) {
    const wrap = $('#toastWrap');
    const t = el('div', 'toast', wrap);
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2600);
  };

  /* ============ sources (web demo) ============ */
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

  /* ============ per-frame ============ */
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
