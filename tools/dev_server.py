"""
Простой локальный сервер для просмотра сайта БЕЗ Node.js.
Заявки не уходят в Telegram - они печатаются в этом окне.

Запуск:  python tools/dev_server.py      затем откройте http://localhost:8788

Для проверки настоящей функции functions/api/lead.js используйте
npx wrangler pages dev public  (см. README.md).
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
PORT = int(os.environ.get("PORT", "8788"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/lead":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(min(length, 8192))
        try:
            data = json.loads(raw or b"{}")
            print("\n[ТЕСТОВАЯ ЗАЯВКА]\n" + json.dumps(data, ensure_ascii=False, indent=2), flush=True)
            body, code = {"ok": True, "test": True}, 200
        except ValueError:
            body, code = {"ok": False, "error": "Неверный формат"}, 400
        out = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


if __name__ == "__main__":
    try:
        import sys
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(f"Сайт открыт на http://localhost:{PORT}  (остановить: Ctrl+C)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
