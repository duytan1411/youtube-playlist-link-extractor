# 🎬 YouTube Playlist Link Extractor Pro

Công cụ trích xuất link video từ YouTube Playlist thành danh sách link Markdown / URL độc lập siêu tốc, bảo mật và chạy 100% cục bộ trên máy tính của bạn.

---

## ✨ Tính Năng Nổi Bật

- 🔗 **Link Thuần Độc Lập (Mặc định - Không có ngoặc)**:
  ```text
  https://www.youtube.com/watch?v=kt6V4ai60fI
  https://www.youtube.com/watch?v=tmeCWULSTHc
  https://www.youtube.com/watch?v=nQfHZ2DEJ8c
  ...
  ```
- 🌐 **Các tùy chọn định dạng khác**:
  - Đánh số thứ tự (`1. https://...`)
  - Định dạng Markdown (`[Link](Link)`)
  - Markdown kèm tiêu đề (`[1. Tiêu đề](https://...)`)
  - Tiêu đề & Link (`1. Tiêu đề - https://...`)
- ⚡ **Tốc độ cực nhanh**: Dùng cơ chế `extract_flat` của `yt-dlp`, không tải video, trích xuất playlist 50–100 video chỉ trong vài giây.
- 📋 **Sao chép 1 chạm**: Nút "Sao chép tất cả" tiện lợi.
- 💾 **Xuất file**: Hỗ trợ tải file `.txt` và xuất file `.csv` có kèm tên bài, thời lượng, kênh.
- 🖼️ **Chế độ xem Thumbnail**: Xem danh sách card trực quan có ảnh thu nhỏ, thời lượng, xem trực tiếp trên YouTube.
- 🕒 **Lịch sử**: Tự động lưu các playlist đã quét gần đây trên trình duyệt để mở lại nhanh.

---

## 🚀 Cách Sử Dụng

### Cách 1: Chạy Giao Diện Web (Khuyên dùng - Rất trực quan)

Chỉ cần **click đúp vào file `Start_App.bat`**. Ứng dụng sẽ tự động khởi chạy và mở trình duyệt tại:
```
http://localhost:5000
```

Hoặc chạy bằng lệnh:
```bash
python app.py
```

### Cách 2: Dùng Công Cụ Dòng Lệnh (CLI)

Chạy trực tiếp file `extract_cli.py`:

```bash
# Định dạng Markdown mặc định
python extract_cli.py "https://www.youtube.com/playlist?list=PLVgHx4Z63paYiFGQ56PjTF1PGePL3r69s"

# Lưu trực tiếp vào file danh_sach.txt
python extract_cli.py "https://www.youtube.com/playlist?list=PLVgHx4Z63paYiFGQ56PjTF1PGePL3r69s" -o danh_sach.txt

# Lấy dạng link thuần (plain URL)
python extract_cli.py "https://www.youtube.com/playlist?list=PLVgHx4Z63paYiFGQ56PjTF1PGePL3r69s" -f plain
```

---

## 📁 Cấu Trúc Dự Án

```
tools lấy link/
├── app.py                # Server Flask backend và API xử lý
├── extract_cli.py        # Script chạy dòng lệnh Terminal / CMD
├── Start_App.bat         # File click đúp khởi chạy trên Windows
├── requirements.txt      # Danh sách thư viện Python
├── templates/
│   └── index.html        # Giao diện Web (Dark Mode, Glassmorphism)
└── static/
    ├── style.css         # Phong cách thiết kế hiện đại
    └── app.js            # Xử lý logic phía trình duyệt
```
