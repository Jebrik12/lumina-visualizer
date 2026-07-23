#!/usr/bin/env python3
"""Inline app.css and all js/*.js into a single self-contained demo HTML file."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def build(out_path):
    with open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()

    def inline_css(m):
        href = m.group(1)
        if href.startswith('http'):
            return m.group(0)
        with open(os.path.join(ROOT, href), 'r', encoding='utf-8') as f:
            return '<style>\n' + f.read() + '\n</style>'

    def inline_js(m):
        src = m.group(1)
        with open(os.path.join(ROOT, src), 'r', encoding='utf-8') as f:
            return '<script>\n' + f.read() + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('wrote %s (%d KB)' % (out_path, os.path.getsize(out_path) // 1024))


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'demo.html')
    build(out)
