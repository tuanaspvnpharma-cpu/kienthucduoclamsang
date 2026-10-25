# Nhật ký thay đổi

## 1.2.0 – 2026-10-25
- Đổi tên cổng: "ClinPharmAI" → **La bàn Dược Lâm Sàng** (khẩu hiệu: "Định hướng điều trị theo bằng chứng"); cập nhật tiêu đề trang, manifest (`short_name`: "La bàn DLS").
- Logo mới: la bàn – kim viên nang; SVG nội tuyến trên sidebar (theo màu đơn vị), `icons/icon.svg`, PNG 192/512 vẽ lại.
- Service worker `cpa-1.2.0`; trang tự tải lại một lần khi có bản service worker mới, để người dùng thấy cập nhật ngay (có hiệu lực từ bản này trở đi).

## 1.1.0 – 2026-10-25
- Thêm 2 tài liệu vào nhóm "Tóm tắt guideline" (tệp chép nguyên trạng, không chỉnh sửa):
  - `KDIGO-AKI-AKD-2026-Ch3-4-tom-tat.html` – KDIGO AKI/AKD (dự thảo 03/2026), chương 3–4.
  - `EAU-2026-UTI-3.3-3.9-tom-tat.html` – EAU 2026, nhiễm khuẩn niệu khoa (UTI 3.3–3.9).
- Danh mục v1.1.0 (22 tài liệu); service worker `cpa-1.1.0`.
- Nội dung chuyên môn của 2 trang mới chưa được thẩm định lại trong cổng (`status: unverified`).

## 1.0.0 – 2026-10-25
- Cổng tra cứu với sidebar trái, tìm kiếm không dấu, định tuyến hash, khung xem tài liệu, theme Phương Nam / Phương Châu.
- Danh mục `data/catalog.json` v1.0.0: 20 tài liệu, 4 nhóm; tiêu đề chép nguyên văn từ thẻ `<title>`; `status: unverified`.
- PWA: service worker (`cpa-1.0.1`) lưu sẵn app và 20 trang; chạy được khi tắt máy chủ.
- Không có công thức lâm sàng nào trong cổng (chỉ điều hướng), nên không có ca kiểm thử công thức; 70 ca kiểm thử cho hàm thuần và tích hợp danh mục – tệp: 70/70 đạt (trình duyệt Chromium trong Claude, 25/10/2026).
- Màu theme Phương Châu là màu tạm, cần thay theo bộ nhận diện chính thức.
