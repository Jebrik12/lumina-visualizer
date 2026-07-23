/* Lumina — audio feature engine: smoothing, AGC, tilt, bass/mid/treb, beat + BPM detection.
   Sources: JUCE plugin frames, procedural simulation, mic, tab/system audio, audio file. */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};
  const NB = 96, NW = 512;

  /* ---------- base64 → Float32Array (JUCE frames) ---------- */
  LUM.b64f32 = function (s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Float32Array(u.buffer, 0, Math.floor(bin.length / 4));
  };

  /* ---------- shared frame shape ---------- */
  function blankFrame() {
    return {
      bands: new Float32Array(NB),
      wl: new Float32Array(NW),
      wr: new Float32Array(NW),
      rms: 0, peak: 0, l: 0, r: 0
    };
  }

  /* ---------- feature state ---------- */
  const A = LUM.audio = {
    raw: new Float32Array(NB),      // post gain/tilt, pre-smooth
    prevRaw: new Float32Array(NB),
    sm: new Float32Array(NB),       // smoothed bands 0..1 (raw response)
    view: new Float32Array(NB),     // shaped bands (what scenes see)
    wl: new Float32Array(NW),
    wr: new Float32Array(NW),
    waveRG: new Float32Array(NW * 2),
    rms: 0, peak: 0, l: 0, r: 0,
    bass: 0, mid: 0, treb: 0, energy: 0, centroid: 0.5, domNorm: 0.3,
    beatPulse: 0, beatPhase: 0, bpm: 120, beatCount: 0,
    _agcEnv: 0.25, _sinceBeat: 9, _lastBeats: [],
    _fluxHist: new Float32Array(90), _fluxIdx: 0, _fluxN: 0,
    _dynEnv: 0.2,
    _bassR: 0, _midR: 0, _trebR: 0, _energyR: 0,

    update(dt) {
      const src = LUM.source;
      if (src && src.step) src.step(dt);
      const f = (src && src.frame) || null;
      const aud = (LUM.state && LUM.state.aud) || { sens: 0, attack: 10, release: 260, tilt: 3, agc: true, agcAmt: 0.75, beat: 0.5, gate: 0.04, react: 1, floor: 0, curve: 1, dyn: 0 };

      if (f) {
        this.rms = f.rms; this.peak = f.peak; this.l = f.l; this.r = f.r;
        this.wl.set(f.wl); this.wr.set(f.wr);
      }

      /* AGC on rms envelope — strength adjustable so quiet/loud difference can survive */
      const pk = Math.max(this.rms, 0.001);
      this._agcEnv = Math.max(this._agcEnv * Math.exp(-dt / 5), pk);
      this._agcEnv = Math.max(this._agcEnv, 0.04);
      const agcAmt = aud.agc ? (aud.agcAmt !== undefined ? aud.agcAmt : 0.75) : 0;
      const agcGainFull = Math.min(6, 0.32 / this._agcEnv);
      const agcGain = (1 - agcAmt) + agcGainFull * agcAmt;
      const gain = agcGain * Math.pow(10, (aud.sens || 0) / 20);

      /* raw bands: gain, tilt, gate */
      const tiltSpan = ((aud.tilt || 0) * 9.97) / 66; // dB/oct → normalized span over 96 bands
      const gate = aud.gate !== undefined ? aud.gate : 0.04;
      let fluxNow = 0;
      const fb = f ? f.bands : null;
      for (let i = 0; i < NB; i++) {
        let v = fb ? fb[i] : 0;
        v = v * gain + tiltSpan * (i / 95 - 0.35);
        v = v < gate ? 0 : (v - gate) / (1 - gate);
        v = v < 0 ? 0 : v > 1 ? 1 : v;
        const d = v - this.prevRaw[i];
        if (d > 0) fluxNow += d * (i < 32 ? 1.9 : i < 64 ? 1.0 : 0.6);
        this.prevRaw[i] = v;
        this.raw[i] = v;
      }
      fluxNow /= NB;

      /* attack/release smoothing */
      const tauA = Math.max(0.001, (aud.attack || 10) / 1000);
      const tauR = Math.max(0.02, (aud.release || 260) / 1000);
      const cA = 1 - Math.exp(-dt / tauA);
      const cR = 1 - Math.exp(-dt / tauR);
      let sumAll = 0, sumW = 0, maxV = 0, maxI = 20;
      for (let i = 0; i < NB; i++) {
        const t = this.raw[i], c = this.sm[i];
        const nv = c + (t > c ? cA : cR) * (t - c);
        this.sm[i] = nv;
        sumAll += nv * i; sumW += nv;
        if (i > 3 && i < 82 && nv > maxV) { maxV = nv; maxI = i; }
      }
      this.centroid = sumW > 0.001 ? (sumAll / sumW) / 95 : this.centroid;
      this.domNorm = maxI / 95;

      /* bass / mid / treb (20–150Hz / 150Hz–2kHz / 2kHz+) */
      let b = 0, m = 0, tr = 0;
      for (let i = 0; i < 27; i++) b += this.sm[i];
      for (let i = 27; i < 64; i++) m += this.sm[i];
      for (let i = 64; i < NB; i++) tr += this.sm[i];
      b /= 27; m /= 37; tr /= 32;
      const eC = 1 - Math.exp(-dt / 0.09);
      this._bassR += eC * (Math.min(1, b * 3.2) - this._bassR);
      this._midR += eC * (Math.min(1, m * 2.2) - this._midR);
      this._trebR += eC * (Math.min(1, tr * 1.5) - this._trebR);
      const eTarget = Math.min(1, this.rms * gain * 2.2);
      this._energyR += (1 - Math.exp(-dt / 0.18)) * (eTarget - this._energyR);

      /* ---- reactivity shaping: floor / curve / amount / dynamics ---- */
      const react = aud.react !== undefined ? aud.react : 1;
      const floorV = Math.min(0.6, aud.floor || 0);
      const curveV = aud.curve !== undefined ? aud.curve : 1;
      const dyn = aud.dyn || 0;
      this._dynEnv += (1 - Math.exp(-dt / 0.45)) * (this._energyR - this._dynEnv);
      const dynGain = dyn > 0 ? Math.pow(Math.min(1, this._dynEnv / 0.3), dyn * 2.2) : 1;
      const den = 1 / Math.max(0.05, 1 - floorV);
      const shape = v => {
        v = (v - floorV) * den;
        if (v <= 0) return 0;
        v = Math.pow(v, curveV) * react * dynGain;
        return v > 1 ? 1 : v;
      };
      for (let i = 0; i < NB; i++) this.view[i] = shape(this.sm[i]);
      this.bass = shape(this._bassR);
      this.mid = shape(this._midR);
      this.treb = shape(this._trebR);
      this.energy = shape(this._energyR);

      /* beat detection: spectral flux + adaptive threshold */
      const H = this._fluxHist;
      H[this._fluxIdx] = fluxNow;
      this._fluxIdx = (this._fluxIdx + 1) % H.length;
      this._fluxN = Math.min(this._fluxN + 1, H.length);
      let mean = 0;
      for (let i = 0; i < this._fluxN; i++) mean += H[i];
      mean /= Math.max(1, this._fluxN);
      let vr = 0;
      for (let i = 0; i < this._fluxN; i++) { const d = H[i] - mean; vr += d * d; }
      const std = Math.sqrt(vr / Math.max(1, this._fluxN));
      const sensK = 2.1 - 1.7 * (aud.beat !== undefined ? aud.beat : 0.5); // 0..1 → 2.1..0.4
      const thr = Math.max(mean + sensK * std, mean * 1.45) + 0.004;
      this._sinceBeat += dt;
      if (fluxNow > thr && this._sinceBeat > 0.15 && this._energyR > 0.03 && this._fluxN > 30) {
        const now = LUM.frame.t;
        const lb = this._lastBeats;
        if (lb.length) {
          const ioi = now - lb[lb.length - 1];
          if (ioi > 0.24 && ioi < 1.2) { /* usable interval */ }
        }
        lb.push(now);
        if (lb.length > 12) lb.shift();
        if (lb.length >= 4) {
          const iois = [];
          for (let i = 1; i < lb.length; i++) {
            const d = lb[i] - lb[i - 1];
            if (d > 0.24 && d < 1.2) iois.push(d);
          }
          if (iois.length >= 3) {
            iois.sort((x, y) => x - y);
            let period = iois[Math.floor(iois.length / 2)];
            let bpm = 60 / period;
            while (bpm < 70) bpm *= 2;
            while (bpm > 180) bpm /= 2;
            this.bpm += 0.3 * (bpm - this.bpm);
          }
        }
        this._sinceBeat = 0;
        this.beatPulse = 1;
        this.beatCount++;
        if (LUM.onBeat) LUM.onBeat();
      }
      this.beatPulse *= Math.exp(-dt * 6.5);
      this.beatPhase = Math.min(1, this._sinceBeat / (60 / Math.max(40, this.bpm)));

      /* interleave wave for RG texture */
      for (let i = 0; i < NW; i++) {
        this.waveRG[i * 2] = this.wl[i];
        this.waveRG[i * 2 + 1] = this.wr[i];
      }
    }
  };

  /* =========================================================
     SIMULATION SOURCE — procedural 124 BPM electronic track.
     Pure math (no WebAudio): works headless, no permissions.
     ========================================================= */
  LUM.makeSimSource = function () {
    const f = blankFrame();
    let t = Math.random() * 60;
    const h = n => { const x = Math.sin(n) * 43758.5453; return x - Math.floor(x); };
    const bandOf = fq => Math.max(0, Math.min(95, 95 * Math.log(fq / 20) / Math.log(1000)));
    function addG(b, c, w, a) {
      const i0 = Math.max(0, Math.floor(c - w * 3)), i1 = Math.min(95, Math.ceil(c + w * 3));
      for (let i = i0; i <= i1; i++) { const d = (i - c) / w; b[i] += a * Math.exp(-d * d); }
    }
    const bassSeq = [0, 0, 7, 5, 0, 0, 10, 7];
    const arpSeq = [0, 3, 7, 12, 7, 3, 10, 7, 0, 5, 8, 12, 15, 12, 8, 7];
    return {
      name: 'sim', frame: f,
      step(dt) {
        t += dt;
        const bpm = 124, spb = 60 / bpm;
        const beat = t / spb, bar = beat / 4, b16 = beat * 4;
        const sec = Math.floor(bar / 8) % 4;        // 0 groove, 1 full, 2 build, 3 drop
        const bp = beat % 1, b16p = b16 % 1, barp = bar % 1;
        const bi = Math.floor(beat), s16 = Math.floor(b16);
        const build2 = sec === 2 && barp > 0.75 && (bar % 8) > 7;
        const kickOn = (sec === 2 && (bar % 8) > 6) ? 0 : 1;
        const kick = kickOn * Math.exp(-bp * 8);
        const snare = ((bi % 2) === 1 ? 1 : 0) * Math.exp(-bp * 9) * (sec >= 1 ? 0.9 : 0.5);
        const roll = (sec === 2) ? Math.exp(-b16p * 12) * (0.35 + 0.65 * ((bar % 8) / 8)) : 0;
        const hat = Math.exp(-b16p * 16) * ((s16 % 2) ? 0.5 : 1.0) * (sec === 0 ? 0.6 : 0.95);
        const duck = 1 - 0.55 * kick;
        const bassN = bassSeq[bi % 8], bassF = 55 * Math.pow(2, bassN / 12);
        const bassA = (sec === 2 ? 0.4 : 0.95) * duck;
        const arpN = arpSeq[s16 % 16], arpF = 220 * Math.pow(2, arpN / 12);
        const arpA = (sec >= 1 ? 1 : 0.25) * Math.exp(-b16p * 5) * 0.8 * duck;
        const riser = sec === 2 ? Math.min(1, (bar % 8) / 8 + barp * 0.12) : 0;
        const padA = (0.3 + 0.12 * Math.sin(bar * 1.7)) * duck;

        const b = f.bands; b.fill(0);
        const kickF = 42 + 130 * Math.exp(-bp * 16);
        addG(b, bandOf(kickF), 2.4, kick * 1.1);
        addG(b, bandOf(bassF), 1.7, bassA * 0.8);
        addG(b, bandOf(bassF * 2), 1.5, bassA * 0.45);
        addG(b, bandOf(bassF * 3), 1.3, bassA * 0.26);
        addG(b, bandOf(arpF), 1.3, arpA * 0.65);
        addG(b, bandOf(arpF * 2), 1.2, arpA * 0.42);
        addG(b, bandOf(arpF * 4), 1.1, arpA * 0.2);
        addG(b, bandOf(300), 8, padA * 0.3);
        for (let i = 34; i < 66; i++) b[i] += (snare * 0.5 + roll * 0.42) * (0.45 + 0.55 * h(i * 7.31 + bi));
        for (let i = 64; i < 96; i++) b[i] += hat * 0.5 * (0.35 + 0.65 * h(i * 13.7 + s16 * 3.1));
        if (riser > 0) addG(b, 18 + 72 * riser, 3.5 + riser * 5, 0.45 + 0.55 * riser);
        for (let i = 0; i < 96; i++) {
          b[i] += 0.018 + 0.02 * h(i * 1.93 + Math.floor(t * 8) * 0.37);
          if (b[i] > 1) b[i] = 1;
        }

        /* waveform window ~43ms */
        const win = 0.043;
        let sum = 0, pkv = 0, sl = 0, sr2 = 0;
        for (let i = 0; i < NW; i++) {
          const tau = t - (NW - 1 - i) * (win / NW);
          const bpL = (tau / spb) % 1;
          const kE = kickOn * Math.exp(-bpL * 8);
          const kF = 42 + 130 * Math.exp(-bpL * 16);
          const core = kE * 0.85 * Math.sin(6.28318 * kF * tau);
          const bassS = bassA * 0.45 * (0.65 * Math.sin(6.28318 * bassF * tau) + 0.35 * (2 * ((bassF * tau) % 1) - 1));
          const hE = Math.exp(-((tau / spb * 4) % 1) * 16) * 0.11;
          const nz = (h(Math.floor(tau * 19997) % 99991) * 2 - 1);
          const nz2 = (h((Math.floor(tau * 19997) + 137) % 99991) * 2 - 1);
          const snS = snare * 0.28 * nz * Math.exp(-bpL * 9);
          let L = core + bassS + arpA * 0.32 * Math.sin(6.28318 * arpF * tau) + hE * nz + snS;
          let R = core + bassS + arpA * 0.32 * Math.sin(6.28318 * arpF * 1.004 * tau + 0.6) + hE * nz2 + snS;
          if (build2) { L *= 0.4; R *= 0.4; }
          L = Math.tanh(L * 1.25); R = Math.tanh(R * 1.25);
          f.wl[i] = L; f.wr[i] = R;
          sum += (L + R) * 0.5 * (L + R) * 0.5;
          const aa = Math.abs((L + R) * 0.5); if (aa > pkv) pkv = aa;
          sl += L * L; sr2 += R * R;
        }
        f.rms = Math.sqrt(sum / NW);
        f.peak = pkv;
        f.l = Math.sqrt(sl / NW);
        f.r = Math.sqrt(sr2 / NW);
      },
      stop() {}
    };
  };

  /* ---------- JUCE plugin source ---------- */
  LUM.makeJuceSource = function () {
    const f = blankFrame();
    return {
      name: 'plugin', frame: f,
      onFrame(d) {
        try {
          const b = LUM.b64f32(d.b), wl = LUM.b64f32(d.wl), wr = LUM.b64f32(d.wr);
          if (b.length >= NB) f.bands.set(b.subarray(0, NB));
          if (wl.length >= NW) f.wl.set(wl.subarray(0, NW));
          if (wr.length >= NW) f.wr.set(wr.subarray(0, NW));
          f.rms = d.rms || 0; f.peak = d.pk || 0; f.l = d.l || 0; f.r = d.r || 0;
        } catch (e) { /* malformed frame — skip */ }
      },
      stop() {}
    };
  };

  /* ---------- WebAudio sources (demo page: mic / tab / file) ---------- */
  LUM.makeMediaSource = async function (kind, file) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    await ac.resume();
    let node = null, stream = null, mediaEl = null, objUrl = null;

    if (kind === 'mic') {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      node = ac.createMediaStreamSource(stream);
    } else if (kind === 'tab') {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const at = st.getAudioTracks();
      if (!at.length) { st.getTracks().forEach(tr => tr.stop()); throw new Error('No audio was shared — enable "Also share tab/system audio" in the picker.'); }
      st.getVideoTracks().forEach(tr => tr.stop());
      stream = new MediaStream(at);
      node = ac.createMediaStreamSource(stream);
    } else if (kind === 'file') {
      mediaEl = new Audio();
      objUrl = URL.createObjectURL(file);
      mediaEl.src = objUrl; mediaEl.loop = true;
      await mediaEl.play();
      node = ac.createMediaElementSource(mediaEl);
      node.connect(ac.destination);
    } else throw new Error('unknown source');

    const split = ac.createChannelSplitter(2);
    const anL = ac.createAnalyser(), anR = ac.createAnalyser(), anM = ac.createAnalyser();
    anL.fftSize = 2048; anR.fftSize = 2048; anM.fftSize = 4096;
    anL.smoothingTimeConstant = 0; anR.smoothingTimeConstant = 0; anM.smoothingTimeConstant = 0;
    node.connect(split);
    split.connect(anL, 0); split.connect(anR, 1);
    node.connect(anM);

    const sr = ac.sampleRate, nBins = anM.frequencyBinCount, binHz = (sr / 2) / nBins;
    const edges = [];
    const fHi = Math.min(20000, sr * 0.47);
    for (let i = 0; i <= NB; i++) edges.push(Math.min(fHi, 20 * Math.pow(fHi / 20, i / NB)) / binHz);
    const fd = new Float32Array(nBins);
    const tdL = new Float32Array(2048), tdR = new Float32Array(2048);
    const f = blankFrame();

    return {
      name: kind, frame: f, ctx: ac,
      step() {
        anM.getFloatFrequencyData(fd);
        for (let i = 0; i < NB; i++) {
          const lo = edges[i], hi = Math.max(edges[i + 1], lo + 0.01);
          let v;
          if (hi - lo < 1.5) {
            const c = (lo + hi) * 0.5, i0 = Math.min(nBins - 2, Math.max(0, Math.floor(c))), fr = c - i0;
            v = fd[i0] * (1 - fr) + fd[i0 + 1] * fr;
          } else {
            v = -180;
            const a0 = Math.max(0, Math.floor(lo)), a1 = Math.min(nBins - 1, Math.ceil(hi));
            for (let k = a0; k <= a1; k++) if (fd[k] > v) v = fd[k];
          }
          let nv = (v + 82) / 62;
          f.bands[i] = nv < 0 ? 0 : nv > 1 ? 1 : nv;
        }
        anL.getFloatTimeDomainData(tdL);
        anR.getFloatTimeDomainData(tdR);
        let sum = 0, pk = 0, sl = 0, sr2 = 0;
        for (let i = 0; i < NW; i++) {
          const j = i * 4;
          const L = (tdL[j] + tdL[j + 1] + tdL[j + 2] + tdL[j + 3]) * 0.25;
          const R = (tdR[j] + tdR[j + 1] + tdR[j + 2] + tdR[j + 3]) * 0.25;
          f.wl[i] = L; f.wr[i] = R;
          const mo = (L + R) * 0.5;
          sum += mo * mo;
          const aa = Math.abs(mo); if (aa > pk) pk = aa;
          sl += L * L; sr2 += R * R;
        }
        f.rms = Math.sqrt(sum / NW); f.peak = pk;
        f.l = Math.sqrt(sl / NW); f.r = Math.sqrt(sr2 / NW);
      },
      stop() {
        try { if (stream) stream.getTracks().forEach(tr => tr.stop()); } catch (e) {}
        try { if (mediaEl) { mediaEl.pause(); mediaEl.src = ''; } } catch (e) {}
        try { if (objUrl) URL.revokeObjectURL(objUrl); } catch (e) {}
        try { ac.close(); } catch (e) {}
      }
    };
  };

  LUM.setSource = function (src) {
    if (LUM.source && LUM.source.stop) LUM.source.stop();
    LUM.source = src;
    if (LUM.ui && LUM.ui.onSourceChanged) LUM.ui.onSourceChanged();
  };
})();
