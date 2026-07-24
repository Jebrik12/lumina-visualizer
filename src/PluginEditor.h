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
    void setNativeFullscreen (bool shouldBeFullscreen);
    void setHostBarHidden (bool shouldHide);
    void applyHostWindowStyle();
    void dragHostWindow (int dx, int dy);
    void closeHostWindow();
    void sendMediaInfo();

    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);

    void onSaveState (const juce::var& payload);
    void onLoadUserPresets();
    void onSaveUserPresets (const juce::var& payload);
    void onCopyText (const juce::var& payload);
    void onRequestPaste();
    void onExportPreset (const juce::var& payload);
    void onImportPreset();
    void onPickMedia();

    juce::WebBrowserComponent::Options makeOptions();

    LuminaAudioProcessor& proc;
    AnalysisEngine::Frame frame;

    bool pageReady = false;
    std::unique_ptr<juce::FileChooser> fileChooser;

    juce::WebBrowserComponent webView;

    /* host-window styling (Windows): fullscreen + optional title-bar removal */
    bool fsActive = false;
    bool barHidden = false;
    bool styleCaptured = false;
    int fsPrevW = 1100, fsPrevH = 700;
    juce::int64 hostStyleOriginal = 0, hostExStyleOriginal = 0;
    int fsPrevRect[4] = { 0, 0, 0, 0 };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LuminaAudioProcessorEditor)
};
