#!/usr/bin/env python3
"""Tiny dev server that serves the project root with Cache-Control: no-store.

Why a custom server? Python's plain http.server sends Last-Modified but no
Cache-Control, so Chrome happily heuristic-caches our JS modules — when we
edit a file mid-iteration, the browser keeps importing the old version and
imports like `from './state.js'` resolve to a stale module. Setting
`Cache-Control: no-store` makes every reload pull a fresh copy from disk,
which is what we want during development.
"""

import http.server
import os
import sys

PORT = int(os.environ.get('PORT', '3460'))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def main():
    os.chdir(ROOT)
    addr = ('', PORT)
    httpd = http.server.ThreadingHTTPServer(addr, NoCacheHandler)
    print(f'Serving {ROOT} on http://localhost:{PORT} (no-cache)')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


if __name__ == '__main__':
    main()
