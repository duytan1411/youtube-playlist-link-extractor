import os
import re
import sys
import webbrowser
import threading
from urllib.parse import parse_qs, urlparse
from flask import Flask, render_template, request, jsonify, Response, send_from_directory
import yt_dlp

# Ensure UTF-8 output on Windows console
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
template_dir = os.path.join(BASE_DIR, "templates")

app = Flask(
    __name__,
    static_folder=static_dir,
    template_folder=template_dir
)

# Vercel Path Fix Middleware
# When Vercel rewrites requests to /api/index, it passes the original URL in HTTP_X_MATCHED_PATH
class VercelPathFixMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        matched = environ.get("HTTP_X_MATCHED_PATH")
        if matched:
            environ["PATH_INFO"] = matched
        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathFixMiddleware(app.wsgi_app)

def get_index_html():
    possible_paths = [
        os.path.join(BASE_DIR, "templates", "index.html"),
        os.path.join(BASE_DIR, "index.html"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates", "index.html"),
        os.path.join(os.getcwd(), "templates", "index.html"),
        os.path.join(os.getcwd(), "api", "templates", "index.html"),
    ]
    for p in possible_paths:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass
    try:
        return render_template("index.html")
    except Exception:
        return "<h1>YouTube Playlist Link Extractor</h1>"

def normalize_playlist_url(url_or_id: str) -> str:
    s = url_or_id.strip()
    if not s:
        return ""
    if "list=" in s:
        parsed = urlparse(s)
        query = parse_qs(parsed.query)
        if "list" in query and query["list"]:
            playlist_id = query["list"][0]
            return f"https://www.youtube.com/playlist?list={playlist_id}"
    if re.match(r"^[a-zA-Z0-9_\-]+$", s) and len(s) >= 10:
        return f"https://www.youtube.com/playlist?list={s}"
    return s

def format_duration(seconds):
    if not seconds:
        return ""
    try:
        s = int(seconds)
        m, sec = divmod(s, 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{h}:{m:02d}:{sec:02d}"
        return f"{m}:{sec:02d}"
    except Exception:
        return ""

@app.route("/")
@app.route("/index")
@app.route("/api")
@app.route("/api/index", methods=["GET", "POST"])
@app.route("/api/index.py", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        return extract_playlist()
    return Response(get_index_html(), mimetype="text/html; charset=utf-8")

@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.route("/api/extract", methods=["GET", "POST"])
@app.route("/extract", methods=["GET", "POST"])
def extract_playlist():
    if request.method == "GET":
        raw_input = request.args.get("url", "").strip()
    else:
        data = request.get_json(silent=True) or {}
        raw_input = data.get("url", "").strip()
        if not raw_input and request.form:
            raw_input = request.form.get("url", "").strip()

    if not raw_input:
        return jsonify({"success": False, "error": "Vui lòng nhập link hoặc ID playlist YouTube"}), 400

    playlist_url = normalize_playlist_url(raw_input)

    ydl_opts = {
        "extract_flat": "in_playlist",
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            if not info:
                return jsonify({"success": False, "error": "Không tìm thấy dữ liệu từ link được cung cấp"}), 404

            entries_raw = info.get("entries")
            if entries_raw is None:
                video_id = info.get("id")
                if video_id:
                    video_url = f"https://www.youtube.com/watch?v={video_id}"
                    entry = {
                        "index": 1,
                        "id": video_id,
                        "title": info.get("title", "Video không tiêu đề"),
                        "url": video_url,
                        "duration": format_duration(info.get("duration")),
                        "thumbnail": info.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                        "channel": info.get("uploader") or info.get("channel") or "Unknown"
                    }
                    return jsonify({
                        "success": True,
                        "playlist_title": info.get("title", "Single Video"),
                        "channel": info.get("uploader") or "Unknown",
                        "total": 1,
                        "videos": [entry]
                    })
                return jsonify({"success": False, "error": "Không thể phân tích video hoặc danh sách phát"}), 400

            videos = []
            for idx, e in enumerate(entries_raw, start=1):
                if not e:
                    continue
                vid_id = e.get("id")
                if not vid_id:
                    e_url = e.get("url") or ""
                    match = re.search(r"v=([a-zA-Z0-9_\-]+)", e_url)
                    if match:
                        vid_id = match.group(1)

                if not vid_id:
                    continue

                full_url = f"https://www.youtube.com/watch?v={vid_id}"
                thumbs = e.get("thumbnails")
                thumb_url = ""
                if thumbs and isinstance(thumbs, list):
                    thumb_url = thumbs[-1].get("url", "")
                if not thumb_url:
                    thumb_url = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"

                videos.append({
                    "index": idx,
                    "id": vid_id,
                    "title": e.get("title") or f"Video #{idx}",
                    "url": full_url,
                    "duration": format_duration(e.get("duration")),
                    "thumbnail": thumb_url,
                    "channel": e.get("uploader") or e.get("channel") or info.get("uploader") or ""
                })

            if not videos:
                return jsonify({"success": False, "error": "Danh sách phát trống hoặc đang ở chế độ riêng tư"}), 404

            return jsonify({
                "success": True,
                "playlist_title": info.get("title") or "YouTube Playlist",
                "playlist_url": playlist_url,
                "channel": info.get("uploader") or info.get("channel") or "Không rõ",
                "total": len(videos),
                "videos": videos
            })

    except Exception as exc:
        err_msg = str(exc)
        if "does not exist" in err_msg.lower():
            err_msg = "Danh sách phát không tồn tại hoặc đã bị xóa."
        elif "private" in err_msg.lower():
            err_msg = "Danh sách phát này đang ở chế độ Riêng tư (Private)."
        return jsonify({"success": False, "error": f"Lỗi khi trích xuất: {err_msg}"}), 500

@app.errorhandler(404)
def fallback_404(e):
    if request.path.endswith("/extract"):
        return extract_playlist()
    if request.path.startswith("/static/"):
        filename = request.path[len("/static/"):]
        return send_from_directory(app.static_folder, filename)
    return Response(get_index_html(), mimetype="text/html; charset=utf-8")

def open_browser():
    webbrowser.open_new("http://localhost:5000")

if __name__ == "__main__":
    port = 5000
    print("=" * 60)
    print(f"[*] YouTube Playlist Link Extractor đang khởi động...")
    print(f"[*] Mở giao diện tại: http://localhost:{port}")
    print("=" * 60)
    
    if "--no-browser" not in sys.argv:
        threading.Timer(1.2, open_browser).start()

    app.run(host="0.0.0.0", port=port, debug=False)
