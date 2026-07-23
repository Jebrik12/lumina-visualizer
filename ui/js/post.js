/* Lumina — post-processing chain: feedback trails → bloom (2 levels) → composite grade */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  const PRE = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes;uniform float uAspect;',
    'out vec4 fragColor;',
    'float phash(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+vec2(19.19));return fract(p.x*p.y);}',
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
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;',
    ' if(uPixel>0.5){float cells=uPixel;vec2 g=vec2(cells*uAspect,cells);uv=(floor(uv*g)+0.5)/g;}',
    ' if(uMirror>0.5&&uMirror<1.5)uv.x=0.5-abs(uv.x-0.5);',
    ' else if(uMirror>1.5&&uMirror<2.5)uv.y=0.5-abs(uv.y-0.5);',
    ' else if(uMirror>2.5){uv.x=0.5-abs(uv.x-0.5);uv.y=0.5-abs(uv.y-0.5);}',
    ' if(uKaleido>0.5){',
    '  vec2 c=uv-0.5;c.x*=uAspect;',
    '  float r=length(c),a=atan(c.y,c.x);',
    '  float m=6.2831853/uKaleido;',
    '  a=mod(a,m);a=abs(a-m*0.5);',
    '  vec2 k=vec2(cos(a),sin(a))*r;k.x/=uAspect;',
    '  uv=clamp(k+0.5,0.0,1.0);',
    ' }',
    ' vec2 dir=uv-0.5;',
    ' vec3 col;',
    ' if(uCA>0.0001){',
    '  col.r=texture(uSrc,uv+dir*uCA).r;',
    '  col.g=texture(uSrc,uv).g;',
    '  col.b=texture(uSrc,uv-dir*uCA).b;',
    ' } else col=texture(uSrc,uv).rgb;',
    ' if(uBloomAmt>0.001){',
    '  vec3 bl=texture(uBloom1,uv).rgb*0.7+texture(uBloom2,uv).rgb*0.8;',
    '  col+=bl*uBloomAmt;',
    ' }',
    ' col=vec3(1.0)-exp(-col*uExpo);',
    ' float l=dot(col,vec3(0.2126,0.7152,0.0722));',
    ' col=mix(vec3(l),col,uSatur);',
    ' if(abs(uHue)>0.0001)col=hueRot(col,uHue);',
    ' col=(col-0.5)*uContrast+0.5;',
    ' col=pow(max(col,0.0),vec3(1.0/uGammaAdj));',
    ' if(uScan>0.001)col*=1.0-uScan*0.45*(0.5+0.5*sin(gl_FragCoord.y*3.14159265));',
    ' float d=length((gl_FragCoord.xy/uRes-0.5)*vec2(uAspect,1.0))/max(uAspect,1.0)*1.55;',
    ' col*=1.0-uVig*smoothstep(0.45,1.15,d);',
    ' float g=phash(gl_FragCoord.xy+fract(uT*61.7)*vec2(371.3,441.7));',
    ' col+=(g-0.5)*(uGrain*0.14+0.006);',
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
      const gl = LUM.gl, F = LUM.frame, dt = F.dt;
      LUM.blendOff();

      /* 1 — feedback trails (always run: keeps buffers fresh) */
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
        uGammaAdj: fx.gamma, uExpo: fx.expo, uFade: fade, uT: F.t
      });
      LUM.fsq();
    }
  };
})();
