# Improvement documentation

Folder này ghi lại các cải tiến được bổ sung sau implementation ban đầu của Ghibli Practice. Mỗi cải tiến có một tài liệu độc lập để reviewer có thể hiểu mục tiêu, thiết kế, code thay đổi, migration, cách kiểm thử và giới hạn mà không phải đọc toàn bộ git history.

## Danh sách cải tiến

| Ngày       | Cải tiến                     | Trạng thái | Tài liệu                                                                                 |
| ---------- | ---------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| 2026-10-02 | Semantic conversation search | Hoàn thành | [2026-10-02-semantic-conversation-search.md](2026-10-02-semantic-conversation-search.md) |
| 2026-10-05 | Clickable document citations | Hoàn thành | [2026-10-05-clickable-document-citations.md](2026-10-05-clickable-document-citations.md) |
| 2026-10-05 | Auto conversation title      | Hoàn thành | [2026-10-05-auto-conversation-title.md](2026-10-05-auto-conversation-title.md)           |
| 2026-10-05 | Optimistic updates and Undo  | Hoàn thành | [2026-10-05-optimistic-updates-and-undo.md](2026-10-05-optimistic-updates-and-undo.md)   |
| 2026-10-05 | Message actions              | Hoàn thành | [2026-10-05-message-actions.md](2026-10-05-message-actions.md)                           |
| 2026-10-06 | Tool approval by risk level  | Hoàn thành | [2026-10-06-tool-approval-by-risk.md](2026-10-06-tool-approval-by-risk.md)               |

## Quy ước tài liệu

Tên file sử dụng định dạng:

```text
YYYY-MM-DD-ten-cai-tien.md
```

Mỗi tài liệu nên có các phần:

1. Bối cảnh và vấn đề cần giải quyết.
2. Phạm vi và yêu cầu.
3. Thiết kế được chọn.
4. Luồng hoạt động.
5. Danh sách code thay đổi.
6. Database/API/configuration nếu có.
7. Kiểm thử và acceptance evidence.
8. Giới hạn, rủi ro và hướng phát triển tiếp theo.

## Template cho cải tiến mới

```markdown
# Tên cải tiến

Ngày: YYYY-MM-DD
Trạng thái: Planned | In progress | Completed

## Bối cảnh

## Yêu cầu

## Thiết kế

## Code thay đổi

## Migration và cấu hình

## Kiểm thử

## Giới hạn và bước tiếp theo
```

## Tài liệu liên quan

- [Tài liệu triển khai tổng thể](../ghibli-practice-implementation.vi.md)
- [Acceptance evidence](../practice-acceptance.md)
- [Implementation progress](../practice-progress.md)
- [Implementation plan](../../IMPLEMENTATION_PLAN.md)
