/* Lumina scenes — TEXTURE pack: Voronoi Bloom, Reaction Bloom, Plasma, Retrowave */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ============ 17. VORONOI BLOOM ============ */
  LUM.reg({
    id: 'voronoi', name: 'Voronoi Bloom', cat: 'Texture', icon: '⬡',
    params: [
      { k: 'scale', n: 'Cell Scale', min: 2, max: 16, def: 7 },
      { k: 'speed', n: 'Shimmer', min: 0.1, max: 2.5, def: 0.9 },
      { k: 'border', n: 'Border Width', min: 0.01, max: 0.2, def: 0.06 },
      { k: 'flash', n: 'Beat Wave', min: 0, max: 1, def: 0.65 },
      { k: 'warp', n: 'Warp', min: 0, max: 1, def: 0.3 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uScaleV,uSpeedV,uBorder,uFlash,uWarpV;',
        'void main(){',
        ' vec2 c=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' vec2 p=c*uScaleV;',
        ' p+=vec2(fbm(c*2.0+uTime*0.12),fbm(c*2.0-uTime*0.1))*uWarpV*2.0;',
        ' vec2 ip=floor(p),fp=fract(p);',
        ' float f1=8.0,f2=8.0;vec2 cid=ip;',
        ' for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){',
        '  vec2 g=vec2(float(dx),float(dy));',
        '  vec2 o=hash22(ip+g);',
        '  o=0.5+0.42*sin(uTime*uSpeedV+o*6.2831853);',
        '  vec2 r=g+o-fp;',
        '  float d=dot(r,r);',
        '  if(d<f1){f2=f1;f1=d;cid=ip+g;}else if(d<f2){f2=d;}',
        ' }',
        ' f1=sqrt(f1);f2=sqrt(f2);',
        ' float border=1.0-smoothstep(0.0,uBorder+0.02,f2-f1);',
        ' float cr=hash21(cid*0.713);',
        ' float cellBand=band(fract(cr*0.91));',
        ' vec3 col=pal(cr*0.8+uTime*0.015)*cellBand*(0.35+cellBand*1.0);',
        ' col*=1.0-0.5*sat(f1*1.4);',
        ' col+=pal(0.88)*border*(0.30+uTreb*1.5);',
        ' float wf=uBeatPhase*2.3;',
        ' col+=pal(0.06)*exp(-abs(length(c)-wf)*7.0)*max(0.0,1.0-uBeatPhase*1.35)*uFlash*1.2;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'voronoi');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uScaleV: P.scale, uSpeedV: P.speed, uBorder: P.border,
        uFlash: P.flash, uWarpV: P.warp
      });
      LUM.fsq();
    }
  });

  /* ============ 18. REACTION BLOOM (Gray-Scott) ============ */
  LUM.reg({
    id: 'reaction', name: 'Reaction Bloom', cat: 'Texture', icon: '🜁',
    params: [
      { k: 'pattern', n: 'Pattern', type: 'select', opts: ['Coral', 'Mitosis', 'Worms', 'Solitons', 'Custom'], def: 0 },
      { k: 'feed', n: 'Feed (custom)', min: 0.01, max: 0.09, def: 0.0545 },
      { k: 'kill', n: 'Kill (custom)', min: 0.04, max: 0.07, def: 0.062 },
      { k: 'iters', n: 'Sim Speed', min: 1, max: 6, step: 1, def: 3 },
      { k: 'seedSize', n: 'Beat Seed Size', min: 0.01, max: 0.08, def: 0.032 }
    ],
    init() {
      this.stepPrg = LUM.scenePrg([
        'uniform sampler2D uSelf;',
        'uniform float uFeed,uKill,uSeedOn,uSeedR;',
        'uniform vec2 uSeedPos;',
        'void main(){',
        ' vec2 uvS=gl_FragCoord.xy/uRes;',
        ' vec2 px=1.0/uRes;',
        ' vec2 s=texture(uSelf,uvS).rg;',
        ' vec2 lap=-s;',
        ' lap+=texture(uSelf,uvS+vec2(px.x,0.0)).rg*0.2;',
        ' lap+=texture(uSelf,uvS-vec2(px.x,0.0)).rg*0.2;',
        ' lap+=texture(uSelf,uvS+vec2(0.0,px.y)).rg*0.2;',
        ' lap+=texture(uSelf,uvS-vec2(0.0,px.y)).rg*0.2;',
        ' lap+=texture(uSelf,uvS+px).rg*0.05;',
        ' lap+=texture(uSelf,uvS-px).rg*0.05;',
        ' lap+=texture(uSelf,uvS+vec2(px.x,-px.y)).rg*0.05;',
        ' lap+=texture(uSelf,uvS+vec2(-px.x,px.y)).rg*0.05;',
        ' float A=s.r,B=s.g;',
        ' float rxn=A*B*B;',
        ' float feed=uFeed+(uMid-0.3)*0.0045;',
        ' float kill=uKill+(uTreb-0.3)*0.0018;',
        ' float nA=A+(lap.r-rxn+feed*(1.0-A));',
        ' float nB=B+(0.5*lap.g+rxn-(kill+feed)*B);',
        ' if(uSeedOn>0.5){',
        '  vec2 d=(uvS-uSeedPos)*vec2(uAspect,1.0);',
        '  if(dot(d,d)<uSeedR*uSeedR)nB=0.85;',
        ' }',
        ' fragColor=vec4(clamp(nA,0.0,1.0),clamp(nB,0.0,1.0),0.0,1.0);',
        '}'
      ].join('\n'), 'reaction.step');
      this.showPrg = LUM.scenePrg([
        'uniform sampler2D uRD;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 s=texture(uRD,uv).rg;',
        ' float v=sat(s.g*2.4);',
        ' vec3 c=pal(v*0.8+0.04)*pow(v,0.65)*1.6;',
        ' c+=pal(0.92)*pow(v,3.5)*0.9;',
        ' c+=pal(0.35)*sat(1.0-s.r)*0.10;',
        ' c*=0.4+uEnergy*1.0;',
        ' fragColor=vec4(c,1.0);',
        '}'
      ].join('\n'), 'reaction.show');
      this.pp = null;
      this._seedFrames = 0; this._seedPos = [0.5, 0.5]; this._bc = 0;
    },
    _alloc() {
      const gl = LUM.gl;
      if (this.pp) this.pp.free();
      const W = 480, H = 300;
      const fmt = LUM.floatRT ? gl.RGBA32F : gl.RGBA8;
      this.pp = LUM.pingPong(W, H, fmt, gl.NEAREST);
      /* wrap for neighbor sampling */
      [this.pp.a.tex, this.pp.b.tex].forEach(t => {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      });
      if (LUM.floatRT) {
        const seed = new Float32Array(W * H * 4);
        for (let i = 0; i < W * H; i++) { seed[i * 4] = 1; }
        for (let k = 0; k < 14; k++) {
          const cx = Math.floor(Math.random() * W), cy = Math.floor(Math.random() * H), r = 3 + Math.random() * 5;
          for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
            if (x * x + y * y > r * r) continue;
            const px = ((cx + x) % W + W) % W, py = ((cy + y) % H + H) % H;
            seed[(py * W + px) * 4 + 1] = 0.9;
          }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.pp.b.tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.FLOAT, seed);
      }
      this._w = W; this._h = H;
    },
    render(P) {
      const A = LUM.audio;
      if (!this.pp) this._alloc();
      if (A.beatCount !== this._bc) {
        this._bc = A.beatCount;
        this._seedFrames = 2;
        this._seedPos = [0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7];
      }
      const FK = [[0.0545, 0.062], [0.0367, 0.0649], [0.046, 0.063], [0.03, 0.062]];
      const pi = Math.round(P.pattern);
      const feed = pi < 4 ? FK[pi][0] : P.feed;
      const kill = pi < 4 ? FK[pi][1] : P.kill;
      const iters = Math.round(P.iters) * 4;
      for (let i = 0; i < iters; i++) {
        LUM.bindRT(this.pp.a);
        this.stepPrg.use();
        LUM.setCommon(this.stepPrg);
        this.stepPrg.set('uRes', [this._w, this._h]);
        this.stepPrg.setAll({
          uSelf: this.pp.b.tex, uFeed: feed, uKill: kill,
          uSeedOn: this._seedFrames > 0 ? 1 : 0, uSeedR: P.seedSize, uSeedPos: this._seedPos
        });
        LUM.fsq();
        this.pp.swap();
        if (this._seedFrames > 0) this._seedFrames--;
      }
      LUM.bindRT(LUM.renderRT || LUM.post.sceneRT);
      this.showPrg.use();
      LUM.setCommon(this.showPrg);
      this.showPrg.set('uRD', this.pp.b.tex);
      LUM.fsq();
    }
  });

  /* ============ 19. PLASMA ============ */
  LUM.reg({
    id: 'plasma', name: 'Plasma', cat: 'Texture', icon: '〰',
    params: [
      { k: 'scale', n: 'Scale', min: 1, max: 8, def: 3.2 },
      { k: 'speed', n: 'Speed', min: 0.1, max: 2.5, def: 0.8 },
      { k: 'warp', n: 'Warp', min: 0, max: 2, def: 0.8 },
      { k: 'contour', n: 'Contours', min: 0, max: 1, def: 0.4 },
      { k: 'react', n: 'Audio React', min: 0, max: 1, def: 0.6 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uScaleP,uSpeedPl,uWarpP,uContour,uReact;',
        'void main(){',
        ' vec2 c=(gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0);',
        ' float t=uTime*uSpeedPl;',
        ' vec2 p=c*uScaleP;',
        ' p+=uWarpP*vec2(fbm(p*0.8+t*0.25),fbm(p*0.8-t*0.2))*1.5;',
        ' float v=sin(p.x*1.4+t)+sin(p.y*1.1-t*0.8)+sin((p.x+p.y)*0.9+t*0.5);',
        ' v+=sin(length(p)*1.8-t*1.3);',
        ' v+=uReact*(uBass*2.2*sin(length(c)*5.0-t*2.0)+uCentroid*1.5*sin(p.x*2.5+t));',
        ' v*=0.5;',
        ' vec3 col=pal(v*0.45+t*0.02)*(0.42+0.38*sin(v*3.14159+t*0.7));',
        ' col*=0.5+uEnergy*1.15;',
        ' col+=pal(0.9)*pow(sat(sin(v*6.2831)),16.0)*uContour*(0.5+uMid);',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'plasma');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uScaleP: P.scale, uSpeedPl: P.speed, uWarpP: P.warp,
        uContour: P.contour, uReact: P.react
      });
      LUM.fsq();
    }
  });

  /* ============ 20. RETROWAVE ============ */
  LUM.reg({
    id: 'retro', name: 'Retrowave', cat: 'Texture', icon: '🌅',
    params: [
      { k: 'grid', n: 'Grid Scale', min: 2, max: 14, def: 6 },
      { k: 'speed', n: 'Drive Speed', min: 0.05, max: 1.2, def: 0.35 },
      { k: 'sun', n: 'Sun Size', min: 0.08, max: 0.3, def: 0.17 },
      { k: 'mtn', n: 'Mountains', min: 0, max: 1, def: 0.6 },
      { k: 'glow', n: 'Neon Glow', min: 0, max: 1, def: 0.7 },
      { k: 'stars', n: 'Stars', min: 0, max: 1, def: 0.6 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uGridSc,uSpeedR,uSunSz,uMtn,uGlowR,uStars;',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' const float HOR=0.44;',
        ' vec3 col=vec3(0.0);',
        ' float sunR=uSunSz*(1.0+uBass*0.15);',
        ' vec2 sunC=vec2(0.5,HOR+sunR*0.62);',
        ' if(uv.y<HOR){',
        '  float py=HOR-uv.y+0.0006;',
        '  float z=0.06/py;',
        '  vec2 gp=vec2((uv.x-0.5)*z*2.4*uAspect,z+uTime*uSpeedR*2.0);',
        '  float gx=abs(fract(gp.x*uGridSc)-0.5);',
        '  float gz=abs(fract(gp.y*uGridSc)-0.5);',
        '  float wx=fwidth(gp.x*uGridSc)*1.5+0.015;',
        '  float wz=fwidth(gp.y*uGridSc)*1.5+0.015;',
        '  float g=max(1.0-smoothstep(0.0,wx,gx),1.0-smoothstep(0.0,wz,gz));',
        '  float pulse=band(sat(z*0.35));',
        '  vec3 gcol=mix(pal(0.62),pal(0.85),sat(z*0.28));',
        '  col+=gcol*g*(0.35+uBass*1.4+pulse*0.9)*exp(-z*0.09);',
        '  col+=pal(0.1)*exp(-py*22.0)*0.55;',
        '  col+=pal(0.05)*exp(-abs(uv.x-0.5)*8.0)*exp(-py*9.0)*0.6;',
        ' }else{',
        '  float dy=uv.y-HOR;',
        '  col=mix(pal(0.72)*0.34,pal(0.98)*0.03,sat(dy*2.6));',
        '  vec2 sg=uv*vec2(uAspect,1.0)*vec2(110.0,70.0);',
        '  float sr=hash21(floor(sg));',
        '  float tw=0.5+0.5*sin(uTime*3.0+sr*44.0);',
        '  col+=vec3(1.0)*smoothstep(0.986,0.999,sr)*tw*uStars*(0.25+uTreb*1.3)*sat(dy*4.5);',
        '  float d=length((uv-sunC)*vec2(uAspect,1.0));',
        '  float slice=sin((uv.y-HOR)*150.0-uTime*2.5);',
        '  float sliceGate=smoothstep(-0.25,0.35,slice+(uv.y-sunC.y)*16.0);',
        '  float sun=(1.0-smoothstep(sunR*0.97,sunR,d))*sliceGate;',
        '  vec3 sunCol=mix(pal(0.02),pal(0.15),sat((uv.y-HOR)/(sunR*1.3)));',
        '  col=mix(col,sunCol*1.4,sun);',
        '  col+=pal(0.06)*exp(-max(d-sunR,0.0)*8.0)*0.55*uGlowR;',
        '  float ridge=HOR+uMtn*0.20*max(fbm(vec2(uv.x*4.1,3.7))-0.30,0.0);',
        '  float ridge2=HOR+uMtn*0.115*max(fbm(vec2(uv.x*6.3+9.0,8.2))-0.32,0.0);',
        '  if(uv.y<ridge){',
        '   col*=0.06;',
        '   col+=pal(0.9)*exp(-(ridge-uv.y)*46.0)*0.95*uGlowR*(0.5+uMid*0.9);',
        '  }else if(uv.y<ridge2){',
        '   col*=0.18;',
        '   col+=pal(0.8)*exp(-(ridge2-uv.y)*55.0)*0.5*uGlowR;',
        '  }',
        ' }',
        ' col+=pal(0.9)*uBeat*0.06;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'retro');
    },
    render(P) {
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uGridSc: P.grid, uSpeedR: P.speed, uSunSz: P.sun,
        uMtn: P.mtn, uGlowR: P.glow, uStars: P.stars
      });
      LUM.fsq();
    }
  });
})();
