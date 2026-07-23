#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include <array>
#include <atomic>
#include <cmath>

/*
    AnalysisEngine — lock-free audio capture + FFT feature extraction.

    The audio thread pushes samples into a ring buffer (single writer).
    The editor's message-thread timer calls compute() ~60x/s, which:
      - snapshots the most recent 2048 samples
      - computes a Hann-windowed FFT
      - folds bins into 96 log-spaced bands (20 Hz .. 20 kHz), mapped to
        a normalized dB scale [-72 dB .. -6 dB] -> [0 .. 1]
      - decimates the last 2048 samples into 512 L/R waveform points
      - measures rms / peak / per-channel levels

    All smoothing, tilt, AGC and beat detection happen in the web UI so the
    user's response controls act instantly without an audio round-trip.
*/
class AnalysisEngine
{
public:
    static constexpr int numBands = 96;
    static constexpr int numWave  = 512;
    static constexpr int fftOrder = 11;
    static constexpr int fftSize  = 1 << fftOrder;   // 2048
    static constexpr int ringSize = 1 << 14;         // 16384
    static constexpr int ringMask = ringSize - 1;

    AnalysisEngine()
    {
        for (int i = 0; i < fftSize; ++i)
            window[(size_t) i] = 0.5f * (1.0f - std::cos (juce::MathConstants<float>::twoPi * (float) i / (float) (fftSize - 1)));
        ringL.fill (0.0f);
        ringR.fill (0.0f);
    }

    void prepare (double newSampleRate) noexcept
    {
        sampleRate.store (newSampleRate > 8000.0 ? newSampleRate : 48000.0);
    }

    /* audio thread */
    void push (const float* l, const float* r, int n) noexcept
    {
        auto w = writePos.load (std::memory_order_relaxed);
        for (int i = 0; i < n; ++i)
        {
            ringL[(size_t) ((w + i) & ringMask)] = l[i];
            ringR[(size_t) ((w + i) & ringMask)] = r[i];
        }
        writePos.store ((w + n) & ringMask, std::memory_order_release);
    }

    struct Frame
    {
        float bands[numBands];
        float wl[numWave];
        float wr[numWave];
        float rms = 0.0f, peak = 0.0f, l = 0.0f, r = 0.0f;
    };

    /* message thread */
    void compute (Frame& f)
    {
        const double sr = sampleRate.load();
        if (std::abs (sr - bandsSampleRate) > 1.0)
            rebuildBandEdges (sr);

        const auto w = writePos.load (std::memory_order_acquire);

        double sumSq = 0.0, sumL = 0.0, sumR = 0.0;
        float pk = 0.0f;

        for (int i = 0; i < fftSize; ++i)
        {
            const auto idx = (size_t) ((w - fftSize + i + ringSize) & ringMask);
            const float L = ringL[idx];
            const float R = ringR[idx];
            const float mono = (L + R) * 0.5f;
            tmpL[(size_t) i] = L;
            tmpR[(size_t) i] = R;
            fftBuf[(size_t) i] = mono * window[(size_t) i];
            sumSq += (double) mono * mono;
            sumL  += (double) L * L;
            sumR  += (double) R * R;
            const float a = std::abs (mono);
            if (a > pk) pk = a;
        }

        std::fill (fftBuf.begin() + fftSize, fftBuf.end(), 0.0f);

        f.rms  = (float) std::sqrt (sumSq / fftSize);
        f.peak = pk;
        f.l    = (float) std::sqrt (sumL / fftSize);
        f.r    = (float) std::sqrt (sumR / fftSize);

        /* waveform: 2048 -> 512 with 4x averaging */
        for (int i = 0; i < numWave; ++i)
        {
            const int j = i * 4;
            f.wl[i] = (tmpL[(size_t) j] + tmpL[(size_t) j + 1] + tmpL[(size_t) j + 2] + tmpL[(size_t) j + 3]) * 0.25f;
            f.wr[i] = (tmpR[(size_t) j] + tmpR[(size_t) j + 1] + tmpR[(size_t) j + 2] + tmpR[(size_t) j + 3]) * 0.25f;
        }

        fft.performFrequencyOnlyForwardTransform (fftBuf.data());

        /* amplitude normalization: full-scale sine (Hann coherent gain 0.5) -> ~1.0 */
        const float norm = 4.0f / (float) fftSize;
        const int   nBins = fftSize / 2;

        for (int b = 0; b < numBands; ++b)
        {
            const float lo = binEdges[(size_t) b];
            const float hi = binEdges[(size_t) b + 1];
            float mag;

            if (hi - lo < 1.5f)
            {
                const float c  = juce::jlimit (0.0f, (float) (nBins - 2), (lo + hi) * 0.5f);
                const int   i0 = (int) c;
                const float fr = c - (float) i0;
                mag = fftBuf[(size_t) i0] * (1.0f - fr) + fftBuf[(size_t) i0 + 1] * fr;
            }
            else
            {
                mag = 0.0f;
                const int a0 = juce::jlimit (0, nBins - 1, (int) std::floor (lo));
                const int a1 = juce::jlimit (0, nBins - 1, (int) std::ceil  (hi));
                for (int k = a0; k <= a1; ++k)
                    mag = juce::jmax (mag, fftBuf[(size_t) k]);
            }

            const float db = 20.0f * std::log10 (mag * norm + 1.0e-7f);
            f.bands[b] = juce::jlimit (0.0f, 1.0f, (db + 72.0f) / 66.0f);
        }
    }

private:
    void rebuildBandEdges (double sr)
    {
        bandsSampleRate = sr;
        const double binHz = sr / (double) fftSize;
        const double fLo = 20.0;
        const double fHi = juce::jmin (20000.0, sr * 0.47);
        for (int i = 0; i <= numBands; ++i)
        {
            const double f = fLo * std::pow (fHi / fLo, (double) i / (double) numBands);
            binEdges[(size_t) i] = (float) (f / binHz);
        }
    }

    juce::dsp::FFT fft { fftOrder };
    std::array<float, ringSize> ringL {}, ringR {};
    std::atomic<int> writePos { 0 };
    std::atomic<double> sampleRate { 48000.0 };

    std::array<float, (size_t) fftSize * 2> fftBuf {};
    std::array<float, fftSize> tmpL {}, tmpR {}, window {};
    std::array<float, numBands + 1> binEdges {};
    double bandsSampleRate = 0.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AnalysisEngine)
};
