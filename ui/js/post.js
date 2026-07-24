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
    'uniform sampler2D uSrc,uBloom1,uBloom2,uMedia,uCurveLUT;',
    'uniform float uBloomAmt,uCA,uGrain,uVig,uScan,uPixel,uKaleido,uMirror,uHue,uSatur,uContrast,uGammaAdj,uExpo,uFade,uT;',
    'uniform float uEnergyA,uBassA,uBeatA,uBeatPh;',
    'uniform float uGrainSize,uGrainType,uGrainReact,uDirt,uPoster,uDither;',
    'uniform float uGlitch,uGlitchBeat,uVhs,uVhsJit,uLens,uWarpA,uWarpReact;',
    'uniform float uExposure,uTemp,uTint,uCurveB,uCurveS,uCurveH,uCurveW,uSCurve;',
    'uniform float uCurveOn;',
    'uniform float uThresh,uThreshLvl,uThreshSoft,uThreshInv,uThreshKeep;',
    'uniform float uMono;uniform vec3 uMonoTint;',
    'uniform float uN2,uN2Scale,uN2Type,uN2Blend,uN2React;',
    'uniform float uTexOn,uTexAmt,uTexScale,uTexBlend;',
    'uniform float uMediaHave,uMediaOp,uMediaBlend,uMediaFit,uMediaLayer,uMediaMotion;',
    'uniform vec2 uMediaSize;',
    'float sat1(float x){return clamp(x,0.0,1.0);}',
    'vec3 blendM(float m,vec3 b,vec3 t){',
    ' if(m<1.5)return mix(2.0*b*t,1.0-2.0*(1.0-b)*(1.0-t),step(vec3(0.5),b));',
    ' if(m<2.5)return 1.0-(1.0-b)*(1.0-t);',
    ' if(m<3.5)return clamp(b/(1.0-t+0.001),0.0,1.0);',
    ' if(m<4.5)return b*t;',
    ' return (1.0-2.0*t)*b*b+2.0*t*b;',
    '}',
    'vec4 mediaSample(vec2 suv,float t){',
    ' float mAsp=uMediaSize.x/max(uMediaSize.y,1.0);',
    ' float rAsp=uRes.x/uRes.y;',
    ' suv=0.5+(suv-0.5)*(1.0-uMediaMotion*uBeatA*0.06);',
    ' suv+=uMediaMotion*vec2(sin(t*0.21),cos(t*0.17))*0.012;',
    ' vec2 uv2=suv-0.5;',
    ' vec2 sc=vec2(rAsp/max(mAsp,0.001),1.0);',
    ' vec2 muv;float alpha=1.0;',
    ' if(uMediaFit<0.5){muv=0.5+uv2*sc/max(sc.x,sc.y);}',
    ' else if(uMediaFit<1.5){muv=0.5+uv2*sc/min(sc.x,sc.y);vec2 stp=step(vec2(0.0),muv)*step(muv,vec2(1.0));alpha=stp.x*stp.y;}',
    ' else{muv=suv*sc*2.0;}',
    ' muv.y=1.0-muv.y;',
    ' return vec4(texture(uMedia,muv).rgb,alpha);',
    '}',
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
    ' /* user media layer */',
    ' if(uMediaHave>0.5){',
    '  vec4 md=mediaSample(gl_FragCoord.xy/uRes,uT);',
    '  float mop=uMediaOp*md.a;',
    '  if(uMediaLayer<0.5){',
    '   if(uMediaBlend<0.5){float ma=sat1(dot(col,vec3(0.299,0.587,0.114))*1.7);col+=md.rgb*mop*(1.0-ma);}',
    '   else col=mix(col,blendM(uMediaBlend,md.rgb,col),mop);',
    '  }else{',
    '   if(uMediaBlend<0.5)col=mix(col,md.rgb,mop);',
    '   else col=mix(col,blendM(uMediaBlend,col,md.rgb),mop);',
    '  }',
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
    ' /* interactive curve LUT */',
    ' if(uCurveOn>0.5){',
    '  col=clamp(col,0.0,1.0);',
    '  col=vec3(texture(uCurveLUT,vec2(col.r,0.5)).r,',
    '           texture(uCurveLUT,vec2(col.g,0.5)).r,',
    '           texture(uCurveLUT,vec2(col.b,0.5)).r);',
    ' }',
    ' /* gamma */',
    ' col=pow(max(col,0.0),vec3(1.0/uGammaAdj));',
    ' /* threshold */',
    ' if(uThresh>0.001){',
    '  float tl=dot(col,vec3(0.2126,0.7152,0.0722));',
    '  float tv=smoothstep(uThreshLvl-uThreshSoft-0.001,uThreshLvl+uThreshSoft+0.001,tl);',
    '  if(uThreshInv>0.5)tv=1.0-tv;',
    '  vec3 tc=(uThreshKeep>0.5)?col*tv:vec3(tv);',
    '  col=mix(col,tc,uThresh);',
    ' }',
    ' /* monochrome */',
    ' if(uMono>0.001){',
    '  float ml=dot(col,vec3(0.2126,0.7152,0.0722));',
    '  col=mix(col,uMonoTint*ml,uMono);',
    ' }',
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
    ' /* noise overlay v2 (blend modes, heavy range) */',
    ' if(uN2>0.001){',
    '  vec2 np=gl_FragCoord.xy/max(uN2Scale,0.5);',
    '  float nseed=floor(uT*14.0);',
    '  float nv;',
    '  if(uN2Type<0.5)nv=pnoise(np*0.06+nseed*vec2(3.7,7.1))*0.7+pnoise(np*0.17+nseed*1.3)*0.3;',
    '  else if(uN2Type<1.5)nv=phash(np+fract(uT*61.7)*vec2(371.3,441.7));',
    '  else nv=phash(vec2(floor(gl_FragCoord.y/max(uN2Scale,0.5)),nseed*13.7));',
    '  float namt=uN2*(1.0-uN2React+uN2React*(0.15+uEnergyA*1.2+uBeatA*0.9));',
    '  col=mix(col,blendM(max(uN2Blend,1.0),clamp(col,0.0,1.0),vec3(nv)),sat1(namt));',
    ' }',
    ' /* texture overlays: paper / halftone / hatch */',
    ' if(uTexOn>0.5){',
    '  vec2 tp=gl_FragCoord.xy*0.5/max(uTexScale,0.25);',
    '  float lum2=dot(clamp(col,0.0,1.0),vec3(0.299,0.587,0.114));',
    '  float tv;',
    '  if(uTexOn<1.5){tv=0.55+0.45*(pnoise(tp*0.35)*0.6+pnoise(tp*1.1)*0.4);}',
    '  else if(uTexOn<2.5){vec2 cell=fract(tp*0.09)-0.5;float rad=(1.0-lum2)*0.58;tv=smoothstep(rad,rad-0.09,length(cell));}',
    '  else{float d45=abs(fract((tp.x+tp.y)*0.07)-0.5)*2.0;float wdt=(1.0-lum2)*0.85;tv=smoothstep(wdt,wdt-0.15,d45);}',
    '  col=mix(col,blendM(max(uTexBlend,1.0),clamp(col,0.0,1.0),vec3(tv)),uTexAmt);',
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
  let curveLutTex = null;

  LUM.setCurveLUT = function (lut) {
    const gl = LUM.gl;
    if (!curveLutTex) {
      curveLutTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, curveLutTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, 256, 1, 0, gl.RED, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, curveLutTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RED, gl.FLOAT, lut);
  };

  LUM.postInit = function () {
    fbPrg = LUM.prog(LUM.FSQ_VS, FB_FS, 'post.feedback');
    brightPrg = LUM.prog(LUM.FSQ_VS, BRIGHT_FS, 'post.bright');
    blurPrg = LUM.prog(LUM.FSQ_VS, BLUR_FS, 'post.blur');
    compPrg = LUM.prog(LUM.FSQ_VS, COMP_FS, 'post.composite');
    const idLut = new Float32Array(256);
    for (let i = 0; i < 256; i++) idLut[i] = i / 255;
    LUM.setCurveLUT(idLut);
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
        uSCurve: fx.sCurve,
        uCurveOn: fx.curveOn ? 1 : 0, uCurveLUT: curveLutTex,
        uThresh: fx.thresh, uThreshLvl: fx.threshLvl, uThreshSoft: fx.threshSoft,
        uThreshInv: fx.threshInv, uThreshKeep: fx.threshKeep,
        uMono: fx.mono, uMonoTint: LUM.hex2rgb(fx.monoTint || '#ffffff'),
        uN2: fx.noise2, uN2Scale: fx.noise2Scale, uN2Type: fx.noise2Type,
        uN2Blend: fx.noise2Blend, uN2React: fx.noise2React,
        uTexOn: fx.texOn, uTexAmt: fx.texAmt, uTexScale: fx.texScale, uTexBlend: fx.texBlend,
        uMedia: LUM.media && LUM.media.ready ? LUM.media.tex() : (curveLutTex),
        uMediaHave: LUM.media && LUM.media.ready ? 1 : 0,
        uMediaOp: fx.mediaOp, uMediaBlend: fx.mediaBlend, uMediaFit: fx.mediaFit,
        uMediaLayer: fx.mediaLayer, uMediaMotion: fx.mediaMotion,
        uMediaSize: LUM.media && LUM.media.ready ? [LUM.media.w, LUM.media.h] : [2, 2]
      });
      LUM.fsq();
    }
  };
})();
