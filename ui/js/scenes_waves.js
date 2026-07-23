/* Lumina scenes — WAVES pack: Scope Suite, Waveform Tunnel, Harmonograph, Cymatics */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ============ 5. SCOPE SUITE ============ */
  LUM.reg({
    id: 'scope', name: 'Scope Suite', cat: 'Waves', icon: '∿',
    params: [
      { k: 'mode', n: 'Mode', type: 'select', opts: ['Line', 'Lissajous XY', 'Radial'], def: 0 },
      { k: 'gain', n: 'Gain', min: 0.2, max: 2.5, def: 1.0 },
      { k: 'width', n: 'Thickness', min: 0.002, max: 0.05, def: 0.012 },
      { k: 'ghosts', n: 'Ghost Layers', min: 0, max: 3, step: 1, def: 1 },
      { k: 'hueDrift', n: 'Hue Drift', min: 0, max: 1, def: 0.3 },
      { k: 'spin', n: 'Spin', min: -1, max: 1, def: 0 }
    ],
    init() {
      this.prg = LUM.ribbonPrg([
        'uniform float uMode,uGain,uSpin,uGhost;',
        'vec2 path(float t){',
        ' vec2 p;',
        ' if(uMode<0.5){',
        '  p=vec2((t*2.0-1.0)*uAspect*0.92,vwavL(t)*uGain*0.72);',
        ' }else if(uMode<1.5){',
        '  p=vec2(vwavL(t),vwavR(t))*uGain*0.95;',
        ' }else{',
        '  float a=t*6.2831853;',
        '  float x=1.0-abs(2.0*t-1.0);',
        '  float r=0.45+vwavL(x)*uGain*0.4;',
        '  p=vec2(cos(a),sin(a))*r;',
        ' }',
        ' p=vrot(uTime*uSpin*0.4+uGhost*0.35)*p;',
        ' p*=1.0+uGhost*0.06;',
        ' return p;',
        '}'
      ].join('\n'), [
        'uniform float uHueDrift,uGhost;',
        'void main(){',
        ' float edge=pow(sat(1.0-abs(vSide)),1.6);',
        ' float br=(0.75+uEnergy*1.7)/(1.0+uGhost*1.4);',
        ' vec3 c=pal(vT*0.7*uHueDrift+uTime*0.03*uHueDrift+uGhost*0.13)*edge*br;',
        ' c+=vec3(edge*edge)*0.30*br;',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 512, 'scope');
    },
    render(P) {
      LUM.blendAdd();
      this.prg.use();
      LUM.setCommon(this.prg);
      const layers = 1 + Math.round(P.ghosts);
      for (let g = 0; g < layers; g++) {
        this.prg.setAll({
          uMode: P.mode, uGain: P.gain, uWidth: P.width * (1 + g * 0.6),
          uSpin: P.spin, uGhost: g, uHueDrift: P.hueDrift
        });
        this.prg.draw();
      }
      LUM.blendOff();
    }
  });

  /* ============ 6. WAVEFORM TUNNEL ============ */
  LUM.reg({
    id: 'tunnel', name: 'Waveform Tunnel', cat: 'Waves', icon: '◉',
    params: [
      { k: 'speed', n: 'Speed', min: 0.1, max: 3, def: 1.0 },
      { k: 'twist', n: 'Twist', min: -3, max: 3, def: 1.2 },
      { k: 'rings', n: 'Ring Density', min: 0.2, max: 2, def: 0.8 },
      { k: 'spokes', n: 'Spokes', min: 0, max: 24, step: 1, def: 8 },
      { k: 'fog', n: 'Depth Fog', min: 0.2, max: 3, def: 1.0 },
      { k: 'wobble', n: 'Wave Depth', min: 0, max: 1, def: 0.6 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uSpeed2,uTwist,uRingsT,uSpokes,uFogT,uWobble;',
        'void main(){',
        ' vec2 p=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' p+=vec2(sin(uTime*0.4),cos(uTime*0.31))*0.04;',
        ' float r=length(p);',
        ' float a=atan(p.y,p.x);',
        ' float z=0.45/max(r,0.012);',
        ' float zz=z+uTime*uSpeed2*1.6;',
        ' float ang=a/6.2831853+0.5+zz*uTwist*0.03;',
        ' float fx=1.0-abs(2.0*fract(ang)-1.0);',
        ' vec2 w=histWave(fx,fract(z*0.05));',
        ' float wv=(w.x+w.y)*0.5;',
        ' float ringPos=fract(zz*uRingsT);',
        ' float line=exp(-pow(ringPos-0.5+wv*0.34*uWobble,2.0)*110.0);',
        ' vec3 c=pal(fract(zz*0.055)+wv*0.35)*line*(0.55+uEnergy*1.2);',
        ' if(uSpokes>0.5){',
        '  float sp=exp(-pow(fract(ang*uSpokes+wv*0.2*uWobble)-0.5,2.0)*160.0);',
        '  c+=pal(fract(zz*0.055)+0.4)*sp*0.35*(0.4+uMid*1.3)*exp(-z*0.14);',
        ' }',
        ' c*=exp(-z*uFogT*0.16);',
        ' c*=smoothstep(0.008,0.05,r);',
        ' c+=pal(0.92)*exp(-r*4.5)*uBass*0.7;',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'tunnel');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uSpeed2: P.speed, uTwist: P.twist, uRingsT: P.rings,
        uSpokes: P.spokes, uFogT: P.fog, uWobble: P.wobble
      });
      LUM.fsq();
    }
  });

  /* ============ 7. HARMONOGRAPH ============ */
  LUM.reg({
    id: 'harmono', name: 'Harmonograph', cat: 'Waves', icon: '❋',
    params: [
      { k: 'cplx', n: 'Complexity', min: 2, max: 14, def: 7 },
      { k: 'damp', n: 'Damping', min: 0, max: 2.5, def: 0.8 },
      { k: 'speed', n: 'Speed', min: 0.05, max: 1.5, def: 0.4 },
      { k: 'audioRatio', n: 'Pitch Follow', type: 'toggle', def: 1 },
      { k: 'ratA', n: 'Ratio A', min: 1, max: 9, step: 1, def: 3 },
      { k: 'ratB', n: 'Ratio B', min: 1, max: 9, step: 1, def: 5 },
      { k: 'width', n: 'Thickness', min: 0.002, max: 0.03, def: 0.008 },
      { k: 'rot3d', n: '3D Tumble', min: 0, max: 2, def: 0.8 }
    ],
    init() {
      this.prg = LUM.ribbonPrg([
        'uniform float uCplx,uDamp,uSpd,uRatA,uRatB,uZRot;',
        'vec2 path(float t){',
        ' float T=t*6.2831853*uCplx;',
        ' float dmp=exp(-t*uDamp);',
        ' float ph=uTime*uSpd*6.2831853;',
        ' vec3 p3=vec3(',
        '  sin(T*uRatA+ph)+0.5*sin(T*uRatB*0.5+ph*1.31),',
        '  sin(T*uRatB+ph*0.83)+0.5*sin(T*uRatA*1.5+ph*0.7),',
        '  sin(T*(uRatA+uRatB)*0.5+ph*0.57));',
        ' p3*=dmp*0.52;',
        ' float ra=uTime*0.3*uZRot;',
        ' float c1=cos(ra),s1=sin(ra);',
        ' p3.xz=mat2(c1,-s1,s1,c1)*p3.xz;',
        ' float rb=0.5+0.3*sin(uTime*0.17*uZRot);',
        ' float c2=cos(rb),s2=sin(rb);',
        ' p3.yz=mat2(c2,-s2,s2,c2)*p3.yz;',
        ' float persp=1.5/(2.4+p3.z);',
        ' return p3.xy*persp*(1.0+uBass*0.3);',
        '}'
      ].join('\n'), [
        'void main(){',
        ' float edge=pow(sat(1.0-abs(vSide)),1.5);',
        ' float tip=exp(-(1.0-vT)*4.0);',
        ' vec3 c=pal(vT*0.9+uTime*0.02)*edge*(0.55+uEnergy*1.5);',
        ' c+=pal(0.95)*edge*tip*1.3*(0.4+uTreb);',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 1024, 'harmono');
      this._ra = 3; this._rb = 5;
    },
    render(P, dt) {
      const A = LUM.audio;
      let ra = P.ratA, rb = P.ratB;
      if (P.audioRatio > 0.5) {
        const tgtA = 2 + Math.round(A.domNorm * 5);
        const tgtB = 3 + Math.round(A.centroid * 5);
        this._ra += Math.min(1, dt * 1.2) * (tgtA - this._ra);
        this._rb += Math.min(1, dt * 1.2) * (tgtB - this._rb);
        ra = this._ra; rb = this._rb;
      }
      LUM.blendAdd();
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uCplx: P.cplx, uDamp: P.damp, uSpd: P.speed,
        uRatA: ra, uRatB: rb, uWidth: P.width, uZRot: P.rot3d
      });
      this.prg.draw();
      LUM.blendOff();
    }
  });

  /* ============ 8. CYMATICS ============ */
  LUM.reg({
    id: 'cymatics', name: 'Cymatics', cat: 'Waves', icon: '✳',
    params: [
      { k: 'sharp', n: 'Line Sharpness', min: 2, max: 26, def: 12 },
      { k: 'shape', n: 'Plate', type: 'select', opts: ['Square', 'Circular'], def: 1 },
      { k: 'shake', n: 'Bass Shake', min: 0, max: 1, def: 0.5 },
      { k: 'invert', n: 'Invert', type: 'toggle', def: 0 },
      { k: 'follow', n: 'Beat Morph', type: 'toggle', def: 1 },
      { k: 'modeN', n: 'Mode N', min: 1, max: 9, step: 1, def: 3 },
      { k: 'modeM', n: 'Mode M', min: 1, max: 9, step: 1, def: 5 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uSharp,uShape,uShake,uInvert;',
        'uniform float uN1,uM1,uN2,uM2,uBlend;',
        'float chl(vec2 p,float n,float m){',
        ' return cos(n*3.14159265*p.x)*cos(m*3.14159265*p.y)-cos(m*3.14159265*p.x)*cos(n*3.14159265*p.y);',
        '}',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 p=(uv-0.5)*vec2(uAspect,1.0)*1.9;',
        ' p+=(hash22(p+fract(uTime*13.7))*2.0-1.0)*0.006*uShake*uBass;',
        ' float v=mix(chl(p,uN1,uM1),chl(p,uN2,uM2),uBlend);',
        ' float lines=exp(-abs(v)*uSharp);',
        ' float glow=exp(-abs(v)*uSharp*0.22)*0.35;',
        ' float crop=1.0;',
        ' if(uShape>0.5){float r=length(p);crop=smoothstep(1.0,0.96,r);lines*=crop;glow*=crop;',
        '  lines+=exp(-abs(r-0.98)*60.0)*0.5*(0.4+uEnergy);}',
        ' vec3 c=pal(0.45+0.25*sin(v*2.2)+uCentroid*0.3)*lines*(0.7+uMid*1.3);',
        ' c+=pal(0.1)*glow*(0.35+uEnergy*0.9);',
        ' vec3 inv=pal(sat(abs(v)*0.35))*(1.0-exp(-abs(v)*uSharp*0.5))*0.42*(0.4+uEnergy*0.9)*crop;',
        ' c=mix(c,inv,uInvert*0.85);',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'cymatics');
      this._a = [3, 5]; this._b = [4, 7]; this._blend = 1; this._bc = 0;
    },
    render(P, dt) {
      const A = LUM.audio;
      if (P.follow > 0.5) {
        if (A.beatCount !== this._bc && this._blend > 0.7) {
          this._bc = A.beatCount;
          this._a = this._b;
          const n = 1 + Math.round(A.domNorm * 7 + Math.random() * 1.5);
          let m = 1 + Math.round(A.centroid * 6 + Math.random() * 2.5);
          if (m === n) m = n + 1;
          this._b = [Math.min(9, n), Math.min(9, m)];
          this._blend = 0;
        }
        this._blend = Math.min(1, this._blend + dt * 2.2);
      } else {
        this._a = [P.modeN, P.modeM];
        this._b = [P.modeN, P.modeM + 1];
        this._blend = 0.5 + 0.5 * Math.sin(LUM.frame.t * 0.4);
        this._bc = A.beatCount;
      }
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uSharp: P.sharp, uShape: P.shape, uShake: P.shake, uInvert: P.invert,
        uN1: this._a[0], uM1: this._a[1], uN2: this._b[0], uM2: this._b[1], uBlend: this._blend
      });
      LUM.fsq();
    }
  });
})();
