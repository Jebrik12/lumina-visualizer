#pragma once

#include "BinaryData.h"

/* Static mapping from resource-provider paths to embedded binary assets. */
struct WebAsset
{
    const char* path;
    const char* data;
    int size;
    const char* mime;
};

static const WebAsset kWebAssets[] =
{
    { "index.html",            BinaryData::index_html,          BinaryData::index_htmlSize,          "text/html"              },
    { "app.css",               BinaryData::app_css,             BinaryData::app_cssSize,             "text/css"               },
    { "js/palettes.js",        BinaryData::palettes_js,         BinaryData::palettes_jsSize,         "application/javascript" },
    { "js/icons.js",           BinaryData::icons_js,            BinaryData::icons_jsSize,            "application/javascript" },
    { "js/widgets.js",         BinaryData::widgets_js,          BinaryData::widgets_jsSize,          "application/javascript" },
    { "js/media.js",           BinaryData::media_js,            BinaryData::media_jsSize,            "application/javascript" },
    { "js/layout.js",          BinaryData::layout_js,           BinaryData::layout_jsSize,           "application/javascript" },
    { "js/gl.js",              BinaryData::gl_js,               BinaryData::gl_jsSize,               "application/javascript" },
    { "js/audio.js",           BinaryData::audio_js,            BinaryData::audio_jsSize,            "application/javascript" },
    { "js/post.js",            BinaryData::post_js,             BinaryData::post_jsSize,             "application/javascript" },
    { "js/scenes_spectrum.js", BinaryData::scenes_spectrum_js,  BinaryData::scenes_spectrum_jsSize,  "application/javascript" },
    { "js/scenes_waves.js",    BinaryData::scenes_waves_js,     BinaryData::scenes_waves_jsSize,     "application/javascript" },
    { "js/scenes_fractal.js",  BinaryData::scenes_fractal_js,   BinaryData::scenes_fractal_jsSize,   "application/javascript" },
    { "js/scenes_motion.js",   BinaryData::scenes_motion_js,    BinaryData::scenes_motion_jsSize,    "application/javascript" },
    { "js/scenes_texture.js",  BinaryData::scenes_texture_js,   BinaryData::scenes_texture_jsSize,   "application/javascript" },
    { "js/scenes_minimal.js",  BinaryData::scenes_minimal_js,   BinaryData::scenes_minimal_jsSize,   "application/javascript" },
    { "js/scenes_meters.js",   BinaryData::scenes_meters_js,    BinaryData::scenes_meters_jsSize,    "application/javascript" },
    { "js/presets.js",         BinaryData::presets_js,          BinaryData::presets_jsSize,          "application/javascript" },
    { "js/bridge.js",          BinaryData::bridge_js,           BinaryData::bridge_jsSize,           "application/javascript" },
    { "js/ui.js",              BinaryData::ui_js,               BinaryData::ui_jsSize,               "application/javascript" },
    { "js/main.js",            BinaryData::main_js,             BinaryData::main_jsSize,             "application/javascript" }
};
