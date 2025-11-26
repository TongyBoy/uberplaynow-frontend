import http.server
import socketserver

PORT = 8080

class BrotliGzipHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Brotli
        if self.path.endswith(".br"):
            self.send_header("Content-Encoding", "br")
            if self.path.endswith(".js.br"):
                self.send_header("Content-Type", "application/javascript")
            elif self.path.endswith(".wasm.br"):
                self.send_header("Content-Type", "application/wasm")
            elif self.path.endswith(".data.br"):
                self.send_header("Content-Type", "application/octet-stream")
            elif self.path.endswith(".json.br"):
                self.send_header("Content-Type", "application/json")

        # Gzip
        elif self.path.endswith(".gz"):
            self.send_header("Content-Encoding", "gzip")
            if self.path.endswith(".js.gz"):
                self.send_header("Content-Type", "application/javascript")
            elif self.path.endswith(".wasm.gz"):
                self.send_header("Content-Type", "application/wasm")
            elif self.path.endswith(".data.gz"):
                self.send_header("Content-Type", "application/octet-stream")
            elif self.path.endswith(".json.gz"):
                self.send_header("Content-Type", "application/json")

        super().end_headers()

with socketserver.TCPServer(("", PORT), BrotliGzipHTTPRequestHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
