/* Lumina scenes — MOTION pack: Particle Nebula, Ink Flow, Hyperdrive, Metaballs */
(function () {
  'use strict';
  const LUM = window.LUM;

  const CURL = [
    'vec2 curl2(vec2 p){float e=0.09;',
    ' float a=fbm(p+vec2(0.0,e)),b=fbm(p-vec2(0.0,e)),c=fbm(p+vec2(e,0.0)),d=fbm(p-vec2(e,0.0));',
    ' return vec2(a-b,d-c)/(2.0*e);}'
  ].join('\n');

  /* ============ 13. PARTICLE NEBULA ============ */
  LUM.reg({
    id: 'particles', name: 'Particle Nebula', cat: 'Motion', icon: '✦',
    params: [
      { k: 'density', n: 'Particles', type: 'select', opts: ['16k', '37k', '65k'], def: 1 },
      { k: 'flowScale', n: 'Flow Scale', min: 0.5, max: 4, def: 1.6 },
      { k: 'speed', n: 'Flow Speed', min: 0.2, max: 4, def: 1.5 },
      { k: 'burst', n: 'Beat Burst', min: 0, max: 1, def: 0.6 },
      { k: 'attract', n: 'Gravity', min: 0, max: 1, def: 0.22 },
      { k: 'size', n: 'Size', min: 1, max: 7, def: 2.6 },
      { k: 'colMode', n: 'Color By', type: 'select', opts: ['Velocity', 'Identity', 'Radius'], def: 0 }
    ],
    init() {
      this.simPrg = LUM.scenePrg([
        'uniform sampler2D uSim;',
        'uniform float uDt2,uFlowScale,uSpeedP,uBurst,uAttract;',
        CURL,
        'void main(){',
        ' ivec2 ij=ivec2(gl_FragCoord.xy);',
        ' vec4 s=texelFetch(uSim,ij,0);',
        ' vec2 pos=s.xy,vel=s.zw;',
        ' float id=hash21(vec2(ij)*0.173+0.31);',
        ' vec2 fl=curl2(pos*uFlowScale+vec2(uTime*0.13,-uTime*0.09));',
        ' vel+=fl*uSpeedP*uDt2*(0.55+0.9*id);',
        ' vel-=pos*uAttract*uDt2*(0.4+uBass*2.2);',
        ' vec2 dir=pos/max(length(pos),1e-3);',
        ' vel+=dir*uBurst*uDt2*(0.4+id*1.3);',
        ' vel*=exp(-uDt2*1.7);',
        ' pos+=vel*uDt2;',
        ' pos=mod(pos+1.3,2.6)-1.3;',
        ' fragColor=vec4(pos,vel);',
        '}'
      ].join('\n'), 'particles.sim');

      const vs = [
        '#version 300 es',
        'precision highp float;',
        'uniform sampler2D uSim;',
        'uniform float uAspect,uSizeP,uTrebV,uSimN,uEnergyV;',
        'out float vSpd;out float vId;out float vRad;',
        'void main(){',
        ' int n=int(uSimN);',
        ' ivec2 ij=ivec2(gl_VertexID%n,gl_VertexID/n);',
        ' vec4 s=texelFetch(uSim,ij,0);',
        ' vSpd=length(s.zw);',
        ' vId=float(gl_VertexID)/float(n*n);',
        ' vRad=length(s.xy);',
        ' gl_Position=vec4(s.xy/vec2(uAspect,1.0),0.0,1.0);',
        ' gl_PointSize=uSizeP*(0.5+min(vSpd*1.6,2.0)+uTrebV*1.8);',
        '}'
      ].join('\n');
      const fs = LUM.PRELUDE + [
        'in float vSpd;in float vId;in float vRad;',
        'uniform float uColMode,uSimN;',
        'void main(){',
        ' vec2 pc=gl_PointCoord*2.0-1.0;',
        ' float d2=dot(pc,pc);',
        ' if(d2>1.0)discard;',
        ' float fal=exp(-d2*3.2);',
        ' float ct=(uColMode<0.5)?fract(vSpd*0.9+0.05):((uColMode<1.5)?fract(vId*0.83):fract(vRad*0.7));',
        ' vec3 c=pal(ct)*fal*(0.09+uEnergy*0.32)*(150.0/uSimN);',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n');
      this.drawPrg = LUM.prog(vs, fs, 'particles.draw');
      this.pp = null; this._res = 0;
    },
    _alloc(res) {
      const gl = LUM.gl;
      if (this.pp) this.pp.free();
      const fmt = LUM.floatRT ? gl.RGBA32F : gl.RGBA8;
      this.pp = LUM.pingPong(res, res, fmt, gl.NEAREST);
      const seed = new Float32Array(res * res * 4);
      for (let i = 0; i < res * res; i++) {
        seed[i * 4] = (Math.random() * 2 - 1) * 1.1;
        seed[i * 4 + 1] = (Math.random() * 2 - 1) * 1.1;
        seed[i * 4 + 2] = 0; seed[i * 4 + 3] = 0;
      }
      gl.bindTexture(gl.TEXTURE_2D, this.pp.b.tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, res, res, gl.RGBA, LUM.floatRT ? gl.FLOAT : gl.UNSIGNED_BYTE,
        LUM.floatRT ? seed : new Uint8Array(seed.length));
      this._res = res;
    },
    render(P, dt) {
      const gl = LUM.gl, A = LUM.audio;
      const res = [128, 192, 256][Math.round(P.density)] || 192;
      if (!this.pp || this._res !== res) this._alloc(res);
      const sdt = Math.min(dt, 0.033);

      LUM.bindRT(this.pp.a);
      this.simPrg.use();
      LUM.setCommon(this.simPrg);
      this.simPrg.set('uRes', [res, res]);
      this.simPrg.setAll({
        uSim: this.pp.b.tex, uDt2: sdt, uFlowScale: P.flowScale,
        uSpeedP: P.speed, uBurst: A.beatPulse * P.burst * 4.5, uAttract: P.attract
      });
      LUM.fsq();

      LUM.bindRT(LUM.post.sceneRT);
      LUM.blendAdd();
      this.drawPrg.use();
      LUM.setCommon(this.drawPrg);
      this.drawPrg.setAll({
        uSim: this.pp.a.tex, uSizeP: P.size, uTrebV: A.treb,
        uSimN: res, uColMode: P.colMode, uEnergyV: A.energy
      });
      gl.drawArrays(gl.POINTS, 0, res * res);
      LUM.blendOff();
      this.pp.swap();
    }
  });

  /* ============ 14. INK FLOW ============ */
  LUM.reg({
    id: 'ink', name: 'Ink Flow', cat: 'Motion', icon: '☁',
    params: [
      { k: 'decay', n: 'Persistence', min: 0.9, max: 0.997, def: 0.985 },
      { k: 'swirl', n: 'Swirl', min: 0.2, max: 4, def: 1.6 },
      { k: 'scale', n: 'Flow Scale', min: 0.6, max: 5, def: 2.2 },
      { k: 'inject', n: 'Dye Amount', min: 0.2, max: 2.5, def: 1.1 },
      { k: 'bassWarp', n: 'Bass Vortex', min: 0, max: 1, def: 0.6 }
    ],
    init() {
      this.stepPrg = LUM.scenePrg([
        'uniform sampler2D uSelf;',
        'uniform float uDecayI,uSwirl,uScaleI,uInjectI,uBassWarp;',
        CURL,
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 c=(uv-0.5)*vec2(uAspect,1.0);',
        ' vec2 fl=curl2(c*uScaleI+vec2(uTime*0.11,-uTime*0.07))*uSwirl;',
        ' fl+=vec2(-c.y,c.x)*uBass*1.4*uBassWarp;',
        ' fl-=(c/max(length(c),1e-3))*uBeat*0.6*uBassWarp;',
        ' vec2 back=uv-fl*uDt*0.38/vec2(uAspect,1.0);',
        ' vec3 d=texture(uSelf,back).rgb*uDecayI;',
        ' for(int k=0;k<3;k++){',
        '  float fk=float(k);',
        '  float ang=uTime*(0.31+fk*0.17)+fk*2.094;',
        '  vec2 ep=vec2(cos(ang),sin(ang*1.27+fk))*(0.30+0.20*sin(uTime*0.23+fk*2.0));',
        '  float amp=(k==0)?uBass:((k==1)?uMid:uTreb);',
        '  float dd=length(c-ep);',
        '  d+=pal(fk*0.31+uTime*0.02)*exp(-dd*dd*320.0)*amp*uInjectI*1.5;',
        ' }',
        ' fragColor=vec4(min(d,vec3(3.5)),1.0);',
        '}'
      ].join('\n'), 'ink.step');
      this.showPrg = LUM.scenePrg([
        'uniform sampler2D uDye;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec3 d=texture(uDye,uv).rgb;',
        ' float lum=dot(d,vec3(0.3333));',
        ' vec3 c=d*0.9+pal(fract(lum*0.45+uTime*0.012))*lum*0.28;',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'ink.show');
      this.pp = null; this._w = 0;
    },
    render(P) {
      const gl = LUM.gl, F = LUM.frame;
      const w = Math.max(4, F.w >> 1), h = Math.max(4, F.h >> 1);
      if (!this.pp || this._w !== w || this._h !== h) {
        if (this.pp) this.pp.free();
        this.pp = LUM.pingPong(w, h, LUM.floatRT ? gl.RGBA16F : gl.RGBA8, gl.LINEAR);
        this._w = w; this._h = h;
      }
      LUM.bindRT(this.pp.a);
      this.stepPrg.use();
      LUM.setCommon(this.stepPrg);
      this.stepPrg.set('uRes', [w, h]);
      this.stepPrg.setAll({
        uSelf: this.pp.b.tex, uDecayI: P.decay, uSwirl: P.swirl,
        uScaleI: P.scale, uInjectI: P.inject, uBassWarp: P.bassWarp
      });
      LUM.fsq();
      LUM.bindRT(LUM.post.sceneRT);
      this.showPrg.use();
      LUM.setCommon(this.showPrg);
      this.showPrg.set('uDye', this.pp.a.tex);
      LUM.fsq();
      this.pp.swap();
    }
  });

  /* ============ 15. HYPERDRIVE ============ */
  LUM.reg({
    id: 'hyper', name: 'Hyperdrive', cat: 'Motion', icon: '➤',
    params: [
      { k: 'dens', n: 'Star Density', min: 8, max: 48, step: 1, def: 24 },
      { k: 'speed', n: 'Warp Speed', min: 0.05, max: 1.2, def: 0.35 },
      { k: 'streak', n: 'Streaking', min: 0, max: 1, def: 0.55 },
      { k: 'nebula', n: 'Nebula', min: 0, max: 1, def: 0.5 },
      { k: 'twist', n: 'Twist', min: -2, max: 2, def: 0.4 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uDens,uSpeedH,uStreak,uNebula,uTwistH;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 c=(uv-0.5)*vec2(uAspect,1.0);',
        ' c=rot(uTime*0.05*uTwistH)*c;',
        ' float r=length(c)+1e-3;',
        ' float a=atan(c.y,c.x);',
        ' float spd=uSpeedH*(0.3+uEnergy*2.2+uBeat*1.0);',
        ' vec3 col=vec3(0.0);',
        ' for(int L=0;L<3;L++){',
        '  float fl=float(L);',
        '  float z=0.4/r+uTime*spd*(1.0+fl*0.55)*3.0;',
        '  float na=floor(uDens+fl*10.0);',
        '  vec2 g=vec2((a/6.2831853+0.5)*na,z*1.6);',
        '  vec2 id=floor(g);',
        '  vec2 f=fract(g)-0.5;',
        '  float rn=hash21(id+fl*17.31);',
        '  if(rn>0.4)continue;',
        '  vec2 sp=(hash22(id+fl*31.7)-0.5)*0.66;',
        '  vec2 dv=f-sp;',
        '  float sx=0.0022;',
        '  float sy=0.0022+uStreak*0.09*min(spd,1.5);',
        '  float br=exp(-dv.x*dv.x/sx-dv.y*dv.y/sy);',
        '  br*=sat(r*2.4)*(0.4+rn*2.0);',
        '  col+=pal(rn*2.1+fl*0.28)*br;',
        ' }',
        ' col*=smoothstep(0.0,0.1,r);',
        ' float nb=fbm(c*2.4+vec2(uTime*0.04,-uTime*0.028));',
        ' col+=pal(nb*0.9+0.05)*nb*nb*uNebula*0.55*(0.5+uMid);',
        ' col+=pal(0.9)*uBeat*0.10;',
        ' col+=pal(0.55)*exp(-r*3.2)*uBass*0.35;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'hyper');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uDens: P.dens, uSpeedH: P.speed, uStreak: P.streak,
        uNebula: P.nebula, uTwistH: P.twist
      });
      LUM.fsq();
    }
  });

  /* ============ 16. METABALLS ============ */
  LUM.reg({
    id: 'metaballs', name: 'Metaballs', cat: 'Motion', icon: '●',
    params: [
      { k: 'count', n: 'Blobs', min: 3, max: 12, step: 1, def: 8 },
      { k: 'goo', n: 'Gooeyness', min: 0.05, max: 0.6, def: 0.19 },
      { k: 'size', n: 'Size', min: 0.4, max: 1.8, def: 0.72 },
      { k: 'speed', n: 'Speed', min: 0.1, max: 2, def: 0.7 },
      { k: 'edge', n: 'Edge Glow', min: 4, max: 60, def: 34 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uCountM,uGoo,uSizeM,uSpeedM,uEdge;',
        'float field(vec2 p){',
        ' float d=1e9;',
        ' for(int i=0;i<12;i++){',
        '  if(float(i)>=uCountM)break;',
        '  float fi=float(i);',
        '  float amp=(i==0)?uBass:((i<5)?uMid:uTreb);',
        '  float sp=uSpeedM*(0.4+fi*0.1);',
        '  vec2 bp=vec2(sin(uTime*sp+fi*2.39),cos(uTime*sp*1.17+fi*1.73))*(0.14+0.5*fract(fi*0.373));',
        '  if(i==0)bp*=0.25;',
        '  float rad=uSizeM*(0.08+0.13*fract(fi*0.61))*(0.6+amp*1.25);',
        '  float dd=length(p-bp)-rad;',
        '  d=smin(d,dd,uGoo);',
        ' }',
        ' return d;',
        '}',
        'void main(){',
        ' vec2 c=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' float d=field(c);',
        ' float inside=smoothstep(0.012,-0.012,d);',
        ' float edge=exp(-abs(d)*uEdge);',
        ' float depth=sat(-d*2.6);',
        ' vec3 base=pal(0.10+depth*0.5+uTime*0.015);',
        ' vec3 col=base*inside*(0.20+depth*0.55+uEnergy*0.35);',
        ' col+=pal(0.82+uTreb*0.1)*edge*(0.5+uTreb*1.2);',
        ' col+=pal(0.5)*exp(-abs(d)*5.0)*0.08;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'metaballs');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uCountM: P.count, uGoo: P.goo, uSizeM: P.size,
        uSpeedM: P.speed, uEdge: P.edge
      });
      LUM.fsq();
    }
  });
})();
