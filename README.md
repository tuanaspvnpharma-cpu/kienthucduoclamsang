# La bàn Dược Lâm Sàng

*Định hướng điều trị theo bằng chứng – cổng tra cứu cho dược sĩ.*

Logo: vòng la bàn có kim là viên nang (nửa vàng chỉ hướng, nửa trắng). Ý nghĩa: dược sĩ lâm sàng định hướng lựa chọn và sử dụng thuốc theo bằng chứng. Tệp gốc: `icons/icon.svg`; logo trên sidebar vẽ bằng SVG nội tuyến nên đổi màu theo đơn vị.

Web app (PWA, chạy ngoại tuyến) có **thanh điều hướng bên trái** để mở 22 tài liệu sẵn có: tóm tắt guideline, tài liệu thông tin thuốc, so sánh dược lý lâm sàng, thẩm định bài báo EBM. Các trang gốc **không bị chỉnh sửa**; cổng chỉ hiển thị chúng trong khung bên phải.

## Tính năng
- Sidebar trái nhóm theo 4 danh mục, đếm số tài liệu, nhớ nhóm đang mở/đóng.
- Tìm kiếm không phân biệt dấu tiếng Việt (gõ `khang sinh` vẫn ra "kháng sinh"), tô sáng đoạn khớp. Phím tắt `/` hoặc `Ctrl+K`; `Enter` mở kết quả đầu; `↑/↓` di chuyển; `Esc` xóa.
- Nút trước/sau, tải lại, mở trong thẻ mới; đường dẫn riêng cho từng tài liệu (`#/p/<id>`), nút Back của trình duyệt hoạt động.
- Trang chủ: thống kê, "Xem gần đây", danh mục dạng thẻ.
- Điện thoại (< 900 px): sidebar thành ngăn kéo trượt, có lớp phủ, đóng bằng `Esc` hoặc chạm ra ngoài.
- Máy tính: nút ☰ thu gọn/mở rộng sidebar (nhớ trạng thái).
- Theme đơn vị: Phương Nam (mặc định) / Phương Châu.
- Ngoại tuyến: service worker lưu sẵn app và cả 22 trang (lấy danh sách từ `data/catalog.json`).

## Chạy trên máy
Trình duyệt chặn đọc JSON khi mở trực tiếp `index.html` (file://). Dùng máy chủ cục bộ kèm theo (không cần cài Node/Python):

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Rồi mở http://localhost:8080. Kiểm thử: http://localhost:8080/tests/

## Triển khai GitHub Pages
Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`. Lưu ý: repo public thì ai cũng xem được 22 tài liệu.

## Cấu trúc
```
index.html              giao diện (sidebar + khung xem)
css/base.css            lõi design system ClinPharmAI (token lấy từ trang so sánh macrolid)
css/theme.css           màu theo đơn vị
js/lib.js               hàm thuần: chuẩn hóa không dấu, lọc, định tuyến, kiểm tra schema
js/app.js               điều khiển giao diện
data/catalog.json       danh mục tài liệu (version, updated, source, status, records)
sw.js, manifest.webmanifest, icons/   PWA
tests/                  ca kiểm thử (mở tests/index.html qua máy chủ)
serve.ps1               máy chủ tĩnh cục bộ
*.html (gốc)            22 tài liệu – không chỉnh sửa
```

## Thêm tài liệu mới
1. Chép tệp `.html` vào thư mục gốc.
2. Thêm một record vào `data/catalog.json`: `id` duy nhất, `category`, `file`, `label` (tên ngắn trên sidebar), `title` (chép **nguyên văn** thẻ `<title>` của tệp), `tags`.
3. Tăng `version`, sửa `updated` trong catalog; tăng `CACHE_VERSION` trong `sw.js`.
4. Mở `tests/` – kiểm thử sẽ báo lỗi nếu tệp không tồn tại hoặc tiêu đề không khớp.

## An toàn và dữ liệu
- Cổng không thu thập, không gửi, không lưu thông tin bệnh nhân. `localStorage` chỉ lưu đơn vị đã chọn, trạng thái sidebar và danh sách id tài liệu xem gần đây.
- Danh mục đặt `status: "unverified"`: nội dung chuyên môn của từng trang **chưa được thẩm định lại** trong cổng; giao diện hiển thị nhãn "Chưa kiểm chứng".
- Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm (Nghị định 13/2023/NĐ-CP); đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.
