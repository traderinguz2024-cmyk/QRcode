import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent


class SPARequestHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".svg": "image/svg+xml; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlsplit(self.path)
        request_path = parsed.path.strip("/") or "index.html"
        target = ROOT / request_path

        if target.exists() and target.is_file():
            return super().do_GET()

        self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    bind_host = os.getenv("FRONTEND_BIND_HOST", "localhost").strip() or "localhost"
    bind_port = int(os.getenv("FRONTEND_BIND_PORT", "4173"))
    public_url = os.getenv("FRONTEND_PUBLIC_URL", "https://qr.akadmvd.uz").strip() or "https://qr.akadmvd.uz"
    server = ThreadingHTTPServer((bind_host, bind_port), SPARequestHandler)
    print(f"Frontend running at {public_url}")
    server.serve_forever()
