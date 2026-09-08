# Kết quả triển khai và kiểm tra

Ngày: 08/09/2026

## Phạm vi đã triển khai

- Tùy biến chat input, user message, thông báo hệ thống cho người dùng và typing indicator.
- Giữ CopilotKit `1.0.0-beta.2`; tích hợp qua `Input` và `Messages` mà phiên bản này cung cấp.
- Giữ render action, Markdown và thao tác dừng/tạo lại phản hồi.
- Thêm sửa nội dung/người phụ trách trực tiếp bằng Edit/Save/Cancel; giữ thêm, hoàn thành và xóa task.
- Dùng chung store giữa UI và Copilot; thêm `updateTodo`, giữ `updateTodoList` và `deleteTodo`.
- Kiểm tra dữ liệu, giới hạn batch, cập nhật theo ID, giữ trường không đổi, không hồi sinh ID đã xóa.
- Sửa lỗi Cancel xóa người phụ trách và lỗi chat kết thúc im lặng khi stream không có phản hồi hoàn chỉnh.
- Bổ sung xử lý draft, trạng thái đang gửi, dừng và timeout 60 giây.
- Khi đóng chat, trả focus về nút mở và ẩn các control của cửa sổ khỏi thao tác bàn phím.

## Hướng dẫn đã áp dụng

Đã đọc và áp dụng `codex-agent-kit/AGENTS.md`, workflow `feature-development`,
skill `feature-implementation`, `frontend-workflow`, `test-engineering`, các
hướng dẫn React/Next.js và `definition-of-done.md`.

Dự án không có thư viện form dùng chung hoặc Storybook. Các form dùng HTML semantic;
test component đặt cạnh component, test store/hook đặt trong `__tests__`.
Không thay đổi thư mục kit hoặc cấu hình bí mật; giữ các thay đổi đang có của người dùng.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| `npm test` | **40/40 test đạt**, 11 file test; lần kiểm tra toàn bộ cuối sau khi các component chuyển vào `common/` và `chat/TodoChat/` |
| `npm run typecheck` | Đạt trên cấu trúc mã hiện tại |
| `npm run lint` | Đạt, không có warning/error ESLint |
| `npm run build` trước các sửa cuối | Đạt; build production và route `/api/copilotkit` được tạo thành công |
| `npm run build` sau các sửa cuối | Chưa đạt trong sandbox: `next/font` không tải được Inter từ Google Fonts (`EACCES`); chưa xác minh build production cuối |
| Desktop, 1280 × 720 | Đã xem bản build trước các sửa cuối; thêm task, sửa tên/người phụ trách, Save, Cancel và đánh dấu hoàn thành hoạt động |
| Mobile, 390 × 844 | Đã xem chat và danh sách trên bản build trước các sửa cuối; bố cục không tràn ngang trong kịch bản đã kiểm tra |
| HTTP failure trong trình duyệt | Đã tái hiện lỗi runtime khi thiếu API key: beta nuốt lỗi và kết thúc im lặng; sau đó bổ sung test hồi quy và sửa kiểm tra transcript |
| Sửa empty-stream và focus khi đóng chat | Mã đã cập nhật; empty-stream có test đạt, nhưng chưa kiểm tra lại các sửa cuối trên trình duyệt do build bị chặn |
| Copilot action/readable context | Test tích hợp dùng provider và đăng ký action thật; đã gọi handler, đọc context và xác minh thay đổi state |
| Phản hồi AI đầu cuối | Chưa xác minh bằng dịch vụ AI thực tế; handler tests không thay thế kiểm tra này |
| Screen reader | Chưa chạy NVDA/VoiceOver; chỉ kiểm tra semantic/accessibility tree và hành vi focus qua test/trình duyệt |

## Giới hạn môi trường

Lệnh build có quyền mạng từng chạy thành công. Lần yêu cầu quyền cho build lại
sau sửa cuối bị hệ thống duyệt tự động từ chối vì giới hạn sử dụng của bộ duyệt.
Build thông thường trong sandbox vẫn không truy cập được Google Fonts.
Không tắt kiểm tra type/lint, thay font hoặc sửa dependency để che lỗi môi trường này.

Khi môi trường cho phép mạng, cần chạy lại `npm run build`, mở bản build mới và
kiểm tra chat failure/focus. Sau đó chạy các kịch bản AI trong README với cấu hình
API hợp lệ. Không có deploy hoặc commit được thực hiện trong công việc này.

## Quyết định so với kế hoạch ban đầu

- State dùng store đồng bộ riêng cho mỗi danh sách và `useSyncExternalStore`, thay vì
  tập hợp handler `setTodos(prev => ...)`. Cách này trả được kết quả validation ngay
  cho UI/tool và tránh side effect trong updater; test bao phủ thay đổi cùng tick.
- `CustomSystemMessage` hiển thị welcome/action/error, không phải prompt role `system`.
- Chỉ thêm action `updateTodo` cho sửa một task; giữ hợp đồng batch thêm/cập nhật
  cũ và kiểm tra ID đã xóa để bảo vệ khỏi cập nhật trễ.
- Runtime client và các package Markdown vốn là dependency gián tiếp được khai báo
  trực tiếp vì code tùy biến sử dụng chúng. Runtime client được khóa đúng bản beta.
- Bổ sung Vitest/Testing Library và cấu hình ESLint vì dự án chưa có bộ test hoặc
  cấu hình lint chạy không tương tác. Type Node được cập nhật trong nhánh 20 để
  tương thích bộ test; không nâng Next.js hoặc CopilotKit.
- Giữ cách tổ chức file hiện tại: task UI trong `src/components/common/`, chat trong
  `src/components/chat/TodoChat/`.

## Khôi phục thay đổi

Thay đổi chỉ nằm trong app và tài liệu, không có migration hoặc dữ liệu bền vững.
Nếu cần rollback, dùng diff để hoàn nguyên riêng thay đổi feature và khôi phục
`package.json`/lockfile tương ứng, rồi chạy `npm ci`. Giữ nguyên các chỉnh sửa khác
của người dùng, nhất là `.gitignore`, cấu trúc thư mục và `.env.local`.
