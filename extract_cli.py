import sys
import argparse
import re
from urllib.parse import parse_qs, urlparse
import yt_dlp

# Ensure UTF-8 output on Windows console
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

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

def extract_playlist(url_or_id: str):
    playlist_url = normalize_playlist_url(url_or_id)
    ydl_opts = {
        "extract_flat": "in_playlist",
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)
        if not info:
            return None, []
        
        entries_raw = info.get("entries")
        if entries_raw is None:
            vid_id = info.get("id")
            if vid_id:
                return info.get("title", "Video"), [{
                    "index": 1,
                    "id": vid_id,
                    "title": info.get("title", "Video"),
                    "url": f"https://www.youtube.com/watch?v={vid_id}"
                }]
            return None, []

        videos = []
        for idx, e in enumerate(entries_raw, start=1):
            if not e:
                continue
            vid_id = e.get("id")
            if not vid_id:
                e_url = e.get("url") or ""
                m = re.search(r"v=([a-zA-Z0-9_\-]+)", e_url)
                if m:
                    vid_id = m.group(1)
            if not vid_id:
                continue
            videos.append({
                "index": idx,
                "id": vid_id,
                "title": e.get("title") or f"Video #{idx}",
                "url": f"https://www.youtube.com/watch?v={vid_id}"
            })
        return info.get("title", "Playlist"), videos

def format_links(videos, fmt="markdown"):
    lines = []
    for v in videos:
        url = v["url"]
        title = v["title"]
        idx = v["index"]
        if fmt == "markdown":
            lines.append(f"[{url}]({url})")
        elif fmt == "plain":
            lines.append(url)
        elif fmt == "numbered":
            lines.append(f"{idx}. {url}")
        elif fmt == "title_markdown":
            lines.append(f"[{idx}. {title}]({url})")
        elif fmt == "title_plain":
            lines.append(f"{idx}. {title} - {url}")
        else:
            lines.append(f"[{url}]({url})")
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="YouTube Playlist Link Extractor CLI")
    parser.add_argument("url", nargs="?", help="URL hoặc ID của YouTube Playlist")
    parser.add_argument("-f", "--format", choices=["plain", "markdown", "numbered", "title_markdown", "title_plain"], 
                        default="plain", help="Định dạng xuất (mặc định: plain - không ngoặc)")
    parser.add_argument("-o", "--output", help="Lưu danh sách link vào file .txt")

    args = parser.parse_args()

    url = args.url
    if not url:
        print("YouTube Playlist Link Extractor")
        print("-" * 40)
        try:
            url = input("Nhập URL hoặc ID Playlist YouTube: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nĐã hủy.")
            return

    if not url:
        print("Lỗi: Bạn chưa nhập URL.")
        return

    print(f"\n[+] Đang phân tích playlist...")
    try:
        title, videos = extract_playlist(url)
        if not videos:
            print("[-] Không tìm thấy video nào hoặc playlist bị lỗi/riêng tư.")
            return

        print(f"[✓] Đã tìm thấy {len(videos)} video trong danh sách: '{title}'\n")
        output_text = format_links(videos, args.format)

        print("--- KẾT QUẢ LINK ---")
        print(output_text)
        print("--------------------")

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output_text + "\n")
            print(f"\n[✓] Đã lưu danh sách vào file: {args.output}")

    except Exception as e:
        print(f"[-] Có lỗi xảy ra: {e}")

if __name__ == "__main__":
    main()
