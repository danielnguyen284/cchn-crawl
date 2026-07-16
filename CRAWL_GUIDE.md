# Hướng Dẫn Kỹ Thuật Crawl Tài Liệu Và Ngân Hàng Câu Hỏi

Tài liệu này hướng dẫn chi tiết cách thức phát hiện tài nguyên, vượt qua cơ chế xác thực (Firebase Auth) và thu thập toàn bộ tài liệu ôn thi (PDF) cùng ngân hàng câu hỏi (JSON) từ hệ thống ôn thi chứng khoán.

---

## 1. Tổng Quan Kiến Trúc
Hệ thống ôn thi chạy trên nền tảng Vercel với địa chỉ:
`https://vn-securities-platform.vercel.app`

Hệ thống sử dụng:
*   **Static Assets**: Lưu trữ các file PDF tài liệu ôn thi công khai.
*   **Firebase Authentication**: Quản lý phiên đăng nhập của người dùng.
*   **Firestore Database**: Lưu trữ dữ liệu ngân hàng câu hỏi dưới dạng các Document trong Project Firebase `educated-brokers`.
*   **Next.js API Routes**: Cung cấp API nội bộ (`/api/real-questions`) để đồng bộ dữ liệu câu hỏi thực tế.

---

## 2. Bước 1: Thu Thập Tài Liệu PDF (Công Khai)
Các file tài liệu PDF ôn thi được lưu trữ trực tiếp dưới dạng tài nguyên tĩnh công khai tại thư mục `/documents/` của website. Chúng ta có thể tải trực tiếp không cần đăng nhập.

### Danh Sách Tài Nguyên PDF Đã Phát Hiện:
*   **Môn 1: Cơ sở về Chứng khoán (CCCM 1)**
    *   `https://vn-securities-platform.vercel.app/documents/CoSo-500CauHoi.pdf` (500 câu hỏi cơ bản)
    *   `https://vn-securities-platform.vercel.app/documents/CoSo-DeWeb.pdf` (Đề thi mẫu trên Web)
*   **Môn 2: Pháp luật Chứng khoán (CCCM 2)**
    *   `https://vn-securities-platform.vercel.app/documents/Luat-BoDe.pdf` (Bộ đề Luật cập nhật)
    *   `https://vn-securities-platform.vercel.app/documents/Luat-TongHopChuY.pdf` (Tổng hợp chú ý)
    *   `https://vn-securities-platform.vercel.app/documents/Luat-DeThi.pdf` (Đề thi mới cập nhật)
*   **Môn 3: Môi giới Chứng khoán (CCCM 3)**
    *   `https://vn-securities-platform.vercel.app/documents/MoiGioi-VietStock.pdf` (Tài liệu ôn thi Vietstock)
    *   `https://vn-securities-platform.vercel.app/documents/MoiGioi-NganHangCauHoi.pdf` (91 câu hỏi Môi giới)
*   **Môn 4: Phân tích & Đầu tư CK (CCCM 4)**
    *   `https://vn-securities-platform.vercel.app/documents/PhanTich-BangCongThuc.pdf` (Bảng công thức 1)
    *   `https://vn-securities-platform.vercel.app/documents/PhanTich-BangCongThuc2.pdf` (Bảng công thức 2)
    *   `https://vn-securities-platform.vercel.app/documents/PhanTich-TaiLieuOnTap.pdf` (Tài liệu ôn tập)
    *   `https://vn-securities-platform.vercel.app/documents/PhanTich-DapAnDeThi.pdf` (Đáp án đề thi mẫu)
    *   `https://vn-securities-platform.vercel.app/documents/PhanTich-DeChuanTN.pdf` (Đề chuẩn trắc nghiệm)

---

## 3. Bước 2: Vượt Qua Xác Thực (Bypass Auth)
Để truy cập vào cơ sở dữ liệu Firestore và các API nội bộ của Next.js, chúng ta cần một mã JWT Token (`id_token`) còn hiệu lực từ Firebase.

### 1. Trích xuất Cấu hình API từ Source Code client:
Qua phân tích mã nguồn client (file JS bundles), ta trích xuất được:
*   `API_KEY`: `AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4`
*   `REFRESH_TOKEN`: Một khóa token dài hạn dùng để sinh phiên làm việc mới.

### 2. Tự Động Làm Mới Token (Refresh Token):
Gửi yêu cầu POST tới Google Identity Toolkit để đổi `refresh_token` lấy `id_token` mới (hạn dùng 1 giờ):
```bash
POST https://securetoken.googleapis.com/v1/token?key={API_KEY}
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={REFRESH_TOKEN}
```
Mã JWT Token nhận được ở trường `id_token` sẽ được sử dụng làm Authorization Header ở các bước sau.

---

## 4. Bước 3: Thu Thập Ngân Hàng Câu Hỏi Từ Firestore
Cơ sở dữ liệu Firestore của hệ thống được tổ chức trong project `educated-brokers`.

### 1. API Endpoint Truy Cập:
`https://firestore.googleapis.com/v1/projects/educated-brokers/databases/(default)/documents`

### 2. Các Collection/Path chứa câu hỏi:
Duyệt qua các collection cấu trúc tương ứng với mã môn thi (`cccm1`, `cccm2`, `cccm3`, `cccm4`):
*   `questions/{subjectId}/items`
*   `subjects/{subjectId}/questions`
*   `examBanks/{subjectId}/questions`

### 3. Cơ Chế Phân Trang (Pagination):
Firestore giới hạn số lượng tài liệu trả về mỗi trang. Để lấy toàn bộ câu hỏi:
*   Đặt tham số `pageSize=300`.
*   Đọc giá trị `nextPageToken` ở kết quả trả về.
*   Nếu có `nextPageToken`, tiếp tục gửi yêu cầu với tham số `pageToken={nextPageToken}` cho đến khi hết trang.

### 4. Định Dạng Dữ Liệu:
Firestore trả về dữ liệu bị đóng gói trong các wrapper kiểu dữ liệu của Google (ví dụ: `{"stringValue": "Câu hỏi..."}`).
Chúng ta sử dụng một hàm đệ quy để giải nén (parse) các kiểu dữ liệu này về dạng JSON nguyên bản (String, Number, Boolean, Array, Map).

---

## 5. Bước 4: Crawl Đề Thi Thực Tế Từ API Hệ Thống
Hệ thống cung cấp một API route nội bộ tổng hợp tất cả các câu hỏi thi thực tế đã được biên soạn sạch sẽ tại:
`https://vn-securities-platform.vercel.app/api/real-questions`

### Thực Hiện Request:
Gửi request kèm Header xác thực JWT Token thu được ở Bước 2:
*   `Authorization: Bearer <id_token>`
*   `Cookie: __session=<id_token>`

Dữ liệu trả về sẽ là danh sách toàn bộ các câu hỏi phân loại theo môn thi.

---

## 6. Tổng Kết Code Crawl Tự Động
Toàn bộ quy trình trên được tự động hóa hoàn toàn trong 2 file mã nguồn:
1.  [crawl.mjs](file:///c:/Users/admin/Documents/products/cchn-crawl/crawl.mjs): Thực hiện tải tài liệu PDF và thử nghiệm quét các Collection của Firestore.
2.  [extract-questions.mjs](file:///c:/Users/admin/Documents/products/cchn-crawl/extract-questions.mjs): Thực hiện trích xuất các câu hỏi gốc (seed questions) và gọi API hệ thống để lấy toàn bộ ngân hàng đề thi thực tế lưu trữ vào thư mục `exam-questions/`.
