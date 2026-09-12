# Servidor local do site, sem cache — assim editar um arquivo e dar F5 sempre mostra a versao nova.
# Uso: python serve.py [porta]

import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    # sem esses cabecalhos o navegador nunca recebe um 304 com conteudo velho
    def do_GET(self):
        for header in ('If-Modified-Since', 'If-None-Match'):
            if header in self.headers:
                del self.headers[header]
        super().do_GET()


# threaded: uma conexao lenta (ou um preconnect do Chrome) nao pode travar o servidor
class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with Server(('127.0.0.1', PORT), NoCacheHandler) as httpd:
        print(f'My Place em http://127.0.0.1:{PORT}  (cache desligado)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nservidor encerrado')
