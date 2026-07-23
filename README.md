# LUMINA — Audio Visualizer Plugin (VST3 + Standalone, Windows)

Lumina is a real-time audio visualizer plugin for Ableton Live (and any VST3 host).
It renders **20 unique GPU-shader scenes** driven by a live FFT/beat analysis of the
track it sits on — spectrum sculptures, oscilloscope art, raymarched fractals,
GPU particles, fluid dyes, reaction–diffusion, cymatics, retrowave landscapes and more —
through a **full post-FX chain** (bloom, motion trails, kaleidoscope, chromatic aberration,
film grain, scanlines, pixelate, hue/color grading), all inside a modern dark,
auto-hiding, resizable UI.

## Features

- **20 scenes** in 5 packs:
  - *Spectrum*: Spectra Bars · Orbital Rings · Waterfall (linear/circular) · Terrain Flight
  - *Waves*: Scope Suite (line / Lissajous XY / radial) · Waveform Tunnel · Harmonograph · Cymatics
  - *Fractal*: Julia Drift · Fractal Temple (raymarched Menger/Mandelbulb) · Warp Core (Milkdrop-style feedback) · Mandala
  - *Motion*: Particle Nebula (up to 65k GPU particles) · Ink Flow · Hyperdrive · Metaballs
  - *Texture*: Voronoi Bloom · Reaction Bloom (Gray–Scott) · Plasma · Retrowave
- **Every scene has its own parameters** (5–8 each), all editable live.
- **Global FX chain**: motion trails with zoom/spin/hue echo, dual-level bloom,
  chromatic aberration, vignette, film grain, scanlines, pixelate,
  kaleidoscope (3–16 fold), mirror modes, hue rotate, saturation/contrast/gamma/brightness.
- **14 curated palettes + custom 2-color palettes**, palette shift & auto-cycle.
- **Audio engine**: 2048-pt FFT → 96 log bands, attack/release smoothing, spectral tilt,
  auto-gain (AGC), noise gate, **beat detection with BPM estimate** — everything reacts musically.
- **47 factory presets**, user presets (stored globally, shared across projects),
  preset import/export as files or clipboard JSON.
- **Randomizer** (R), **shuffle mode** (auto-morphs the look every 32 beats),
  **focus mode** (F — pure visuals, UI hidden), auto-hiding UI, resizable window.
- **Per-instance state** is saved inside your Ableton project.
- Audio passes through untouched (zero latency, no processing).

## Install (Windows 10/11)

1. Download `Lumina-Windows.zip` from the [Releases](../../releases) page.
2. Unzip it.
3. Copy the **`Lumina.vst3` folder** into `C:\Program Files\Common Files\VST3\`
4. In Ableton Live: `Options → Preferences → Plug-Ins` → make sure **VST3** is enabled → click **Rescan**.
5. Drop **Lumina** (under *Lumina Audio*) onto any track — usually the **Master** track.
   Audio passes through unchanged; the visuals react to whatever the track carries.
6. Resize the window as you like, double-click the canvas (or press `F`) for pure full-window visuals.

`Lumina.exe` (Standalone) also works without a DAW — pick any input device in its audio settings.

> **Requirements:** Windows 10/11 with the Microsoft Edge **WebView2 Runtime**
> (preinstalled on all updated systems; otherwise grab it from
> https://developer.microsoft.com/microsoft-edge/webview2/) and any GPU from ~2015+.
> Live 10.1+ for VST3 support (tested with Live 11/12).

## Shortcuts

| Key | Action |
|-----|--------|
| `F` / double-click | Focus mode (pure visuals) |
| `Esc` | Exit focus / close dialog |
| `R` / `Shift+R` | Randomize look / randomize scene too |
| `S` | Shuffle presets on beat |
| `← →` | Previous / next preset |
| `↑ ↓` | Previous / next scene |
| `H` | Help |

## Building from source

Requirements: CMake 3.22+, MSVC (Visual Studio 2022), git.

```powershell
# WebView2 SDK (once):
nuget install Microsoft.Web.WebView2 -OutputDirectory "$env:USERPROFILE\AppData\Local\PackageManagement\NuGet\Packages"

cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
```

Artefacts land in `build/Lumina_artefacts/Release/` (`VST3/Lumina.vst3`, `Standalone/Lumina.exe`).
JUCE 8.0.15 is fetched automatically. CI builds run on GitHub Actions (see `.github/workflows/build.yml`)
and are validated with [pluginval](https://github.com/Tracktion/pluginval) at strictness 10.

## Architecture

- **C++ (JUCE 8)** — audio pass-through, lock-free capture ring, 2048-pt FFT,
  96 log-spaced bands, L/R waveforms, levels — streamed at 60 fps into the UI as
  base64 `Float32Array`s over the WebView event bridge.
- **Web UI (WebView2 + WebGL2)** — all 20 scenes are GLSL shaders (including GPU particle
  simulation, semi-Lagrangian dye advection and Gray–Scott reaction–diffusion sims),
  post-FX chain with feedback buffers and dual-level bloom, beat detection, presets, UI.
- A single-file **web demo** of the same engine (simulated audio / mic / tab audio / file)
  can be built with `python3 ui/build_demo.py`.

## License

[AGPL-3.0](LICENSE) — built with [JUCE 8](https://juce.com) under its AGPLv3 option.
