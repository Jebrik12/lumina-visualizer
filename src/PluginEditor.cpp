#include "PluginEditor.h"
#include "WebAssets.h"

#if JUCE_WINDOWS
 #define WIN32_LEAN_AND_MEAN
 #include <windows.h>
#endif

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
    setNativeFullscreen (false);
    stopTimer();
}

void LuminaAudioProcessorEditor::resized()
{
    webView.setBounds (getLocalBounds());
    if (! fsActive)
    {
        proc.editorW = getWidth();
        proc.editorH = getHeight();
    }
}

/*  Fullscreen: instead of moving the WebView into another window (unreliable with
    WebView2), we make the HOST's plugin window borderless and stretch it across the
    monitor, resizing the editor to match. On exit everything is restored exactly. */
void LuminaAudioProcessorEditor::setNativeFullscreen (bool shouldBeFullscreen)
{
   #if JUCE_WINDOWS
    if (shouldBeFullscreen == fsActive)
        return;

    auto* peer = getPeer();
    if (peer == nullptr)
        return;

    HWND child = (HWND) peer->getNativeHandle();
    HWND top = GetAncestor (child, GA_ROOT);
    if (top == nullptr)
        return;

    if (shouldBeFullscreen)
    {
        fsPrevW = getWidth();
        fsPrevH = getHeight();
        fsPrevStyle = (juce::int64) GetWindowLongPtr (top, GWL_STYLE);
        fsPrevExStyle = (juce::int64) GetWindowLongPtr (top, GWL_EXSTYLE);
        RECT r {};
        GetWindowRect (top, &r);
        fsPrevRect[0] = r.left; fsPrevRect[1] = r.top;
        fsPrevRect[2] = r.right - r.left; fsPrevRect[3] = r.bottom - r.top;

        HMONITOR mon = MonitorFromWindow (top, MONITOR_DEFAULTTONEAREST);
        MONITORINFO mi {};
        mi.cbSize = sizeof (MONITORINFO);
        GetMonitorInfo (mon, &mi);
        const int mw = mi.rcMonitor.right - mi.rcMonitor.left;
        const int mh = mi.rcMonitor.bottom - mi.rcMonitor.top;

        /* logical (JUCE) size of the same monitor for the editor itself */
        const auto& displays = juce::Desktop::getInstance().getDisplays();
        const auto* display = displays.getDisplayForRect (getScreenBounds());
        if (display == nullptr) display = displays.getPrimaryDisplay();
        const auto logical = display != nullptr ? display->totalArea : juce::Rectangle<int> (0, 0, mw, mh);

        fsActive = true;

        SetWindowLongPtr (top, GWL_STYLE,
                          (LONG_PTR) ((fsPrevStyle & ~(LONG_PTR) (WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)) | WS_POPUP));
        SetWindowPos (top, HWND_TOPMOST, mi.rcMonitor.left, mi.rcMonitor.top, mw, mh,
                      SWP_FRAMECHANGED | SWP_SHOWWINDOW | SWP_NOOWNERZORDER);
        setSize (logical.getWidth(), logical.getHeight());
        SetWindowPos (top, HWND_TOPMOST, mi.rcMonitor.left, mi.rcMonitor.top, mw, mh,
                      SWP_FRAMECHANGED | SWP_SHOWWINDOW | SWP_NOOWNERZORDER);
    }
    else
    {
        fsActive = false;

        SetWindowLongPtr (top, GWL_STYLE, (LONG_PTR) fsPrevStyle);
        SetWindowLongPtr (top, GWL_EXSTYLE, (LONG_PTR) fsPrevExStyle);
        setSize (fsPrevW, fsPrevH);
        SetWindowPos (top, HWND_NOTOPMOST, fsPrevRect[0], fsPrevRect[1], fsPrevRect[2], fsPrevRect[3],
                      SWP_FRAMECHANGED | SWP_SHOWWINDOW | SWP_NOOWNERZORDER);
    }
   #else
    juce::ignoreUnused (shouldBeFullscreen);
   #endif

    auto obj = std::make_unique<juce::DynamicObject>();
    obj->setProperty ("on", fsActive);
    webView.emitEventIfBrowserIsVisible ("fullscreenState", juce::var (obj.release()));
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
        .withEventListener ("importPreset", [this] (const juce::var&) { onImportPreset(); })
        .withEventListener ("setFullscreen", [this] (const juce::var& v)
                            { setNativeFullscreen ((bool) propOr (v, "on", false)); })
        .withEventListener ("pickMedia", [this] (const juce::var&) { onPickMedia(); })
        .withEventListener ("clearMedia", [this] (const juce::var&)
                            {
                                proc.setMediaPath ("");
                                sendMediaInfo();
                            });
}

void LuminaAudioProcessorEditor::sendInit()
{
    auto obj = std::make_unique<juce::DynamicObject>();
    obj->setProperty ("state", proc.getUiState());
    obj->setProperty ("sampleRate", proc.getSampleRate() > 0 ? proc.getSampleRate() : 48000.0);
    obj->setProperty ("version", JucePlugin_VersionString);

    const auto mediaPath = proc.getMediaPath();
    if (mediaPath.isNotEmpty() && juce::File (mediaPath).existsAsFile())
    {
        juce::File f (mediaPath);
        obj->setProperty ("mediaName", f.getFileName());
        obj->setProperty ("mediaExt", f.getFileExtension().toLowerCase());
        obj->setProperty ("mediaUrl", "/media/current?v=" + juce::String (juce::Random::getSystemRandom().nextInt (1 << 30)));
    }

    webView.emitEventIfBrowserIsVisible ("init", juce::var (obj.release()));
}

void LuminaAudioProcessorEditor::sendMediaInfo()
{
    auto obj = std::make_unique<juce::DynamicObject>();
    const auto mediaPath = proc.getMediaPath();
    if (mediaPath.isNotEmpty() && juce::File (mediaPath).existsAsFile())
    {
        juce::File f (mediaPath);
        obj->setProperty ("name", f.getFileName());
        obj->setProperty ("ext", f.getFileExtension().toLowerCase());
        obj->setProperty ("url", "/media/current?v=" + juce::String (juce::Random::getSystemRandom().nextInt (1 << 30)));
    }
    webView.emitEventIfBrowserIsVisible ("mediaInfo", juce::var (obj.release()));
}

void LuminaAudioProcessorEditor::onPickMedia()
{
    fileChooser = std::make_unique<juce::FileChooser> (
        "Load image / GIF / video",
        juce::File::getSpecialLocation (juce::File::userPicturesDirectory),
        "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.mp4;*.webm");

    juce::Component::SafePointer<LuminaAudioProcessorEditor> safe (this);

    fileChooser->launchAsync (juce::FileBrowserComponent::openMode
                                  | juce::FileBrowserComponent::canSelectFiles,
                              [safe] (const juce::FileChooser& fc)
                              {
                                  if (safe == nullptr)
                                      return;
                                  auto f = fc.getResult();
                                  if (f == juce::File {} || ! f.existsAsFile())
                                      return;
                                  auto dir = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                                                 .getChildFile ("Lumina")
                                                 .getChildFile ("media");
                                  dir.createDirectory();
                                  auto dest = dir.getChildFile (f.getFileName());
                                  if (f.getFullPathName() == dest.getFullPathName() || f.copyFileTo (dest))
                                  {
                                      safe->proc.setMediaPath (dest.getFullPathName());
                                      safe->sendMediaInfo();
                                  }
                              });
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
    if (path.contains ("?"))
        path = path.upToFirstOccurrenceOf ("?", false, false);
    if (path.isEmpty())
        path = "index.html";

    if (path == "media/current")
    {
        const auto mediaPath = proc.getMediaPath();
        juce::File f (mediaPath);
        if (mediaPath.isNotEmpty() && f.existsAsFile())
        {
            juce::MemoryBlock mb;
            if (f.loadFileAsData (mb))
            {
                const auto ext = f.getFileExtension().toLowerCase();
                juce::String mime = "application/octet-stream";
                if (ext == ".png") mime = "image/png";
                else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                else if (ext == ".webp") mime = "image/webp";
                else if (ext == ".gif") mime = "image/gif";
                else if (ext == ".mp4") mime = "video/mp4";
                else if (ext == ".webm") mime = "video/webm";
                const auto* bytes = static_cast<const std::byte*> (mb.getData());
                return juce::WebBrowserComponent::Resource {
                    std::vector<std::byte> (bytes, bytes + mb.getSize()), mime
                };
            }
        }
        return std::nullopt;
    }

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
