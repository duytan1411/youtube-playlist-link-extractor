@echo off
chcp 65001 > nul
title YouTube Playlist Link Extractor
color 0F

echo =====================================================================
echo           YOUTUBE PLAYLIST LINK EXTRACTOR - PRO TOOL
echo =====================================================================
echo.

cd /d "%~dp0"

echo [*] Đang kiểm tra môi trường Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] LỖI: Không tìm thấy Python trong hệ thống!
    echo [!] Vui lòng cài đặt Python (từ https://python.org) và chọn "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo [*] Đang kiểm tra các thư viện phụ thuộc (yt-dlp, flask)...
python -c "import yt_dlp, flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Đang tự động cài đặt thư viện cần thiết...
    python -m pip install -U yt-dlp flask
)

echo.
echo [✓] Sẵn sàng! Đang mở ứng dụng trên trình duyệt web (http://localhost:5000)...
echo [*] Để tắt ứng dụng, chỉ cần đóng cửa sổ đen này lại.
echo.

python app.py

pause
