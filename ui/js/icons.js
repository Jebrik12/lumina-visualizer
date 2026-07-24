/* Lumina — inline stroke SVG icon set (24x24, stroke=currentColor, Lucide-style). No external deps. */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  const W = (inner, sw) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.75) +
    '" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" aria-hidden="true">' + inner + '</svg>';

  const I = {
    /* ---- toolbar / ui ---- */
    'chevron-left':  '<path d="M15 18l-6-6 6-6"/>',
    'chevron-right': '<path d="M9 18l6-6-6-6"/>',
    'chevron-down':  '<path d="M6 9l6 6 6-6"/>',
    'plus':          '<path d="M12 5v14M5 12h14"/>',
    'trash':         '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
    'download':      '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    'upload':        '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
    'dice':          '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="0.8" fill="currentColor"/><circle cx="15" cy="9" r="0.8" fill="currentColor"/><circle cx="9" cy="15" r="0.8" fill="currentColor"/><circle cx="15" cy="15" r="0.8" fill="currentColor"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>',
    'shuffle':       '<path d="M3 7h4l10 10h4M21 17l-2-2M21 17l-2 2M3 17h4l2.5-2.5M13.5 9.5L17 7h4M21 7l-2-2M21 7l-2 2"/>',
    'maximize':      '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    'help':          '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2.2-2.4 3.4"/><circle cx="12" cy="16.5" r="0.5" fill="currentColor"/>',
    'settings':      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    'palette':       '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="0.9" fill="currentColor"/><circle cx="12" cy="7.5" r="0.9" fill="currentColor"/><circle cx="15.5" cy="10" r="0.9" fill="currentColor"/><path d="M12 21a9 9 0 0 1 0-18"/><path d="M12 21c-2 0-2.5-1.6-1.5-2.8.9-1.1.3-2.7-1.2-2.7H7"/>',
    'sliders':       '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18.5" cy="18" r="2"/>',
    'x':             '<path d="M18 6L6 18M6 6l12 12"/>',
    'reset':         '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/>',
    'lock':          '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    'unlock':        '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>',
    'image':         '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-8 8"/>',
    'film':          '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    'save':          '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v4h8"/>',
    'copy':          '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    'check':         '<path d="M20 6L9 17l-5-5"/>',
    'sun':           '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    'moon':          '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    'layout-1':      '<rect x="3" y="4" width="18" height="16" rx="2"/>',
    'layout-2h':     '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    'layout-2v':     '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 12h18"/>',
    'layout-3h':     '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    'layout-quad':   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/>',
    'layout-6h':     '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6 4v16M9 4v16M12 4v16M15 4v16M18 4v16"/>',
    'play':          '<path d="M6 4l14 8-14 8z"/>',
    'mic':           '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    'monitor':       '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    'music':         '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/>',

    /* ---- scenes ---- */
    'sc-bars':       '<path d="M5 20V10M9.5 20V4M14 20v-9M18.5 20V7"/>',
    'sc-rings':      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    'sc-waterfall':  '<path d="M4 6c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2M4 12c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2M4 18c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2"/>',
    'sc-terrain':    '<path d="M3 19l6-10 4 6 3-4 5 8z"/><path d="M3 19h18"/>',
    'sc-scope':      '<path d="M2 12h4l2-6 4 12 2-6h8"/>',
    'sc-tunnel':     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>',
    'sc-harmono':    '<path d="M12 12c3-4.5 8-4.5 8 0s-5 4.5-8 0-8-4.5-8 0 5 4.5 8 0z"/>',
    'sc-cymatics':   '<circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/>',
    'sc-julia':      '<path d="M12 3v18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M4.2 7.5l15.6 9M4.2 7.5l-.7 4.1M4.2 7.5l4.1-.7M19.8 16.5l.7-4.1M19.8 16.5l-4.1.7M4.2 16.5l15.6-9M4.2 16.5l4.1.7M19.8 7.5l-4.1-.7"/>',
    'sc-temple':     '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
    'sc-warp':       '<path d="M12 12m-1 0a1 1 0 1 0 2 0 4 4 0 1 0-4 4 7 7 0 1 0 7-7 10 10 0 1 0-10 10"/>',
    'sc-mandala':    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5M6 6l3.5 3.5M14.5 14.5L18 18M18 6l-3.5 3.5M9.5 14.5L6 18"/>',
    'sc-particles':  '<path d="M12 6l1.2 3L16 10l-2.8 1L12 14l-1.2-3L8 10l2.8-1z"/><circle cx="5" cy="5" r="0.8" fill="currentColor"/><circle cx="19" cy="6" r="0.8" fill="currentColor"/><circle cx="18" cy="18" r="0.8" fill="currentColor"/><circle cx="5.5" cy="17" r="0.8" fill="currentColor"/>',
    'sc-ink':        '<path d="M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11z"/>',
    'sc-hyper':      '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>',
    'sc-metaballs':  '<circle cx="9" cy="12" r="5.5"/><circle cx="16" cy="10" r="4"/>',
    'sc-voronoi':    '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 3v6.5M4.2 16.5l6-3.5M19.8 16.5l-6-3.5M12 9.5l-1.8 3.5M12 9.5l1.8 3.5"/>',
    'sc-reaction':   '<circle cx="8" cy="9" r="3.5"/><circle cx="15.5" cy="14" r="4.5"/><circle cx="16" cy="6" r="1.6"/>',
    'sc-plasma':     '<path d="M12 21c4 0 6.5-2.6 6.5-6 0-4.5-4-6-3.5-10-3.5 1.5-4 5-3.5 7.5C10.5 11 9 9.5 9.2 7 6.8 8.8 5.5 11.5 5.5 15c0 3.4 2.5 6 6.5 6z"/>',
    'sc-retro':      '<path d="M5 15a7 7 0 0 1 14 0"/><path d="M2 15h20M6 19h12M12 4v2M5.6 6.4l1.4 1.4M18.4 6.4L17 7.8"/>',
    'sc-linescape':  '<path d="M3 6h4c1.5 0 2-2 3.5-2S13 6 15 6h6M3 12h3c2 0 2.5-3 5-3s3 3 5 3h5M3 18h5c1.5 0 2-1.5 3.5-1.5S14 18 16 18h5"/>',
    'sc-dotmatrix':  '<circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="12" cy="6" r="1" fill="currentColor"/><circle cx="18" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/><circle cx="12" cy="18" r="1" fill="currentColor"/><circle cx="18" cy="18" r="1" fill="currentColor"/>',
    'sc-ringseq':    '<circle cx="12" cy="12" r="3"/><path d="M12 5a7 7 0 0 1 7 7M5 12a7 7 0 0 1 7-7"/><path d="M12 1.5A10.5 10.5 0 0 1 22.5 12"/>',
    'sc-ribbons':    '<path d="M3 8c4-4 6 4 10 0s5-2 8-4M3 14c4-4 6 4 10 0s5-2 8-4M3 20c4-4 6 4 10 0s5-2 8-4"/>',
    'sc-vu':         '<path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 18L16 9"/><path d="M4.6 14.5l1.8.8M19.4 14.5l-1.8.8M7.5 10.8l1.4 1.4M12 9v2M4 18h16"/>',
    'sc-meters':     '<path d="M5 20V8M5 20h0M10 20V4M15 20v-8M20 20V6"/><path d="M3.5 8H6.5M8.5 4h3M13.5 12h3M18.5 6h3"/>',
    'sc-readout':    '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M10 10v4M10 10h-3M10 14h-3M14 10h3v4h-3z"/>'
  };

  LUM.icon = function (name, sw) {
    const inner = I[name];
    if (!inner) return W('<circle cx="12" cy="12" r="8"/>');
    return W(inner, sw);
  };

  LUM.iconNames = Object.keys(I);
})();
