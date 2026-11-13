@echo off
chcp 65001 >nul
title PetX CMS Social Auto Post
cd /d "%~dp0"

:menu
cls
echo ========================================================
echo       PETX CMS - CÔNG CỤ ĐĂNG BÀI TỰ ĐỘNG (AI)
echo ========================================================
echo.
echo 1. Đăng bài NGAY lên Facebook và Telegram (Chủ đề ngẫu nhiên)
echo 2. Tạo bài xem trước trên Telegram (Dry-run, không đăng FB)
echo 3. Chọn chủ đề cụ thể để đăng ngay:
echo      [A] Khám bệnh, Kê toa & Bệnh án điện tử
echo      [B] Bán hàng Pet Shop POS & In hóa đơn
echo      [C] Nhập thuốc & Kiểm kê kho hàng thực tế
echo      [D] Xuất chuyển kho thuốc chi nhánh
echo      [E] Thống kê doanh số Bác sĩ thú y (Tính hoa hồng)
echo      [F] Ứng dụng PetX Mobile trên điện thoại
echo 4. Bật chế độ Tự động hẹn giờ đăng bài (09:00, 14:00, 20:00)
echo 5. Thoát
echo.
set /p opt="Nhập lựa chọn của bạn (1-5 hoặc A-F): "

if "%opt%"=="1" (
    echo.
    echo [Đang tạo bài viết AI và đăng lên Facebook...]
    node scripts\ai-auto-post.cjs --publish
    echo.
    pause
    goto menu
)

if "%opt%"=="2" (
    echo.
    echo [Đang tạo bài xem trước trên Telegram...]
    node scripts\ai-auto-post.cjs --dry-run
    echo.
    pause
    goto menu
)

if /i "%opt%"=="A" (
    node scripts\ai-auto-post.cjs --topic treatment --publish
    pause
    goto menu
)
if /i "%opt%"=="B" (
    node scripts\ai-auto-post.cjs --topic pos --publish
    pause
    goto menu
)
if /i "%opt%"=="C" (
    node scripts\ai-auto-post.cjs --topic inventory --publish
    pause
    goto menu
)
if /i "%opt%"=="D" (
    node scripts\ai-auto-post.cjs --topic transfer --publish
    pause
    goto menu
)
if /i "%opt%"=="E" (
    node scripts\ai-auto-post.cjs --topic doctor --publish
    pause
    goto menu
)
if /i "%opt%"=="F" (
    node scripts\ai-auto-post.cjs --topic mobile --publish
    pause
    goto menu
)

if "%opt%"=="4" (
    echo.
    echo [Đang khởi động tiến trình tự động hẹn giờ...]
    node scripts\auto-scheduler.cjs
    pause
    goto menu
)

if "%opt%"=="5" exit

goto menu

