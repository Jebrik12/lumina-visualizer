/* Lumina — user media layer: image / GIF / video loaded as a live GL texture.
   Plugin mode: file served by the C++ resource provider at /media/current.
   Demo mode: object URL from a file input. GIFs decode via ImageDecoder (WebCodecs). */
(function () {
  'use strict';
  const LUM = window.LUM = window.LUM || {};

  const M = LUM.media = {
    ready: false, type: null, name: '', w: 2, h: 2,
    _el: null, _tex: null, _dirtyEveryFrame: false, _needsUpload: false,
    _gifFrames: null, _gifIndex: 0, _gifNext: 0, _objUrl: null,

    tex() {
      const gl = LUM.gl;
      if (!this._tex) {
        this._tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      }
      return this._tex;
    },

    clear() {
      this.ready = false; this.type = null; this.name = '';
      if (this._el && this._el.pause) { try { this._el.pause(); } catch (e) {} }
      this._el = null; this._gifFrames = null;
      if (this._objUrl) { try { URL.revokeObjectURL(this._objUrl); } catch (e) {} this._objUrl = null; }
      if (LUM.ui && LUM.ui.onMediaChanged) LUM.ui.onMediaChanged();
    },

    async load(url, ext, name, isObjectUrl) {
      this.clear();
      this.name = name || '';
      if (isObjectUrl) this._objUrl = url;
      ext = String(ext || '').toLowerCase().replace(/^\./, '');

      try {
        if (['mp4', 'webm'].includes(ext)) {
          const v = document.createElement('video');
          v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
          v.src = url;
          await v.play().catch(() => {});
          await new Promise(res => {
            if (v.readyState >= 2) return res();
            v.addEventListener('loadeddata', res, { once: true });
            v.addEventListener('error', res, { once: true });
          });
          if (!v.videoWidth) throw new Error('video failed');
          this._el = v; this.type = 'video';
          this.w = v.videoWidth; this.h = v.videoHeight;
          this._dirtyEveryFrame = true;
        } else if (ext === 'gif' && window.ImageDecoder) {
          const resp = await fetch(url);
          const buf = await resp.arrayBuffer();
          const dec = new ImageDecoder({ data: buf, type: 'image/gif' });
          await dec.tracks.ready;
          const track = dec.tracks.selectedTrack;
          const count = Math.min(track.frameCount || 1, 120);
          const frames = [];
          for (let i = 0; i < count; i++) {
            const r = await dec.decode({ frameIndex: i });
            const bmp = await createImageBitmap(r.image);
            frames.push({ bmp, dur: Math.max(20, (r.image.duration || 80000) / 1000) });
            r.image.close();
          }
          this._gifFrames = frames; this._gifIndex = 0; this._gifNext = 0;
          this.type = 'gif';
          this.w = frames[0].bmp.width; this.h = frames[0].bmp.height;
          this._dirtyEveryFrame = true;
        } else {
          const img = new Image();
          img.src = url;
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
          this._el = img; this.type = 'image';
          this.w = img.naturalWidth; this.h = img.naturalHeight;
          this._needsUpload = true;
        }
        this.ready = true;
        if (LUM.ui && LUM.ui.toast) LUM.ui.toast('Media loaded: ' + (this.name || this.type));
      } catch (e) {
        this.clear();
        if (LUM.ui && LUM.ui.toast) LUM.ui.toast('Could not load media' + (name ? ': ' + name : ''));
      }
      if (LUM.ui && LUM.ui.onMediaChanged) LUM.ui.onMediaChanged();
    },

    /* per-frame texture update */
    update(t) {
      if (!this.ready) return;
      const gl = LUM.gl;
      if (this.type === 'video') {
        const v = this._el;
        if (v && v.readyState >= 2) {
          gl.bindTexture(gl.TEXTURE_2D, this.tex());
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
        }
      } else if (this.type === 'gif' && this._gifFrames) {
        const now = t * 1000;
        if (now >= this._gifNext) {
          const f = this._gifFrames[this._gifIndex];
          gl.bindTexture(gl.TEXTURE_2D, this.tex());
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, f.bmp);
          this._gifIndex = (this._gifIndex + 1) % this._gifFrames.length;
          this._gifNext = now + f.dur;
        }
      } else if (this._needsUpload && this._el) {
        gl.bindTexture(gl.TEXTURE_2D, this.tex());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._el);
        this._needsUpload = false;
      }
    },

    /* pick a file: plugin → native chooser, demo → browser input */
    pick() {
      if (LUM.bridge.plugin) { LUM.emit('pickMedia', {}); return; }
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        this.load(url, ext, f.name, true);
      };
      inp.click();
    },

    remove() {
      if (LUM.bridge.plugin) LUM.emit('clearMedia', {});
      this.clear();
    }
  };
})();
