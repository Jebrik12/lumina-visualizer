/* Lumina — multi-pane layout engine: pane rect math, per-pane render targets, compose blit. */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  const MODES = [
    { id: 'single', n: 'Single', panes: 1, icon: 'layout-1' },
    { id: '2h', n: 'Split V', panes: 2, icon: 'layout-2h' },
    { id: '2v', n: 'Split H', panes: 2, icon: 'layout-2v' },
    { id: '3h', n: 'Triple', panes: 3, icon: 'layout-3h' },
    { id: 'quad', n: 'Quad', panes: 4, icon: 'layout-quad' },
    { id: '6h', n: 'Strip ×6', panes: 6, icon: 'layout-6h' }
  ];

  LUM.layoutModes = MODES;
  LUM.layoutModeById = {};
  MODES.forEach(m => { LUM.layoutModeById[m.id] = m; });

  LUM.DEFAULT_LAYOUT = {
    mode: 'single', split: 0.5, splitV: 0.5, gap: 2,
    panes: ['rings', 'bars', 'scope', 'waterfall', 'vu', 'meters'],
    active: 0
  };

  /* pane rects in render pixels */
  LUM.paneRects = function (L, W, H) {
    const g = Math.round((L.gap || 0) * (W / 800));
    const s = Math.min(0.85, Math.max(0.15, L.split || 0.5));
    const sv = Math.min(0.85, Math.max(0.15, L.splitV || 0.5));
    const r = [];
    const push = (x, y, w, h) => r.push({
      x: Math.round(x), y: Math.round(y),
      w: Math.max(2, Math.round(w)), h: Math.max(2, Math.round(h))
    });

    switch (L.mode) {
      case '2h': {
        const w1 = W * s - g / 2;
        push(0, 0, w1, H);
        push(w1 + g, 0, W - w1 - g, H);
        break;
      }
      case '2v': {
        const h1 = H * sv - g / 2;
        push(0, H - h1, W, h1);
        push(0, 0, W, H - h1 - g);
        break;
      }
      case '3h': {
        const w1 = W * Math.min(0.7, Math.max(0.15, s * 0.66));
        const w2 = (W - w1 - 2 * g) * sv;
        push(0, 0, w1, H);
        push(w1 + g, 0, w2, H);
        push(w1 + g + w2 + g, 0, W - w1 - w2 - 2 * g, H);
        break;
      }
      case 'quad': {
        const w1 = W * s - g / 2, h1 = H * sv - g / 2;
        push(0, H - h1, w1, h1);
        push(w1 + g, H - h1, W - w1 - g, h1);
        push(0, 0, w1, H - h1 - g);
        push(w1 + g, 0, W - w1 - g, H - h1 - g);
        break;
      }
      case '6h': {
        const w = (W - 5 * g) / 6;
        for (let i = 0; i < 6; i++) push(i * (w + g), 0, w, H);
        break;
      }
      default:
        push(0, 0, W, H);
    }
    return r;
  };

  /* ---- pane render targets ---- */
  const pool = [];
  LUM.paneRT = function (i, w, h) {
    const gl = LUM.gl, fmt = LUM.floatRT ? gl.RGBA16F : gl.RGBA8;
    let e = pool[i];
    if (!e || e.w !== w || e.h !== h) {
      if (e) LUM.delRT(e);
      e = pool[i] = LUM.makeRT(w, h, fmt, gl.LINEAR);
    }
    return e;
  };

  /* ---- compose blit ---- */
  let blitPrg = null;
  LUM.composePane = function (rt, rect, fullW, fullH) {
    const gl = LUM.gl;
    if (!blitPrg) {
      blitPrg = LUM.prog(LUM.FSQ_VS, [
        '#version 300 es',
        'precision highp float;',
        'uniform sampler2D uSrc;uniform vec4 uRect;uniform vec2 uFull;',
        'out vec4 fragColor;',
        'void main(){',
        ' vec2 uv=(gl_FragCoord.xy-uRect.xy)/uRect.zw;',
        ' fragColor=vec4(texture(uSrc,uv).rgb,1.0);',
        '}'
      ].join('\n'), 'layout.blit');
    }
    gl.viewport(rect.x, rect.y, rect.w, rect.h);
    blitPrg.use();
    blitPrg.setAll({ uSrc: rt.tex, uRect: [rect.x, rect.y, rect.w, rect.h], uFull: [fullW, fullH] });
    LUM.fsq();
  };

  /* map a canvas click (css px) to a pane index */
  LUM.paneAt = function (L, cssX, cssY, cssW, cssH) {
    const rects = LUM.paneRects(L, cssW, cssH);
    const y = cssH - cssY; /* rects are GL-space (origin bottom-left) */
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (cssX >= r.x && cssX <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return 0;
  };
})();
