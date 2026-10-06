# Tool approval based on risk level

Ngày: 2026-10-06

Trạng thái: Completed

## 1. Bối cảnh

Ghibli Workspace có cả tool chỉ thay đổi giao diện, mutation có thể đảo ngược và thao tác xóa dữ liệu. Trước thay đổi này, risk policy nằm rải rác trong agent prompt và từng component: theme/sidebar chạy ngay, conversation deletion mở dialog, nhưng agent-side pin/archive/watchlist chạy trực tiếp trên server nên không tạo được Undo giống thao tác UI. File draft cũng có thể bị xóa từ nút `X` mà không có bước xác nhận rõ ràng.

## 2. Yêu cầu

| Risk level            | Tool/action                                                                | Hành vi                                     |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| No confirmation       | Theme, sidebar, search và read-only tools                                  | Chạy ngay                                   |
| Undoable              | Rename, pin/unpin, archive/restore conversation                            | Chạy ngay và hiển thị Undo                  |
| Confirmation required | Watchlist writes, delete conversation/file và mutation chưa được phân loại | Chờ người dùng duyệt; chưa thay đổi dữ liệu |

Policy phải áp dụng cho tool do agent gọi, không chỉ các button người dùng bấm trực tiếp.

## 3. Central risk policy

`src/lib/practice/tool-risk.ts` là registry duy nhất ánh xạ tool name sang:

```text
no_confirmation | undoable | confirmation_required
```

Các tool đã biết được khai báo tường minh. Tool mới chưa có trong registry nhưng có prefix mutation như `add_`, `create_`, `delete_`, `remove_`, `rename_`, `set_` hoặc `update_` mặc định là `confirmation_required`. Quy tắc fail-closed này ngăn một tool ghi dữ liệu mới vô tình chạy ngay chỉ vì developer quên cập nhật policy.

Các `set_*` UI an toàn như `set_theme` và `set_conversation_sidebar` được allowlist tường minh nên vẫn chạy không cần confirmation.

## 4. No-confirmation tools

Nhóm này không ghi dữ liệu business khó phục hồi:

- `set_theme`;
- `set_conversation_sidebar`;
- `open_conversation_search`;
- `show_attachment`;
- `list_watchlist`;
- `find_conversations`;
- `extract_attachment`;
- catalog queries.

Handler được thực thi ngay và trả tool result cho agent như trước.

## 5. Undoable tools

`update_conversation` được đăng ký thành frontend tool. REST API vẫn là canonical persistence boundary, nhưng frontend sở hữu transaction UX:

1. agent gọi tool;
2. frontend gọi validated REST endpoint;
3. React Query cache được invalidate/đồng bộ;
4. Undo toast xuất hiện sau mutation thành công;
5. Undo gọi mutation ngược qua API, không chỉ sửa cache cục bộ.

Rename/pin/archive dùng chung conversation mutation pipeline hiện có, gồm optimistic cache update, rollback và inverse mutation.

Watchlist add/remove ban đầu thuộc nhóm này nhưng đã được nâng lên `confirmation_required`; xem [Watchlist write approval](2026-10-06-watchlist-write-approval.md).

## 6. Confirmation-required tools

### Watchlist writes

`add_watchlist_film` và `remove_watchlist_film` dùng `useHumanInTheLoop`. Tool dừng ở approval card; REST mutation chỉ chạy trong callback Approve. Decline trả kết quả cho agent mà không thay đổi dữ liệu. Watchlist không có editable fields, nên update request được tách thành add/remove và mỗi mutation cần approval riêng.

### Delete conversation

`delete_conversation` chỉ gọi `onDelete()` để mở dialog hiện có. Tool result là `awaiting_user_action`; conversation chỉ bị xóa khi người dùng bấm nút destructive trong dialog. Dialog tiếp tục chặn delete khi response đang chạy.

### Delete file

`delete_attachment` chỉ hỗ trợ file draft chưa gắn vào saved message:

1. kiểm tra attachment thuộc conversation hiện tại;
2. từ chối xóa riêng saved attachment và hướng người dùng xóa conversation;
3. mở dialog `Delete file?`;
4. chỉ gọi `DELETE /attachments/:id` sau khi người dùng xác nhận.

Nút delete file trực tiếp trong attachment list cũng dùng cùng dialog. Nội dung dialog nói rõ thao tác permanent và không có Undo.

## 7. Runtime and agent boundary

Practice runtime chỉ forward các frontend tools đã allowlist. Danh sách mới gồm cả:

- `update_conversation`;
- `add_watchlist_film`;
- `remove_watchlist_film`;
- `delete_attachment`.

Agent prompt được cập nhật để không báo deletion thành công khi tool mới chỉ trả trạng thái chờ xác nhận.

## 8. Code thay đổi

| File                                                  | Nội dung                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/practice/tool-risk.ts`                       | Central risk registry và fail-closed fallback                                |
| `src/lib/practice/tool-risk.test.ts`                  | Unit test cho ba risk levels và unknown mutations                            |
| `src/components/practice/practice-tools.tsx`          | Frontend tools, HITL watchlist approval và confirmation-only delete handlers |
| `src/components/practice/watchlist-approval-card.tsx` | Approval/decline UI cho agent-requested watchlist writes                     |
| `src/components/practice/ghibli-chat.tsx`             | Delete-file confirmation dialog và props cho shared mutation/Undo            |
| `src/pages/practice/ghibli.tsx`                       | Truyền conversation mutation pipeline và Undo controller vào chat            |
| `src/mastra/agents/ghibli-agent.ts`                   | Loại server mutation bypass và mô tả risk behavior                           |
| `src/mastra/routes/practice.ts`                       | Allowlist frontend mutation/delete-file tools                                |

Không có database migration hoặc dependency mới.

## 9. Security và consistency

- Tool name từ model không tự quyết định risk; registry do application sở hữu.
- High-risk handler không gọi mutation trước confirmation.
- Backend tiếp tục kiểm tra thread/resource ownership và schema UUID.
- Saved attachment không thể bị xóa riêng để tránh message/citation trỏ tới file đã mất.
- Undo gọi server API thật, vì vậy trạng thái vẫn đúng sau reload.
- Unknown mutation tool mặc định yêu cầu confirmation.

## 10. Kiểm thử

Automated tests kiểm tra:

- theme/sidebar/search là `no_confirmation`;
- conversation metadata mutations là `undoable`;
- watchlist add/update/delete/remove và delete conversation/file là `confirmation_required`;
- unknown add/delete mutations fail closed;
- toàn bộ persistence, message action, semantic search, citation và optimistic-update tests cũ không regression.

Kết quả verification được ghi trong `docs/practice-acceptance.md`.

```text
npm test                  11 files, 37 tests passed
npm run typecheck         passed
npx eslint src scripts    passed
npm run vite:build        passed (existing externalization and large-chunk warnings)
npm run mastra:build      passed
```

Mastra build cuối cùng đã hoàn tất bundling và dependency installation. Build script bỏ qua package-lock generation trên Windows theo behavior hiện có.

## 11. Giới hạn

- File đã gắn với saved message chỉ bị xóa cùng conversation; chưa có flow sửa message để loại attachment và cập nhật citation atomically.
- Confirmation dialog là application-level approval. Task này không cần suspend/resume model run vì delete tool không thực thi side effect trước khi dialog được xác nhận.
- Policy registry cần được cập nhật khi thêm tool mới; fallback chỉ bảo đảm mutation chưa biết không chạy thẳng.
