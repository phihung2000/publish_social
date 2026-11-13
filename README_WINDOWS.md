# HƯỚNG DẪN SETUP & CHẠY PETX CMS AUTO POST TRÊN WINDOWS 🪟

Tài liệu này hướng dẫn chi tiết từ A-Z cách thiết lập và vận hành hệ thống **Tự động viết bài bằng AI (Gemini Pro) & Đăng lên Facebook Fanpage + Telegram Bot** dành riêng cho phần mềm quản lý phòng khám thú y **PetX CMS** trên hệ điều hành **Windows 10 / Windows 11**.

---

## 📋 MỤC LỤC
1. [Yêu cầu phần mềm cài đặt](#1-yêu-cầu-phần-mềm-cài-đặt)
2. [Cấu trúc thư mục & File cấu hình](#2-cấu-trúc-thư-mục--file-cấu-hình)
3. [Cách 1: Chạy bằng 1-Click với File `run-post.bat` (Khuyên dùng)](#3-cách-1-chạy-bằng-1-click-với-file-run-postbat-khuyên-dùng)
4. [Cách 2: Chạy bằng dòng lệnh PowerShell / CMD](#4-cách-2-chạy-bằng-dòng-lệnh-powershell--cmd)
5. [Cách 3: Cài đặt lịch tự động đăng bài hàng ngày trên Windows](#5-cách-3-cài-đặt-lịch-tự-động-đăng-bài-hàng-ngày-trên-windows)
6. [Cách 4: Chạy cụm Docker n8n Workflow (Tùy chọn)](#6-cách-4-chạy-cụm-docker-n8n-workflow-tùy-chọn)
7. [Xử lý lỗi thường gặp trên Windows (Troubleshooting)](#7-xử-lý-lỗi-thường-gặp-trên-windows-troubleshooting)

---

## 1. Yêu cầu phần mềm cài đặt

Để chạy công cụ đăng bài AI tự động, máy tính Windows của bạn chỉ cần cài đặt:

1. **Node.js (Bắt buộc):**
   - Tải bản **LTS** mới nhất (Node.js 20.x hoặc 22.x) tại: [https://nodejs.org/](https://nodejs.org/)
   - Khi cài đặt, chọn mặc định và tích chọn **"Add to PATH"**.
   - Mở cửa sổ **CMD** hoặc **PowerShell** gõ kiểm tra:
     ```cmd
     node -v
     ```
     *(Hiện ra phiên bản dạng `v20.x.x` là thành công).*

2. **Docker Desktop for Windows (Tùy chọn):**
   - Chỉ cần thiết nếu bạn muốn chạy cả giao diện kéo thả **n8n** và bot Telegram 2 chiều.
   - Nếu bạn chỉ cần **AI tự động viết bài và đăng lên Facebook + gửi về Telegram để xem**, bạn **KHÔNG CẦN DOCKER**, chỉ cần Node.js là đủ chạy cực kỳ nhẹ và nhanh!

---

## 2. Cấu trúc thư mục & File cấu hình

Sao chép toàn bộ thư mục `post-socical` sang ổ đĩa trên máy Windows của bạn (Ví dụ: `D:\post-socical` hoặc `C:\post-socical`).

### Các file quan trọng:
- `gemini-keys.json`: Chứa danh sách API Key của 3 tài khoản Gemini Pro. Hệ thống sẽ tự động luân phiên (load-balance) và dự phòng (failover) giữa 3 tài khoản này.
- `.env`: Chứa cấu hình Buffer Token, Telegram Bot Token và Chat ID.
- `run-post.bat`: Menu tương tác 1-Click dành riêng cho Windows.
- `scripts/ai-auto-post.cjs`: Bộ máy AI chính kết nối Gemini, Unsplash HD Photo Pool, Telegram Bot & Buffer Facebook API.
- `scripts/auto-scheduler.cjs`: Bộ hẹn giờ tự động đăng bài theo các mốc giờ vàng trong ngày.

---

## 3. Cách 1: Chạy bằng 1-Click với File `run-post.bat` (Khuyên dùng)

Trên máy Windows, bạn chỉ cần mở thư mục `publish-social` và **nhấp đúp chuột (Double-click)** vào file **`run-post.bat`** (hoặc file `run-post.bat` ở thư mục gốc).

Màn hình menu trực quan sẽ xuất hiện:

```text
========================================================
      PETX CMS - CÔNG CỤ ĐĂNG BÀI TỰ ĐỘNG (AI)
========================================================

1. Đăng bài NGAY lên Facebook và Telegram (Chủ đề ngẫu nhiên)
2. Tạo bài xem trước trên Telegram (Dry-run, không đăng FB)
3. Chọn chủ đề cụ thể để đăng ngay:
     [A] Khám bệnh, Kê toa & Bệnh án điện tử
     [B] Bán hàng Pet Shop POS & In hóa đơn
     [C] Nhập thuốc & Kiểm kê kho hàng thực tế
     [D] Xuất chuyển kho thuốc chi nhánh
     [E] Thống kê doanh số Bác sĩ thú y (Tính hoa hồng)
     [F] Ứng dụng PetX Mobile trên điện thoại
4. Bật chế độ Tự động hẹn giờ đăng bài (09:00, 14:00, 20:00)
5. Thoát

Nhập lựa chọn của bạn (1-5 hoặc A-F):
```

- Nhập `1` rồi bấm `Enter`: AI sẽ tạo bài và bắn trực tiếp lên Facebook Page + Telegram.
- Nhập `2`: Tạo bài xem trước trên Telegram để kiểm tra mà không đăng lên Facebook.
- Nhập `A` đến `F`: Đăng bài về đúng tính năng của phần mềm PetX CMS mà bạn muốn quảng bá.
- Nhập `4`: Bật chế độ treo máy tự động đăng bài mỗi ngày.

---

## 4. Cách 2: Chạy bằng dòng lệnh PowerShell / CMD

Nếu bạn muốn chạy qua dòng lệnh, hãy mở **PowerShell** hoặc **Command Prompt (CMD)**:

```powershell
# 1. Di chuyển vào thư mục publish-social (thay đổi đường dẫn theo máy của bạn)
cd D:\post-socical\publish-social

# 2. Tạo bài xem trước trên Telegram Bot (không đăng Facebook)
node scripts/ai-auto-post.cjs --dry-run

# 3. Tạo bài và ĐĂNG NGAY lên Fanpage Facebook + Telegram
node scripts/ai-auto-post.cjs --publish
```

### Đăng bài theo từng chủ đề chuyên sâu của PetX CMS:
```powershell
# Chủ đề 1: Khám bệnh, Kê toa thuốc, Bệnh án điện tử & Khôi phục toa xóa
node scripts/ai-auto-post.cjs --topic treatment --publish

# Chủ đề 2: Bán hàng Pet Shop POS, quét mã vạch, in hóa đơn
node scripts/ai-auto-post.cjs --topic pos --publish

# Chủ đề 3: Nhập thuốc & Kiểm kê kho thực tế, tự động đối chiếu thừa/thiếu
node scripts/ai-auto-post.cjs --topic inventory --publish

# Chủ đề 4: Xuất kho điều chuyển thuốc sang chi nhánh khác
node scripts/ai-auto-post.cjs --topic transfer --publish

# Chủ đề 5: Báo cáo doanh số & Tự động tính hoa hồng cho Bác sĩ thú y
node scripts/ai-auto-post.cjs --topic doctor --publish

# Chủ đề 6: Ứng dụng di động PetX Mobile cho Bác sĩ & Chủ phòng khám
node scripts/ai-auto-post.cjs --topic mobile --publish
```

---

## 5. Cách 3: Cài đặt lịch tự động đăng bài hàng ngày trên Windows

Có 2 phương pháp để tự động hóa hoàn toàn:

### Phương pháp A: Dùng script `auto-scheduler.cjs` (Rất đơn giản)
Chạy script hẹn giờ bằng lệnh sau, giữ cửa sổ terminal chạy nền:
```powershell
node scripts/auto-scheduler.cjs
```
- Mặc định: Tự động đăng 3 bài mỗi ngày vào **09:00**, **14:00**, và **20:00** (Giờ Việt Nam).
- Hoặc đăng định kỳ mỗi X tiếng (Ví dụ mỗi 4 tiếng đăng 1 bài):
  ```powershell
  node scripts/auto-scheduler.cjs --every-hours 4
  ```

---

### Phương pháp B: Dùng Windows Task Scheduler (Chạy ngầm chuyên nghiệp)
Windows Task Scheduler giúp máy tự động chạy ngầm theo lịch ngay cả khi bạn không mở bất kỳ cửa sổ dòng lệnh nào.

**Các bước thiết lập:**
1. Nhấn tổ hợp phím **`Win + R`**, nhập `taskschd.msc` rồi nhấn **Enter** để mở **Task Scheduler**.
2. Ở menu bên phải (**Actions**), chọn **Create Basic Task...**
3. **Name:** Nhập `PetX_Auto_Post`. Nhấn **Next**.
4. **Trigger:** Chọn **Daily** (Hàng ngày). Nhấn **Next**.
5. Chọn giờ bắt đầu chạy (Ví dụ: `09:00:00 AM`). Nhấn **Next**.
6. **Action:** Chọn **Start a program**. Nhấn **Next**.
7. Điền thông số chương trình:
   - **Program/script:** Nhập `node.exe` (Nếu báo lỗi không tìm thấy, nhập đường dẫn đầy đủ: `C:\Program Files\nodejs\node.exe`).
   - **Add arguments (optional):** Nhập `scripts\ai-auto-post.cjs --publish`
   - **Start in (optional):** Nhập đường dẫn thư mục `publish-social` của bạn, ví dụ: `D:\post-socical\publish-social`
8. Nhấn **Next** ➔ Nhấn **Finish**.
*(Bạn có thể tạo thêm 1 Task tương tự cho khung giờ 15:00 hoặc 20:00 nếu muốn đăng nhiều bài/ngày).*

---

## 6. Cách 4: Chạy cụm Docker n8n Workflow (Tùy chọn)

Nếu bạn muốn mở giao diện điều khiển n8n và bot Telegram tiếp nhận file/ảnh:

1. Khởi động **Docker Desktop for Windows** (chờ Docker chuyển sang màu xanh - Running).
2. Mở PowerShell tại `publish-social`:
   ```powershell
   docker compose up -d
   ```
3. Khởi động Webhook & Tunnel:
   ```powershell
   node scripts/start-telegram.cjs
   ```
4. Truy cập giao diện quản trị n8n tại: **`http://localhost:5678`**.

---

## 7. Xử lý lỗi thường gặp trên Windows (Troubleshooting)

### 1. Lỗi: `'node' is not recognized as an internal or external command`
- **Nguyên nhân:** Chưa cài đặt Node.js hoặc chưa thêm Node.js vào biến môi trường PATH của Windows.
- **Khắc phục:** Tải lại bộ cài Node.js tại [nodejs.org](https://nodejs.org/), chạy bộ cài và nhớ tích vào ô **"Automatically install the necessary tools"** hoặc kiểm tra biến môi trường hệ thống (System Environment Variables). Khởi động lại CMD sau khi cài.

### 2. Lỗi: `Execution Policy` trong PowerShell (`File ... cannot be loaded because running scripts is disabled on this system`)
- **Khắc phục:** Mở PowerShell bằng quyền Admin (**Run as Administrator**) và chạy lệnh:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```
  Nhấn `Y` để đồng ý.

### 3. Lỗi font chữ tiếng Việt hiển thị trong Command Prompt
- File `run-post.bat` đã được tích hợp sẵn lệnh `chcp 65001` (UTF-8). Nếu bạn tự gõ lệnh trong CMD, hãy gõ `chcp 65001` trước khi chạy để chữ tiếng Việt hiển thị chuẩn xác không bị lỗi dấu.

### 4. Thay đổi hoặc bổ sung API Key Gemini Pro mới
- Mở file `gemini-keys.json` bằng Notepad hoặc VS Code.
- Dán API Key mới vào trường `"apiKey"` của tài khoản bạn muốn. Hệ thống sẽ tự động nhận diện key mới ngay lập tức mà không cần khởi động lại dịch vụ.

---

🎉 **Chúc bạn vận hành chiến dịch marketing tự động cho PetX CMS thành công rực rỡ!**
Mọi thắc mắc hoặc cần tùy biến thêm, vui lòng liên hệ đội ngũ phát triển.

