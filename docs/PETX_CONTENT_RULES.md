# HƯỚNG DẪN & QUY TẮC NỘI DUNG CHÍNH XÁC CHO PHẦN MỀM PETX CMS (petx.io.vn)

Tài liệu này được trích xuất và chuẩn hóa trực tiếp từ mã nguồn thực tế của hệ thống **PetX CMS** (`petx-cms-deploy`), chuẩn hóa các trụ cột tính năng thật và thông tin liên hệ mua bản quyền phần mềm.

---

## 1. THÔNG TIN LIÊN HỆ & MUA BẢN QUYỀN PHẦN MỀM

- **Tên sản phẩm:** PetX CMS - Phần mềm quản lý Phòng khám Thú y & Bán hàng Pet Shop.
- **Website chính thức:** [https://petx.io.vn/](https://petx.io.vn/)
- **Hotline / Zalo tư vấn mua phần mềm:**
  - 📞 **0396 476 443** (Tư vấn trực tiếp)
  - 📞 **0336 781 793** (Hotline hỗ trợ kỹ thuật)
- **Email liên hệ:**
  - 📧 **nguyenphihung3800@gmail.com**
  - 📧 **exteam.solutions@gmail.com**
- **Nền tảng hỗ trợ:** 
  - **Web App:** Chạy mượt mà trên trình duyệt máy tính, laptop (Next.js, MUI, Redux).
  - **Mobile App:** Ứng dụng di động PetX CMS Mobile (React Native Expo) cho Bác sĩ & Chủ phòng khám quản lý từ xa mọi lúc mọi nơi.

---

## 2. 6 TRỤ CỘT TÍNH NĂNG CHÍNH CỦA PETX CMS (SOURCE TRỰC TIẾP TỪ CODEBASE)

### Trụ cột 1: Thông tin & Điều trị thú y (Module Core)
- **Tạo phiếu khám bệnh mới:** Ghi nhận thông tin thú cưng (chó, mèo, loài, giống, tuổi, cân nặng), chủ nuôi, triệu chứng, chẩn đoán.
- **Kê toa thuốc điện tử:** Kê đơn trực tiếp từ kho thuốc, tự động tính tiền thuốc, in toa thuốc rõ ràng cho khách hàng.
- **Lịch sử điều trị thông minh:** Tra cứu lịch sử khám bệnh, các đợt điều trị trước, toa thuốc cũ chỉ trong 1 giây qua SĐT khách hàng.
- **Khôi phục toa thuốc:** Tính năng an toàn dữ liệu, cho phép xem lại và khôi phục phiếu khám đã lỡ tay xóa.

### Trụ cột 2: Quản lý Bán hàng Pet Shop (POS)
- **Màn hình bán hàng tốc độ cao:** Thao tác chọn sản phẩm, tính chiết khấu, phụ thu và in hóa đơn bán lẻ chuyên nghiệp.
- **Quản lý đơn hàng & Trả lại hàng:** Kiểm soát danh sách đơn bán, quy trình đổi trả hàng hóa, hoàn tiền rõ ràng.
- **Khôi phục đơn xóa:** Lưu vết lịch sử bán hàng, chống gian lận và thất thoát tiền bán hàng.

### Trụ cột 3: Quản lý Kho Dược & Kiểm kê kho hàng
- **Nhập thuốc & Hàng hóa:** Nhập kho thuốc thú y, vắc xin, quản lý giá vốn, hạn dùng, nhà cung cấp.
- **Kiểm kê kho hàng thực tế:** Đối chiếu số lượng kiểm kê thực tế so với sổ sách, tự động tính chênh lệch thừa/thiếu, cân bằng kho chính xác.
- **Xuất chuyển chi nhánh:** Quản lý điều chuyển thuốc và hàng hóa giữa các cơ sở/chi nhánh phòng khám tiện lợi.

### Trụ cột 4: Thống kê Doanh số & Hiệu suất Bác sĩ (13 loại báo cáo)
- **Báo cáo Lời - Lỗ (P&L):** Đánh giá chính xác hiệu quả kinh doanh của phòng khám.
- **Doanh số điều trị theo từng Bác sĩ:** Thống kê số ca khám, doanh thu điều trị của từng bác sĩ để tính hoa hồng, lương thưởng minh bạch.
- **Báo cáo Thu chi điều trị vs Thu chi bán hàng:** Tách biệt rõ dòng tiền từ chuyên môn y tế và bán lẻ phụ kiện/thức ăn.
- **Báo cáo Xuất - Nhập - Tồn kho:** Theo dõi lượng thuốc tồn kho, tránh đọng vốn.

### Trụ cột 5: Quản lý Công nợ & Kế toán Thu chi
- **Quản lý công nợ:** Theo dõi công nợ chi tiết của khách hàng khám chịu và công nợ với các nhà cung cấp dược phẩm.
- **Kế toán thu chi:** Quản lý quỹ tiền mặt, tài khoản ngân hàng, lập phiếu thu - phiếu chi tự động khi phát sinh giao dịch.

### Trụ cột 6: Tiện ích In mã vạch & Quản lý trên Mobile App
- **In mã vạch (Barcode):** Tự sinh và in mã vạch hàng loạt dán lên các lọ thuốc, thức ăn, phụ kiện để quét barcode khi bán hàng.
- **PetX Mobile App:** Bác sĩ đi công tác hoặc chủ phòng khám đi vắng vẫn xem được lịch sử khám, doanh thu realtime trên điện thoại.

---

## 3. CẤU TRÚC BÀI ĐĂNG CHUẨN

1. **Tiêu đề (Hook):** Đánh trúng nỗi đau quản lý phòng khám thú y (thất lạc sổ bệnh án, khó tính hoa hồng bác sĩ, nhầm lẫn tiền thu chi, lệch kho thuốc).
2. **Nội dung (Body):** Nêu giải pháp cụ thể của PetX CMS (Module Điều trị, POS, Kiểm kê kho, Báo cáo theo Bác sĩ).
3. **Call To Action (CTA):**
   - 🌐 Website trải nghiệm: https://petx.io.vn/
   - 📞 Hotline / Zalo tư vấn: **0396 476 443** | **0336 781 793**
   - 📧 Email liên hệ: **nguyenphihung3800@gmail.com** | **exteam.solutions@gmail.com**
4. **Hashtags:** `#PetX #PhanMemThuY #QuanLyPhongKhamThuY #PetShopPOS #BenhAnThuCung #BacSiThuY #petx_iovn`
