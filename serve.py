"""Serve the portfolio locally with Unity WebGL Brotli headers enabled."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PortfolioHandler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        lowered = path.lower()
        for ext in (".br", ".gz"):
            if lowered.endswith(".wasm" + ext):
                return "application/wasm"
            if lowered.endswith(".js" + ext):
                return "application/javascript"
            if lowered.endswith(ext):
                return "application/octet-stream"
        return super().guess_type(path)

    def end_headers(self):
        # Unity WebGL builds ship pre-compressed files (Brotli .br or gzip .gz).
        request_path = self.path.split("?", 1)[0].lower()
        if request_path.endswith(".br"):
            self.send_header("Content-Encoding", "br")
            self.send_header("Vary", "Accept-Encoding")
        elif request_path.endswith(".gz"):
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Run a local portfolio preview server.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(PortfolioHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Portfolio preview: http://127.0.0.1:{args.port}/")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
