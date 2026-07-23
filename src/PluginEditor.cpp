#include "PluginEditor.h"
#include "WebAssets.h"

namespace
{
    juce::var propOr (const juce::var& v, const juce::Identifier& key, const juce::var& fallback)
    {
        if (auto* obj = v.getDynamicObject())
            if (obj->hasProperty (key))
                return obj->getProperty (key);
        return fallback;
    }
}

LuminaAudioProcessorEditor::LuminaAudioProcessorEditor (LuminaAudioProcessor& p)
    : AudioProcessorEditor (&p),
      proc (p),
      webView (makeOptions())
{
    addAndMakeVisible (webView);

    setResizable (true, true);
    setResizeLimits (760, 480, 8192, 8192);
    setSize (juce::jmax (760, proc.editorW.load()),
             juce::jmax (480, proc.editorH.load()));

    webView.goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    startTimerHz (60);
}

LuminaAudioProcessorEditor::~LuminaAudioProcessorEditor()
{
    stopTimer();
}

void LuminaAudioProcessorEditor::resized()
{
    webView.setBounds (getLocalBounds());
    proc.editorW = getWidth();
    proc.editorH = getHeight();
}

/* ---------------- options + event wiring ---------------- */

juce::WebBrowserComponent::Options LuminaAudioProcessorEditor::makeOptions()
{
    using WB = juce::WebBrowserComponent;

    auto userData = juce::File::getSpecialLocation (juce::File::tempDirectory)
                        .getChildFile ("LuminaWebView2");

    return WB::Options {}
        .withBackend (WB::Options::Backend::webview2)
        .withWinWebView2Options (WB::Options::WinWebView2 {}
                                     .withUserDataFolder (userData)
                                     .withBackgroundColour (juce::Colours::black))
        .withNativeIntegrationEnabled()
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withResourceProvider ([this] (const juce::String& url)
                               { return getResource (url); })
        .withEventListener ("uiReady", [this] (const juce::var&)
                            {
                                pageReady = true;
                                sendInit();
                            })
        .withEventListener ("saveState", [this] (const juce::var& v) { onSaveState (v); })
        .withEventListener ("loadUserPresets", [this] (const juce::var&) { onLoadUserPresets(); })
        .withEventListener ("saveUserPresets", [this] (const juce::var& v) { onSaveUserPresets (v); })
        .withEventListener ("copyText", [this] (const juce::var& v) { onCopyText (v); })
        .withEventListener ("requestPaste", [this] (const juce::var&) { onRequestPaste(); })
        .withEventListener ("exportPreset", [this] (const juce::var& v) { onExportPreset (v); })
        .withEventListener ("importPreset", [this] (const juce::var&) { onImportPreset(); });
}

void LuminaAudioProcessorEditor::sendInit()
{
    auto obj = std::make_unique<juce::DynamicObject>();
    obj->setProperty ("state", proc.getUiState());
    obj->setProperty ("sampleRate", proc.getSampleRate() > 0 ? proc.getSampleRate() : 48000.0);
    obj->setProperty ("version", JucePlugin_VersionString);
    webView.emitEventIfBrowserIsVisible ("init", juce::var (obj.release()));
}

void LuminaAudioProcessorEditor::pushStateToWeb()
{
    if (pageReady)
        sendInit();
}

/* ---------------- per-frame audio data ---------------- */

void LuminaAudioProcessorEditor::timerCallback()
{
    if (! pageReady)
        return;

    proc.analysis.compute (frame);

    auto obj = std::make_unique<juce::DynamicObject>();
    obj->setProperty ("b",  juce::Base64::toBase64 (frame.bands, sizeof (frame.bands)));
    obj->setProperty ("wl", juce::Base64::toBase64 (frame.wl, sizeof (frame.wl)));
    obj->setProperty ("wr", juce::Base64::toBase64 (frame.wr, sizeof (frame.wr)));
    obj->setProperty ("rms", frame.rms);
    obj->setProperty ("pk",  frame.peak);
    obj->setProperty ("l",   frame.l);
    obj->setProperty ("r",   frame.r);

    webView.emitEventIfBrowserIsVisible ("audioFrame", juce::var (obj.release()));
}

/* ---------------- resource provider ---------------- */

std::optional<juce::WebBrowserComponent::Resource>
LuminaAudioProcessorEditor::getResource (const juce::String& url)
{
    auto path = url.startsWith ("/") ? url.substring (1) : url;
    if (path.isEmpty())
        path = "index.html";

    for (const auto& asset : kWebAssets)
    {
        if (path == asset.path)
        {
            const auto* bytes = reinterpret_cast<const std::byte*> (asset.data);
            return juce::WebBrowserComponent::Resource {
                std::vector<std::byte> (bytes, bytes + asset.size),
                juce::String (asset.mime)
            };
        }
    }

    return std::nullopt;
}

/* ---------------- bridge events ---------------- */

void LuminaAudioProcessorEditor::onSaveState (const juce::var& payload)
{
    const auto json = propOr (payload, "json", "").toString();
    if (json.isNotEmpty())
        proc.setUiState (json);
}

void LuminaAudioProcessorEditor::onLoadUserPresets()
{
    const auto file = LuminaAudioProcessor::getUserPresetsFile();
    auto obj = std::make_unique<juce::DynamicObject>();
    obj->setProperty ("json", file.existsAsFile() ? file.loadFileAsString() : juce::String());
    webView.emitEventIfBrowserIsVisible ("userPresets", juce::var (obj.release()));
}

void LuminaAudioProcessorEditor::onSaveUserPresets (const juce::var& payload)
{
    const auto json = propOr (payload, "json", "").toString();
    auto file = LuminaAudioProcessor::getUserPresetsFile();
    file.getParentDirectory().createDirectory();
    file.replaceWithText (json);
}

void LuminaAudioProcessorEditor::onCopyText (const juce::var& payload)
{
    juce::SystemClipboard::copyTextToClipboard (propOr (payload, "text", "").toString());
}

void LuminaAudioProcessorEditor::onRequestPaste()
{
    auto obj = std::make_unique<juce::DynamicObject>();
    obj->setProperty ("text", juce::SystemClipboard::getTextFromClipboard());
    webView.emitEventIfBrowserIsVisible ("pasteText", juce::var (obj.release()));
}

void LuminaAudioProcessorEditor::onExportPreset (const juce::var& payload)
{
    const auto json = propOr (payload, "json", "").toString();
    auto name = propOr (payload, "name", "lumina-preset").toString()
                    .retainCharacters ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_");
    if (name.isEmpty())
        name = "lumina-preset";

    auto start = juce::File::getSpecialLocation (juce::File::userDocumentsDirectory)
                     .getChildFile (name + ".luminapreset");

    fileChooser = std::make_unique<juce::FileChooser> ("Export Lumina preset", start,
                                                       "*.luminapreset;*.json");

    fileChooser->launchAsync (juce::FileBrowserComponent::saveMode
                                  | juce::FileBrowserComponent::warnAboutOverwriting,
                              [json] (const juce::FileChooser& fc)
                              {
                                  auto file = fc.getResult();
                                  if (file != juce::File {})
                                      file.replaceWithText (json);
                              });
}

void LuminaAudioProcessorEditor::onImportPreset()
{
    fileChooser = std::make_unique<juce::FileChooser> ("Import Lumina preset",
                                                       juce::File::getSpecialLocation (juce::File::userDocumentsDirectory),
                                                       "*.luminapreset;*.json");

    juce::Component::SafePointer<LuminaAudioProcessorEditor> safeThis (this);

    fileChooser->launchAsync (juce::FileBrowserComponent::openMode
                                  | juce::FileBrowserComponent::canSelectFiles,
                              [safeThis] (const juce::FileChooser& fc)
                              {
                                  if (safeThis == nullptr)
                                      return;

                                  auto file = fc.getResult();
                                  if (file == juce::File {} || ! file.existsAsFile())
                                      return;

                                  auto obj = std::make_unique<juce::DynamicObject>();
                                  obj->setProperty ("json", file.loadFileAsString());
                                  safeThis->webView.emitEventIfBrowserIsVisible ("importedPreset",
                                                                                 juce::var (obj.release()));
                              });
}
