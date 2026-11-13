# Tiếp tục công việc

- Trạng thái: in_progress
- Cập nhật: 2026-11-11T16:20:00+07:00
- Mục tiêu: Startup đăng ký lại webhook Telegram sau khi media-gateway đứng trước n8n.
- File: scripts/register-telegram-webhook.cjs
- File: scripts/start-telegram.cjs
- File: scripts/check-telegram-webhook-startup.cjs
- File: services/media-gateway/server.cjs
- Đã làm / quyết định: Lệnh node -e nhét cả script vào dòng lệnh Windows, nuốt lỗi Telegram và in ra cả chương trình. Đăng ký chuyển sang file, in mô tả lỗi, thử lại khi export credential bị khóa, và luôn dùng URL tunnel đã kiểm tra.
- Đã làm / quyết định: Gateway bỏ header expect và content-length cũ của request chunked để Telegram kiểm tra webhook không bị kẹt.
- Kiểm tra: NOT_RUN node scripts/check-telegram-webhook-startup.cjs — shell phiên thoát ngay.
- Kiểm tra: NOT_RUN node scripts/start-telegram.cjs lần này — chưa chạy lại sau khi sửa.
- Bước tiếp theo: Chạy node scripts/start-telegram.cjs. Nếu vẫn lỗi, dòng đầu tiên trước câu "Khong xac nhan duoc webhook" là lý do Telegram trả về.
