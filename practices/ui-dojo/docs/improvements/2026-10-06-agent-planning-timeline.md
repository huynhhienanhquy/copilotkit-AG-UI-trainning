# Agent planning timeline

Ngày: 2026-10-06

Trạng thái: Completed

## 1. Mục tiêu

Khi một yêu cầu cần nhiều hành động độc lập, Ghibli Workspace hiển thị trước một kế hoạch ngắn theo thứ tự thực thi. Timeline giúp người dùng thấy agent sắp phối hợp những phần nào mà không hiển thị reasoning, hidden analysis hoặc chain-of-thought.

Yêu cầu một bước và câu hỏi thông tin đơn giản không tạo timeline để tránh làm chat nhiễu.

## 2. Luồng thực thi

1. Agent xác định yêu cầu cần từ hai hành động độc lập trở lên.
2. Agent gọi frontend tool `present_plan` đúng một lần trước hành động đầu tiên.
3. UI render title và 2–6 action labels theo thứ tự.
4. Handler xác nhận plan đã được trình bày và trả quyền điều khiển cho agent.
5. Agent tiếp tục gọi các read/UI/mutation tools cần thiết.

Tool call và arguments đi qua AG-UI/Mastra history như các tool call khác, nên timeline có thể được phục hồi cùng conversation mà không chạy lại handler.

## 3. Public-plan contract

`planningTimelineSchema` chỉ nhận:

- `title`: tiêu đề hướng tới kết quả, tối đa 80 ký tự;
- `steps`: 2–6 action labels, mỗi label tối đa 120 ký tự.

Schema dùng `.strict()`, vì vậy các field như `reasoning`, `analysis` hoặc payload ngoài contract bị từ chối. Component không đọc reasoning events và không biến model reasoning thành nội dung UI.

## 4. Timeline UI

`PlanningTimeline` hiển thị:

- title của kế hoạch;
- trạng thái `Planning…` trong khi arguments đang stream;
- trạng thái `Plan ready` khi tool hoàn tất;
- các bước đánh số và đường nối dọc để thể hiện thứ tự orchestration.

Component sử dụng design tokens hiện có nên tương thích light/dark theme, có semantic `section`, `ol` và accessible labels.

## 5. Runtime integration

- `present_plan` là frontend tool không có business side effect.
- Tool được thêm vào runtime frontend allowlist.
- Risk registry phân loại tool là `no_confirmation`.
- Agent instruction yêu cầu dùng đúng một lần cho multi-step request, bỏ qua với simple/single-step request và không lặp lại plan trong prose.

## 6. Files thay đổi

| File                                            | Nội dung                                 |
| ----------------------------------------------- | ---------------------------------------- |
| `src/lib/practice/planning.ts`                  | Strict schema và public plan type        |
| `src/lib/practice/planning.test.ts`             | Contract, bounds và no-reasoning tests   |
| `src/components/practice/planning-timeline.tsx` | Accessible numbered timeline             |
| `src/components/practice/practice-tools.tsx`    | `present_plan` frontend tool và renderer |
| `src/mastra/agents/ghibli-agent.ts`             | Multi-step planning policy               |
| `src/mastra/routes/practice.ts`                 | Frontend tool allowlist                  |
| `src/lib/practice/tool-risk.ts`                 | Explicit no-confirmation classification  |
| `src/lib/practice/tool-risk.test.ts`            | Risk policy regression coverage          |

## 7. Verification

```text
npm test                  10 files, 33 tests passed
npm run typecheck         passed
npx eslint src scripts    passed
npm run vite:build        passed
```

Vite vẫn báo các warning đã có trước về Node modules được browser-externalize và bundle chunks lớn; không có build error mới.

`npm run mastra:build` vẫn bị Windows giữ lock trong generated `.mastra/output/node_modules` (`EPERM` tại package `ajv`), giống lần kiểm tra task trước. Source frontend/backend đã qua project typecheck; lỗi không nằm trong source hoặc practice data.

## 8. Manual acceptance scenario

Prompt nhiều bước:

```text
Find Spirited Away, add it to my watchlist, then switch to dark theme.
```

Kỳ vọng: một timeline ngắn xuất hiện trước các tool actions, sau đó lookup, watchlist mutation và theme action tiếp tục chạy.

Prompt một bước:

```text
Switch to dark theme.
```

Kỳ vọng: theme đổi ngay, không tạo planning timeline.
