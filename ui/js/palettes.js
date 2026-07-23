/* Lumina — cosine-gradient palette library (IQ-style: a + b*cos(2π(c*t+d))) */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  LUM.palettes = [
    { id: 'neon',    name: 'Neon Violet', a: [0.48, 0.44, 0.62], b: [0.45, 0.50, 0.38], c: [1.0, 1.0, 1.0],  d: [0.72, 0.46, 0.12] },
    { id: 'miami',   name: 'Miami',       a: [0.55, 0.42, 0.60], b: [0.45, 0.48, 0.40], c: [1.0, 1.0, 1.0],  d: [0.90, 0.55, 0.25] },
    { id: 'ocean',   name: 'Deep Ocean',  a: [0.16, 0.42, 0.52], b: [0.20, 0.42, 0.46], c: [1.0, 1.0, 1.0],  d: [0.55, 0.42, 0.30] },
    { id: 'magma',   name: 'Magma',       a: [0.50, 0.24, 0.12], b: [0.50, 0.36, 0.22], c: [1.0, 1.0, 1.0],  d: [0.00, 0.14, 0.32] },
    { id: 'aurora',  name: 'Aurora',      a: [0.28, 0.52, 0.46], b: [0.34, 0.42, 0.42], c: [1.0, 1.0, 1.0],  d: [0.42, 0.16, 0.62] },
    { id: 'gold',    name: 'Golden Hour', a: [0.52, 0.38, 0.20], b: [0.48, 0.40, 0.26], c: [1.0, 1.0, 1.0],  d: [0.05, 0.12, 0.30] },
    { id: 'ice',     name: 'Glacier',     a: [0.60, 0.72, 0.84], b: [0.34, 0.26, 0.16], c: [1.0, 1.0, 1.0],  d: [0.55, 0.48, 0.40] },
    { id: 'candy',   name: 'Candy',       a: [0.62, 0.48, 0.66], b: [0.38, 0.42, 0.34], c: [1.0, 1.0, 1.0],  d: [0.82, 0.58, 0.35] },
    { id: 'ember',   name: 'Ember',       a: [0.46, 0.18, 0.10], b: [0.52, 0.30, 0.16], c: [1.0, 1.0, 1.0],  d: [0.02, 0.36, 0.48] },
    { id: 'toxic',   name: 'Toxic',       a: [0.30, 0.52, 0.22], b: [0.36, 0.44, 0.28], c: [1.0, 1.0, 1.0],  d: [0.28, 0.06, 0.55] },
    { id: 'cyber',   name: 'Cyberpunk',   a: [0.52, 0.36, 0.58], b: [0.48, 0.52, 0.42], c: [1.0, 1.0, 1.0],  d: [0.62, 0.30, 0.85] },
    { id: 'spectrum',name: 'Spectrum',    a: [0.50, 0.50, 0.50], b: [0.50, 0.50, 0.50], c: [1.0, 1.0, 1.0],  d: [0.00, 0.33, 0.67] },
    { id: 'mono',    name: 'Monochrome',  a: [0.62, 0.66, 0.74], b: [0.38, 0.36, 0.30], c: [0.5, 0.5, 0.5],  d: [0.00, 0.00, 0.00] },
    { id: 'sunset',  name: 'Sunset Tape', a: [0.55, 0.35, 0.42], b: [0.45, 0.38, 0.36], c: [1.0, 1.0, 1.0],  d: [0.95, 0.65, 0.40] }
  ];

  LUM.paletteById = {};
  LUM.palettes.forEach(p => { LUM.paletteById[p.id] = p; });

  function hex2rgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return [1, 1, 1];
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  LUM.hex2rgb = hex2rgb;

  function rgb2hex(c) {
    const h = v => ('0' + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2);
    return '#' + h(c[0]) + h(c[1]) + h(c[2]);
  }
  LUM.rgb2hex = rgb2hex;

  /* Build cosine palette coefficients from two custom colors: pal(0)=c1, pal(0.5)=c2, cyclic. */
  LUM.customPalette = function (hex1, hex2) {
    const c1 = hex2rgb(hex1), c2 = hex2rgb(hex2);
    const a = [], b = [];
    for (let i = 0; i < 3; i++) { a[i] = (c1[i] + c2[i]) * 0.5; b[i] = (c1[i] - c2[i]) * 0.5; }
    return { id: 'custom', name: 'Custom', a, b, c: [1, 1, 1], d: [0, 0, 0] };
  };

  /* Resolve current palette object from state.pal = {id, custom:{c1,c2}, shift} */
  LUM.resolvePalette = function (palState) {
    if (!palState) return LUM.palettes[0];
    if (palState.id === 'custom' && palState.custom) return LUM.customPalette(palState.custom.c1, palState.custom.c2);
    return LUM.paletteById[palState.id] || LUM.palettes[0];
  };

  /* JS-side palette evaluation (for UI swatches) */
  LUM.evalPalette = function (p, t) {
    const out = [];
    for (let i = 0; i < 3; i++) out[i] = Math.max(0, Math.min(1, p.a[i] + p.b[i] * Math.cos(6.28318 * (p.c[i] * t + p.d[i]))));
    return out;
  };
})();
