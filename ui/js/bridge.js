/* Lumina — JUCE WebView bridge (plugin mode) with web-demo fallback (localStorage persistence) */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  const hasJuce = !!(window.__JUCE__ && window.__JUCE__.backend &&
    typeof window.__JUCE__.backend.addEventListener === 'function');

  LUM.bridge = { plugin: hasJuce, sampleRate: 48000 };

  if (hasJuce) {
    const be = window.__JUCE__.backend;
    LUM.emit = function (name, obj) { try { be.emitEvent(name, obj || {}); } catch (e) {} };

    be.addEventListener('audioFrame', d => {
      if (LUM.juceSource) LUM.juceSource.onFrame(d);
    });
    be.addEventListener('init', d => {
      if (d && d.sampleRate) LUM.bridge.sampleRate = d.sampleRate;
      if (LUM.onInit) LUM.onInit(d || {});
    });
    be.addEventListener('userPresets', d => {
      if (LUM.ui && LUM.ui.onUserPresets) LUM.ui.onUserPresets(d && d.json);
    });
    be.addEventListener('pasteText', d => {
      if (LUM.ui && LUM.ui.onPasteText) LUM.ui.onPasteText(d && d.text);
    });
    be.addEventListener('importedPreset', d => {
      if (LUM.ui && LUM.ui.onImportedPreset) LUM.ui.onImportedPreset(d && d.json);
    });
  } else {
    LUM.emit = function () {};
  }

  /* ---------- persistence ---------- */
  let saveTimer = null;
  LUM.persist = function () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const json = JSON.stringify(LUM.serialize());
      if (hasJuce) LUM.emit('saveState', { json });
      else { try { localStorage.setItem('lumina.state', json); } catch (e) {} }
    }, 600);
  };

  LUM.loadLocalState = function () {
    if (hasJuce) return null;
    try { return JSON.parse(localStorage.getItem('lumina.state') || 'null'); } catch (e) { return null; }
  };

  /* ---------- user presets ---------- */
  LUM.requestUserPresets = function () {
    if (hasJuce) LUM.emit('loadUserPresets', {});
    else {
      let json = null;
      try { json = localStorage.getItem('lumina.userPresets'); } catch (e) {}
      if (LUM.ui && LUM.ui.onUserPresets) LUM.ui.onUserPresets(json);
    }
  };
  LUM.saveUserPresets = function (obj) {
    const json = JSON.stringify(obj);
    if (hasJuce) LUM.emit('saveUserPresets', { json });
    else { try { localStorage.setItem('lumina.userPresets', json); } catch (e) {} }
  };

  /* ---------- clipboard ---------- */
  LUM.copyText = function (text) {
    if (hasJuce) { LUM.emit('copyText', { text }); return Promise.resolve(true); }
    if (navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    return Promise.resolve(false);
  };
  LUM.requestPaste = function () {
    if (hasJuce) { LUM.emit('requestPaste', {}); return; }
    if (navigator.clipboard && navigator.clipboard.readText)
      navigator.clipboard.readText().then(t => { if (LUM.ui && LUM.ui.onPasteText) LUM.ui.onPasteText(t); }).catch(() => {
        if (LUM.ui) LUM.ui.toast('Clipboard read blocked — paste into the import box instead.');
      });
  };

  /* ---------- preset file import/export ---------- */
  LUM.exportPresetFile = function (name, json) {
    if (hasJuce) { LUM.emit('exportPreset', { name, json }); return; }
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (name || 'lumina-preset').replace(/[^\w\- ]+/g, '') + '.luminapreset';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };
  LUM.importPresetFile = function () {
    if (hasJuce) { LUM.emit('importPreset', {}); return; }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.luminapreset,.json,application/json';
    inp.onchange = () => {
      const fl = inp.files && inp.files[0];
      if (!fl) return;
      const rd = new FileReader();
      rd.onload = () => { if (LUM.ui && LUM.ui.onImportedPreset) LUM.ui.onImportedPreset(String(rd.result)); };
      rd.readAsText(fl);
    };
    inp.click();
  };

  /* ---------- ready handshake ---------- */
  LUM.bridgeReady = function () {
    if (hasJuce) LUM.emit('uiReady', {});
  };
})();
