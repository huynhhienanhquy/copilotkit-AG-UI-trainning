# Kế hoạch thực hiện UI Dojo Practice

Ngày lập: 2026-09-08  
Trạng thái: kế hoạch triển khai; chưa thực hiện thay đổi ứng dụng.  
Thư mục: `practices/ui-dojo`  
Boilerplate: https://github.com/mastra-ai/ui-dojo

## 1. Mục tiêu và phạm vi

Xây dựng một trải nghiệm chat với Ghibli agent có khả năng điều khiển giao diện bằng tool, quản lý hội thoại, đọc file đính kèm và quản lý danh sách phim muốn xem. Lịch sử và dữ liệu nghiệp vụ phải khôi phục được sau khi tải lại trang hoặc khởi động lại backend.

Các yêu cầu bắt buộc:

- [ ] Tool đổi theme.
- [ ] Tool thu gọn/mở sidebar.
- [ ] Tool mở popup tìm kiếm.
- [ ] Tool hiển thị và trích xuất nội dung file đính kèm.
- [ ] Xóa, archive/unarchive, đổi tiêu đề, pin/unpin hội thoại.
- [ ] Hiển thị, thêm, xóa phim trong watchlist bằng Ghibli agent.
- [ ] Suggestions giới thiệu đầy đủ các tính năng.
- [ ] Lưu và khôi phục message, bao gồm nội dung tool và tham chiếu attachment.

### 1.1. Giả định triển khai

Các quyết định dưới đây là mặc định đề xuất để kế hoạch có thể triển khai ngay; chưa phải lựa chọn đã được người dùng xác nhận.

| Điểm chưa được đề bài xác định | Mặc định trong kế hoạch | Nếu thay đổi |
| --- | --- | --- |
| Framework UI | Một trang mới dùng CopilotKit v2 + Mastra/AG-UI | Nếu cần AI SDK/Assistant UI, giữ service/backend và bổ sung adapter UI riêng |
| Vị trí trang | `/practice/ghibli` và `/practice/ghibli/chat/:threadId` | Có thể đổi route mà không đổi mô hình dữ liệu |
| Sidebar được điều khiển | Sidebar danh sách hội thoại của trang practice | Sidebar điều hướng demo ngoài cùng tiếp tục dùng cơ chế hiện tại |
| Phạm vi tìm kiếm | Tiêu đề và nội dung text đã lưu của hội thoại; có bộ lọc archive | Tìm phim/web là phạm vi bổ sung |
| File hỗ trợ | TXT, Markdown, PDF có lớp text, DOCX; tối đa 10 MiB/file, 3 file/message | OCR, bảng tính, giải nén và định dạng khác là phần mở rộng |
| Ý nghĩa extract | Trích xuất văn bản, trả nguồn và thông tin trang nếu có | Tóm tắt có thể do agent thực hiện sau extraction; không đồng nhất extraction với tóm tắt |
| Người dùng | Một người dùng demo, `resourceId` cố định do server cấu hình | Nhiều người dùng cần thêm xác thực và suy ra resource từ session server |
| Conversation actions | Có menu UI; đồng thời có tool để demo qua chat | Đây là phần mở rộng có chủ đích so với cách đọc tối thiểu của đề bài |
| Watchlist | Dùng chung cho người dùng giữa các hội thoại | Không lưu watchlist riêng trong từng thread |
| Lưu file | Disk bền vững ở local, metadata trong DB | Triển khai trên hạ tầng ephemeral phải dùng object storage |

Không nhân bản toàn bộ tính năng sang mọi demo trong lần triển khai đầu. Không thêm đăng nhập, OCR, vector search hoặc triển khai production vào phạm vi mặc định.

## 2. Hiện trạng đã kiểm tra trong code local

| Khu vực | Hiện trạng | Hướng tận dụng |
| --- | --- | --- |
| `src/App.tsx` | Có routing cho AI SDK, Assistant UI, CopilotKit, Mastra Client SDK | Thêm route practice |
| `src/components/layout.tsx` | Layout chung, sidebar điều hướng demo | Thêm mục Ghibli Practice |
| `src/components/theme-provider.tsx` | Theme light/dark/system, lưu localStorage | Dùng lại `useTheme`, không tạo theme store thứ hai |
| `src/components/ui/sidebar.tsx` | Có context desktop/mobile, toggle và ghi cookie | Dùng cơ chế tương đương với context riêng cho conversation sidebar; tránh nhầm provider và phím tắt |
| `src/pages/copilot-kit/index.tsx` | Đã dùng v2 frontend tool, render tool, suggestions | Tham khảo cách đăng ký tool |
| `src/components/ck/copilot-chat-panel.tsx` | Shell dùng chung cho CopilotChat | Tái sử dụng hoặc bọc riêng cho practice |
| `src/pages/assistant-ui/index.tsx` | Có tải threads/messages, khôi phục và xóa thread khi memory bật | Tham khảo luồng, không copy nguyên runtime sang CopilotKit |
| `src/hooks/use-threads.ts`, `use-agent-messages.ts`, `use-delete-thread.ts` | Có nền tảng query/mutation cho memory | Dùng query key thống nhất theo resource, agent và thread |
| `src/mastra/agents/ghibli-agent.ts` | Chỉ tra cứu phim/nhân vật, chưa có memory | Cấu hình memory và thêm tools nghiệp vụ |
| `src/mastra/tools/ghibli-tool.ts` | Trả phim nhưng chưa giữ ID trong kết quả mapping | Bổ sung ID phim ổn định phục vụ watchlist |
| `src/mastra/storage.ts` | LibSQL dùng chung; hỗ trợ URL/token Turso | Tận dụng storage cho memory; xác minh API mở rộng trước khi viết repository nghiệp vụ |
| `src/mastra/index.ts` | Server cổng 4750, route CopilotKit và chat | Đăng ký route/service cho practice |

Ghi chú: component archive mẫu không chứng minh archive đã nối với persistence. Có attachment UI cũng không chứng minh file đã được upload, trích xuất hoặc khôi phục sau reload.

## 3. Kiến trúc dự kiến

```text
Ghibli Practice Page
  ├─ Conversation sidebar + action menu + search dialog
  ├─ CopilotKit v2 chat + suggestions + tool renderers
  ├─ Attachment preview + extracted text view
  └─ Watchlist panel
          │
          ├─ Frontend tools → theme/sidebar/dialog state
          │
          └─ API / AG-UI → Mastra Ghibli agent
                              ├─ Memory: threads + message parts
                              ├─ Conversation service
                              ├─ Attachment service + extraction
                              └─ Watchlist service + Ghibli catalog
                                      │
                                      ├─ LibSQL / configured database
                                      └─ Durable file storage
```

Nguyên tắc:

1. Nút UI và agent tool gọi chung service nghiệp vụ; không có hai cách lưu watchlist/conversation khác nhau.
2. React state giữ trạng thái hiển thị; DB giữ dữ liệu cần tồn tại qua phiên.
3. Dùng Mastra Memory làm nguồn lịch sử duy nhất. Nếu bridge thiếu lưu một loại message part, bổ sung ở một điểm tích hợp đã xác minh; không tạo thêm kho chat song song.
4. Định danh thread ở URL; request chạy agent luôn gắn đúng thread/resource.
5. Frontend tool và backend tool trả kết quả có cấu trúc. Không báo thành công trước khi mutation hoàn tất.
6. Dữ liệu tool đã lưu chỉ được render khi mở lại lịch sử, không được thực thi lại.

### 3.1. Dữ liệu cần lưu

| Thực thể | Trường chính | Quy tắc |
| --- | --- | --- |
| Thread | ID, resourceId, agentId, title, createdAt, updatedAt | Dùng thread của Mastra; không nhân đôi bảng lịch sử |
| Thread metadata | archivedAt, pinnedAt, schemaVersion | Merge metadata để không ghi đè trường không liên quan; nếu API hiện tại không phù hợp, dùng bảng phụ theo threadId |
| Message | ID, threadId, role, parts, thời gian | Giữ tool call ID/result và attachment ID; thứ tự ổn định, không trùng ID |
| Attachment | ID, resourceId, threadId, messageId khi đã gắn, filename, MIME, size, storageKey, status, createdAt | Tên lưu do server tạo; file phải tồn tại độc lập với blob URL của trình duyệt |
| Extraction | attachmentId, parserVersion, status, text/chunks, page metadata, errorCode | Cache kết quả theo file và parser; giữ rõ lỗi, rỗng và unsupported |
| Watchlist item | resourceId, filmId, title, image, releaseYear, addedAt | Unique `(resourceId, filmId)`; thêm lại không tạo bản sao |

Preferences theme và trạng thái sidebar có thể lưu ở localStorage. Dữ liệu lịch sử, file và watchlist không phụ thuộc localStorage. Không coi resourceId do browser tùy ý gửi là cơ chế xác thực.

## 4. Tool contracts dự kiến

Tên và schema dưới đây là thiết kế ứng dụng; cần kiểm tra cách đăng ký tương ứng với phiên bản SDK đang cài ở bước P0.

| Tool | Input chính | Nơi thực thi | Kết quả / hành vi |
| --- | --- | --- | --- |
| `set_theme` | mode: light/dark/system/toggle | Frontend | Theme đã áp dụng; toggle dựa trên màu thực tế khi đang system |
| `set_conversation_sidebar` | expanded: boolean | Frontend | Mở/đóng đúng sidebar trên desktop và mobile |
| `open_conversation_search` | query?: string, includeArchived?: boolean | Frontend | Mở dialog, điền query và focus input; không tuyên bố tìm thấy nếu mới chỉ mở popup |
| `show_attachment` | attachmentId | Frontend + API đọc file | Mở preview của file đã tồn tại và thuộc resource/thread hợp lệ |
| `extract_attachment` | attachmentId | Backend | Text hoặc chunks giới hạn kích thước, nguồn, trạng thái và thông tin cắt ngắn |
| `list_watchlist` | Không cần ID người dùng từ model | Backend | Danh sách phim và số lượng |
| `add_watchlist_film` | filmId | Backend | added/already_exists và phim đã xác minh từ catalog |
| `remove_watchlist_film` | filmId | Backend | removed/not_found |
| `rename_conversation` | threadId, title | Backend | Tiêu đề mới, giới hạn 1–120 ký tự sau trim |
| `set_conversation_archived` | threadId, archived: boolean | Backend | Trạng thái archive sau cập nhật |
| `set_conversation_pinned` | threadId, pinned: boolean | Backend | Trạng thái pin sau cập nhật |
| `delete_conversation` | threadId | Backend qua luồng xóa của ứng dụng | Chỉ xóa khi thread mục tiêu không có run đang chạy |

Tools backend dùng context từ server để xác định resource, không cho model chọn chủ sở hữu. ID không tồn tại trả lỗi có mã và mô tả phù hợp; không tự đoán ID từ tiêu đề trùng.

Agent context cung cấp theme/sidebar hiện tại, thread hiện tại, danh sách attachment có thể sử dụng và thông tin hội thoại tối thiểu cần thiết. Tra cứu hội thoại khác qua service với phân trang/tìm kiếm; không nhét toàn bộ lịch sử vào prompt.

Quy tắc đặc biệt cho xóa thread hiện tại: agent trình bày thao tác xóa trên UI, kết thúc run, sau đó người dùng kích hoạt nút xóa. Service chặn xóa thread đang streaming để phần kết thúc run không tạo lại message trong thread đã xóa. Đây là thiết kế tương tác cho thao tác xóa dữ liệu; các thao tác rename/pin/archive không cần quy trình này.

## 5. Kế hoạch triển khai theo giai đoạn

### P0 — Kiểm chứng tích hợp và baseline

Phụ thuộc: không có.

- [ ] Đọc lại `AGENTS.md`, kiểm tra working tree và giữ nguyên thay đổi đang có.
- [ ] Kiểm tra Node/pnpm, dependencies đã cài, scripts và cấu hình môi trường; không in API key/token.
- [ ] Chạy build/lint baseline; ghi lỗi có sẵn để phân biệt lỗi mới.
- [ ] Kiểm tra API/type của các phiên bản CopilotKit 1.62.1, `@ag-ui/mastra` 1.1.1 và Mastra trong package local.
- [ ] Làm một luồng nhỏ: tạo thread → gửi message → chạy frontend tool → lưu result → reload → tiếp tục chat.
- [ ] Xác minh cách đặt threadId, truyền resourceId, hydrate message và chuyển đổi Mastra message parts sang định dạng AG-UI/CopilotKit.
- [ ] Kiểm tra khả năng cập nhật title/metadata, phân trang messages và hỗ trợ truy vấn storage.
- [ ] Chốt đường tích hợp: ưu tiên bridge có sẵn; viết adapter hẹp nếu cần. Không nâng phiên bản hàng loạt để né lỗi chưa hiểu.

Đầu ra: ghi chú quyết định kỹ thuật và luồng persistence hoạt động. Chưa mở rộng tất cả tools khi vòng lưu/khôi phục này chưa đạt.

### P1 — Dữ liệu và backend services

Phụ thuộc: P0.

- [ ] Bật `Memory` dùng `getStorage()` cho Ghibli agent; kiểm tra tác động tới các demo Ghibli hiện có.
- [ ] Đặt resourceId demo trong server config và truyền nhất quán ở chat/list/load/mutation.
- [ ] Tạo migration có phiên bản cho attachment, extraction và watchlist; bổ sung thread metadata nếu phải dùng bảng phụ.
- [ ] Tạo repositories/services cho conversation, attachment và watchlist, dùng API storage đã kiểm tra.
- [ ] Cung cấp thao tác tạo/list/read/update/delete hội thoại và đọc lịch sử có phân trang.
- [ ] Định nghĩa lỗi validation/not_found/conflict/extraction_failed và phản hồi thống nhất.
- [ ] Chuẩn hóa query keys phía frontend theo resourceId, agentId, threadId.
- [ ] Định nghĩa xóa hội thoại: xóa message, metadata và file thuộc riêng thread; watchlist vẫn là dữ liệu người dùng độc lập.

Nghiệm thu: dữ liệu không mất sau restart server; migration chạy lại an toàn; thao tác trên resource/thread khác bị từ chối hoặc không tìm thấy.

### P2 — Trang chat và lưu/khôi phục messages

Phụ thuộc: P1.

- [ ] Thêm trang practice, route có threadId và mục navigation.
- [ ] Tạo conversation trước khi gửi message đầu tiên; thread rỗng có tên mặc định và có thể được xóa.
- [ ] Nối CopilotKit với Ghibli agent và thread đang chọn.
- [ ] Tải lịch sử trước khi cho phép gửi; có loading/error/retry và trạng thái thread không tồn tại.
- [ ] Khôi phục text, tool call/result và attachment references; xử lý message part chưa hỗ trợ bằng fallback có ý nghĩa.
- [ ] Giữ nguyên message ID/thứ tự, tránh nhân đôi khi hydrate hoặc reconnect.
- [ ] Dừng run khi chuyển thread trong bản đầu; không để chunk của thread cũ cập nhật thread mới.
- [ ] Xử lý hủy stream/lỗi mạng: giữ phần đã được lưu, hiển thị kết quả chưa hoàn tất, retry không chạy lại mutation thành công.
- [ ] Khi mở `/practice/ghibli`, khôi phục thread gần nhất còn hợp lệ hoặc mở trạng thái tạo mới.
- [ ] Hỗ trợ tải thêm lịch sử; không âm thầm chỉ hiển thị trang đầu.

Nghiệm thu: gửi ít nhất hai lượt, reload, mở URL trực tiếp, restart backend và chat tiếp vẫn đúng thread; mở lịch sử không gọi lại frontend/backend tool.

### P3 — Conversation sidebar và quản lý hội thoại

Phụ thuộc: P2.

- [ ] Tạo sidebar riêng: New chat, Active, Archived, nhóm Pinned và danh sách còn lại.
- [ ] Mặc định sắp pinned trước; trong nhóm sắp theo thời gian phù hợp, ổn định khi bằng nhau.
- [ ] Menu mỗi thread: rename, pin/unpin, archive/unarchive, delete.
- [ ] Rename có input, Enter để lưu, Escape để hủy, validation tiêu đề.
- [ ] Archive giữ nguyên messages; archived thread mở được để đọc, unarchive trước khi gửi tiếp.
- [ ] Giữ pinnedAt khi archive; archive không hiện trong Active, unarchive khôi phục vị trí pinned.
- [ ] Xóa thread đang xem điều hướng về thread hợp lệ hoặc màn hình mới sau khi xóa hoàn tất.
- [ ] Mutations thành công cập nhật cache/list/search; lỗi không để UI báo trạng thái đã lưu.
- [ ] Đăng ký tools quản lý conversation qua cùng service; định danh rõ thread mục tiêu.
- [ ] Chặn xóa thread có run active; hoàn thiện flow xóa thread hiện tại như phần tool contracts.

Nghiệm thu: tất cả thao tác tồn tại sau reload; archive không xóa dữ liệu; xóa không khiến thread xuất hiện lại; thay đổi metadata không ghi đè lẫn nhau.

### P4 — Tools điều khiển UI

Phụ thuộc: P2, P3.

- [ ] Gom đăng ký frontend tools trong hook/component nằm dưới đúng CopilotKit và UI providers.
- [ ] Nối `set_theme` vào `useTheme`; dùng cùng hành vi với nút theme.
- [ ] Nối `set_conversation_sidebar` vào state sidebar practice; xử lý mobile drawer.
- [ ] Theme/sidebar được thao tác bằng nút hoặc agent đều cập nhật cùng state.
- [ ] Lưu preference sidebar riêng, tránh cookie/phím tắt đụng sidebar điều hướng toàn ứng dụng.
- [ ] Tool trả trạng thái sau khi thực hiện, có renderer gọn cho kết quả và lỗi.
- [ ] Đảm bảo re-render/hydration không đăng ký hoặc thực thi tool nhiều lần.

Nghiệm thu: lệnh bật/tắt thực hiện chính xác từ mọi trạng thái; chỉ có một nguồn theme và một state conversation sidebar.

### P5 — Search popup

Phụ thuộc: P1, P3; frontend tool dựa trên P4.

- [ ] Xây dialog bằng UI primitives hiện có; nút mở và phím tắt Ctrl/Cmd+K scoped cho trang practice.
- [ ] Hỗ trợ tìm theo title và text message đã lưu, không tìm tool JSON/raw file trong bản đầu.
- [ ] Có bộ lọc Active/Archived/All; mặc định Active.
- [ ] Backend tìm trên toàn bộ dữ liệu thuộc resource, có phân trang; không chỉ lọc danh sách đang tải ở browser.
- [ ] Chuẩn hóa khoảng trắng/case, dùng truy vấn tham số; kiểm tra Unicode và tiếng Việt.
- [ ] Debounce khoảng 250 ms; bỏ kết quả request cũ khi query mới đã thay đổi.
- [ ] Kết quả có title, snippet và thời gian; chọn kết quả mở đúng thread, đóng dialog.
- [ ] Hỗ trợ focus, Escape, bàn phím, loading, không có kết quả và lỗi.
- [ ] `open_conversation_search` mở popup và điền sẵn query từ agent.

Nghiệm thu: tìm được text trong message cũ chưa được load vào UI; archive filter đúng; rename/delete phản ánh trong kết quả.

### P6 — Ghibli watchlist

Phụ thuộc: P1, P2.

- [ ] Giữ `filmId` trong kết quả `ghibliFilms`; xử lý lỗi HTTP và dữ liệu catalog không hợp lệ.
- [ ] Bổ sung list/add/remove watchlist tools với schema rõ ràng.
- [ ] Agent tìm phim trong catalog để lấy ID thật trước khi thêm; hỏi lại khi tên mơ hồ.
- [ ] Watchlist service xác minh phim và bảo đảm unique `(resourceId, filmId)`.
- [ ] Tạo panel/card hiển thị poster nếu có, title, năm phát hành và nút remove.
- [ ] Nút add/remove và agent tools dùng cùng service, cập nhật panel ngay sau thành công.
- [ ] Tool result lịch sử mô tả thao tác đã diễn ra; panel watchlist luôn hiển thị dữ liệu hiện tại.
- [ ] Sửa instructions Ghibli agent để nhận cả yêu cầu UI, conversation, attachment, watchlist; tránh quy tắc cũ buộc gọi catalog cho mọi câu hỏi.

Nghiệm thu: thêm Totoro ở thread A, mở thread B vẫn thấy; thêm lại không trùng; xóa phim đã vắng trả kết quả hợp lệ; lỗi catalog không tạo phim giả.

### P7 — Attachment upload, preview và extraction

Phụ thuộc: P1, P2.

- [ ] Chọn parser TXT/Markdown/PDF/DOCX tương thích runtime bằng một sample thật mỗi loại; kiểm tra API/version trước khi thêm dependency.
- [ ] Thêm upload endpoint, giới hạn kích thước/số file và validate MIME/nội dung; tên storage do server cấp.
- [ ] Upload hoàn tất trước khi gửi message tham chiếu attachment; hiển thị uploading/success/error/remove.
- [ ] Lưu file bền vững và metadata; gắn attachmentId vào message thay vì chỉ dùng blob URL.
- [ ] Cho phép gửi message chỉ có file; agent nhận attachment metadata để biết file nào có thể gọi tool.
- [ ] Preview TXT/Markdown dưới dạng nội dung an toàn, PDF qua viewer phù hợp; DOCX hiển thị văn bản trích xuất và liên kết file gốc.
- [ ] Tool `show_attachment` mở preview; không cho model cung cấp đường dẫn filesystem/URL tùy ý thay attachmentId.
- [ ] Extraction lưu full text/chunks; trả tối đa 20.000 ký tự/lần cho agent và metadata chỉ rõ còn dữ liệu, hỗ trợ đọc tiếp theo chunk.
- [ ] Không đưa toàn bộ file lớn vào prompt; text trích xuất được coi là dữ liệu người dùng, không thành chỉ dẫn hệ thống.
- [ ] PDF scan trả trạng thái cần OCR/không có text; DOCX/PDF lỗi hoặc mã hóa trả lỗi cụ thể.
- [ ] Có timeout extraction và giới hạn tài nguyên parser; đặc biệt giới hạn nội dung giải nén DOCX.
- [ ] Upload chưa gắn message được dọn khi hủy hoặc hết TTL 24 giờ bằng cơ chế cleanup nội bộ được tài liệu hóa.
- [ ] Sau reload, file cũ mở được và extraction có thể dùng lại; file không tồn tại hiện lỗi rõ ràng.

Nghiệm thu: upload, show, extract và reload thành công với bốn định dạng đã chọn; không cắt ngắn âm thầm; không giả vờ đọc được file lỗi/scan.

### P8 — Suggestions và trải nghiệm xuyên suốt

Phụ thuộc: P3–P7.

- [ ] Tạo registry suggestions gồm ID, label, prompt/action, điều kiện hiển thị và feature tương ứng.
- [ ] Hiển thị 4–6 gợi ý phù hợp nhất và nút xem tất cả tính năng.
- [ ] Suggestions gọi cùng luồng gửi chat/tool/UI đã xây, không mô phỏng kết quả.
- [ ] Có hướng dẫn upload khi chưa có file, thay vì gửi prompt extraction chắc chắn thất bại.
- [ ] Nội dung gợi ý rename/delete chỉ tới thread hiện tại; thao tác thread khác cần người dùng chọn rõ.
- [ ] Bổ sung empty states, lỗi có thể thử lại, disable thao tác không hợp lệ khi streaming/uploading.
- [ ] Kiểm tra layout desktop/mobile, bàn phím, focus dialog và tương phản ở cả hai theme.

### P9 — Kiểm thử, tài liệu và bàn giao

Phụ thuộc: tất cả giai đoạn trước.

- [ ] Chạy `pnpm run vite:build`, `pnpm run lint` và build/start backend theo môi trường hỗ trợ.
- [ ] Script `mastra:build` hiện dùng gán biến môi trường kiểu POSIX: nếu chạy trên Windows, dùng cách đặt biến tương đương trong PowerShell hoặc sửa script cross-platform khi cần.
- [ ] Thêm kiểm thử tự động có giá trị cho persistence, metadata, search, watchlist và attachment; chọn runner tối thiểu tương thích dự án.
- [ ] Test service/parser dùng DB tạm và fixtures; không cần LLM hoặc gọi external API thật để pass.
- [ ] Kiểm thử UI thủ công với model thật cho các tool và suggestions; ghi rõ phần chưa xác minh nếu thiếu credentials.
- [ ] Kiểm tra lại các demo cũ chịu ảnh hưởng từ Ghibli agent/memory/layout.
- [ ] Cập nhật README: setup, env, migration, vị trí DB/file, giới hạn file, demo prompts và checklist chạy thử.
- [ ] Tạo báo cáo nghiệm thu với kết quả thực tế, lỗi baseline còn tồn tại và giới hạn còn lại.

## 6. Danh sách thay đổi theo file dự kiến

Các file mới dưới đây là phương án tổ chức; điều chỉnh sau P0 nếu API hiện có cho phép tái sử dụng tốt hơn.

| File/khu vực | Thay đổi |
| --- | --- |
| `src/App.tsx`, `src/components/layout.tsx` | Routes và mục navigation cho practice |
| `src/pages/practice/ghibli.tsx` | Trang tổng, thread routing và provider composition |
| `src/components/practice/ghibli-chat.tsx` | Chat, hydration, streaming và tool renderers |
| `src/components/practice/conversation-sidebar.tsx` | List, active/archive/pinned và trạng thái responsive |
| `src/components/practice/conversation-actions.tsx` | Menu rename/pin/archive/delete |
| `src/components/practice/conversation-search.tsx` | Search dialog |
| `src/components/practice/attachment-preview.tsx` | Upload/preview/extracted text UI |
| `src/components/practice/watchlist-panel.tsx` | Danh sách phim hiện tại |
| `src/components/practice/practice-ui-provider.tsx` | State sidebar, search, attachment preview |
| `src/hooks/use-practice-tools.tsx` | Frontend tools, agent context và renderer registrations |
| `src/hooks/use-practice-conversations.ts` | Query/mutation/cache conversation và message |
| `src/hooks/use-watchlist.ts`, `use-attachments.ts` | Query/mutation dữ liệu nghiệp vụ |
| `src/lib/practice/contracts.ts` | Types/schema dùng chung, không import server code vào frontend |
| `src/lib/practice/api.ts`, `suggestions.ts` | API client và suggestion registry |
| `src/mastra/agents/ghibli-agent.ts` | Memory, instructions và tools |
| `src/mastra/tools/ghibli-tool.ts` | Stable film ID và kiểm tra dữ liệu nguồn |
| `src/mastra/tools/watchlist-tools.ts` | List/add/remove tools |
| `src/mastra/tools/attachment-tools.ts` | Extraction/read chunks |
| `src/mastra/tools/conversation-tools.ts` | Conversation mutations |
| `src/mastra/services/` | Conversation, watchlist, attachment services và extraction adapters |
| `src/mastra/repositories/`, `src/mastra/migrations/` | Truy cập dữ liệu nghiệp vụ và migrations |
| `src/mastra/routes/practice.ts`, `src/mastra/index.ts` | API registration; adapter AG-UI riêng chỉ khi P0 chứng minh cần |
| `package.json`, `pnpm-lock.yaml`, `.env.example`, `.gitignore` | Dependencies/parser/test scripts, cấu hình mẫu và loại DB/upload/generated files khỏi Git |
| `README.md`, `docs/practice-acceptance.md` | Hướng dẫn và kết quả nghiệm thu |

Không tái cấu trúc toàn bộ demo hiện có để phục vụ trang mới. Theo `AGENTS.md`: alias `@/*`, ưu tiên `type`, component typed props, named exports, `cn()` và Zod cho validation.

## 7. Ma trận suggestions

| Tính năng | Prompt/action mẫu | Điều kiện |
| --- | --- | --- |
| Theme | “Chuyển sang giao diện tối/sáng” | Chọn ngược theme hiện tại |
| Sidebar | “Thu gọn/Mở danh sách hội thoại” | Theo trạng thái sidebar |
| Search | “Tìm cuộc trò chuyện có nhắc đến Totoro” | Luôn có thể mở popup |
| Upload | Mở bộ chọn file | Chưa có attachment |
| Show file | “Mở file tôi vừa đính kèm” | Có file upload thành công |
| Extract | “Trích xuất văn bản từ file này” | Có file được hỗ trợ; nhiều file thì chọn rõ |
| Rename | “Đổi tên cuộc trò chuyện này thành Ghibli cuối tuần” | Thread đã tạo |
| Archive | “Lưu trữ cuộc trò chuyện này” | Thread active |
| Unarchive | Nút khôi phục trong archive; prompt chỉ rõ thread từ một chat active | Thread archived không nhận message mới |
| Pin/unpin | “Ghim/Bỏ ghim cuộc trò chuyện này” | Theo metadata hiện tại |
| Delete | “Xóa cuộc trò chuyện này” → hiển thị hành động xóa trên UI | Thread đã tạo; xóa chỉ thực hiện khi run kết thúc |
| Show watchlist | “Cho tôi xem danh sách phim muốn xem” | Luôn có |
| Add film | “Thêm Spirited Away vào danh sách muốn xem” | Phim chưa có trong watchlist |
| Remove film | “Xóa [phim đang có] khỏi danh sách muốn xem” | Watchlist không rỗng |
| Ghibli lookup | “Giới thiệu My Neighbor Totoro” | Luôn có |

## 8. Ma trận kiểm thử nghiệm thu

| ID | Kịch bản | Kết quả cần đạt | Cách kiểm tra |
| --- | --- | --- | --- |
| A01 | Gửi 2 lượt → reload → gửi tiếp | Đủ lịch sử, đúng thread, không trùng message | Integration + browser |
| A02 | Restart backend, mở URL thread cũ | Messages, metadata và watchlist còn nguyên | Integration + browser |
| A03 | Chuyển thread khi streaming | Không có chunk/message lẫn thread | Integration + browser |
| A04 | Mở lịch sử chứa tool mutation | Hiển thị kết quả, không thực thi lại | Integration |
| A05 | Thread dài hơn một trang dữ liệu | Tải thêm được, thứ tự đúng | Integration |
| A06 | Rename → pin → archive → unarchive | Metadata độc lập, title và pin không mất | Service integration |
| A07 | Xóa thread hiện tại và thread khác | Không tái sinh dữ liệu, điều hướng đúng, file cleanup đúng | Integration + browser |
| A08 | Theme/sidebar bằng nút và prompt | Cùng state, desktop/mobile đúng | Browser |
| A09 | Search message cũ, archived thread | Kết quả đầy đủ theo filter; chọn đúng thread | Service integration + browser |
| A10 | Add cùng phim hai lần, kể cả request đồng thời | Chỉ một watchlist item | Service integration |
| A11 | Remove phim không tồn tại | Trả not_found, không lỗi không kiểm soát | Service integration |
| A12 | Watchlist qua hai thread và reload | Cùng danh sách người dùng | Integration + browser |
| A13 | TXT/MD/PDF/DOCX có nội dung đã biết | Extract đúng fixture; giữ nguồn và trang khi có | Parser fixtures |
| A14 | File quá lớn/sai định dạng/lỗi/PDF scan | Báo lỗi cụ thể; không bịa nội dung | Parser + API integration |
| A15 | File có nội dung vượt giới hạn tool | Báo còn dữ liệu, đọc tiếp được | Service integration |
| A16 | Upload → gửi → reload → show/extract | Tham chiếu file còn dùng được | Integration + browser |
| A17 | ID attachment/thread khác resource | Không lộ dữ liệu hoặc cho mutation | Service integration |
| A18 | Timeout/mất mạng khi tool mutation | Không báo thành công giả, retry không tạo bản ghi trùng | Integration |
| A19 | Đi qua tất cả suggestions | Mỗi tính năng có gợi ý khả dụng và hành vi thật | Browser checklist |
| A20 | Build/lint và mở demo Ghibli cũ | Không phát sinh lỗi mới do practice | Build + smoke check |

Không viết unit test chỉ để lặp lại JSX hoặc kiểm tra một setter đổi boolean. Tập trung tự động hóa các lỗi dữ liệu, phân trang, retry, quyền truy cập và race condition; UI đơn giản kiểm tra bằng browser.

## 9. Rủi ro kỹ thuật và cách xử lý

| Rủi ro | Cách xử lý |
| --- | --- |
| Bridge không khôi phục đầy đủ tool/file parts | Kiểm chứng ở P0; adapter chuyển đổi có fixtures; không giả định chỉ bật Memory là xong |
| Luồng chat ghi đè title hoặc metadata | Kiểm tra lifecycle cập nhật thread; mutation merge trường, test rename sau chat tiếp |
| Xóa trong lúc agent còn ghi message | Guard active run và deferred UI deletion cho thread hiện tại |
| Cache sai resource/thread | Query key chuẩn, invalidate theo đúng phạm vi |
| Ghibli API chậm hoặc không hoạt động | Timeout, phản hồi lỗi rõ, cache catalog có thời hạn; tests dùng fixtures |
| Extraction quá lớn hoặc file hỏng | Hạn mức upload/parser/time, chunked result, lỗi và trạng thái explicit |
| Attachment chỉ có URL tạm | Lưu file thật và storageKey; restore qua attachment ID |
| Thay đổi Ghibli agent ảnh hưởng demo cũ | Smoke test route cũ; tool nghiệp vụ cần context hợp lệ, không gắn nhầm resource |
| Sidebar lồng nhau và phím tắt xung đột | Provider/state riêng cho practice; test focus và mobile |
| Disk local không bền vững khi deploy | Tài liệu hóa local default; object storage là yêu cầu khi chuyển môi trường |

## 10. Mốc bàn giao và Definition of Done

Thứ tự ưu tiên: **P0 → P1 → P2 → P3 → P4/P5/P6/P7 → P8 → P9**. P5 cần P3/P4; P6 và P7 độc lập về nghiệp vụ nhưng dùng chung nền tảng P1/P2. Đây là thứ tự phụ thuộc, không yêu cầu tạo agent hay task song song.

| Mốc | Nội dung có thể demo |
| --- | --- |
| M1 — Chat bền vững | Tạo thread, gửi, reload, restore, chat tiếp |
| M2 — Conversation và UI tools | Rename/archive/pin/delete, theme/sidebar/search |
| M3 — Ghibli và attachments | Watchlist, upload, show/extract file |
| M4 — Hoàn thiện | Suggestions, lỗi/loading, mobile, tài liệu và kết quả kiểm thử |

Practice hoàn thành khi:

- [ ] Tất cả yêu cầu ở mục 1 có luồng hoạt động thực tế và suggestions để khám phá.
- [ ] Messages, conversation metadata, watchlist và file khôi phục được sau reload/restart.
- [ ] Không chạy lại tools khi xem lịch sử; không tạo dữ liệu trùng khi retry.
- [ ] Các thao tác UI và agent dùng cùng dữ liệu, phản ánh thành công/thất bại chính xác.
- [ ] Các trường hợp A01–A20 đã được kiểm tra, ghi rõ kết quả và giới hạn.
- [ ] Build/lint không có lỗi mới; lỗi có sẵn được ghi riêng, không bỏ qua âm thầm.
- [ ] README đủ để người khác cài, cấu hình, chạy và tự thử toàn bộ practice.

Bước thực hiện đầu tiên khi bắt đầu code: P0, đặc biệt vòng thử nghiệm **frontend tool → lưu message/tool result → reload → tiếp tục chat**, vì kết quả này quyết định adapter và persistence cho toàn bộ phần còn lại.
