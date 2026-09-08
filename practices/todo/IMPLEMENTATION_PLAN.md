# Kế hoạch tùy biến UI và cập nhật task trong ToDo App

Ngày lập: 08/09/2026

Trạng thái: Đã triển khai; còn xác minh build cuối và luồng AI thực tế. Xem [VERIFICATION.md](./VERIFICATION.md).

## 1. Mục tiêu và phạm vi

Thực hiện hai yêu cầu:

1. Tùy biến các thành phần chat: `Input`, `SystemMessage`, `UserMessage` và `TypingIndicator`.
2. Hoàn thiện cập nhật task từ tương tác trực tiếp trên UI và yêu cầu gửi cho Copilot.

### Giả định

- `Input` là ô nhập tin nhắn trong chat.
- `SystemMessage` là thông báo hiển thị cho người dùng. Cần xác minh tên gọi và vai trò của component trong phiên bản CopilotKit đang dùng trước khi triển khai; không đưa system prompt nội bộ ra UI.
- Cập nhật task gồm sửa nội dung, đổi trạng thái hoàn thành và đổi hoặc bỏ người phụ trách.
- Giữ dữ liệu trong React state như hiện tại. Lưu dữ liệu sau khi tải lại trang, database và đồng bộ nhiều người dùng chưa thuộc phạm vi.
- Giữ phong cách hiện có làm nền tảng thiết kế; chưa có mẫu thiết kế riêng.

### Hiện trạng đã kiểm tra

- `package.json` và `package-lock.json` cùng khóa các package CopilotKit chính ở `1.0.0-beta.2`.
- `src/app/page.tsx` chứa provider, popup chat, state task và các action của Copilot.
- `CopilotPopup` mới tùy biến tiêu đề, lời chào và hành vi mở/đóng.
- UI đã hỗ trợ thêm, đánh dấu hoàn thành, gán người qua `prompt()` và xóa task.
- Có action `updateTodoList` để thêm/cập nhật theo `id`, action `deleteTodo` và `useCopilotReadable` cung cấp danh sách cho Copilot.
- Chưa có thao tác sửa nội dung task trực tiếp.
- Cancel trong hộp thoại gán người hiện truyền `null` vào handler và có thể làm mất người phụ trách.
- Các handler hiện đọc `todos` từ closure; cần chuyển sang cập nhật dựa trên state mới nhất.

## 2. Bước 1 — Xác minh API và kiểm tra ban đầu

### Công việc

- [x] Cài dependency theo lockfile và chạy ứng dụng.
- [x] Kiểm tra type/source của `CopilotPopup` và component chat trong bản đã cài.
- [x] Xác định điểm mở rộng tương ứng cho bốn thành phần yêu cầu.
- [x] Xác minh `SystemMessage` chỉ thông báo hệ thống hay phản hồi assistant; ghi lại ánh xạ chính xác.
- [x] Kiểm tra cách nhận trạng thái đang xử lý, hoàn tất, lỗi và hủy của chat.
- [x] Chạy kiểm tra TypeScript, build và lint nếu đã cấu hình; ghi nhận lỗi có sẵn.
- [ ] Thử các luồng thêm, hoàn thành, gán người, xóa và cập nhật qua chat.

### Quyết định kỹ thuật

Ưu tiên API của phiên bản hiện tại. Nếu thiếu khả năng tùy biến, đánh giá lớp bọc hoặc nâng phiên bản tối thiểu cần thiết, kèm phạm vi ảnh hưởng và kiểm tra tương thích giữa các package CopilotKit.

Tài liệu hiện tại mô tả cơ chế slot với các tên như `input`, `messageView`, `assistantMessage`, `userMessage` và `cursor`. Đây chỉ là nguồn tham khảo; chưa xác minh khả năng áp dụng cho `1.0.0-beta.2`.

Tham khảo: [CopilotKit — Slots](https://docs.copilotkit.ai/custom-look-and-feel/slots).

### Điều kiện hoàn tất

- Có ánh xạ rõ ràng giữa bốn component yêu cầu và API thực tế.
- Chọn được cách tích hợp, xác định có cần đổi dependency hay không.
- Có kết quả kiểm tra ban đầu để phân biệt lỗi nền với lỗi do thay đổi mới.

## 3. Bước 2 — Thống nhất logic quản lý task

### Công việc

- [x] Tách phần danh sách từ `page.tsx` thành component `TodoList`.
- [x] Tạo hook `useTodos` quản lý state và các thao tác thêm, cập nhật, xóa.
- [x] Tạo kiểu dữ liệu cập nhật chỉ cho phép `text`, `isCompleted`, `assignedTo`.
- [x] Dùng store đồng bộ với useSyncExternalStore để mọi thao tác dựa trên snapshot mới nhất; xem quyết định điều chỉnh trong VERIFICATION.md.
- [x] Dùng `id` làm định danh; không dùng nội dung hoặc vị trí để xác định task.
- [x] Giữ nguyên trường không được gửi trong yêu cầu cập nhật.
- [x] Định nghĩa kết quả thao tác để UI và Copilot phản hồi thành công hoặc lỗi nhất quán.
- [x] Tách mutation/validation khỏi React state updater; trả kết quả đồng bộ và thông báo qua subscriber.

### Quy tắc dữ liệu

| Trường hợp | Hành vi |
| --- | --- |
| Sửa nội dung | Trim khoảng trắng; từ chối nội dung rỗng |
| Đổi trạng thái | Chỉ đổi trạng thái của đúng task |
| Bỏ người phụ trách | Dùng giá trị hoặc thao tác rõ ràng để biểu thị bỏ gán |
| Không truyền người phụ trách | Giữ nguyên người hiện có |
| Cập nhật `id` không tồn tại | Trả kết quả không tìm thấy; không tự tạo task |
| Hủy chỉnh sửa | Không thay đổi state |
| Thêm task trực tiếp | Sinh `id` mới và đặt trạng thái mặc định chưa hoàn thành |

### Tương thích với action hiện có

`updateTodoList` hiện có hành vi thêm nếu `id` chưa tồn tại. Cần giữ hành vi thêm/cập nhật này một cách rõ ràng cho action hiện có, đồng thời tách biệt với thao tác chỉ sửa một task. Không để yêu cầu sửa task đã bị xóa vô tình tạo lại task đó.

Chốt hợp đồng action ở bước 5 để phân biệt ý định tạo mới và chỉnh sửa, thay vì suy luận hoàn toàn từ việc có tìm thấy `id` hay không.

### Điều kiện hoàn tất

- UI và Copilot có thể dùng chung logic quản lý task.
- Các cập nhật liên tiếp không ghi đè dữ liệu do dùng state cũ.
- Thao tác sửa không làm mất trường không liên quan.

## 4. Bước 3 — Tùy biến giao diện chat

### Component dự kiến

| Component | Công việc |
| --- | --- |
| `CustomInput` | Ô nhập nhiều dòng, placeholder, nút gửi, trạng thái tương tác |
| `CustomSystemMessage` | Kiểu hiển thị riêng cho loại thông báo đã xác minh ở bước 1 |
| `CustomUserMessage` | Bong bóng tin nhắn căn phải, màu sắc và khoảng cách nhất quán |
| `CustomTypingIndicator` | Dấu hiệu đang xử lý, gắn với vòng đời phản hồi thực tế |

### Input

- [x] Enter để gửi; Shift+Enter để xuống dòng.
- [x] Không gửi nội dung rỗng hoặc chỉ có khoảng trắng.
- [x] Tránh gửi nhầm khi bộ gõ đang trong trạng thái composition.
- [x] Giữ callback gửi/nhận và hành vi quản lý nội dung theo API CopilotKit thực tế.
- [x] Xử lý trạng thái đang gửi để tránh gửi trùng ngoài ý muốn.
- [x] Có nhãn truy cập và trạng thái focus rõ ràng cho ô nhập, nút gửi.

### Message

- [x] Phân biệt trực quan tin nhắn người dùng với thông báo hoặc phản hồi của Copilot.
- [x] Giữ xuống dòng; hỗ trợ nội dung dài và chuỗi không có khoảng trắng.
- [x] Giữ khả năng render nội dung mà component gốc yêu cầu, sau khi xác minh API.
- [x] Không hiển thị system prompt hoặc dữ liệu nội bộ như thông báo người dùng.

### Typing indicator và bố cục

- [x] Hiển thị theo trạng thái xử lý thực tế, không dùng timer giả lập.
- [x] Dừng khi hoàn tất, lỗi hoặc hủy nếu phiên bản hỗ trợ hủy.
- [x] Có nhãn trạng thái cho trình đọc màn hình; hỗ trợ giảm chuyển động.
- [x] Kiểm tra bố cục trên desktop và mobile, không tràn ngang.
- [x] Giới hạn CSS trong phạm vi chat, tránh ảnh hưởng form task.
- [x] Nối các component vào `CopilotPopup` bằng API đã xác minh.

### Điều kiện hoàn tất

Cả bốn thành phần có giao diện tùy biến nhất quán; gửi, nhận và hiển thị trạng thái chat vẫn hoạt động đúng.

## 5. Bước 4 — Hoàn thiện thao tác cập nhật trực tiếp

### Công việc

- [x] Thêm nút Edit trong `TodoItem`.
- [x] Cho phép sửa nội dung và người phụ trách ngay trong dòng task.
- [x] Khởi tạo bản nháp từ dữ liệu hiện tại khi bắt đầu chỉnh sửa.
- [x] Thêm Save và Cancel; chỉ ghi state khi Save với dữ liệu hợp lệ.
- [x] Hiển thị lỗi cạnh trường nhập và giữ bản nháp khi lưu thất bại.
- [x] Giữ checkbox đổi trạng thái hoàn thành.
- [x] Thay `prompt()` gán người bằng trường chỉnh sửa trên UI.
- [x] Có cách bỏ người phụ trách rõ ràng.
- [x] Sửa lỗi Cancel làm mất người phụ trách.
- [x] Đảm bảo nút thao tác dùng được trên thiết bị cảm ứng và bằng bàn phím, không chỉ khi hover.
- [x] Xử lý trường hợp task bị xóa trong lúc đang chỉnh sửa.
- [x] Khi lưu, chỉ gửi trường người dùng đã sửa để tránh ghi đè thay đổi không liên quan từ Copilot.

### Luồng tương tác

1. Người dùng bấm Edit.
2. UI tạo và hiển thị bản nháp.
3. Người dùng sửa nội dung hoặc người phụ trách.
4. Save kiểm tra dữ liệu và gọi logic cập nhật theo `id`.
5. Thành công: đóng chế độ chỉnh sửa và hiển thị dữ liệu mới.
6. Lỗi: giữ bản nháp và hiển thị thông báo phù hợp.
7. Cancel: bỏ bản nháp, giữ nguyên dữ liệu task.

### Điều kiện hoàn tất

Người dùng sửa được nội dung, trạng thái và người phụ trách. Hủy chỉnh sửa không thay đổi dữ liệu; thêm và xóa vẫn hoạt động.

## 6. Bước 5 — Đồng bộ action của Copilot

### Công việc

- [x] Tách đăng ký `useCopilotAction` và `useCopilotReadable` vào hook `useTodoCopilot`.
- [x] Cho handler dùng chung logic quản lý task ở bước 2.
- [x] Chốt hợp đồng action phân biệt tạo mới và chỉnh sửa, giữ tương thích luồng thêm hiện có.
- [x] Mô tả rõ tham số bắt buộc, trường tùy chọn và cách bỏ gán người.
- [x] Kiểm tra dữ liệu action trước khi áp dụng.
- [x] Cung cấp danh sách mới nhất qua `useCopilotReadable`.
- [x] Phản hồi đúng kết quả thành công, task không tồn tại hoặc dữ liệu không hợp lệ.
- [x] Giữ hoạt động của `deleteTodo`.
- [x] Phân biệt trạng thái đang cập nhật với kết quả đã hoàn tất nếu API render hỗ trợ.

### Kịch bản yêu cầu qua chat

| Yêu cầu | Kết quả mong đợi |
| --- | --- |
| “Đánh dấu task A đã hoàn thành” | Đổi trạng thái đúng task |
| “Đổi tên task A thành Chuẩn bị demo” | Chỉ đổi nội dung |
| “Giao task A cho Linh” | Cập nhật người phụ trách |
| “Bỏ người phụ trách của task A” | Xóa giá trị được gán |
| “Sửa task vừa bị xóa” | Báo không tìm thấy, không tạo lại ngoài ý muốn |
| Yêu cầu tạo task mới | Luồng thêm hiện có vẫn hoạt động |

### Điều kiện hoàn tất

Thao tác trực tiếp và yêu cầu qua chat cùng cập nhật một nguồn dữ liệu; UI phản ánh kết quả và Copilot đọc được danh sách mới nhất.

## 7. Bước 6 — Kiểm thử và nghiệm thu

Tập trung kiểm thử tự động vào logic có nguy cơ sai dữ liệu. Kiểm tra trực quan và thao tác thực tế cho phần trình bày, tránh viết test chỉ sao chép cấu trúc component.

| Nhóm | Nội dung cần kiểm tra |
| --- | --- |
| Logic task | Đúng `id`, giữ trường không đổi, từ chối nội dung rỗng, xử lý `id` không tồn tại |
| Chỉnh sửa trực tiếp | Save, Cancel, bỏ gán người, xóa task khi đang sửa |
| Cập nhật liên tiếp | Không mất cập nhật do state cũ; không ghi đè trường không sửa |
| Chat input | Nút gửi, Enter, Shift+Enter, bộ gõ tiếng Việt, nội dung rỗng |
| Message | Nội dung dài, xuống dòng, ánh xạ đúng loại message |
| Trạng thái chat | Đang xử lý, hoàn tất, lỗi, hủy nếu được hỗ trợ |
| Tích hợp | UI thay đổi rồi Copilot đọc đúng; Copilot thay đổi rồi UI hiển thị đúng |
| Hồi quy | Thêm, xóa, đóng/mở chat vẫn hoạt động |
| Truy cập và bố cục | Desktop, mobile, bàn phím, focus, nhãn nút, giảm chuyển động |
| Kiểm tra kỹ thuật | TypeScript, build, lint đã cấu hình |

### Điều kiện môi trường

- Kiểm thử Copilot thực tế cần API key hợp lệ theo cấu hình runtime của dự án.
- Có thể kiểm tra handler bằng dữ liệu giả lập, nhưng không coi đó là bằng chứng đã kiểm tra luồng AI đầu cuối.
- Ghi rõ kiểm tra nào đã chạy, kết quả và phần chưa xác minh do thiếu môi trường.

### Checklist nghiệm thu

- [x] Bốn thành phần chat được tùy biến và tích hợp bằng API đã xác minh.
- [x] Người dùng sửa được nội dung, trạng thái và người phụ trách trên UI.
- [x] Cập nhật đúng task và giữ nguyên trường không liên quan.
- [x] Cancel không thay đổi dữ liệu; nội dung task rỗng bị từ chối.
- [x] Typing indicator kết thúc đúng khi hoàn tất hoặc lỗi.
- [ ] Copilot cập nhật task và danh sách hiển thị kết quả đúng.
- [ ] Copilot đọc được thay đổi mới từ thao tác trực tiếp.
- [x] Chức năng thêm và xóa không bị hồi quy.
- [ ] Các kiểm tra kỹ thuật phù hợp đã hoàn tất; hạn chế còn lại được ghi nhận.
- [x] README được cập nhật với hướng dẫn chạy và kịch bản kiểm tra.

## 8. Tổ chức file dự kiến

Các đường dẫn dưới đây tính từ thư mục `practices/todo`.

| File | Thay đổi dự kiến |
| --- | --- |
| `src/app/page.tsx` | Giữ bố cục, provider và tích hợp popup; chuyển logic danh sách ra ngoài |
| `src/app/globals.css` | Style chat có phạm vi và animation cần thiết |
| `src/components/common/TodoList.tsx` | Component mới cho danh sách và form thêm task |
| `src/components/common/TodoItem.tsx` | Edit, Save, Cancel, chỉnh người phụ trách và hỗ trợ bàn phím |
| `src/components/chat/TodoChat/CustomInput.tsx` | Ô nhập chat tùy biến |
| `src/components/chat/TodoChat/CustomSystemMessage.tsx` | Hiển thị loại thông báo đã xác minh |
| `src/components/chat/TodoChat/CustomUserMessage.tsx` | Tin nhắn người dùng tùy biến |
| `src/components/chat/TodoChat/CustomTypingIndicator.tsx` | Trạng thái đang xử lý |
| `src/hooks/useTodos.ts` | State và logic quản lý task dùng chung |
| `src/hooks/useTodoCopilot.ts` | Đăng ký action và dữ liệu đọc cho Copilot |
| `src/types/todo.ts` | Kiểu task, dữ liệu cập nhật và kết quả thao tác |
| `README.md` | Hướng dẫn chạy, hành vi mới và kịch bản kiểm tra |

Tên component và cách tích hợp có thể được điều chỉnh sau bước xác minh API, nhưng phải bao phủ đủ bốn thành phần yêu cầu.

## 9. Thứ tự và mốc bàn giao

| Mốc | Phụ thuộc | Kết quả review được |
| --- | --- | --- |
| M1 — Xác minh | Bước 1 | API tương thích, lựa chọn tích hợp, kết quả kiểm tra ban đầu |
| M2 — Logic task | M1, bước 2 | Bộ thao tác dùng chung và quy tắc dữ liệu rõ ràng |
| M3 — UI chat | M1, bước 3 | Bốn component tùy biến hoạt động trong popup |
| M4 — UI task | M2, bước 4 | Sửa, lưu, hủy và đổi người phụ trách trực tiếp |
| M5 — Copilot action | M2, M4, bước 5 | Luồng chat và UI đồng bộ dữ liệu |
| M6 — Nghiệm thu | M3, M5, bước 6 | Kết quả kiểm thử, hướng dẫn sử dụng và hạn chế được ghi nhận |

Thứ tự triển khai dự kiến: xác minh phiên bản → thống nhất logic task → tùy biến chat → hoàn thiện thao tác trực tiếp → nối action → kiểm thử và cập nhật tài liệu.

## 10. Tiến độ và bằng chứng

Checkbox được đánh dấu khi phần triển khai và kiểm tra tương ứng đã có bằng chứng.
Các checkbox AI đầu cuối vẫn để mở dù test handler/context đã đạt, vì chưa kiểm tra
bằng dịch vụ AI thực tế. Kiểm tra bố cục desktop/mobile đã thực hiện trên bản build
trước sửa empty-stream và focus; cần kiểm tra lại bản cuối sau khi build có mạng.

- M1–M5: đã triển khai, có test chức năng và tích hợp handler/context.
- M6: 40 test, TypeScript và lint đạt. Build trước sửa cuối đạt; build cuối bị chặn
  tải Google Fonts. Kiểm tra AI thực tế và screen reader vẫn chưa xác minh.
- Đã cập nhật README theo cấu trúc thư mục hiện tại.
- Kết quả, giới hạn môi trường, điều chỉnh kiến trúc và cách rollback nằm trong
  [VERIFICATION.md](./VERIFICATION.md).
