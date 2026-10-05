# Optimistic updates and Undo

Ngày: 2026-10-05

Trạng thái: Completed

## 1. Bối cảnh

Các thao tác archive, pin và cập nhật watchlist trước đây chờ API hoàn tất rồi mới invalidate toàn bộ practice query. Cách này giữ dữ liệu đúng nhưng tạo cảm giác chậm, không có cách đảo ngược thao tác vừa thực hiện và chỉ hiển thị lỗi sau khi server từ chối request.

## 2. Yêu cầu

- Dùng optimistic update của TanStack React Query.
- Archive và pin phải phản ánh ngay trên danh sách conversation.
- Remove watchlist phải phản ánh ngay trong panel.
- Archive thành công hiển thị toast `Conversation archived — Undo`.
- Cho phép Undo archive, pin và remove watchlist.
- Nếu API gốc hoặc API Undo thất bại, trả cache về snapshot trước mutation.
- Sau mỗi mutation, refetch dữ liệu canonical từ server.

## 3. Thiết kế

Mỗi mutation tuân theo cùng một transaction lifecycle:

1. `onMutate` hủy refetch đang chạy trên cache liên quan.
2. Chụp snapshot cache hiện tại.
3. Ghi trạng thái dự đoán vào cache ngay lập tức.
4. Gọi API.
5. `onError` khôi phục chính xác snapshot.
6. `onSuccess` ghi response canonical và tạo toast Undo nếu action hỗ trợ.
7. `onSettled` invalidate query để đồng bộ lần cuối với server.

Undo không chỉ sửa cache cục bộ. Nút Undo thực hiện mutation ngược qua cùng pipeline, vì vậy thay đổi được lưu bền vững và cũng có rollback nếu request ngược thất bại.

## 4. Conversation cache

Conversation xuất hiện trong hai dạng cache:

| Query key                            | Vai trò                                      |
| ------------------------------------ | -------------------------------------------- |
| `['practice', 'thread', id]`         | Conversation đang mở                         |
| `['practice', 'threads', scope]`     | Các trang infinite query active hoặc archive |
| `['practice', 'search', ...filters]` | Kết quả search có ranking và snippet         |

`optimisticConversation` áp dụng cùng semantics với backend cho `archivedAt`, `pinnedAt`, `title` và `updatedAt`. `updateConversationPages` sau đó:

- chuyển conversation giữa active/archive cache khi archive hoặc restore;
- đưa conversation đã pin lên đầu;
- giữ thứ tự `pinned → updatedAt → id` ổn định;
- cập nhật `total` và `hasMore` của các trang đã load;
- tạo mảng/object mới, không mutate snapshot dùng để rollback.

Search cache không được tự dựng lại vì nó chứa score và highlighted snippet do server tính. Sau mutation, search query được invalidate để lấy kết quả canonical.

## 5. Watchlist cache

`updateWatchlist` nhận film đầy đủ thay vì chỉ nhận ID:

- `PUT`: thêm film vào đầu cache với `addedAt` tạm thời;
- `DELETE`: loại film khỏi cache ngay;
- rollback: khôi phục nguyên mảng `WatchlistItem[]` trước mutation.

Khi remove thành công, toast hiển thị `<film title> removed from watchlist — Undo`. Undo gọi lại `PUT /watchlist/:filmId`; nếu request này thất bại, film vẫn ở trạng thái removed và lỗi được hiển thị ngay trong toast.

## 6. Toast Undo

Practice page sở hữu một toast controller dùng chung cho conversation và watchlist:

- chỉ giữ action reversible gần nhất;
- tự đóng sau 7 giây;
- có nút đóng thủ công;
- disable nút trong khi Undo đang chạy;
- chỉ đóng sau khi Undo thành công;
- giữ toast và hiển thị lỗi nếu Undo thất bại;
- dùng `role="status"` và `aria-live="polite"` để thông báo không ngắt quãng screen reader.

Các message hiện có:

| Action           | Toast                          | Undo mutation       |
| ---------------- | ------------------------------ | ------------------- |
| Archive          | `Conversation archived — Undo` | `archived: false`   |
| Restore          | `Conversation restored — Undo` | `archived: true`    |
| Pin              | `Conversation pinned — Undo`   | `pinned: false`     |
| Unpin            | `Conversation unpinned — Undo` | `pinned: true`      |
| Remove watchlist | `<title> removed ... — Undo`   | `PUT /watchlist/id` |

Undo mutation dùng `announce: false` để không tạo chuỗi toast qua lại vô hạn.

## 7. Failure và consistency

Conversation mutation snapshot tất cả thread-list cache đã load và detail cache của target. Watchlist mutation snapshot riêng watchlist cache. Phạm vi nhỏ này tránh rollback nhầm các query không liên quan nếu một action khác xảy ra đồng thời.

API error được xử lý theo thứ tự:

1. restore snapshot;
2. hiển thị error hiện có của page/panel;
3. invalidate query trong `onSettled`;
4. server response sau refetch trở thành source of truth cuối cùng.

Mutation không có cached entity vẫn gọi API bình thường; bước optimistic được bỏ qua và dữ liệu được nạp lại khi request settle.

## 8. Code thay đổi

| File                                          | Nội dung                                                   |
| --------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/practice/optimistic-updates.ts`      | Pure cache transforms cho conversation và watchlist        |
| `src/lib/practice/optimistic-updates.test.ts` | Tests archive/restore, pin/unpin và remove/restore         |
| `src/components/practice/undo-toast.tsx`      | Toast controller, timeout, pending và Undo error state     |
| `src/pages/practice/ghibli.tsx`               | Optimistic conversation mutation, rollback và shared toast |
| `src/components/practice/watchlist-panel.tsx` | Optimistic add/remove, rollback và Undo remove             |

Không có database migration, API contract mới hoặc dependency mới.

## 9. Kiểm thử

Automated tests xác nhận:

- archive xóa conversation khỏi active cache và thêm vào archived cache;
- Undo restore đưa conversation trở lại active cache;
- pin thay đổi thứ tự ngay, unpin trả về thứ tự trước đó;
- remove/restore watchlist tạo state mới và không làm hỏng snapshot;
- toàn bộ service/parser/bridge tests trước đó vẫn pass.

Verification ngày 2026-10-05:

```text
npm test                         7 files, 21 tests passed
npm run typecheck               passed
npx eslint src scripts          passed
npm run vite:build              passed (existing bundle-size warnings)
```

## 10. Giới hạn và bước tiếp theo

- UI giữ một toast Undo tại một thời điểm; action mới thay action cũ.
- Undo hết hạn sau 7 giây nhưng action gốc vẫn được lưu bình thường.
- Delete conversation không có Undo vì đây là destructive flow riêng có confirmation và cleanup message/file.
- Agent tool có thể cập nhật pin/archive/watchlist trên server; toast Undo hiện chỉ áp dụng cho thao tác trực tiếp từ UI.
- Search result được refetch thay vì optimistic rewrite để không giả lập ranking/snippet ở client.
