# quick_note

**QuickNote – Sổ Ghi chú & Checklist Cá nhân** (Stationery Checklist Paper UI)

Ứng dụng web quản lý các tờ ghi chú và danh sách việc cần làm cá nhân theo phong cách giấy văn phòng phẩm (kem ấm `#F7F3E6`, dòng kẻ ngang `#8BA4B2`, vòng tròn cam đất `#C46D53`, tiêu đề xanh xám `#52758C`), phục vụ học phần Phát triển Hệ thống Thông tin (SDLC – NEU).

## Tính năng chính

- **Đăng nhập / Đăng ký sổ ghi chú** (`src/auth.js`): Xác thực người dùng và hỗ trợ đăng nhập nhanh bằng tài khoản mẫu (`sinhvien@neu.edu.vn` / `123456`).
- **Trang chủ Lưới Tờ Ghi chú Checklist** (`src/notes.js`):
  - Hiển thị các tờ giấy checklist chuẩn 8 dòng kẻ ngang với 3 nhóm phân loại (`TO DO`, `TO BUY`, `OTHERS`).
  - Tick / bỏ tick hoàn thành trực tiếp trên từng dòng ghi chú (lưu bền vững).
  - Tìm kiếm tức thời (realtime) theo tiêu đề và lọc nhanh theo nhóm.
- **Tạo / Chỉnh sửa / Xóa tờ ghi chú**:
  - Kiểm tra hợp lệ tiêu đề (`1 - 100` ký tự sau khi `trim()`, chặn tiêu đề rỗng hoặc toàn khoảng trắng).
  - Khóa nút Lưu (`isSaving`) chống bấm đúp tạo bản ghi trùng lặp (khắc phục `BUG-01`).
  - Hộp thoại xác nhận trước khi xóa tờ ghi chú.
- **Lưu trữ & Cơ sở dữ liệu** (`src/store.js`, `supabase_schema.sql`):
  - Hoạt động tức thì với `localStorage` kèm dữ liệu mẫu chuẩn thiết kế Figma, đồng thời hỗ trợ kết nối Supabase PostgreSQL (kèm Row Level Security - RLS).

## Cấu trúc thư mục

```text
quick_note/
├── index.html            # Trang khung ứng dụng (App Shell)
├── styles.css            # Hệ thống giao diện Stationery Checklist Paper
├── supabase_schema.sql   # Định nghĩa bảng users, notes và RLS policies trên Supabase
├── vercel.json           # Cấu hình triển khai tĩnh trên Vercel
└── src/
    ├── store.js          # Quản lý trạng thái, dữ liệu mẫu, validation & đồng bộ lưu trữ
    ├── auth.js           # Màn hình bìa sổ Đăng nhập & Đăng ký (Frame 1 & 2)
    ├── notes.js          # Trang chủ lưới tờ ghi chú, bộ lọc & Modal CRUD (Frame 3 & 4)
    └── app.js            # Điều hướng tự động giữa Auth và Dashboard
```
