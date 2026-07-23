/* Lumina scenes — FRACTAL pack: Julia Drift, Fractal Temple, Warp Core, Mandala */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ============ 9. JULIA DRIFT ============ */
  LUM.reg({
    id: 'julia', name: 'Julia Drift', cat: 'Fractal', icon: '❂',
    params: [
      { k: 'iter', n: 'Detail', min: 40, max: 200, step: 1, def: 110 },
      { k: 'zoom', n: 'Zoom', min: 0.5, max: 3.5, def: 1.15 },
      { k: 'drift', n: 'Drift Speed', min: 0.02, max: 0.6, def: 0.16 },
      { k: 'audioInf', n: 'Audio Push', min: 0, max: 1, def: 0.55 },
      { k: 'trap', n: 'Orbit Trap', type: 'select', opts: ['Circle', 'Cross'], def: 0 },
      { k: 'beatZoom', n: 'Beat Zoom', min: 0, max: 1, def: 0.4 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uIter,uZoom,uDrift,uAudioInf,uTrap,uBeatZoom;',
        'void main(){',
        ' vec2 uv=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' float zm=uZoom*(1.0+uBeat*0.07*uBeatZoom);',
        ' vec2 z=uv*2.7/zm;',
        ' z=rot(uTime*0.02)*z;',
        ' float t=uTime*uDrift;',
        ' vec2 c=vec2(-0.745+0.117*sin(t*0.73),0.186+0.095*cos(t*0.53));',
        ' c+=vec2(sin(t*2.1),cos(t*1.7))*vec2(uBass,uMid)*0.055*uAudioInf;',
        ' float trap=1e9;',
        ' int N=int(uIter);',
        ' int i=0;',
        ' for(int k=0;k<200;k++){',
        '  if(k>=N)break;',
        '  z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;',
        '  float tp=(uTrap<0.5)?abs(length(z)-0.45-uBass*0.25):min(abs(z.x),abs(z.y));',
        '  trap=min(trap,tp);',
        '  i=k;',
        '  if(dot(z,z)>64.0)break;',
        ' }',
        ' vec3 col;',
        ' if(dot(z,z)<=64.0){',
        '  col=pal(0.03+uBass*0.1)*(0.04+0.35*exp(-trap*18.0));',
        '  col+=pal(0.55)*exp(-trap*48.0)*0.55;',
        ' }else{',
        '  float sm=float(i)+1.0-log2(max(1.0,log2(dot(z,z))));',
        '  float f=sat(sm/float(N));',
        '  col=pal(f*1.7+uTime*0.012)*(0.10+1.1*pow(f,0.7));',
        '  col+=pal(0.82)*exp(-trap*12.0)*(0.3+uTreb*0.55);',
        ' }',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'julia');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uIter: P.iter, uZoom: P.zoom, uDrift: P.drift,
        uAudioInf: P.audioInf, uTrap: P.trap, uBeatZoom: P.beatZoom
      });
      LUM.fsq();
    }
  });

  /* ============ 10. FRACTAL TEMPLE (raymarched) ============ */
  LUM.reg({
    id: 'temple', name: 'Fractal Temple', cat: 'Fractal', icon: '⌬',
    params: [
      { k: 'type', n: 'Fractal', type: 'select', opts: ['Menger Temple', 'Mandelbulb'], def: 0 },
      { k: 'detail', n: 'Precision', min: 0, max: 1, def: 0.6 },
      { k: 'camSpd', n: 'Orbit Speed', min: 0.01, max: 0.4, def: 0.09 },
      { k: 'pulse', n: 'Bass Pulse', min: 0, max: 1, def: 0.55 },
      { k: 'fog', n: 'Fog', min: 0.1, max: 2.5, def: 0.9 },
      { k: 'glow', n: 'Proximity Glow', min: 0, max: 1, def: 0.5 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uType,uDetail,uCamSpd,uPulse,uFogF,uGlowF;',
        'float maxc(vec3 p){return max(p.x,max(p.y,p.z));}',
        'float sdBox(vec3 p,vec3 b){vec3 di=abs(p)-b;return min(maxc(di),0.0)+length(max(di,0.0));}',
        'float deMenger(vec3 p){',
        ' float d=sdBox(p,vec3(1.0));',
        ' float s=1.0;',
        ' for(int m=0;m<4;m++){',
        '  vec3 a=mod(p*s,2.0)-1.0;',
        '  s*=3.0;',
        '  vec3 r=abs(1.0-3.0*abs(a));',
        '  float da=max(r.x,r.y);',
        '  float db=max(r.y,r.z);',
        '  float dc=max(r.z,r.x);',
        '  float c=(min(da,min(db,dc))-1.0)/s;',
        '  d=max(d,c);',
        ' }',
        ' return d;',
        '}',
        'float deBulb(vec3 pos){',
        ' vec3 z=pos;float dr=1.0;float r=0.0;',
        ' for(int i=0;i<4;i++){',
        '  r=length(z);',
        '  if(r>2.0)break;',
        '  float theta=acos(clamp(z.z/max(r,1e-6),-1.0,1.0))*8.0;',
        '  float phi=atan(z.y,z.x)*8.0;',
        '  float zr=pow(r,8.0);',
        '  dr=pow(r,7.0)*8.0*dr+1.0;',
        '  z=zr*vec3(sin(theta)*cos(phi),sin(phi)*sin(theta),cos(theta))+pos;',
        ' }',
        ' return 0.5*log(max(r,1e-6))*r/dr;',
        '}',
        'float map(vec3 p){',
        ' float s=1.0+uBass*0.09*uPulse;',
        ' vec3 q=p/s;',
        ' q.xz=rot(uTime*0.05)*q.xz;',
        ' q.xy=rot(uTime*0.033+uBeatPhase*0.05*uPulse)*q.xy;',
        ' float d=(uType<0.5)?deMenger(q):deBulb(q*0.85)/0.85;',
        ' return d*s;',
        '}',
        'vec3 nrm(vec3 p){',
        ' vec2 e=vec2(0.0015,0.0);',
        ' return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));',
        '}',
        'void main(){',
        ' vec2 ndc=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0)*2.0;',
        ' float ct=uTime*uCamSpd*6.2831853;',
        ' float rad=3.05-uEnergy*0.35;',
        ' vec3 ro=vec3(sin(ct)*rad,0.85*sin(ct*0.6)+0.15,cos(ct)*rad);',
        ' vec3 fw=normalize(-ro);',
        ' vec3 rt=normalize(cross(vec3(0.0,1.0,0.0),fw));',
        ' vec3 up=cross(fw,rt);',
        ' vec3 rd=normalize(fw*1.65+ndc.x*rt+ndc.y*up);',
        ' float tt=0.0;float md=1e9;float d=1e9;',
        ' vec3 p=ro;',
        ' float steps=0.0;',
        ' for(int i=0;i<84;i++){',
        '  p=ro+rd*tt;',
        '  d=map(p);',
        '  md=min(md,d);',
        '  float eps=mix(0.004,0.0011,uDetail)*max(tt,0.25);',
        '  if(d<eps||tt>9.0)break;',
        '  tt+=d*0.82;',
        '  steps+=1.0;',
        ' }',
        ' float ao=1.0-steps/84.0;',
        ' vec3 col=vec3(0.0);',
        ' float eps2=mix(0.004,0.0011,uDetail)*max(tt,0.25);',
        ' if(d<eps2&&tt<=9.0){',
        '  vec3 n=nrm(p);',
        '  float dif=max(dot(n,normalize(vec3(0.6,0.85,-0.4))),0.0);',
        '  float rim=pow(1.0-max(dot(n,-rd),0.0),2.2);',
        '  vec3 base=pal(length(p)*0.33+uTime*0.015);',
        '  col=base*(0.10+dif*0.8)+rim*pal(0.85)*0.75;',
        '  col*=ao*ao;',
        '  col+=pal(0.92)*uBeat*0.35*rim*uPulse*2.0;',
        ' }',
        ' col+=pal(0.72)*exp(-md*13.0)*uGlowF*(0.35+uTreb*1.1);',
        ' col*=exp(-tt*uFogF*0.12);',
        ' col+=pal(0.03)*0.028*(1.0-ao);',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'temple');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uType: P.type, uDetail: P.detail, uCamSpd: P.camSpd,
        uPulse: P.pulse, uFogF: P.fog, uGlowF: P.glow
      });
      LUM.fsq();
    }
  });

  /* ============ 11. WARP CORE (Milkdrop-style feedback) ============ */
  LUM.reg({
    id: 'warp', name: 'Warp Core', cat: 'Fractal', icon: '๑',
    params: [
      { k: 'mode', n: 'Warp Field', type: 'select', opts: ['Sine Weave', 'Polar Swirl', 'Noise Flow', 'Shockwave'], def: 1 },
      { k: 'warp', n: 'Warp Amount', min: 0, max: 1, def: 0.5 },
      { k: 'zoom', n: 'Zoom Flow', min: -0.4, max: 0.4, def: 0.12 },
      { k: 'rotFlow', n: 'Rotation Flow', min: -0.8, max: 0.8, def: 0.15 },
      { k: 'decay', n: 'Persistence', min: 0.8, max: 0.985, def: 0.94 },
      { k: 'inject', n: 'Ink Amount', min: 0.2, max: 2, def: 0.6 }
    ],
    init() {
      this.warpPrg = LUM.scenePrg([
        'uniform sampler2D uSelf;',
        'uniform float uWarpAmt,uZoomW,uRotW,uDecayW,uModeW,uInject;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 c=(uv-0.5)*vec2(uAspect,1.0);',
        ' float r=length(c);',
        ' float a=atan(c.y,c.x);',
        ' float t=uTime*0.4;',
        ' vec2 off;',
        ' if(uModeW<0.5){off=vec2(sin(c.y*7.0+t*2.1)+sin(c.y*13.0-t),sin(c.x*7.0-t*1.7)+sin(c.x*11.0+t*0.8))*0.5;}',
        ' else if(uModeW<1.5){off=vec2(cos(a*3.0+r*9.0-t*2.0),sin(a*2.0-r*7.0+t*1.6));}',
        ' else if(uModeW<2.5){float n=fbm(c*3.0+t*0.35)*6.2831853;off=vec2(cos(n),sin(n));}',
        ' else{off=(c/max(r,1e-3))*sin(r*16.0-t*4.0-uBeatPhase*3.0);}',
        ' off*=uWarpAmt*0.007*(0.4+uMid*1.6+uBeat*1.0);',
        ' vec2 p=rot(uRotW)*(c*uZoomW)+off;',
        ' p.x/=uAspect;',
        ' vec2 uv2=p+0.5;',
        ' vec3 prev=texture(uSelf,uv2).rgb*uDecayW;',
        ' vec2 msk=step(vec2(0.0),uv2)*step(uv2,vec2(1.0));',
        ' prev*=msk.x*msk.y;',
        ' float ang=fract(a/6.2831853+0.5);',
        ' float angM=1.0-abs(2.0*ang-1.0);',
        ' float wv=wavM(angM);',
        ' float ring=exp(-abs(r-0.33-wv*0.14)*64.0);',
        ' vec3 inj=pal(fract(ang+uTime*0.04))*ring*uInject*(0.5+uEnergy*1.8);',
        ' float bar=band(uv.x);',
        ' inj+=pal(uv.x*0.8)*exp(-uv.y*22.0)*bar*bar*0.9*uInject;',
        ' inj+=pal(0.9)*exp(-r*9.0)*uBeat*uInject*0.5;',
        ' fragColor=vec4(min(prev+inj,vec3(2.2)),1.0);',
        '}'
      ].join('\n'), 'warp');
      this.blitPrg = LUM.prog(LUM.FSQ_VS, [
        '#version 300 es',
        'precision highp float;',
        'uniform sampler2D uSrc;uniform vec2 uRes;',
        'out vec4 fragColor;',
        'void main(){fragColor=vec4(texture(uSrc,gl_FragCoord.xy/uRes).rgb,1.0);}'
      ].join('\n'), 'warp.blit');
      this.pp = null; this._w = 0; this._h = 0;
    },
    render(P, dt) {
      const gl = LUM.gl, F = LUM.frame;
      if (!this.pp || this._w !== F.w || this._h !== F.h) {
        if (this.pp) this.pp.free();
        this.pp = LUM.pingPong(F.w, F.h, LUM.floatRT ? gl.RGBA16F : gl.RGBA8, gl.LINEAR);
        this._w = F.w; this._h = F.h;
      }
      LUM.bindRT(this.pp.a);
      this.warpPrg.use();
      LUM.setCommon(this.warpPrg);
      this.warpPrg.setAll({
        uSelf: this.pp.b.tex,
        uWarpAmt: P.warp, uZoomW: Math.exp(-P.zoom * dt * 3),
        uRotW: P.rotFlow * dt * 3, uDecayW: Math.pow(P.decay, dt * 60),
        uModeW: P.mode, uInject: P.inject
      });
      LUM.fsq();
      LUM.bindRT(LUM.post.sceneRT);
      this.blitPrg.use();
      this.blitPrg.setAll({ uSrc: this.pp.a.tex, uRes: [F.w, F.h] });
      LUM.fsq();
      this.pp.swap();
    }
  });

  /* ============ 12. MANDALA ============ */
  LUM.reg({
    id: 'mandala', name: 'Mandala', cat: 'Fractal', icon: '✾',
    params: [
      { k: 'sym', n: 'Symmetry', min: 3, max: 24, step: 1, def: 10 },
      { k: 'scale', n: 'Pattern Scale', min: 1.5, max: 9, def: 4.2 },
      { k: 'flow', n: 'Flow Speed', min: 0.05, max: 1.5, def: 0.4 },
      { k: 'drive', n: 'Audio Drive', min: 0, max: 1, def: 0.6 },
      { k: 'sharp', n: 'Line Crisp', min: 0, max: 1, def: 0.55 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uSym,uScale2,uFlow,uDrive,uSharp2;',
        'void main(){',
        ' vec2 c=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' float r=length(c);',
        ' float a=atan(c.y,c.x);',
        ' float m=6.2831853/uSym;',
        ' a=mod(a,m);a=abs(a-m*0.5);',
        ' vec2 p=vec2(cos(a),sin(a))*r;',
        ' float t=uTime*uFlow;',
        ' vec2 q=p*uScale2;',
        ' q+=vec2(fbm(q*1.4+t*0.4),fbm(q*1.4-t*0.33))*0.75;',
        ' float ptn=sin(q.x*5.0+t*2.0)+sin(length(q)*8.0-t*2.6)+sin((q.x+q.y)*4.0+t);',
        ' ptn+=band(sat(r*1.15))*uDrive*3.0;',
        ' float w=abs(sin(ptn*1.3));',
        ' float lines=smoothstep(0.55+uSharp2*0.42,1.0,w);',
        ' float glow=exp(-w*2.6)*0.5;',
        ' vec3 col=pal(fract(r*0.65-uTime*0.03)+ptn*0.04)*(lines*1.35+glow*0.55);',
        ' col*=smoothstep(1.35,0.2,r);',
        ' col+=pal(0.04)*exp(-r*4.6)*uBass*0.9;',
        ' col+=pal(0.88)*exp(-abs(r-0.5-uBeatPhase*0.5)*30.0)*max(0.0,1.0-uBeatPhase*1.4)*0.6;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'mandala');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uSym: P.sym, uScale2: P.scale, uFlow: P.flow,
        uDrive: P.drive, uSharp2: P.sharp
      });
      LUM.fsq();
    }
  });
})();
