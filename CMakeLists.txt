cmake_minimum_required(VERSION 3.22)

project(Lumina VERSION 1.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

set(JUCE_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(JUCE_BUILD_EXTRAS OFF CACHE BOOL "" FORCE)

FetchContent_Declare(JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        8.0.15
    GIT_SHALLOW    TRUE)
FetchContent_MakeAvailable(JUCE)

juce_add_plugin(Lumina
    COMPANY_NAME "Lumina Audio"
    COMPANY_WEBSITE "https://github.com"
    BUNDLE_ID com.luminaaudio.lumina
    PLUGIN_MANUFACTURER_CODE Lmna
    PLUGIN_CODE Lmv1
    FORMATS VST3 Standalone
    PRODUCT_NAME "Lumina"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    COPY_PLUGIN_AFTER_BUILD FALSE
    NEEDS_WEB_BROWSER TRUE
    NEEDS_WEBVIEW2 TRUE
    MICROPHONE_PERMISSION_ENABLED FALSE
    VST3_CATEGORIES Fx Analyzer)

juce_add_binary_data(LuminaWebAssets
    HEADER_NAME BinaryData.h
    NAMESPACE BinaryData
    SOURCES
        ui/index.html
        ui/app.css
        ui/js/palettes.js
        ui/js/gl.js
        ui/js/audio.js
        ui/js/post.js
        ui/js/scenes_spectrum.js
        ui/js/scenes_waves.js
        ui/js/scenes_fractal.js
        ui/js/scenes_motion.js
        ui/js/scenes_texture.js
        ui/js/presets.js
        ui/js/bridge.js
        ui/js/ui.js
        ui/js/main.js)

target_sources(Lumina PRIVATE
    src/PluginProcessor.cpp
    src/PluginEditor.cpp)

target_include_directories(Lumina PRIVATE src)

target_compile_definitions(Lumina PRIVATE
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)

if(WIN32)
    target_compile_definitions(Lumina PRIVATE
        JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)
endif()

target_link_libraries(Lumina
    PRIVATE
        LuminaWebAssets
        juce::juce_audio_utils
        juce::juce_dsp
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)
