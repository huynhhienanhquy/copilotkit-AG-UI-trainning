# Message actions

Ngày: 2026-10-05

Trạng thái: Completed

## 1. Bối cảnh

Ghibli Workspace trước đây chỉ hỗ trợ gửi message mới và dừng stream. Người dùng không thể sửa câu hỏi cũ, tạo lại câu trả lời, copy response bằng action rõ ràng, hoặc retry một tool call thất bại. Khi dừng response, phần nội dung đã stream cũng không có trạng thái terminal để phân biệt với response hoàn chỉnh.

## 2. Yêu cầu

- Edit và resend user message.
- Regenerate assistant response.
- Copy assistant response.
- Retry failed tool call.
- Response bị dừng phải hiển thị trạng thái `Interrupted`.
- History sau action phải lưu bền vững và đúng sau reload.
- Không cho mutation khi conversation archived hoặc đang có run khác.

## 3. Semantics được chọn

Message history là một timeline tuyến tính. Vì vậy edit/regenerate không giữ các response phía sau dưới dạng branch ẩn:

- **Edit and resend**: cập nhật nội dung user message được chọn, giữ nguyên block tham chiếu attachment do server tạo, xóa toàn bộ message phía sau rồi chạy agent lại.
- **Regenerate**: xóa assistant message được chọn và toàn bộ message phía sau, sau đó chạy lại từ user turn ngay trước nó.
- **Retry failed tool call**: xác nhận assistant message có tool invocation lỗi hoặc chưa hoàn tất, xóa response đó và chạy lại toàn bộ turn. Cách này để agent tự quyết định tool arguments mới và tránh phát lại mù một side effect cũ.
- **Copy response**: dùng copy action của `CopilotChatAssistantMessage`; dữ liệu copy là text content của response.
- **Stop response**: abort provider request, đánh dấu assistant message gần nhất bằng metadata `practiceStatus: interrupted`, và render badge `Interrupted` cả ngay tại client lẫn sau reload.

## 4. Luồng edit, regenerate và retry

1. UI disable action khi upload/run đang hoạt động hoặc conversation đã archive.
2. Client gọi `PATCH /practice/threads/:threadId/messages/:messageId` với action tương ứng.
3. `ConversationService` chạy mutation trong queue riêng của thread và kiểm tra ownership/archive/run lease.
4. Service cập nhật target nếu là edit, sau đó xóa descendants khỏi Mastra Memory.
5. Attachment thuộc các user message bị loại khỏi timeline được trả về trạng thái draft (`message_id = NULL`) thay vì bị mất file.
6. Server trả canonical history; client thay timeline hiện tại bằng response này.
7. Client gọi CopilotKit `runAgent` với user turn cuối cùng.
8. Query practice được invalidate để sidebar, search, messages và attachment state đồng bộ lại từ server.

Edit form chỉ hiển thị phần người dùng đã nhập. Block sau heading `Attached files:` không xuất hiện trong textarea và được server ghép lại từ message cũ, nên người dùng không thể vô tình sửa attachment ID.

## 5. Failed tool detection

Retry button chỉ xuất hiện khi ít nhất một tool call thỏa một trong các điều kiện:

- chưa có tool-result message;
- AG-UI tool message có trường `error`;
- serialized result chứa `error`;
- serialized result có `status` khác `success`, `completed` hoặc `result`.

Server kiểm tra lại Mastra tool invocation trước khi chấp nhận `retry_tool`. UI detection vì vậy chỉ quyết định affordance; backend vẫn là security và consistency boundary.

## 6. Interrupted state

Stop button đánh dấu response gần nhất ngay trên UI để phản hồi tức thì. `PracticeRunner` đồng thời truyền trạng thái abort vào completion callback. Sau khi run finalizer lưu phần response đã nhận, server cập nhật content metadata:

```json
{
  "practiceStatus": "interrupted"
}
```

`restoreMessages` ánh xạ metadata này sang assistant message name `interrupted`. Renderer dùng giá trị đó để khôi phục badge sau refresh. Nếu provider chưa kịp tạo assistant message, composer vẫn hiển thị thông báo `Response interrupted` cho phiên hiện tại.

## 7. API

### Edit

```http
PATCH /practice/threads/:threadId/messages/:messageId
Content-Type: application/json

{ "action": "edit", "text": "Updated question" }
```

### Regenerate

```json
{ "action": "regenerate" }
```

### Retry failed tool

```json
{ "action": "retry_tool" }
```

Response của cả ba action:

```json
{ "items": ["canonical AG-UI messages"] }
```

Validation từ chối sai role, message không thuộc thread, retry tool đã thành công, conversation archived và overlapping run.

## 8. Code thay đổi

| File                                                  | Nội dung                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/components/practice/ghibli-chat.tsx`             | Message renderers, edit dialog, regenerate/retry/stop lifecycle và canonical rehydration |
| `src/lib/practice/message-actions.ts`                 | Tách editable text và nhận diện failed tool result                                       |
| `src/mastra/routes/practice.ts`                       | PATCH message-action endpoint và interrupted finalization                                |
| `src/mastra/services/conversations.ts`                | Atomic timeline revision, descendant cleanup và interrupted metadata                     |
| `src/mastra/services/attachments.ts`                  | Detach file của user turn bị loại khỏi timeline                                          |
| `src/mastra/services/practice-messages.ts`            | Khôi phục persisted interrupted status                                                   |
| `src/mastra/services/practice-runner.ts`              | Báo completion là normal hay aborted đúng một lần                                        |
| `src/lib/practice/message-actions.test.ts`            | Unit test editable text và failed-tool detection                                         |
| `src/mastra/services/__tests__/conversations.test.ts` | Persistence tests cho edit, retry, regenerate và interrupted state                       |

Không có dependency mới hoặc database migration.

## 9. Kiểm thử

Automated coverage xác nhận:

- edit giữ attachment references và xóa mọi descendant cũ;
- regenerate trả timeline về user turn trước assistant response;
- retry chỉ chấp nhận invocation lỗi/chưa hoàn tất;
- interrupted metadata được lưu và restore thành badge;
- helper nhận diện missing result, explicit error, serialized error và success;
- toàn bộ test cũ không regression.

Verification ngày 2026-10-05:

```text
npm test              8 files, 27 tests passed
npm run typecheck     passed
npx eslint src scripts passed
npm run vite:build    passed (existing externalization and large-chunk warnings)
```

`npm run mastra:build` đã pass trong final rerun ngày 2026-10-06, gồm bundling và output dependency installation. Build script bỏ qua package-lock generation trên Windows theo behavior hiện có.

## 10. Giới hạn và bước tiếp theo

- Timeline hiện tuyến tính; edit/regenerate xóa descendants thay vì cung cấp branch navigation.
- Retry chạy lại cả assistant turn. Đây là lựa chọn an toàn hơn cho context nhưng tool không idempotent vẫn phải tự có idempotency/confirmation ở service tương ứng.
- Clipboard phụ thuộc quyền clipboard của browser; CopilotKit hiển thị trạng thái copy thành công tại toolbar.
- Interrupted badge cần assistant message đã bắt đầu được persist; nếu dừng trước token đầu tiên, chỉ có thông báo phiên hiện tại.
