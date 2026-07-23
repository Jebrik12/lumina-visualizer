/* Lumina — WebGL2 core: context, programs, render targets, data textures, shared GLSL prelude */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  LUM.scenes = [];
  LUM.sceneById = {};
  LUM.reg = function (s) { LUM.scenes.push(s); LUM.sceneById[s.id] = s; };
  LUM.shaderErrors = [];
  LUM.NB = 96;   // spectrum bands
  LUM.NW = 512;  // waveform points

  LUM.glInit = function (canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: false, alpha: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'high-performance'
    });
    if (!gl) return null;
    LUM.gl = gl;
    LUM.canvas = canvas;
    LUM.floatRT = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    return gl;
  };

  function fmtOf(internal) {
    const gl = LUM.gl;
    switch (internal) {
      case gl.RGBA32F: case gl.RGBA16F: return [gl.RGBA, gl.FLOAT];
      case gl.RG32F: case gl.RG16F: return [gl.RG, gl.FLOAT];
      case gl.R32F: case gl.R16F: return [gl.RED, gl.FLOAT];
      default: return [gl.RGBA, gl.UNSIGNED_BYTE];
    }
  }

  LUM.makeTex = function (w, h, internal, filter, wrap, data) {
    const gl = LUM.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const ft = fmtOf(internal);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, ft[0], ft[1], data || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap || gl.CLAMP_TO_EDGE);
    return { tex: t, w, h, internal };
  };

  LUM.makeRT = function (w, h, internal, filter) {
    const gl = LUM.gl;
    let t = LUM.makeTex(w, h, internal, filter);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && internal !== gl.RGBA8) {
      gl.deleteTexture(t.tex);
      t = LUM.makeTex(w, h, gl.RGBA8, filter);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo: fb, tex: t.tex, w, h, internal: t.internal };
  };

  LUM.delRT = function (rt) {
    if (!rt) return;
    const gl = LUM.gl;
    gl.deleteFramebuffer(rt.fbo); gl.deleteTexture(rt.tex);
  };

  LUM.bindRT = function (rt) {
    const gl = LUM.gl;
    if (rt) { gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo); gl.viewport(0, 0, rt.w, rt.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, LUM.canvas.width, LUM.canvas.height); }
  };

  LUM.pingPong = function (w, h, internal, filter) {
    return {
      a: LUM.makeRT(w, h, internal, filter),
      b: LUM.makeRT(w, h, internal, filter),
      swap() { const t = this.a; this.a = this.b; this.b = t; },
      free() { LUM.delRT(this.a); LUM.delRT(this.b); this.a = this.b = null; }
    };
  };

  function compile(type, src, tag) {
    const gl = LUM.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s) || 'unknown shader error';
      console.error('[Lumina shader:' + (tag || '') + ']', log);
      LUM.shaderErrors.push((tag ? tag + ': ' : '') + String(log).slice(0, 400));
      return null;
    }
    return s;
  }

  LUM.prog = function (vsSrc, fsSrc, tag) {
    const gl = LUM.gl;
    const vs = compile(gl.VERTEX_SHADER, vsSrc, tag);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc, tag);
    if (!vs || !fs) return { bad: true, use() {}, set() {}, setAll() {}, uni: {} };
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p) || 'link error';
      console.error('[Lumina link:' + (tag || '') + ']', log);
      LUM.shaderErrors.push((tag ? tag + ' link: ' : 'link: ') + String(log).slice(0, 400));
      return { bad: true, use() {}, set() {}, setAll() {}, uni: {} };
    }
    const uni = {}; let unit = 0;
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      const u = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
      if (info.type === gl.SAMPLER_2D) { u.unit = unit; unit += info.size; }
      uni[name] = u;
    }
    return {
      p, uni, bad: false,
      use() { gl.useProgram(p); },
      set(name, v) {
        const u = this.uni[name];
        if (!u || v === undefined || v === null) return;
        switch (u.type) {
          case gl.SAMPLER_2D: {
            const tex = v.tex !== undefined ? v.tex : (v.t !== undefined ? v.t : v);
            gl.activeTexture(gl.TEXTURE0 + u.unit);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(u.loc, u.unit);
            break;
          }
          case gl.FLOAT:
            if (v.length !== undefined) gl.uniform1fv(u.loc, v); else gl.uniform1f(u.loc, v);
            break;
          case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
          case gl.INT: case gl.BOOL: gl.uniform1i(u.loc, v | 0); break;
          case gl.INT_VEC2: gl.uniform2iv(u.loc, v); break;
          default: break;
        }
      },
      setAll(o) { for (const k in o) this.set(k, o[k]); }
    };
  };

  LUM.FSQ_VS = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';
  LUM.fsq = function () { const gl = LUM.gl; gl.drawArrays(gl.TRIANGLES, 0, 3); };

  /* Shared GLSL prelude for all scene fragment shaders */
  LUM.PRELUDE = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime,uDt,uAspect;',
    'uniform sampler2D uBands,uWave,uHist,uWaveHist;',
    'uniform float uHistHead,uWaveHistHead;',
    'uniform float uRms,uPeak,uBass,uMid,uTreb,uEnergy,uBeat,uBeatPhase,uBpm,uCentroid,uLevL,uLevR;',
    'uniform vec3 uPalA,uPalB,uPalC,uPalD;uniform float uPalShift;',
    'out vec4 fragColor;',
    'float band(float x){return texture(uBands,vec2(clamp(x,0.0,1.0),0.5)).r;}',
    'float wavL(float x){return texture(uWave,vec2(clamp(x,0.0,1.0),0.5)).r;}',
    'float wavR(float x){return texture(uWave,vec2(clamp(x,0.0,1.0),0.5)).g;}',
    'float wavM(float x){vec2 w=texture(uWave,vec2(clamp(x,0.0,1.0),0.5)).rg;return (w.r+w.g)*0.5;}',
    'float histBand(float x,float back){float y=fract(uHistHead-back);return texture(uHist,vec2(clamp(x,0.0,1.0),y)).r;}',
    'vec2 histWave(float x,float back){float y=fract(uWaveHistHead-back);return texture(uWaveHist,vec2(clamp(x,0.0,1.0),y)).rg;}',
    'vec3 pal(float t){return clamp(uPalA+uPalB*cos(6.28318*(uPalC*(t+uPalShift)+uPalD)),0.0,1.0);}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'float sat(float x){return clamp(x,0.0,1.0);}',
    'float hash11(float p){p=fract(p*443.8975);p*=p+19.19;return fract(p*p);}',
    'float hash21(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+vec2(19.19));return fract(p.x*p.y);}',
    'vec2 hash22(vec2 p){float n=hash21(p);return vec2(n,hash21(p+n+1.7));}',
    'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    ' float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));',
    ' return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
    'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.03+vec2(11.7,9.2);a*=0.5;}return v;}',
    'vec3 hsv(float h,float s,float v){vec3 k=abs(fract(vec3(h)+vec3(0.0,0.6666667,0.3333333))*6.0-3.0)-1.0;return v*mix(vec3(1.0),clamp(k,0.0,1.0),s);}',
    'float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}',
    ''
  ].join('\n');

  LUM.scenePrg = function (body, tag) { return LUM.prog(LUM.FSQ_VS, LUM.PRELUDE + body, tag); };

  /* Glowing ribbon (thick polyline) builder.
     pathSrc must define: vec2 path(float t)  in unit space (y: -1..1, x: -aspect..aspect).
     fsBody gets: vSide (-1..1 across ribbon), vT (0..1 along).  n = point count. */
  LUM.ribbonPrg = function (pathSrc, fsBody, n, tag) {
    const step = (1 / (n - 1)).toFixed(9);
    const vs = [
      '#version 300 es',
      'precision highp float;',
      'uniform vec2 uRes;uniform float uTime,uDt,uAspect,uWidth;',
      'uniform sampler2D uBands,uWave,uHist,uWaveHist;',
      'uniform float uHistHead,uWaveHistHead;',
      'uniform float uRms,uPeak,uBass,uMid,uTreb,uEnergy,uBeat,uBeatPhase,uBpm,uCentroid,uLevL,uLevR;',
      'float vband(float x){return texture(uBands,vec2(clamp(x,0.0,1.0),0.5)).r;}',
      'float vwavL(float x){return texture(uWave,vec2(clamp(x,0.0,1.0),0.5)).r;}',
      'float vwavR(float x){return texture(uWave,vec2(clamp(x,0.0,1.0),0.5)).g;}',
      'vec2 vhistWave(float x,float back){float y=fract(uWaveHistHead-back);return texture(uWaveHist,vec2(clamp(x,0.0,1.0),y)).rg;}',
      'mat2 vrot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
      'out float vSide;out float vT;',
      pathSrc,
      'void main(){',
      ' int i=gl_VertexID>>1;',
      ' float side=float((gl_VertexID&1)*2-1);',
      ' float t=float(i)*' + step + ';',
      ' vec2 p=path(t);',
      ' vec2 p2=path(min(t+' + step + ',1.0));',
      ' vec2 d=p2-p;',
      ' if(length(d)<1e-6)d=vec2(1e-6,0.0);',
      ' vec2 nrm=normalize(vec2(-d.y,d.x));',
      ' vec2 q=p+nrm*uWidth*side;',
      ' vSide=side;vT=t;',
      ' gl_Position=vec4(q/vec2(uAspect,1.0),0.0,1.0);',
      '}'
    ].join('\n');
    const fs = LUM.PRELUDE + 'in float vSide;in float vT;\n' + fsBody;
    const pr = LUM.prog(vs, fs, tag);
    pr.count = n * 2;
    pr.draw = function () { LUM.gl.drawArrays(LUM.gl.TRIANGLE_STRIP, 0, this.count); };
    return pr;
  };

  /* 1-row data texture (bands: R16F, wave: RG16F) */
  LUM.dataTex = function (w, ch) {
    const gl = LUM.gl;
    const internal = ch === 2 ? gl.RG16F : gl.R16F;
    const tx = LUM.makeTex(w, 1, internal, gl.LINEAR, gl.CLAMP_TO_EDGE);
    const ft = fmtOf(internal);
    return {
      t: tx.tex, w,
      update(f32) {
        gl.bindTexture(gl.TEXTURE_2D, tx.tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, 1, ft[0], ft[1], f32);
      }
    };
  };

  /* Scrolling history texture (ring of rows). headNorm() = v-coord of most recent row. */
  LUM.history = function (w, rows, ch) {
    const gl = LUM.gl;
    const internal = ch === 2 ? gl.RG16F : gl.R16F;
    const tx = LUM.makeTex(w, rows, internal, gl.LINEAR, gl.REPEAT);
    const ft = fmtOf(internal);
    let head = 0;
    return {
      t: tx.tex, w, rows,
      push(f32) {
        gl.bindTexture(gl.TEXTURE_2D, tx.tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, head, w, 1, ft[0], ft[1], f32);
        head = (head + 1) % rows;
      },
      headNorm() { return (((head - 1 + rows) % rows) + 0.5) / rows; }
    };
  };

  LUM.blendAdd = function () { const gl = LUM.gl; gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); };
  LUM.blendAlpha = function () { const gl = LUM.gl; gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE); };
  LUM.blendOff = function () { LUM.gl.disable(LUM.gl.BLEND); };

  /* Per-frame shared state (filled by main.js) */
  LUM.frame = { w: 1, h: 1, t: 0, dt: 0.016, palShift: 0 };

  LUM.setCommon = function (pr) {
    const F = LUM.frame, A = LUM.audio, P = F.pal;
    pr.setAll({
      uRes: [F.w, F.h], uAspect: F.w / F.h, uTime: F.t, uDt: F.dt,
      uBands: LUM.bandTex, uWave: LUM.waveTex, uHist: LUM.histTex, uWaveHist: LUM.waveHistTex,
      uHistHead: LUM.histTex.headNorm(), uWaveHistHead: LUM.waveHistTex.headNorm(),
      uRms: A.rms, uPeak: A.peak, uBass: A.bass, uMid: A.mid, uTreb: A.treb,
      uEnergy: A.energy, uBeat: A.beatPulse, uBeatPhase: A.beatPhase, uBpm: A.bpm,
      uCentroid: A.centroid, uLevL: A.l, uLevR: A.r,
      uPalA: P.a, uPalB: P.b, uPalC: P.c, uPalD: P.d, uPalShift: F.palShift
    });
  };
})();
