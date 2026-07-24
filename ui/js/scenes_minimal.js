/* Lumina scenes — MINIMAL pack: Linescape, Dot Matrix, Ring Sequencer, Ribbon Field */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ============ 21. LINESCAPE ============ */
  LUM.reg({
    id: 'linescape', name: 'Linescape', cat: 'Minimal', icon: '≡',
    params: [
      { k: 'lines', n: 'Lines', min: 14, max: 72, step: 1, def: 42 },
      { k: 'amp', n: 'Amplitude', min: 0, max: 2, def: 1.0 },
      { k: 'span', n: 'History Span', min: 0.2, max: 1, def: 0.9 },
      { k: 'width', n: 'Line Width', min: 0.6, max: 3, def: 1.1 },
      { k: 'envelope', n: 'Center Focus', min: 0.8, max: 4, def: 2.1 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uLines,uAmp,uSpan,uWidth2,uEnvelope;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' float n=uLines;',
        ' float bell=exp(-pow((uv.x-0.5)*uEnvelope,2.0)*7.0);',
        ' float fi=floor((uv.y-0.10)/0.80*n);',
        ' float dmin=1e9;float which=0.0;',
        ' for(int k=-2;k<=1;k++){',
        '  float i=fi+float(k);',
        '  if(i<0.0||i>=n)continue;',
        '  float base=0.10+0.80*(i+0.5)/n;',
        '  float back=(1.0-(i+0.5)/n)*uSpan;',
        '  vec2 w=histWave(uv.x,back);',
        '  float y=base+(w.x+w.y)*0.5*uAmp*bell*0.22;',
        '  float d=abs(uv.y-y);',
        '  if(d<dmin){dmin=d;which=i;}',
        ' }',
        ' float px=dmin*uRes.y;',
        ' float line=smoothstep(uWidth2+1.2,uWidth2-0.4,px);',
        ' vec3 col=pal(0.45+which/n*0.25)*line*(0.7+uEnergy*0.7);',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'linescape');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({ uLines: P.lines, uAmp: P.amp, uSpan: P.span, uWidth2: P.width, uEnvelope: P.envelope });
      LUM.fsq();
    }
  });

  /* ============ 22. DOT MATRIX ============ */
  LUM.reg({
    id: 'dotmatrix', name: 'Dot Matrix', cat: 'Minimal', icon: '⠿',
    params: [
      { k: 'cols', n: 'Columns', min: 12, max: 64, step: 1, def: 32 },
      { k: 'rows', n: 'Rows', min: 8, max: 40, step: 1, def: 18 },
      { k: 'dot', n: 'Dot Size', min: 0.12, max: 0.46, def: 0.3 },
      { k: 'idle', n: 'Idle Glow', min: 0, max: 0.3, def: 0.1 },
      { k: 'colorRow', n: 'Color By', type: 'select', opts: ['Level', 'Column'], def: 0 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uCols,uRows,uDot,uIdle,uColorRow;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' uv=(uv-0.5)*1.06+0.5;',
        ' vec2 grid=vec2(uCols,uRows);',
        ' vec2 cell=floor(uv*grid);',
        ' if(cell.x<0.0||cell.x>=uCols||cell.y<0.0||cell.y>=uRows){fragColor=vec4(0,0,0,1);return;}',
        ' vec2 fc=fract(uv*grid)-0.5;',
        ' fc.x*=uRes.x/uRes.y*uRows/uCols;',
        ' float x=(cell.x+0.5)/uCols;',
        ' float v=band(x);',
        ' float lvl=(cell.y+0.5)/uRows;',
        ' float on=step(lvl,v);',
        ' float d=length(fc);',
        ' float dotm=smoothstep(uDot,uDot-0.1,d);',
        ' float ct=(uColorRow<0.5)?lvl*0.7:x*0.8;',
        ' vec3 col=pal(ct)*dotm*(uIdle+on*1.3);',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'dotmatrix');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({ uCols: P.cols, uRows: P.rows, uDot: P.dot, uIdle: P.idle, uColorRow: P.colorRow });
      LUM.fsq();
    }
  });

  /* ============ 23. RING SEQUENCER ============ */
  LUM.reg({
    id: 'ringseq', name: 'Ring Sequencer', cat: 'Minimal', icon: '◎',
    params: [
      { k: 'rings', n: 'Rings', min: 4, max: 24, step: 1, def: 11 },
      { k: 'spacing', n: 'Spacing', min: 0.03, max: 0.11, def: 0.055 },
      { k: 'thick', n: 'Thickness', min: 0.4, max: 3, def: 1.0 },
      { k: 'pulse', n: 'Pulse', min: 0, max: 3, def: 1.7 },
      { k: 'arc', n: 'Arc Mode', type: 'toggle', def: 0 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uRingsN,uGapR,uThick2,uPulse2,uArcM;',
        'void main(){',
        ' vec2 c=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' float r=length(c);',
        ' float a=atan(c.y,c.x);',
        ' float fi=floor(r/uGapR-0.5);',
        ' vec3 col=vec3(0.0);',
        ' if(fi>=0.0&&fi<uRingsN){',
        '  float rc=(fi+1.0)*uGapR;',
        '  float x=(fi+0.5)/uRingsN;',
        '  float v=band(x*0.92+0.02);',
        '  float w=(0.0015+uThick2*0.0022)*(1.0+v*uPulse2);',
        '  float d=abs(r-rc);',
        '  float line=smoothstep(w+0.0018,w,d);',
        '  if(uArcM>0.5){',
        '   float span=0.15+v*0.85;',
        '   float aa=fract(a/6.2831853+0.5+uTime*0.02*(mod(fi,2.0)*2.0-1.0));',
        '   line*=step(abs(aa-0.5),span*0.5);',
        '  }',
        '  col=pal(x*0.75)*line*(0.35+v*1.5);',
        ' }',
        ' col+=pal(0.05)*exp(-r*9.0)*uBass*0.6;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'ringseq');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({ uRingsN: P.rings, uGapR: P.spacing, uThick2: P.thick, uPulse2: P.pulse, uArcM: P.arc });
      LUM.fsq();
    }
  });

  /* ============ 24. RIBBON FIELD ============ */
  LUM.reg({
    id: 'ribbons', name: 'Ribbon Field', cat: 'Minimal', icon: '∿∿',
    params: [
      { k: 'count', n: 'Ribbons', min: 2, max: 5, step: 1, def: 4 },
      { k: 'amp', n: 'Amplitude', min: 0.2, max: 2, def: 1.0 },
      { k: 'freq', n: 'Frequency', min: 0.5, max: 4, def: 1.6 },
      { k: 'speed', n: 'Flow Speed', min: 0.1, max: 2, def: 0.7 },
      { k: 'width', n: 'Thickness', min: 0.003, max: 0.05, def: 0.014 }
    ],
    init() {
      this.prg = LUM.ribbonPrg([
        'uniform float uRibbon,uFlowT,uAmpR,uFreqR,uCountR;',
        'vec2 path(float t){',
        ' float x=(t*2.0-1.0)*uAspect*0.96;',
        ' float ph=uFlowT*(0.6+uRibbon*0.11)+uRibbon*2.4;',
        ' float y=(uRibbon-(uCountR-1.0)*0.5)*(1.3/max(uCountR,1.0));',
        ' y+=sin(t*6.2831853*uFreqR+ph)*0.14*uAmpR;',
        ' y+=sin(t*6.2831853*uFreqR*2.17-ph*1.31)*0.06*uAmpR;',
        ' y+=vband(t*0.9+0.05)*0.30*uAmpR*(0.35+0.65*fract(uRibbon*0.37+0.21));',
        ' return vec2(x,y);',
        '}'
      ].join('\n'), [
        'uniform float uRibbonF,uCountF;',
        'void main(){',
        ' float edge=pow(sat(1.0-abs(vSide)),1.4);',
        ' vec3 c=pal(uRibbonF/max(uCountF,1.0)*0.6+vT*0.2)*edge*(0.55+uEnergy*1.1);',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 512, 'ribbons');
    },
    render(P) {
      LUM.blendAdd();
      this.prg.use();
      LUM.setCommon(this.prg);
      const n = Math.round(P.count);
      for (let i = 0; i < n; i++) {
        this.prg.setAll({
          uRibbon: i, uRibbonF: i, uCountR: n, uCountF: n,
          uFlowT: LUM.frame.t * P.speed, uAmpR: P.amp, uFreqR: P.freq, uWidth: P.width
        });
        this.prg.draw();
      }
      LUM.blendOff();
    }
  });
})();
