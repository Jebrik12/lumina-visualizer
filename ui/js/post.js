/* Lumina — post-processing chain: feedback trails → bloom (2 levels) → composite
   (lens/warp/glitch/VHS displacement, CA, exposure, tonemap, temp/tint, curves,
    grain engine, film dirt, posterize+dither, scanlines, vignette) */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  const PRE = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes;uniform float uAspect;',
    'out vec4 fragColor;',
    'float phash(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+vec2(19.19));return fract(p.x*p.y);}',
    'float pnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    ' float a=phash(i),b=phash(i+vec2(1,0)),c=phash(i+vec2(0,1)),d=phash(i+vec2(1,1));',
    ' return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
    'vec3 hueRot(vec3 c,float a){',
    ' const mat3 toYIQ=mat3(0.299,0.596,0.211,0.587,-0.274,-0.523,0.114,-0.322,0.312);',
    ' const mat3 toRGB=mat3(1.0,1.0,1.0,0.956,-0.272,-1.106,0.621,-0.647,1.703);',
    ' vec3 yiq=toYIQ*c;float h=atan(yiq.z,yiq.y)+a;float l=length(yiq.yz);',
    ' yiq.y=l*cos(h);yiq.z=l*sin(h);return toRGB*yiq;}',
    ''
  ].join('\n');

  const FB_FS = PRE + [
    'uniform sampler2D uScene,uPrev;',
    'uniform float uTrail,uFbRot,uFbZoom;uniform vec2 uFbShift;uniform float uFbHue;',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;',
    ' vec2 c=uv-0.5;c.x*=uAspect;',
    ' float cs=cos(uFbRot),sn=sin(uFbRot);',
    ' c=mat2(cs,-sn,sn,cs)*c;',
    ' c*=uFbZoom;',
    ' c.x/=uAspect;',
    ' vec2 uv2=c+0.5+uFbShift;',
    ' vec3 prev=texture(uPrev,uv2).rgb;',
    ' vec2 msk=step(vec2(0.0),uv2)*step(uv2,vec2(1.0));',
    ' prev*=msk.x*msk.y;',
    ' if(abs(uFbHue)>0.0001)prev=max(hueRot(prev,uFbHue),0.0);',
    ' vec3 scene=texture(uScene,uv).rgb;',
    ' vec3 col=scene+prev*uTrail;',
    ' fragColor=vec4(min(col,vec3(6.0)),1.0);',
    '}'
  ].join('\n');

  const BRIGHT_FS = PRE + [
    'uniform sampler2D uSrc;uniform float uThr;',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;',
    ' vec3 c=texture(uSrc,uv).rgb;',
    ' float l=dot(c,vec3(0.2126,0.7152,0.0722));',
    ' fragColor=vec4(c*smoothstep(uThr,uThr+0.55,l),1.0);',
    '}'
  ].join('\n');

  const BLUR_FS = PRE + [
    'uniform sampler2D uSrc;uniform vec2 uDir;uniform float uRadius;',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;',
    ' vec2 px=uDir*uRadius/uRes;',
    ' vec3 c=texture(uSrc,uv).rgb*0.227027;',
    ' c+=texture(uSrc,uv+px*1.3846154).rgb*0.3162162;',
    ' c+=texture(uSrc,uv-px*1.3846154).rgb*0.3162162;',
    ' c+=texture(uSrc,uv+px*3.2307692).rgb*0.0702703;',
    ' c+=texture(uSrc,uv-px*3.2307692).rgb*0.0702703;',
    ' fragColor=vec4(c,1.0);',
    '}'
  ].join('\n');

  const COMP_FS = PRE + [
    'uniform sampler2D uSrc,uBloom1,uBloom2;',
    'uniform float uBloomAmt,uCA,uGrain,uVig,uScan,uPixel,uKaleido,uMirror,uHue,uSatur,uContrast,uGammaAdj,uExpo,uFade,uT;',
    'uniform float uEnergyA,uBassA,uBeatA,uBeatPh;',
    'uniform float uGrainSize,uGrainType,uGrainReact,uDirt,uPoster,uDither;',
    'uniform float uGlitch,uGlitchBeat,uVhs,uVhsJit,uLens,uWarpA,uWarpReact;',
    'uniform float uExposure,uTemp,uTint,uCurveB,uCurveS,uCurveH,uCurveW,uSCurve;',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;',
    ' float glitchShift=0.0;',
    ' float vhsBand=0.0;',
    ' /* lens distortion */',
    ' if(abs(uLens)>0.002){',
    '  vec2 cc=uv-0.5;cc.x*=uAspect;',
    '  float r2=dot(cc,cc);',
    '  cc*=1.0+uLens*r2*0.85;',
    '  cc.x/=uAspect;uv=cc+0.5;',
    ' }',
    ' /* wavy warp displacement */',
    ' if(uWarpA>0.002){',
    '  float wAmp=uWarpA*(1.0-uWarpReact+uWarpReact*(0.25+uEnergyA*1.5));',
    '  uv+=(vec2(pnoise(uv*3.0+vec2(uT*0.31,0.0)),pnoise(uv*3.0+vec2(7.7,uT*0.27)))-0.5)*0.09*wAmp;',
    ' }',
    ' /* block glitch */',
    ' if(uGlitch>0.002){',
    '  float seed=floor(uT*8.0);',
    '  float gAmt=uGlitch*((uGlitchBeat>0.5)?uBeatA:(0.3+0.7*uEnergyA));',
    '  float rows=mix(9.0,28.0,phash(vec2(seed,3.7)));',
    '  float row=floor(uv.y*rows);',
    '  float rnd=phash(vec2(row,seed));',
    '  if(rnd>1.0-0.4*gAmt){',
    '   float sh=(phash(vec2(row,seed+13.0))-0.5)*0.22*gAmt;',
    '   uv.x+=sh;',
    '   glitchShift=abs(sh)*0.55;',
    '  }',
    ' }',
    ' /* VHS tracking band + line jitter */',
    ' if(uVhs>0.002){',
    '  float bandPos=fract(uT*0.11);',
    '  vhsBand=smoothstep(0.06,0.0,abs(uv.y-bandPos))*uVhs;',
    '  uv.x+=vhsBand*0.025*sin(uT*47.0);',
    ' }',
    ' if(uVhsJit>0.002){',
    '  uv.x+=(phash(vec2(floor(uv.y*uRes.y*0.5),floor(uT*24.0)))-0.5)*0.006*uVhsJit;',
    ' }',
    ' uv=clamp(uv,0.0,1.0);',
    ' /* pixelate */',
    ' if(uPixel>0.5){float cells=uPixel;vec2 g=vec2(cells*uAspect,cells);uv=(floor(uv*g)+0.5)/g;}',
    ' /* mirror */',
    ' if(uMirror>0.5&&uMirror<1.5)uv.x=0.5-abs(uv.x-0.5);',
    ' else if(uMirror>1.5&&uMirror<2.5)uv.y=0.5-abs(uv.y-0.5);',
    ' else if(uMirror>2.5){uv.x=0.5-abs(uv.x-0.5);uv.y=0.5-abs(uv.y-0.5);}',
    ' /* kaleidoscope */',
    ' if(uKaleido>0.5){',
    '  vec2 c=uv-0.5;c.x*=uAspect;',
    '  float r=length(c),a=atan(c.y,c.x);',
    '  float m=6.2831853/uKaleido;',
    '  a=mod(a,m);a=abs(a-m*0.5);',
    '  vec2 k=vec2(cos(a),sin(a))*r;k.x/=uAspect;',
    '  uv=clamp(k+0.5,0.0,1.0);',
    ' }',
    ' /* chromatic sampling (CA + VHS bleed + glitch split) */',
    ' vec2 dir=uv-0.5;',
    ' float caEff=uCA+uVhs*0.006+glitchShift;',
    ' vec3 col;',
    ' if(caEff>0.0001){',
    '  col.r=texture(uSrc,uv+dir*caEff+vec2(glitchShift*0.5,0.0)).r;',
    '  col.g=texture(uSrc,uv).g;',
    '  col.b=texture(uSrc,uv-dir*caEff-vec2(glitchShift*0.5,0.0)).b;',
    ' } else col=texture(uSrc,uv).rgb;',
    ' /* bloom */',
    ' if(uBloomAmt>0.001){',
    '  vec3 bl=texture(uBloom1,uv).rgb*0.7+texture(uBloom2,uv).rgb*0.8;',
    '  col+=bl*uBloomAmt;',
    ' }',
    ' /* exposure (linear) + tonemap */',
    ' col*=exp2(uExposure);',
    ' col=vec3(1.0)-exp(-col*uExpo);',
    ' /* saturation + hue */',
    ' float l=dot(col,vec3(0.2126,0.7152,0.0722));',
    ' col=mix(vec3(l),col,uSatur);',
    ' if(abs(uHue)>0.0001)col=hueRot(col,uHue);',
    ' /* temperature / tint */',
    ' if(abs(uTemp)>0.001||abs(uTint)>0.001){',
    '  col*=vec3(1.0+uTemp*0.28-uTint*0.08,1.0+uTint*0.22,1.0-uTemp*0.28-uTint*0.08);',
    ' }',
    ' /* contrast */',
    ' col=(col-0.5)*uContrast+0.5;',
    ' /* parametric curves */',
    ' float lum=dot(clamp(col,0.0,1.0),vec3(0.2126,0.7152,0.0722));',
    ' float shadM=(1.0-lum)*(1.0-lum);',
    ' float highM=lum*lum;',
    ' col+=uCurveB*0.28*(1.0-col);',
    ' col*=1.0+uCurveS*0.55*shadM;',
    ' col*=1.0+uCurveH*0.55*highM;',
    ' col*=1.0+uCurveW*0.4;',
    ' col=clamp(col,0.0,1.0);',
    ' if(uSCurve>0.001)col=mix(col,col*col*(3.0-2.0*col),uSCurve);',
    ' /* gamma */',
    ' col=pow(max(col,0.0),vec3(1.0/uGammaAdj));',
    ' /* scanlines + vignette */',
    ' if(uScan>0.001)col*=1.0-uScan*0.45*(0.5+0.5*sin(gl_FragCoord.y*3.14159265));',
    ' float d=length((gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0))/max(uAspect,1.0)*1.55;',
    ' col*=1.0-uVig*smoothstep(0.45,1.15,d);',
    ' /* VHS tracking band overlay */',
    ' if(vhsBand>0.001){',
    '  float bn=phash(vec2(gl_FragCoord.y*0.7,floor(uT*60.0)));',
    '  col=mix(col,vec3(dot(col,vec3(0.333)))*0.65+bn*0.5,vhsBand*0.55);',
    ' }',
    ' /* film dirt: dust specks + hairs */',
    ' if(uDirt>0.002){',
    '  vec2 cell=vec2(26.0,16.0);',
    '  vec2 dc=floor(uv*cell+floor(uT*9.0)*vec2(0.37,0.71));',
    '  float ds=phash(dc);',
    '  if(ds>1.0-0.05*uDirt){',
    '   vec2 sc=vec2(fract(ds*57.31),fract(ds*113.97));',
    '   vec2 lp=fract(uv*cell)-sc;',
    '   float hair=step(0.72,phash(dc+0.7));',
    '   lp.x*=mix(1.0,7.0,hair);',
    '   lp.y*=mix(1.0,0.8,hair);',
    '   float spk=smoothstep(0.10,0.02,length(lp));',
    '   float shade=step(0.45,phash(dc+0.31));',
    '   col=mix(col,vec3(shade),spk*min(uDirt*1.4,1.0)*0.85);',
    '  }',
    ' }',
    ' /* grain engine */',
    ' {',
    '  vec2 gp=floor(gl_FragCoord.xy/max(uGrainSize,1.0));',
    '  float t8=fract(uT*61.7);',
    '  float amt=uGrain*0.15*(1.0-uGrainReact+uGrainReact*(0.2+uEnergyA*1.3+uBeatA*0.9));',
    '  if(uGrainType<0.5){',
    '   float g=phash(gp+t8*vec2(371.3,441.7));',
    '   col+=(g-0.5)*amt;',
    '  }else if(uGrainType<1.5){',
    '   vec3 g3=vec3(phash(gp+t8*vec2(371.3,441.7)),phash(gp+t8*vec2(129.9,761.3)+9.0),phash(gp+t8*vec2(253.1,311.7)+31.0));',
    '   col+=(g3-0.5)*amt;',
    '  }else{',
    '   float g=step(0.5,phash(gp+t8*vec2(371.3,441.7)))*2.0-1.0;',
    '   col+=g*amt*0.9;',
    '   col=mix(col,vec3(0.5+g*0.35),min(amt*0.5,0.5));',
    '  }',
    '  col+=(phash(gl_FragCoord.xy+t8*vec2(133.7,217.3))-0.5)*0.006;',
    ' }',
    ' /* posterize + dither */',
    ' if(uPoster>1.5){',
    '  float n=uPoster;',
    '  float dth=(phash(gl_FragCoord.xy*0.71+fract(uT*61.7)*vec2(217.0,131.0))-0.5)*(uDither/n);',
    '  col=floor((col+dth)*n)/n;',
    ' }',
    ' col*=uFade;',
    ' fragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  let fbPrg, brightPrg, blurPrg, compPrg;
  let sceneRT = null, fbPP = null, halfA = null, halfB = null, quartA = null, quartB = null;
  let W = 0, H = 0;

  LUM.postInit = function () {
    fbPrg = LUM.prog(LUM.FSQ_VS, FB_FS, 'post.feedback');
    brightPrg = LUM.prog(LUM.FSQ_VS, BRIGHT_FS, 'post.bright');
    blurPrg = LUM.prog(LUM.FSQ_VS, BLUR_FS, 'post.blur');
    compPrg = LUM.prog(LUM.FSQ_VS, COMP_FS, 'post.composite');
  };

  LUM.postResize = function (w, h) {
    if (w === W && h === H) return;
    W = w; H = h;
    const gl = LUM.gl, fmt = LUM.floatRT ? gl.RGBA16F : gl.RGBA8;
    LUM.delRT(sceneRT); if (fbPP) fbPP.free();
    LUM.delRT(halfA); LUM.delRT(halfB); LUM.delRT(quartA); LUM.delRT(quartB);
    sceneRT = LUM.makeRT(w, h, fmt, gl.LINEAR);
    fbPP = LUM.pingPong(w, h, fmt, gl.LINEAR);
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    const qw = Math.max(2, w >> 2), qh = Math.max(2, h >> 2);
    halfA = LUM.makeRT(hw, hh, fmt, gl.LINEAR);
    halfB = LUM.makeRT(hw, hh, fmt, gl.LINEAR);
    quartA = LUM.makeRT(qw, qh, fmt, gl.LINEAR);
    quartB = LUM.makeRT(qw, qh, fmt, gl.LINEAR);
  };

  LUM.post = {
    begin() {
      const gl = LUM.gl;
      LUM.bindRT(sceneRT);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    get sceneRT() { return sceneRT; },

    run(fx, fade, outW, outH) {
      const gl = LUM.gl, F = LUM.frame, A = LUM.audio, dt = F.dt;
      LUM.blendOff();

      /* 1 — feedback trails */
      LUM.bindRT(fbPP.a);
      fbPrg.use();
      fbPrg.setAll({
        uRes: [W, H], uAspect: W / H,
        uScene: sceneRT.tex, uPrev: fbPP.b.tex,
        uTrail: fx.trail,
        uFbRot: fx.fbRot * dt,
        uFbZoom: Math.exp(-fx.fbZoom * dt),
        uFbShift: [fx.fbShiftX * dt, fx.fbShiftY * dt],
        uFbHue: fx.fbHue * dt
      });
      LUM.fsq();
      const srcTex = fbPP.a.tex;
      fbPP.swap();

      /* 2 — bloom */
      if (fx.bloom > 0.004) {
        LUM.bindRT(halfA);
        brightPrg.use();
        brightPrg.setAll({ uRes: [halfA.w, halfA.h], uAspect: W / H, uSrc: srcTex, uThr: fx.bloomThr });
        LUM.fsq();
        blurPrg.use();
        LUM.bindRT(halfB);
        blurPrg.setAll({ uRes: [halfB.w, halfB.h], uAspect: W / H, uSrc: halfA.tex, uDir: [1, 0], uRadius: fx.bloomRad });
        LUM.fsq();
        LUM.bindRT(halfA);
        blurPrg.setAll({ uRes: [halfA.w, halfA.h], uSrc: halfB.tex, uDir: [0, 1], uRadius: fx.bloomRad });
        LUM.fsq();
        LUM.bindRT(quartA);
        blurPrg.setAll({ uRes: [quartA.w, quartA.h], uSrc: halfA.tex, uDir: [1, 0], uRadius: fx.bloomRad * 1.6 });
        LUM.fsq();
        LUM.bindRT(quartB);
        blurPrg.setAll({ uRes: [quartB.w, quartB.h], uSrc: quartA.tex, uDir: [0, 1], uRadius: fx.bloomRad * 1.6 });
        LUM.fsq();
      }

      /* 3 — composite to screen */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, outW, outH);
      compPrg.use();
      compPrg.setAll({
        uRes: [outW, outH], uAspect: outW / outH,
        uSrc: srcTex, uBloom1: halfA.tex, uBloom2: quartB.tex,
        uBloomAmt: fx.bloom, uCA: fx.ca * 0.03, uGrain: fx.grain,
        uVig: fx.vig, uScan: fx.scan,
        uPixel: fx.pixel >= 8 ? Math.round(fx.pixel) : 0,
        uKaleido: fx.kaleido, uMirror: fx.mirror,
        uHue: F.hue, uSatur: fx.satur, uContrast: fx.contrast,
        uGammaAdj: fx.gamma, uExpo: fx.expo, uFade: fade, uT: F.t,
        uEnergyA: A.energy, uBassA: A.bass, uBeatA: A.beatPulse, uBeatPh: A.beatPhase,
        uGrainSize: fx.grainSize, uGrainType: fx.grainType, uGrainReact: fx.grainReact,
        uDirt: fx.dirt, uPoster: fx.poster, uDither: fx.dither,
        uGlitch: fx.glitch, uGlitchBeat: fx.glitchBeat, uVhs: fx.vhs, uVhsJit: fx.vhsJit,
        uLens: fx.lens, uWarpA: fx.warp, uWarpReact: fx.warpReact,
        uExposure: fx.exposure, uTemp: fx.temp, uTint: fx.tint,
        uCurveB: fx.curveB, uCurveS: fx.curveS, uCurveH: fx.curveH, uCurveW: fx.curveW,
        uSCurve: fx.sCurve
      });
      LUM.fsq();
    }
  };
})();
