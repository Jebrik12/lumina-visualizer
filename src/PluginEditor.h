#pragma once

#include <juce_gui_extra/juce_gui_extra.h>

#include "PluginProcessor.h"

class LuminaAudioProcessorEditor : public juce::AudioProcessorEditor,
                                   private juce::Timer
{
public:
    explicit LuminaAudioProcessorEditor (LuminaAudioProcessor&);
    ~LuminaAudioProcessorEditor() override;

    void resized() override;
    void paint (juce::Graphics& g) override { g.fillAll (juce::Colours::black); }

    /* called by the processor when a session state was just restored */
    void pushStateToWeb();

private:
    void timerCallback() override;
    void sendInit();

    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);

    void onSaveState (const juce::var& payload);
    void onLoadUserPresets();
    void onSaveUserPresets (const juce::var& payload);
    void onCopyText (const juce::var& payload);
    void onRequestPaste();
    void onExportPreset (const juce::var& payload);
    void onImportPreset();

    juce::WebBrowserComponent::Options makeOptions();

    LuminaAudioProcessor& proc;
    AnalysisEngine::Frame frame;

    bool pageReady = false;
    std::unique_ptr<juce::FileChooser> fileChooser;

    juce::WebBrowserComponent webView;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LuminaAudioProcessorEditor)
};
