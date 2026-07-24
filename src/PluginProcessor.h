#pragma once

#include <juce_audio_utils/juce_audio_utils.h>

#include "Analysis.h"

class LuminaAudioProcessor : public juce::AudioProcessor
{
public:
    LuminaAudioProcessor();
    ~LuminaAudioProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return "Default"; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    /* ---- shared with editor ---- */
    AnalysisEngine analysis;

    juce::String getUiState() const
    {
        const juce::ScopedLock sl (stateLock);
        return uiStateJson;
    }

    void setUiState (const juce::String& json)
    {
        const juce::ScopedLock sl (stateLock);
        uiStateJson = json;
    }

    juce::String getMediaPath() const
    {
        const juce::ScopedLock sl (stateLock);
        return mediaPath;
    }

    void setMediaPath (const juce::String& path)
    {
        const juce::ScopedLock sl (stateLock);
        mediaPath = path;
    }

    static juce::File getUserPresetsFile()
    {
        return juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                 .getChildFile ("Lumina")
                 .getChildFile ("userpresets.json");
    }

    std::atomic<int> editorW { 1100 }, editorH { 700 };

private:
    mutable juce::CriticalSection stateLock;
    juce::String uiStateJson;
    juce::String mediaPath;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LuminaAudioProcessor)
};
