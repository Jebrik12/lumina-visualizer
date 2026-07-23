/* Lumina scenes — SPECTRUM pack: Spectra Bars, Orbital Rings, Waterfall, Terrain Flight */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ============ 1. SPECTRA BARS ============ */
  LUM.reg({
    id: 'bars', name: 'Spectra Bars', cat: 'Spectrum', icon: '▮▮▯',
    params: [
      { k: 'count', n: 'Bars', min: 12, max: 96, step: 1, def: 56 },
      { k: 'gap', n: 'Gap', min: 0, max: 0.7, def: 0.3 },
      { k: 'layout', n: 'Layout', type: 'select', opts: ['Classic', 'Mirror', 'Quad'], def: 1 },
      { k: 'caps', n: 'Peak Caps', min: 0, max: 1, def: 0.8 },
      { k: 'glow', n: 'Base Glow', min: 0, max: 1, def: 0.45 },
      { k: 'segs', n: 'Segments', min: 0, max: 40, step: 1, def: 0 },
      { k: 'colorMode', n: 'Color By', type: 'select', opts: ['Frequency', 'Height'], def: 0 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uCount,uGap,uLayout,uCaps,uGlow,uSegs,uColorMode;',
        'uniform float uPeaks[96];',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 p=uv;',
        ' if(uLayout>0.5)p.y=abs(p.y-0.5)*2.0;',
        ' if(uLayout>1.5)p.x=abs(p.x-0.5)*2.0;',
        ' float n=uCount;',
        ' float bi=floor(p.x*n);',
        ' float fx=fract(p.x*n);',
        ' float x=(bi+0.5)/n;',
        ' float v=band(x)*0.94+0.015;',
        ' float halfw=0.5-uGap*0.5;',
        ' float dx=abs(fx-0.5);',
        ' float edge=smoothstep(halfw,halfw-0.14,dx);',
        ' float top=smoothstep(v,v-0.02,p.y);',
        ' float bar=edge*top;',
        ' if(uSegs>0.5)bar*=step(0.22,fract(p.y*uSegs));',
        ' float ct=(uColorMode<0.5)?x*0.85:sat(p.y/max(v,0.02))*0.75;',
        ' vec3 base=pal(ct);',
        ' vec3 c=base*bar*(0.4+v*1.35);',
        ' float g=exp(-max(p.y-v,0.0)*(16.0-uGlow*10.0))*edge;',
        ' c+=base*g*uGlow*0.55;',
        ' int pi=int(clamp(bi,0.0,95.0));',
        ' float pk=uPeaks[pi];',
        ' float capLine=exp(-abs(p.y-pk)*110.0)*edge*step(0.03,pk);',
        ' c+=pal(ct+0.12)*capLine*uCaps*(0.7+v);',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'bars');
      this.peaks = new Float32Array(96);
    },
    render(P, dt) {
      const A = LUM.audio, n = Math.round(P.count);
      for (let i = 0; i < 96; i++) {
        let v = 0;
        if (i < n) {
          const x = (i + 0.5) / n * 95;
          const i0 = Math.min(94, Math.floor(x)), fr = x - i0;
          v = A.view[i0] * (1 - fr) + A.view[i0 + 1] * fr;
          v = v * 0.94 + 0.015;
        }
        let pk = this.peaks[i] - dt * (0.25 + this.peaks[i] * 0.35);
        if (v > pk) pk = v;
        this.peaks[i] = Math.max(0, pk);
      }
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uCount: n, uGap: P.gap, uLayout: P.layout, uCaps: P.caps,
        uGlow: P.glow, uSegs: P.segs, uColorMode: P.colorMode, uPeaks: this.peaks
      });
      LUM.fsq();
    }
  });

  /* ============ 2. ORBITAL RINGS ============ */
  LUM.reg({
    id: 'rings', name: 'Orbital Rings', cat: 'Spectrum', icon: '◎',
    params: [
      { k: 'rings', n: 'Rings', min: 1, max: 4, step: 1, def: 3 },
      { k: 'rotSpd', n: 'Rotation', min: -1.5, max: 1.5, def: 0.35 },
      { k: 'baseR', n: 'Radius', min: 0.25, max: 0.9, def: 0.52 },
      { k: 'thick', n: 'Thickness', min: 0.2, max: 2.5, def: 1.0 },
      { k: 'arc', n: 'Reach', min: 0, max: 1, def: 0.55 },
      { k: 'ripple', n: 'Beat Ripple', min: 0, max: 1, def: 0.7 },
      { k: 'innerWave', n: 'Waveform Core', type: 'toggle', def: 1 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uRings,uRotSpd,uBaseR,uThick,uArc,uRipple,uInnerWave;',
        'void main(){',
        ' vec2 uv=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' float r=length(uv);',
        ' float a=atan(uv.y,uv.x);',
        ' vec3 c=vec3(0.0);',
        ' float rr=uBaseR*0.5+uBeatPhase*1.1;',
        ' c+=pal(0.9)*exp(-abs(r-rr)*46.0)*max(0.0,1.0-uBeatPhase*1.25)*uRipple*1.4;',
        ' for(int k=0;k<4;k++){',
        '  if(float(k)>=uRings)break;',
        '  float fk=float(k);',
        '  float dir=mod(fk,2.0)<1.0?1.0:-1.0;',
        '  float aa=a*dir+uTime*uRotSpd*(0.5+fk*0.3)+fk*2.1;',
        '  float xa=fract(aa/6.2831853);',
        '  xa=1.0-abs(2.0*xa-1.0);',
        '  float v=band(xa);',
        '  float ringR=uBaseR*(0.52+fk*0.27);',
        '  float w=uThick*(0.014+v*0.05);',
        '  float d=abs(r-(ringR+v*uArc*0.20));',
        '  float m=exp(-d*d/(w*w)*3.0);',
        '  c+=pal(xa*0.75+fk*0.09)*m*(0.22+v*1.7);',
        ' }',
        ' if(uInnerWave>0.5){',
        '  float xa2=fract(a/6.2831853+0.5);',
        '  float xam=1.0-abs(2.0*xa2-1.0);',
        '  float wv=wavM(xam);',
        '  float ringR2=uBaseR*0.30+wv*0.10;',
        '  float d2=abs(r-ringR2);',
        '  c+=pal(0.18+wv*0.6)*exp(-d2*150.0)*(0.7+uEnergy*1.4);',
        ' }',
        ' c+=pal(0.03)*exp(-r*6.0)*uBass*0.85;',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'rings');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uRings: P.rings, uRotSpd: P.rotSpd, uBaseR: P.baseR, uThick: P.thick,
        uArc: P.arc, uRipple: P.ripple, uInnerWave: P.innerWave
      });
      LUM.fsq();
    }
  });

  /* ============ 3. WATERFALL ============ */
  LUM.reg({
    id: 'waterfall', name: 'Waterfall', cat: 'Spectrum', icon: '≋',
    params: [
      { k: 'polar', n: 'Shape', type: 'select', opts: ['Linear', 'Circular'], def: 1 },
      { k: 'span', n: 'History Span', min: 0.25, max: 1, def: 0.85 },
      { k: 'contrast', n: 'Contrast', min: 0, max: 1, def: 0.45 },
      { k: 'colMode', n: 'Color By', type: 'select', opts: ['Intensity', 'Frequency'], def: 0 },
      { k: 'rotate', n: 'Spin', min: -0.6, max: 0.6, def: 0.12 },
      { k: 'flip', n: 'Direction', type: 'select', opts: ['Down', 'Up'], def: 0 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uPolar,uSpan,uContrast2,uColMode,uRotate2,uFlip;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' float v;float cx;',
        ' if(uPolar>0.5){',
        '  vec2 p=(uv-0.5)*vec2(uAspect,1.0);',
        '  p=rot(uTime*uRotate2)*p;',
        '  float r=length(p)*1.45;',
        '  float a=fract(atan(p.y,p.x)/6.2831853+0.5);',
        '  cx=1.0-abs(2.0*a-1.0);',
        '  v=histBand(cx,sat(r)*uSpan);',
        '  v*=smoothstep(1.05,0.9,r)*smoothstep(0.0,0.06,r);',
        ' } else {',
        '  cx=uv.x;',
        '  float back=(uFlip>0.5)?(1.0-uv.y):uv.y;',
        '  v=histBand(cx,back*uSpan);',
        ' }',
        ' v=pow(sat(v*1.15),1.0+uContrast2*2.4);',
        ' vec3 c=(uColMode<0.5)?pal(v*0.85+0.03)*(0.04+v*1.7):pal(cx*0.8)*v*1.8;',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'waterfall');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uPolar: P.polar, uSpan: P.span, uContrast2: P.contrast,
        uColMode: P.colMode, uRotate2: P.rotate, uFlip: P.flip
      });
      LUM.fsq();
    }
  });

  /* ============ 4. TERRAIN FLIGHT ============ */
  LUM.reg({
    id: 'terrain', name: 'Terrain Flight', cat: 'Spectrum', icon: '⛰',
    params: [
      { k: 'height', n: 'Height', min: 0.1, max: 0.85, def: 0.5 },
      { k: 'style', n: 'Style', type: 'select', opts: ['Solid + Grid', 'Wireframe'], def: 0 },
      { k: 'fog', n: 'Fog', min: 0.2, max: 3, def: 1.1 },
      { k: 'pitch', n: 'Camera Pitch', min: 0.1, max: 0.75, def: 0.38 },
      { k: 'grid', n: 'Grid Density', min: 6, max: 40, step: 1, def: 18 },
      { k: 'bob', n: 'Bass Bob', min: 0, max: 1, def: 0.5 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uHeightAmt,uStyle,uFogF,uPitch,uGridN,uBob;',
        'float hgt(vec2 xz){',
        ' float fx=sat(abs(xz.x)*0.85+0.02);',
        ' return histBand(fx,fract(xz.y))*uHeightAmt;',
        '}',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 ndc=(uv-0.5)*vec2(uAspect,1.0)*2.0;',
        ' vec3 ro=vec3(0.0,0.62+uBass*0.12*uBob,0.0);',
        ' vec3 rd=normalize(vec3(ndc.x,ndc.y-uPitch,1.35));',
        ' float tt=0.05,tp=0.05;',
        ' float py=ro.y,ph=0.0;',
        ' bool hit=false;',
        ' vec3 p=ro;',
        ' float h=0.0;',
        ' for(int i=0;i<64;i++){',
        '  p=ro+rd*tt;',
        '  h=hgt(vec2(p.x*0.5,p.z*0.13));',
        '  if(p.y<h){hit=true;break;}',
        '  tp=tt;py=p.y;ph=h;',
        '  tt+=0.02+tt*0.09;',
        '  if(tt>7.0)break;',
        ' }',
        ' vec3 col=vec3(0.0);',
        ' if(hit){',
        '  float f=clamp((py-ph)/max((py-ph)-(p.y-h),1e-4),0.0,1.0);',
        '  float th=mix(tp,tt,f);',
        '  p=ro+rd*th;',
        '  float hh=hgt(vec2(p.x*0.5,p.z*0.13));',
        '  float vN=sat(hh/max(uHeightAmt,0.01));',
        '  vec3 base=pal(vN*0.72+0.05)*(0.18+vN*1.5);',
        '  float gx=abs(fract(p.x*0.5*uGridN)-0.5);',
        '  float gz=abs(fract(p.z*0.13*uGridN*2.0)-0.5);',
        '  float lw=0.06+th*0.012;',
        '  float grid=max(smoothstep(lw,0.0,gx),smoothstep(lw,0.0,gz));',
        '  vec3 wire=pal(vN*0.6+0.28)*(0.35+vN*2.1);',
        '  col=(uStyle<0.5)?mix(base*0.75,wire,grid*0.85):wire*grid*(0.4+vN*1.6);',
        '  col*=exp(-th*uFogF*0.30);',
        ' }',
        ' float horiz=exp(-abs(ndc.y-uPitch+0.05)*7.0);',
        ' col+=pal(0.65)*horiz*0.22*(0.4+uEnergy);',
        ' float st=hash21(floor(ndc*vec2(90.0,50.0)));',
        ' if(st>0.995&&ndc.y>uPitch*0.4)col+=vec3(0.5)*uTreb*sin(uTime*4.0+st*40.0)*0.5+vec3(0.12)*step(0.997,st);',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'terrain');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uHeightAmt: P.height, uStyle: P.style, uFogF: P.fog,
        uPitch: P.pitch, uGridN: P.grid, uBob: P.bob
      });
      LUM.fsq();
    }
  });
})();
