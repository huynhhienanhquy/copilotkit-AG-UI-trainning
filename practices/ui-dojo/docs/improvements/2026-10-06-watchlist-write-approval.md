# Watchlist write approval

Ngày: 2026-10-06

Trạng thái: Completed

## 1. Mục tiêu

Mọi thay đổi watchlist do agent đề xuất phải được người dùng duyệt trước khi ghi dữ liệu. Phạm vi gồm add, remove/delete và mọi yêu cầu update watchlist được biểu diễn bằng các thao tác add/remove tương ứng.

Read-only `list_watchlist` vẫn chạy ngay. Các nút trong Watchlist panel là hành động trực tiếp của người dùng, vì vậy chính cú click đó là authorization; approval card áp dụng cho agent-requested writes.

## 2. Lý do thay đổi

Trước thay đổi này, `add_watchlist_film` và `remove_watchlist_film` là frontend tools có handler gọi REST API ngay, sau đó mới hiển thị Undo. Undo giúp phục hồi nhưng không đáp ứng yêu cầu “approve trước khi thực hiện”.

## 3. Approval boundary

Hai mutation tools được chuyển từ `useFrontendTool` sang `useHumanInTheLoop`:

1. agent phát tool call với film UUID và catalog title;
2. CopilotKit dừng tool ở trạng thái `executing`;
3. UI hiển thị film, ID, `Decline` và `Approve add/remove`;
4. trước khi bấm Approve, không có `PUT`/`DELETE` request;
5. Approve mới gọi validated REST endpoint rồi trả `{ approved: true, result }` về agent;
6. Decline trả `{ approved: false }` mà không gọi mutation;
7. agent chỉ được báo thành công sau approved execution.

Approved mutations vẫn giữ Undo hiện có. Đây là lớp phục hồi bổ sung sau lớp approval, không thay thế approval.

## 4. Add, update và delete semantics

Watchlist lưu các film catalog immutable và `addedAt`; không có editable note, rating hoặc custom metadata. Vì vậy:

- add → `add_watchlist_film`, một approval;
- delete/remove → `remove_watchlist_film`, một approval;
- update danh sách → các add/remove cần thiết, mỗi mutation có approval riêng;
- `update_watchlist_film` và `delete_watchlist_film` được policy phân loại `confirmation_required` để fail closed nếu được bổ sung sau này.

## 5. UI states

`WatchlistApprovalCard` có ba trạng thái:

- `inProgress`: arguments đang stream, chưa có control thực thi;
- `executing`: hiển thị approval controls;
- `complete`: hiển thị `Approved and completed` hoặc `Declined — no changes made` từ persisted tool result.

Nếu API thất bại sau Approve, card hiển thị lỗi và vẫn cho phép người dùng quyết định lại; tool chưa nhận success result.

## 6. Code thay đổi

| File                                                       | Nội dung                                           |
| ---------------------------------------------------------- | -------------------------------------------------- |
| `src/components/practice/practice-tools.tsx`               | Native HITL registration và approved mutation      |
| `src/components/practice/watchlist-approval-card.tsx`      | Approval/decline UI và persisted outcome           |
| `src/components/practice/watchlist-approval-card.test.tsx` | Chứng minh no-execution-before-approval và decline |
| `src/lib/practice/tool-risk.ts`                            | Watchlist writes → `confirmation_required`         |
| `src/lib/practice/tool-risk.test.ts`                       | Add/update/delete/remove policy coverage           |
| `src/mastra/agents/ghibli-agent.ts`                        | Agent must wait for approval and respect decline   |
| `src/components/practice/watchlist-panel.tsx`              | Phân biệt agent approval với direct user controls  |

Không có database migration, API route mới hoặc dependency mới.

## 7. Security properties

- Server mutation tools không được đăng ký trực tiếp trên `ghibliAgent`.
- Runtime chỉ forward tên frontend tool đã allowlist.
- REST mutation nằm trong callback `onApprove`, không nằm trong tool registration handler.
- Decline không gọi mutation callback.
- Backend vẫn validate UUID, catalog membership và resource scope.
- Unknown mutation-shaped tools và mọi tên add/update/delete/remove watchlist đều fail closed trong risk policy.

## 8. Verification

```text
npm test                  11 files, 37 tests passed
npm run typecheck         passed
npx eslint src scripts    passed
npm run vite:build        passed
npm run mastra:build      passed
```

UI tests xác nhận:

- render card không tự chạy approved mutation;
- click Approve mới gọi mutation callback;
- click Decline không gọi approved mutation;
- persisted declined result không render action buttons.

Vite vẫn có các warning đã biết về browser-externalized Node modules và large chunks. Mastra build hoàn tất bundling, dependency installation và generated deploy output; Windows bỏ qua package-lock generation theo behavior hiện có của build script.
