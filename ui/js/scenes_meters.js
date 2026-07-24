/* Lumina scenes — METERS pack: VU Needle, Level Meters, Readout HUD */
(function () {
  'use strict';
  const LUM = window.LUM;

  /* ============ 25. VU NEEDLE ============ */
  LUM.reg({
    id: 'vu', name: 'VU Needle', cat: 'Meters', icon: '☊',
    params: [
      { k: 'ballistics', n: 'Ballistics (ms)', min: 80, max: 900, step: 1, def: 300 },
      { k: 'range', n: 'Sensitivity', min: 0.5, max: 3, def: 1.4 },
      { k: 'accent', n: 'Accent Ticks', min: 0, max: 1, def: 0.6 },
      { k: 'lamp', n: 'Peak Lamp', min: 0, max: 1, def: 0.8 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uNeedle,uPeakL,uAccent;',
        'float segd(vec2 p,vec2 a,vec2 b){',
        ' vec2 pa=p-a,ba=b-a;',
        ' float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);',
        ' return length(pa-ba*h);',
        '}',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec2 c=(uv-vec2(0.5,0.22))*vec2(uAspect,1.0);',
        ' vec3 col=vec3(0.015);',
        ' float r=length(c);',
        ' vec3 tickCol=pal(0.6);',
        ' for(int i=0;i<=10;i++){',
        '  float f=float(i)/10.0;',
        '  float ta=mix(2.4,0.74,f);',
        '  vec2 dir=vec2(cos(ta),sin(ta));',
        '  float major=mod(float(i),2.0)<0.5?1.0:0.0;',
        '  float r1=major>0.5?0.50:0.53;',
        '  float d=segd(c,dir*r1,dir*0.575);',
        '  float tick=smoothstep(0.004,0.0015,d);',
        '  vec3 tc=(f>0.8)?vec3(0.95,0.25,0.2):mix(vec3(0.55),tickCol,uAccent);',
        '  col+=tc*tick*(major>0.5?1.0:0.55);',
        ' }',
        ' float arcD=abs(r-0.585);',
        ' float arcA=atan(c.y,c.x);',
        ' float inArc=step(0.74,arcA)*step(arcA,2.4);',
        ' col+=mix(vec3(0.4),vec3(0.95,0.25,0.2),step(arcA,1.07))*smoothstep(0.0035,0.0012,arcD)*inArc*0.8;',
        ' float na=mix(2.4,0.74,clamp(uNeedle,0.0,1.0));',
        ' vec2 nd=vec2(cos(na),sin(na));',
        ' float needle=smoothstep(0.005,0.0015,segd(c,nd*0.03,nd*0.56));',
        ' col+=pal(0.15)*needle*1.5;',
        ' col+=vec3(0.9)*needle*0.4;',
        ' col+=pal(0.1)*smoothstep(0.035,0.0,length(c))*0.9;',
        ' vec2 lampP=c-vec2(0.42,0.4);',
        ' float lamp=smoothstep(0.032,0.024,length(lampP));',
        ' col+=vec3(1.0,0.22,0.18)*lamp*uPeakL;',
        ' col+=vec3(0.08,0.02,0.02)*smoothstep(0.034,0.03,length(lampP));',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'vu');
      this._vu = 0; this._lamp = 0;
    },
    render(P, dt) {
      const A = LUM.audio;
      const tau = Math.max(0.05, P.ballistics / 1000);
      const target = Math.min(1, A.energy * P.range);
      this._vu += (target - this._vu) * (1 - Math.exp(-dt / tau));
      this._lamp = Math.max(this._lamp * Math.exp(-dt * 4), A.beatPulse * P.lamp);
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({ uNeedle: this._vu, uPeakL: this._lamp, uAccent: P.accent });
      LUM.fsq();
    }
  });

  /* ============ 26. LEVEL METERS ============ */
  LUM.reg({
    id: 'meters', name: 'Level Meters', cat: 'Meters', icon: '𝄛',
    params: [
      { k: 'mode', n: 'Bars', type: 'select', opts: ['L / R', 'L R + B M T', '6 Bands'], def: 1 },
      { k: 'segs', n: 'Segments', min: 10, max: 48, step: 1, def: 24 },
      { k: 'colorMode', n: 'Color', type: 'select', opts: ['Classic', 'Palette'], def: 0 },
      { k: 'peaks', n: 'Peak Hold', type: 'toggle', def: 1 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uBarsM,uSegs2,uColorM,uPeaksOn;',
        'uniform float uVals[8];',
        'uniform float uPks[8];',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' uv=(uv-0.5)*vec2(1.04,1.12)+0.5;',
        ' if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){fragColor=vec4(0,0,0,1);return;}',
        ' float n=uBarsM;',
        ' float bi=floor(uv.x*n);',
        ' float fx=fract(uv.x*n);',
        ' int idx=int(clamp(bi,0.0,7.0));',
        ' float v=uVals[idx];',
        ' float pk=uPks[idx];',
        ' float segs=uSegs2;',
        ' float si=floor(uv.y*segs);',
        ' float fy=fract(uv.y*segs);',
        ' float lvl=(si+0.5)/segs;',
        ' float on=step(lvl,v);',
        ' float cell=step(0.14,fx)*step(fx,0.86)*step(0.18,fy)*step(fy,0.86);',
        ' vec3 base;',
        ' if(uColorM<0.5){',
        '  base=mix(vec3(0.15,0.85,0.35),vec3(0.98,0.82,0.2),smoothstep(0.55,0.78,lvl));',
        '  base=mix(base,vec3(0.95,0.22,0.18),smoothstep(0.8,0.92,lvl));',
        ' } else base=pal(lvl*0.8);',
        ' vec3 col=base*cell*(0.06+on*1.2);',
        ' if(uPeaksOn>0.5){',
        '  float pd=abs(lvl-pk)*segs;',
        '  col+=base*cell*smoothstep(0.6,0.2,pd)*0.9*step(0.03,pk);',
        ' }',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'meters');
      this.vals = new Float32Array(8);
      this.pks = new Float32Array(8);
    },
    render(P, dt) {
      const A = LUM.audio;
      const mode = Math.round(P.mode);
      let list;
      if (mode === 0) list = [A.l * 2.2, A.r * 2.2];
      else if (mode === 1) list = [A.l * 2.2, A.r * 2.2, A.bass, A.mid, A.treb];
      else {
        list = [];
        for (let i = 0; i < 6; i++) {
          let s = 0;
          for (let j = 0; j < 16; j++) s += A.view[i * 16 + j];
          list.push(Math.min(1, s / 16 * 1.8));
        }
      }
      const n = list.length;
      for (let i = 0; i < 8; i++) {
        const v = i < n ? Math.min(1, list[i]) : 0;
        this.vals[i] = v;
        let pk = this.pks[i] - dt * 0.18;
        if (v > pk) pk = v;
        this.pks[i] = Math.max(0, pk);
      }
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({ uBarsM: n, uSegs2: P.segs, uColorM: P.colorMode, uPeaksOn: P.peaks, uVals: this.vals, uPks: this.pks });
      LUM.fsq();
    }
  });

  /* ============ 27. READOUT HUD ============ */
  LUM.reg({
    id: 'readout', name: 'Readout HUD', cat: 'Meters', icon: '88',
    params: [
      { k: 'accent', n: 'Accent Color', min: 0, max: 1, def: 0.6 },
      { k: 'flicker', n: 'CRT Flicker', min: 0, max: 1, def: 0.15 },
      { k: 'barRow', n: 'Level Bar', type: 'toggle', def: 1 }
    ],
    init() {
      this.prg = LUM.scenePrg([
        'uniform float uD[4];',
        'uniform float uB[3];',
        'uniform float uNegOn,uAccentT,uFlicker,uBarOn,uLevel;',
        'float segd2(vec2 p,vec2 a,vec2 b,float w){',
        ' vec2 pa=p-a,ba=b-a;',
        ' float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);',
        ' return length(pa-ba*h)-w;',
        '}',
        'float digit(float dv,vec2 p){',
        ' int di=int(dv+0.5);',
        ' int mask=di==0?63:di==1?6:di==2?91:di==3?79:di==4?102:di==5?109:di==6?125:di==7?7:di==8?127:111;',
        ' float d=1e9;',
        ' if((mask&1)!=0)d=min(d,segd2(p,vec2(0.28,0.92),vec2(0.72,0.92),0.055));',
        ' if((mask&2)!=0)d=min(d,segd2(p,vec2(0.78,0.84),vec2(0.78,0.56),0.055));',
        ' if((mask&4)!=0)d=min(d,segd2(p,vec2(0.78,0.44),vec2(0.78,0.16),0.055));',
        ' if((mask&8)!=0)d=min(d,segd2(p,vec2(0.28,0.08),vec2(0.72,0.08),0.055));',
        ' if((mask&16)!=0)d=min(d,segd2(p,vec2(0.22,0.16),vec2(0.22,0.44),0.055));',
        ' if((mask&32)!=0)d=min(d,segd2(p,vec2(0.22,0.56),vec2(0.22,0.84),0.055));',
        ' if((mask&64)!=0)d=min(d,segd2(p,vec2(0.28,0.5),vec2(0.72,0.5),0.055));',
        ' return smoothstep(0.012,-0.012,d);',
        '}',
        'void main(){',
        ' vec2 uv=gl_FragCoord.xy/uRes;',
        ' vec3 col=vec3(0.012);',
        ' vec3 acc=pal(uAccentT);',
        ' float flick=1.0-uFlicker*0.12*(0.5+0.5*sin(uTime*47.0))*hash11(floor(uTime*24.0));',
        ' float cw=0.115;',
        ' float x0=0.5-cw*2.6;',
        ' float y0=0.42,hh=0.30;',
        ' float g=0.0;',
        ' if(uNegOn>0.5)g+=segd2((uv-vec2(x0-cw*0.75,y0+hh*0.5))/vec2(cw*0.9,hh),vec2(0.2,0.0),vec2(0.8,0.0),0.05)<0.0?1.0:0.0;',
        ' for(int i=0;i<4;i++){',
        '  float xi=x0+float(i)*cw*1.15+(float(i)>2.5?cw*0.5:0.0);',
        '  vec2 p=(uv-vec2(xi,y0))/vec2(cw,hh);',
        '  if(p.x>=-0.2&&p.x<=1.2&&p.y>=-0.1&&p.y<=1.1)g+=digit(uD[i],p);',
        ' }',
        ' vec2 dotP=uv-vec2(x0+2.0*cw*1.15+cw*0.62,y0+0.02);',
        ' g+=smoothstep(0.012,0.008,length(dotP*vec2(uAspect,1.0)*0.8));',
        ' col+=acc*g*1.25*flick;',
        ' float gb=0.0;',
        ' float bw=0.052;',
        ' for(int i=0;i<3;i++){',
        '  float xi=0.5-bw*1.8+float(i)*bw*1.2;',
        '  vec2 p=(uv-vec2(xi,0.16))/vec2(bw,0.13);',
        '  if(p.x>=-0.2&&p.x<=1.2&&p.y>=-0.1&&p.y<=1.1)gb+=digit(uB[i],p);',
        ' }',
        ' col+=vec3(0.85)*gb*0.8*flick;',
        ' if(uBarOn>0.5){',
        '  float bar=step(abs(uv.y-0.80),0.012)*step(abs(uv.x-0.5),0.30);',
        '  float fill=step(uv.x,0.2+0.6*uLevel);',
        '  col+=mix(vec3(0.10),acc,fill)*bar*flick;',
        ' }',
        ' col+=acc*step(abs(uv.y-0.80),0.018)*step(abs(uv.x-0.5),0.302)*0.08;',
        ' fragColor=vec4(col,1.0);',
        '}'
      ].join('\n'), 'readout');
      this.d = new Float32Array(4);
      this.b = new Float32Array(3);
      this._db = -30;
    },
    render(P, dt) {
      const A = LUM.audio;
      const rms = Math.max(A.rms, 1e-5);
      const dbNow = Math.max(-60, Math.min(0, 20 * Math.log10(rms)));
      this._db += (dbNow - this._db) * (1 - Math.exp(-dt / 0.25));
      const dbAbs = Math.abs(this._db);
      const tens = Math.floor(dbAbs / 10) % 10;
      const ones = Math.floor(dbAbs) % 10;
      const tenth = Math.floor(dbAbs * 10) % 10;
      this.d[0] = tens; this.d[1] = ones; this.d[2] = tenth; this.d[3] = Math.floor(dbAbs * 100) % 10;
      const bpm = Math.round(A.bpm);
      this.b[0] = Math.floor(bpm / 100) % 10;
      this.b[1] = Math.floor(bpm / 10) % 10;
      this.b[2] = bpm % 10;
      this.prg.use();
      LUM.setCommon(this.prg);
      this.prg.setAll({
        uD: this.d, uB: this.b, uNegOn: 1,
        uAccentT: P.accent, uFlicker: P.flicker, uBarOn: P.barRow,
        uLevel: A.energy
      });
      LUM.fsq();
    }
  });
})();
