#pragma once

#include <juce_gui_extra/juce_gui_extra.h>

#include "PluginProcessor.h"

/* Borderless fullscreen shell the WebView reparents into (true fullscreen, no host title bar). */
class FullscreenShell : public juce::Component
{
public:
    explicit FullscreenShell (std::function<void()> exitFn) : onExit (std::move (exitFn))
    {
        setOpaque (true);
        setWantsKeyboardFocus (true);
    }

    void paint (juce::Graphics& g) override { g.fillAll (juce::Colours::black); }

    void resized() override
    {
        for (int i = 0; i < getNumChildComponents(); ++i)
            getChildComponent (i)->setBounds (getLocalBounds());
    }

    bool keyPressed (const juce::KeyPress& key) override
    {
        if (key == juce::KeyPress::escapeKey && onExit != nullptr) { onExit(); return true; }
        return false;
    }

    void userTriedToCloseWindow() override { if (onExit != nullptr) onExit(); }

private:
    std::function<void()> onExit;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (FullscreenShell)
};

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
    std::unique_ptr<FullscreenShell> fsShell;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LuminaAudioProcessorEditor)
};
