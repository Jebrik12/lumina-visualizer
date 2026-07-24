/* Lumina — defaults + 44 factory presets */
(function () {
  'use strict';
  const LUM = window.LUM;

  LUM.DEFAULT_FX = {
    trail: 0.42, fbZoom: 0.06, fbRot: 0.02, fbHue: 0, fbShiftX: 0, fbShiftY: 0,
    bloom: 0.55, bloomThr: 0.55, bloomRad: 1.2,
    ca: 0.12, grain: 0.22, vig: 0.34, scan: 0, pixel: 0,
    kaleido: 0, mirror: 0,
    hueSpeed: 0, satur: 1.05, contrast: 1.05, gamma: 1.0, expo: 1.5,
    /* v1.1 — grunge / glitch / analog */
    grainSize: 1, grainType: 0, grainReact: 0, dirt: 0,
    poster: 0, dither: 0.5,
    glitch: 0, glitchBeat: 1, vhs: 0, vhsJit: 0,
    lens: 0, warp: 0, warpReact: 0.5,
    /* v1.1 — grade */
    exposure: 0, temp: 0, tint: 0,
    curveB: 0, curveS: 0, curveH: 0, curveW: 0, sCurve: 0,
    /* v2.0 — look modules */
    thresh: 0, threshLvl: 0.5, threshSoft: 0.08, threshInv: 0, threshKeep: 0,
    mono: 0, monoTint: '#ffffff',
    noise2: 0, noise2Scale: 2, noise2Type: 1, noise2Blend: 1, noise2React: 0.3,
    texOn: 0, texAmt: 0.5, texScale: 1, texBlend: 4,
    mediaOp: 1, mediaBlend: 0, mediaFit: 0, mediaLayer: 0, mediaMotion: 0.3,
    curveOn: 0, curvePts: [[0, 0], [0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [1, 1]]
  };
  LUM.DEFAULT_AUD = {
    sens: 0, attack: 10, release: 260, tilt: 3,
    agc: true, agcAmt: 0.75, beat: 0.5, gate: 0.04,
    react: 1, floor: 0, curve: 1, dyn: 0,
    respPts: null, respLut: null,
    bassG: 1, midG: 1, trebG: 1
  };

  /* ---- Audio response presets (aud-only) ---- */
  LUM.factoryAudPresets = [
    { name: 'Default', aud: {} },
    { name: 'Punchy Kicks', aud: { attack: 4, release: 200, floor: 0.14, curve: 1.5, dyn: 0.55, beat: 0.65, bassG: 1.45, trebG: 0.85 } },
    { name: 'Snappy EDM', aud: { attack: 3, release: 150, floor: 0.1, curve: 1.3, dyn: 0.4, beat: 0.7 } },
    { name: 'Smooth Ambient', aud: { attack: 32, release: 620, curve: 0.75, dyn: 0, react: 0.9, beat: 0.35 } },
    { name: 'Bass Focus', aud: { bassG: 1.6, midG: 0.8, trebG: 0.6, floor: 0.08, curve: 1.2 } },
    { name: 'Treble Sparkle', aud: { trebG: 1.55, bassG: 0.8, curve: 0.9 } },
    { name: 'Calm Until Loud', aud: { floor: 0.26, curve: 1.6, dyn: 0.8 } },
    { name: 'Hyper Reactive', aud: { react: 1.5, attack: 2, release: 120, curve: 1.1, dyn: 0.25, beat: 0.8 } }
  ];

  /* ---- FX chain presets (fx-only) ---- */
  LUM.factoryFxPresets = [
    { name: 'Clean', fx: { trail: 0, fbZoom: 0, fbRot: 0, bloom: 0.35, ca: 0, grain: 0.08, vig: 0.2 } },
    { name: 'Soft Bloom', fx: { trail: 0.35, bloom: 0.85, bloomRad: 1.8, ca: 0.08, grain: 0.15, vig: 0.3 } },
    { name: 'VHS Camcorder', fx: { vhs: 0.65, vhsJit: 0.5, ca: 0.3, grain: 0.45, grainType: 2, grainReact: 0.3, temp: 0.22, scan: 0.3, curveB: 0.06, sCurve: 0.2, trail: 0.12, bloom: 0.5 } },
    { name: 'Film', fx: { dirt: 0.6, grain: 0.5, grainSize: 1.8, vig: 0.55, sCurve: 0.3, temp: 0.1, satur: 0.85, bloom: 0.45, trail: 0.1 } },
    { name: 'Cyber Glitch', fx: { glitch: 0.8, glitchBeat: 1, ca: 0.25, poster: 8, dither: 1, grainType: 2, grain: 0.4, grainReact: 0.5, scan: 0.25, bloom: 0.6 } },
    { name: 'Thin Lines', fx: { thresh: 1, threshLvl: 0.42, threshSoft: 0.02, mono: 1, monoTint: '#ffffff', bloom: 0.2, grain: 0.12, trail: 0, vig: 0 } },
    { name: 'Halftone Print', fx: { texOn: 2, texAmt: 0.85, texScale: 1.2, texBlend: 4, mono: 1, monoTint: '#f2ede4', thresh: 0.25, threshLvl: 0.3, threshSoft: 0.25, bloom: 0.15, grain: 0.2, vig: 0.25 } },
    { name: 'Overdrive', fx: { exposure: 0.7, sCurve: 0.55, bloom: 1.1, ca: 0.3, grainReact: 1, grain: 0.6, trail: 0.4, fbZoom: 0.15 } },
    { name: 'Dirty Analog', fx: { noise2: 0.55, noise2Type: 1, noise2Blend: 1, noise2React: 0.5, vhs: 0.3, dirt: 0.4, grain: 0.4, temp: 0.15, sCurve: 0.25, bloom: 0.5 } },
    { name: 'Mono Minimal', fx: { mono: 1, monoTint: '#ffffff', bloom: 0.3, grain: 0.15, vig: 0.15, contrast: 1.12, trail: 0.1 } }
  ];
  LUM.DEFAULT_UI = {
    quality: 'auto', autohide: true, showFps: true, shuffle: false, shuffleBeats: 32,
    theme: 'dark', themeVars: null, accent: '#5b8cff', scale: 1, blur: false, panelAlpha: 0.92,
    hideHostBar: true
  };

  /* Each preset: name, scene, p (scene params), fx (partial), pal {id, shift?, cycle?, custom?} */
  LUM.factoryPresets = [
    /* --- Spectrum --- */
    { name: 'Neon Halo', scene: 'rings', pal: { id: 'neon', cycle: 0.01 }, p: { rings: 3, rotSpd: 0.35, baseR: 0.52, thick: 1.1, arc: 0.6, ripple: 0.75, innerWave: 1 }, fx: { trail: 0.5, bloom: 0.8, fbZoom: 0.1, ca: 0.15 } },
    { name: 'Solar Observatory', scene: 'rings', pal: { id: 'gold' }, p: { rings: 4, rotSpd: 0.15, baseR: 0.6, thick: 1.6, arc: 0.35, ripple: 0.4, innerWave: 1 }, fx: { trail: 0.3, bloom: 0.65, fbRot: 0.06, grain: 0.35, vig: 0.45 } },
    { name: 'Club Meter', scene: 'bars', pal: { id: 'miami' }, p: { count: 64, gap: 0.35, layout: 1, caps: 0.9, glow: 0.5, segs: 0, colorMode: 0 }, fx: { trail: 0.15, bloom: 0.7, ca: 0.1 } },
    { name: 'LED Wall', scene: 'bars', pal: { id: 'toxic' }, p: { count: 40, gap: 0.45, layout: 0, caps: 1, glow: 0.3, segs: 24, colorMode: 1 }, fx: { trail: 0, bloom: 0.5, scan: 0.35, pixel: 0, grain: 0.3 } },
    { name: 'Quad Cathedral', scene: 'bars', pal: { id: 'aurora' }, p: { count: 48, gap: 0.2, layout: 2, caps: 0.5, glow: 0.7, segs: 0, colorMode: 0 }, fx: { trail: 0.62, fbZoom: 0.14, bloom: 0.9, kaleido: 0 } },
    { name: 'Nebula Falls', scene: 'waterfall', pal: { id: 'aurora', cycle: 0.008 }, p: { polar: 1, span: 0.85, contrast: 0.5, colMode: 0, rotate: 0.14, flip: 0 }, fx: { trail: 0.25, bloom: 0.6, ca: 0.18 } },
    { name: 'Data Rain', scene: 'waterfall', pal: { id: 'cyber' }, p: { polar: 0, span: 0.7, contrast: 0.6, colMode: 1, rotate: 0, flip: 0 }, fx: { trail: 0, bloom: 0.45, scan: 0.45, grain: 0.35, pixel: 160 } },
    { name: 'Neon Canyon', scene: 'terrain', pal: { id: 'miami' }, p: { height: 0.55, style: 1, fog: 1.0, pitch: 0.38, grid: 22, bob: 0.6 }, fx: { trail: 0.2, bloom: 0.75, ca: 0.2, vig: 0.4 } },
    { name: 'Aurora Ridge', scene: 'terrain', pal: { id: 'aurora' }, p: { height: 0.45, style: 0, fog: 1.4, pitch: 0.34, grid: 14, bob: 0.4 }, fx: { trail: 0.12, bloom: 0.55, grain: 0.3 } },

    /* --- Waves --- */
    { name: 'Oscilloscope Lab', scene: 'scope', pal: { id: 'toxic' }, p: { mode: 0, gain: 1.2, width: 0.01, ghosts: 2, hueDrift: 0.15, spin: 0 }, fx: { trail: 0.55, bloom: 0.7, scan: 0.5, grain: 0.4, vig: 0.5 } },
    { name: 'Lissajous Dance', scene: 'scope', pal: { id: 'ice' }, p: { mode: 1, gain: 1.1, width: 0.014, ghosts: 1, hueDrift: 0.5, spin: 0.15 }, fx: { trail: 0.8, fbRot: 0.12, fbZoom: 0.04, bloom: 0.85, ca: 0.2 } },
    { name: 'Radial Pulse', scene: 'scope', pal: { id: 'ember' }, p: { mode: 2, gain: 1.3, width: 0.012, ghosts: 2, hueDrift: 0.3, spin: 0.4 }, fx: { trail: 0.65, fbZoom: 0.18, bloom: 0.8 } },
    { name: 'Wormhole Express', scene: 'tunnel', pal: { id: 'cyber', cycle: 0.012 }, p: { speed: 1.4, twist: 1.8, rings: 1.0, spokes: 10, fog: 0.9, wobble: 0.7 }, fx: { trail: 0.35, bloom: 0.75, ca: 0.3, vig: 0.45 } },
    { name: 'Deep Dive', scene: 'tunnel', pal: { id: 'ocean' }, p: { speed: 0.5, twist: -0.8, rings: 0.5, spokes: 0, fog: 1.6, wobble: 0.9 }, fx: { trail: 0.55, bloom: 0.6, grain: 0.3 } },
    { name: 'Pendulum Garden', scene: 'harmono', pal: { id: 'candy', cycle: 0.015 }, p: { cplx: 8, damp: 0.9, speed: 0.35, audioRatio: 1, width: 0.008, rot3d: 0.9 }, fx: { trail: 0.72, fbZoom: 0.05, bloom: 0.8, ca: 0.12 } },
    { name: 'Silk Knots', scene: 'harmono', pal: { id: 'ice' }, p: { cplx: 12, damp: 1.6, speed: 0.18, audioRatio: 0, ratA: 5, ratB: 7, width: 0.005, rot3d: 0.5 }, fx: { trail: 0.85, fbRot: -0.05, bloom: 0.65, grain: 0.25 } },
    { name: 'Chladni Plate', scene: 'cymatics', pal: { id: 'mono' }, p: { sharp: 15, shape: 1, shake: 0.6, invert: 0, follow: 1 }, fx: { trail: 0.3, bloom: 0.55, grain: 0.45, vig: 0.5 } },
    { name: 'Sand Mandala', scene: 'cymatics', pal: { id: 'gold' }, p: { sharp: 9, shape: 1, shake: 0.3, invert: 1, follow: 1 }, fx: { trail: 0.45, bloom: 0.6, fbRot: 0.03 } },

    /* --- Fractal --- */
    { name: 'Electric Julia', scene: 'julia', pal: { id: 'neon', cycle: 0.01 }, p: { iter: 120, zoom: 1.2, drift: 0.18, audioInf: 0.7, trap: 0, beatZoom: 0.5 }, fx: { trail: 0.25, bloom: 0.7, ca: 0.16 } },
    { name: 'Fractal Bloom', scene: 'julia', pal: { id: 'magma' }, p: { iter: 150, zoom: 1.7, drift: 0.09, audioInf: 0.4, trap: 1, beatZoom: 0.3 }, fx: { trail: 0.4, kaleido: 6, bloom: 0.75, fbRot: 0.04 } },
    { name: 'Menger Temple', scene: 'temple', pal: { id: 'ember' }, p: { type: 0, detail: 0.65, camSpd: 0.08, pulse: 0.6, fog: 0.9, glow: 0.55 }, fx: { trail: 0.18, bloom: 0.6, vig: 0.5, grain: 0.3 } },
    { name: 'Bulb Ritual', scene: 'temple', pal: { id: 'aurora', cycle: 0.006 }, p: { type: 1, detail: 0.55, camSpd: 0.12, pulse: 0.8, fog: 0.7, glow: 0.7 }, fx: { trail: 0.3, bloom: 0.8, ca: 0.2 } },
    { name: 'Milk Machine', scene: 'warp', pal: { id: 'spectrum', cycle: 0.02 }, p: { mode: 1, warp: 0.55, zoom: 0.14, rotFlow: 0.2, decay: 0.945, inject: 0.65 }, fx: { trail: 0.1, bloom: 0.7, ca: 0.14 } },
    { name: 'Acid Ripples', scene: 'warp', pal: { id: 'toxic' }, p: { mode: 3, warp: 0.8, zoom: 0.05, rotFlow: -0.1, decay: 0.93, inject: 0.8 }, fx: { trail: 0.1, bloom: 0.65, mirror: 3, grain: 0.3 } },
    { name: 'Noise Cathedral', scene: 'warp', pal: { id: 'ocean' }, p: { mode: 2, warp: 0.65, zoom: 0.2, rotFlow: 0, decay: 0.955, inject: 0.55 }, fx: { trail: 0.1, bloom: 0.85, kaleido: 4 } },
    { name: 'Sacred Circuit', scene: 'mandala', pal: { id: 'cyber', cycle: 0.01 }, p: { sym: 12, scale: 4.5, flow: 0.5, drive: 0.7, sharp: 0.7 }, fx: { trail: 0.4, fbRot: 0.05, bloom: 0.8, ca: 0.15 } },
    { name: 'Rose Window', scene: 'mandala', pal: { id: 'magma' }, p: { sym: 8, scale: 3.2, flow: 0.22, drive: 0.5, sharp: 0.4 }, fx: { trail: 0.55, fbZoom: 0.08, bloom: 0.7, vig: 0.5 } },

    /* --- Motion --- */
    { name: 'Star Nursery', scene: 'particles', pal: { id: 'neon', cycle: 0.008 }, p: { density: 2, flowScale: 1.4, speed: 1.6, burst: 0.6, attract: 0.3, size: 2.4, colMode: 0 }, fx: { trail: 0.68, fbZoom: 0.03, bloom: 0.85, ca: 0.12 } },
    { name: 'Ember Storm', scene: 'particles', pal: { id: 'ember' }, p: { density: 1, flowScale: 2.4, speed: 2.6, burst: 1.0, attract: 0.6, size: 3.2, colMode: 2 }, fx: { trail: 0.5, fbShiftY: 0.02, bloom: 0.75, grain: 0.35 } },
    { name: 'Ink Ocean', scene: 'ink', pal: { id: 'ocean', cycle: 0.006 }, p: { decay: 0.988, swirl: 1.8, scale: 2.0, inject: 1.2, bassWarp: 0.7 }, fx: { trail: 0.1, bloom: 0.6, contrast: 1.12 } },
    { name: 'Lava Lamp', scene: 'ink', pal: { id: 'magma' }, p: { decay: 0.993, swirl: 0.8, scale: 1.2, inject: 0.9, bassWarp: 0.4 }, fx: { trail: 0.1, bloom: 0.7, vig: 0.45, grain: 0.28 } },
    { name: 'Hyperjump', scene: 'hyper', pal: { id: 'ice' }, p: { dens: 30, speed: 0.55, streak: 0.85, nebula: 0.35, twist: 0.2 }, fx: { trail: 0.45, fbZoom: 0.22, bloom: 0.8, ca: 0.3 } },
    { name: 'Slipstream', scene: 'hyper', pal: { id: 'miami', cycle: 0.01 }, p: { dens: 20, speed: 0.3, streak: 0.5, nebula: 0.7, twist: 1.2 }, fx: { trail: 0.55, fbRot: 0.1, bloom: 0.7 } },
    { name: 'Goo Lab', scene: 'metaballs', pal: { id: 'toxic' }, p: { count: 9, goo: 0.32, size: 1.1, speed: 0.8, edge: 26 }, fx: { trail: 0.3, bloom: 0.75, ca: 0.18 } },
    { name: 'Mercury', scene: 'metaballs', pal: { id: 'mono' }, p: { count: 6, goo: 0.42, size: 1.2, speed: 0.5, edge: 40 }, fx: { trail: 0.2, bloom: 0.9, contrast: 1.2, grain: 0.2 } },

    /* --- Texture --- */
    { name: 'Stained Glass', scene: 'voronoi', pal: { id: 'spectrum' }, p: { scale: 6, speed: 0.7, border: 0.05, flash: 0.7, warp: 0.25 }, fx: { trail: 0.2, bloom: 0.6, vig: 0.4 } },
    { name: 'Honeycomb Pulse', scene: 'voronoi', pal: { id: 'gold' }, p: { scale: 10, speed: 1.2, border: 0.09, flash: 0.9, warp: 0.5 }, fx: { trail: 0.35, bloom: 0.7, ca: 0.12, grain: 0.3 } },
    { name: 'Coral Reef', scene: 'reaction', pal: { id: 'ocean', cycle: 0.005 }, p: { pattern: 0, iters: 3, seedSize: 0.03 }, fx: { trail: 0.15, bloom: 0.65, contrast: 1.1 } },
    { name: 'Mitosis', scene: 'reaction', pal: { id: 'candy' }, p: { pattern: 1, iters: 4, seedSize: 0.045 }, fx: { trail: 0.2, bloom: 0.75, vig: 0.4 } },
    { name: "Demoscene '94", scene: 'plasma', pal: { id: 'spectrum', cycle: 0.03 }, p: { scale: 4, speed: 1.4, warp: 0.5, contour: 0.6, react: 0.7 }, fx: { trail: 0, bloom: 0.5, pixel: 120, scan: 0.5, grain: 0.35 } },
    { name: 'Silk Plasma', scene: 'plasma', pal: { id: 'aurora', cycle: 0.008 }, p: { scale: 2.2, speed: 0.5, warp: 1.4, contour: 0.15, react: 0.5 }, fx: { trail: 0.3, bloom: 0.7, satur: 1.15 } },
    { name: 'Miami Nights', scene: 'retro', pal: { id: 'miami' }, p: { grid: 6, speed: 0.4, sun: 0.18, mtn: 0.6, glow: 0.8, stars: 0.7 }, fx: { trail: 0.15, bloom: 0.8, ca: 0.15, grain: 0.3, scan: 0.2 } },
    { name: 'Cyber Sunset', scene: 'retro', pal: { id: 'sunset', cycle: 0.004 }, p: { grid: 9, speed: 0.7, sun: 0.22, mtn: 0.4, glow: 0.6, stars: 0.4 }, fx: { trail: 0.25, bloom: 0.7, ca: 0.28, scan: 0.4 } },

    /* --- Showcase combos --- */
    { name: 'Kaleido Dreams', scene: 'ink', pal: { id: 'candy', cycle: 0.02 }, p: { decay: 0.985, swirl: 2.4, scale: 2.8, inject: 1.4, bassWarp: 0.8 }, fx: { trail: 0.3, kaleido: 8, fbRot: 0.08, bloom: 0.85, ca: 0.2 } },
    { name: 'Strobe Temple', scene: 'temple', pal: { id: 'cyber' }, p: { type: 0, detail: 0.5, camSpd: 0.16, pulse: 1.0, fog: 0.6, glow: 0.8 }, fx: { trail: 0.45, fbZoom: 0.12, bloom: 0.95, ca: 0.35, mirror: 0 } },
    { name: 'Vinyl Scope', scene: 'scope', pal: { id: 'gold' }, p: { mode: 2, gain: 1.1, width: 0.02, ghosts: 3, hueDrift: 0.1, spin: -0.3 }, fx: { trail: 0.75, fbRot: -0.15, bloom: 0.6, grain: 0.6, vig: 0.65, scan: 0.3 } },
    { name: 'Pixel Storm', scene: 'particles', pal: { id: 'cyber', cycle: 0.02 }, p: { density: 1, flowScale: 3.0, speed: 3.0, burst: 0.9, attract: 0.45, size: 4, colMode: 1 }, fx: { trail: 0.55, bloom: 0.6, pixel: 110, scan: 0.3, ca: 0.1 } },

    /* --- v1.1 Grunge & Analog showcase --- */
    { name: 'Dirty VHS', scene: 'retro', pal: { id: 'sunset', cycle: 0.004 }, p: { grid: 7, speed: 0.5, sun: 0.19, mtn: 0.55, glow: 0.7, stars: 0.5 }, fx: { vhs: 0.7, vhsJit: 0.55, grain: 0.5, grainType: 2, grainReact: 0.35, ca: 0.3, temp: 0.28, scan: 0.3, curveB: 0.06, sCurve: 0.25, trail: 0.15, bloom: 0.55, vig: 0.45 } },
    { name: 'Broken Signal', scene: 'waterfall', pal: { id: 'cyber' }, p: { polar: 0, span: 0.85, contrast: 0.45, colMode: 1, rotate: 0, flip: 0 }, fx: { glitch: 0.85, glitchBeat: 1, poster: 6, dither: 1, grainType: 2, grain: 0.5, grainReact: 0.5, ca: 0.2, contrast: 1.15, exposure: 0.45, bloom: 0.6, trail: 0, scan: 0.25 } },
    { name: 'Overdriven', scene: 'bars', pal: { id: 'ember' }, p: { count: 48, gap: 0.25, layout: 2, caps: 0.7, glow: 0.8, segs: 0, colorMode: 0 }, fx: { grainReact: 1, grain: 0.65, grainSize: 1.4, exposure: 0.5, sCurve: 0.5, bloom: 1.05, ca: 0.28, vig: 0.4, trail: 0.35, fbZoom: 0.12 }, aud: { react: 1.4, curve: 1.35, dyn: 0.5 } },
    { name: 'Film Noir', scene: 'scope', pal: { id: 'mono' }, p: { mode: 2, gain: 1.1, width: 0.016, ghosts: 2, hueDrift: 0.05, spin: -0.2 }, fx: { dirt: 0.8, grain: 0.55, grainSize: 2, satur: 0.2, vig: 0.7, sCurve: 0.35, curveB: -0.1, contrast: 1.15, bloom: 0.45, scan: 0.15, trail: 0.6, fbRot: -0.08 } },
    { name: 'Grunge Temple', scene: 'temple', pal: { id: 'toxic' }, p: { type: 0, detail: 0.6, camSpd: 0.1, pulse: 0.7, fog: 0.8, glow: 0.6 }, fx: { dirt: 0.5, glitch: 0.35, glitchBeat: 1, grain: 0.5, grainType: 1, curveS: -0.35, curveH: 0.3, vig: 0.55, bloom: 0.7, trail: 0.25, ca: 0.18 } },
    { name: 'Analog Dreams', scene: 'ink', pal: { id: 'candy', cycle: 0.008 }, p: { decay: 0.988, swirl: 1.9, scale: 2.0, inject: 1.1, bassWarp: 0.6 }, fx: { vhs: 0.4, vhsJit: 0.25, warp: 0.35, warpReact: 0.7, temp: -0.22, grain: 0.38, grainSize: 1.6, trail: 0.15, bloom: 0.8, sCurve: 0.2, exposure: 0.15 } },

    /* --- v2.0 Minimal & Meters --- */
    { name: 'Unknown Pleasures', scene: 'linescape', pal: { id: 'mono' }, p: { lines: 46, amp: 1.2, span: 0.9, width: 1.1, envelope: 2.2 }, fx: { mono: 1, monoTint: '#ffffff', bloom: 0.25, grain: 0.18, trail: 0, vig: 0.2, contrast: 1.1 } },
    { name: 'LED Matrix', scene: 'dotmatrix', pal: { id: 'toxic' }, p: { cols: 36, rows: 20, dot: 0.3, idle: 0.1, colorRow: 0 }, fx: { bloom: 0.6, grain: 0.2, trail: 0.1, scan: 0.2 } },
    { name: 'Minimal Pulse', scene: 'ringseq', pal: { id: 'mono' }, p: { rings: 12, spacing: 0.05, thick: 0.9, pulse: 1.8, arc: 0 }, fx: { mono: 1, monoTint: '#ffffff', bloom: 0.3, grain: 0.12, trail: 0.15, vig: 0.1 } },
    { name: 'Arc Sequencer', scene: 'ringseq', pal: { id: 'cyber' }, p: { rings: 14, spacing: 0.048, thick: 1.2, pulse: 2.2, arc: 1 }, fx: { bloom: 0.65, trail: 0.35, fbRot: 0.06, ca: 0.12 } },
    { name: 'Silk Ribbons', scene: 'ribbons', pal: { id: 'ice' }, p: { count: 4, amp: 1.1, freq: 1.8, speed: 0.8, width: 0.016 }, fx: { trail: 0.55, bloom: 0.7, ca: 0.1, grain: 0.15 } },
    { name: 'Analog Console', scene: 'vu', pal: { id: 'gold' }, p: { ballistics: 300, range: 1.5, accent: 0.7, lamp: 0.9 }, fx: { grain: 0.3, grainSize: 1.5, vig: 0.5, temp: 0.15, sCurve: 0.2, bloom: 0.4, trail: 0 }, layout: { mode: '3h', split: 0.5, splitV: 0.5, gap: 3, panes: ['vu', 'meters', 'readout', 'waterfall', 'vu', 'meters'], active: 0 } },
    { name: 'Studio Meters', scene: 'meters', pal: { id: 'mono' }, p: { mode: 1, segs: 26, colorMode: 0, peaks: 1 }, fx: { bloom: 0.35, grain: 0.15, scan: 0.15, trail: 0 } },
    { name: 'Data Terminal', scene: 'readout', pal: { id: 'toxic' }, p: { accent: 0.45, flicker: 0.35, barRow: 1 }, fx: { scan: 0.4, grain: 0.3, grainType: 2, glitch: 0.2, glitchBeat: 1, bloom: 0.5, vig: 0.35 } },
    { name: 'Meter Strip', scene: 'waterfall', pal: { id: 'ocean', cycle: 0.006 }, p: { polar: 0, span: 0.8, contrast: 0.5, colMode: 1, rotate: 0, flip: 0 }, fx: { bloom: 0.45, grain: 0.2, scan: 0.1, trail: 0 }, layout: { mode: '6h', gap: 3, panes: ['waterfall', 'scope', 'meters', 'vu', 'linescape', 'readout'], active: 0 } },
    { name: 'Control Room', scene: 'scope', pal: { id: 'cyber' }, p: { mode: 0, gain: 1.1, width: 0.01, ghosts: 1, hueDrift: 0.2, spin: 0 }, fx: { bloom: 0.5, grain: 0.2, trail: 0.4 }, layout: { mode: 'quad', split: 0.5, splitV: 0.5, gap: 3, panes: ['scope', 'waterfall', 'meters', 'dotmatrix', 'vu', 'readout'], active: 0 } },
    { name: 'Ink Print', scene: 'cymatics', pal: { id: 'mono' }, p: { sharp: 16, shape: 1, shake: 0.3, invert: 0, follow: 1 }, fx: { thresh: 1, threshLvl: 0.35, threshSoft: 0.03, threshInv: 1, mono: 1, monoTint: '#111111', exposure: 0.4, bloom: 0, grain: 0.25, vig: 0 } },
    { name: 'Thin White Rings', scene: 'rings', pal: { id: 'mono' }, p: { rings: 3, rotSpd: 0.25, baseR: 0.55, thick: 0.6, arc: 0.5, ripple: 0.5, innerWave: 1 }, fx: { thresh: 1, threshLvl: 0.3, threshSoft: 0.02, mono: 1, monoTint: '#ffffff', bloom: 0.2, trail: 0.25, grain: 0.1 } },
    { name: 'Halftone Poster', scene: 'metaballs', pal: { id: 'ember' }, p: { count: 8, goo: 0.22, size: 0.85, speed: 0.7, edge: 30 }, fx: { texOn: 2, texAmt: 0.9, texScale: 1.4, texBlend: 4, mono: 1, monoTint: '#f2ede4', bloom: 0.15, vig: 0.3, grain: 0.2 } },
    { name: 'Xerox Noise', scene: 'plasma', pal: { id: 'mono' }, p: { scale: 3.5, speed: 0.7, warp: 1.2, contour: 0.7, react: 0.6 }, fx: { thresh: 0.9, threshLvl: 0.5, threshSoft: 0.05, mono: 1, monoTint: '#ffffff', noise2: 0.4, noise2Type: 1, noise2Blend: 1, noise2React: 0.4, grain: 0.3, texOn: 3, texAmt: 0.4, bloom: 0.1 } }
  ];
})();
