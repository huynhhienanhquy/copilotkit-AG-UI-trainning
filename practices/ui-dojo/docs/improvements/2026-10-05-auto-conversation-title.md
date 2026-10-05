# Auto-generate conversation title

Ngày: 2026-10-05

Trạng thái: Completed

## 1. Bối cảnh

Conversation mới luôn có title `New conversation`. Người dùng phải rename thủ công, nên khi có nhiều cuộc hội thoại, sidebar khó phân biệt nội dung. Title cần được tạo tự động sau message đầu tiên nhưng tuyệt đối không được ghi đè title mà người dùng đã đặt.

## 2. Yêu cầu

- Sau message đầu tiên, agent hoặc một model nhỏ tạo title ngắn.
- Chỉ update khi title hiện tại vẫn là `New conversation`.
- Không gọi model lại sau khi title đã được tạo; message sau chỉ retry khi title vẫn đúng bằng `New conversation`.
- Retry cùng message ID phải idempotent.
- Manual rename trong lúc model đang chạy phải thắng generated title.
- Provider failure không được làm hỏng việc lưu/gửi message.

## 3. Kết quả

Flow sử dụng một service title riêng với model mặc định:

```env
PRACTICE_TITLE_MODEL=gpt-5-mini
```

Title prompt yêu cầu 3–7 từ, giữ ngôn ngữ của người dùng và chỉ trả plain title. Request dùng OpenAI Responses API với `instructions` tách biệt khỏi user input; output được đọc từ `response.output_text`, rồi chuẩn hóa thành một dòng, bỏ common Markdown/quotes/label/punctuation và giới hạn 80 Unicode characters.

## 4. Luồng hoạt động

```mermaid
sequenceDiagram
  participant UI
  participant API as Message API
  participant Memory
  participant Title as Title service
  participant Model as Small model

  UI->>API: POST first user message
  API->>Memory: Save stable message ID
  Memory-->>API: isFirstMessage = true
  API->>Title: generateIfDefault
  Title->>Memory: Read current title
  alt title is New conversation
    Title->>Model: Generate short title
    Model-->>Title: Candidate title
    Title->>Memory: Atomic updateTitleIfDefault
  else title was renamed
    Title-->>API: Skip generation/update
  end
  API-->>UI: Persisted user message
  UI->>UI: Refresh thread + sidebar queries
  UI->>API: Start normal agent run
```

## 5. Xác định first message

`ConversationService.saveUserMessage` trả:

```ts
{
  created: boolean;
  isFirstMessage: boolean;
}
```

Trước khi lưu message mới, service recall tối đa một persisted message:

- `total === 0`: message đang lưu là message đầu tiên;
- `total > 0`: không tạo title;
- message ID đã tồn tại và nội dung giống nhau: retry idempotent;
- message ID thuộc thread/resource khác hoặc có content khác: trả conflict/not-found như trước.

Với retry của chính first message khi history vẫn chỉ có một message, `isFirstMessage` tiếp tục là `true`. Title service tự skip nếu title đã được tạo, nên không gọi model lần hai.

Message route gọi `generateIfDefault` sau mỗi persisted user message. Bình thường lần đầu tiên tạo title thành công và các lần sau bị bỏ qua trước khi gọi provider. Nếu lần đầu thất bại do network, credential hoặc output rỗng, message kế tiếp trở thành một self-healing retry vì title vẫn là `New conversation`. Cách này cũng sửa dần các conversation cũ đã được tạo trong lúc title provider gặp lỗi.

## 6. Model request

Title generation chạy server-side qua OpenAI Responses API. Đây là API được OpenAI khuyến nghị cho ứng dụng text-generation mới: [Text generation guide](https://developers.openai.com/api/docs/guides/text).

| Thuộc tính         | Giá trị                                            |
| ------------------ | -------------------------------------------------- |
| API                | Responses API                                      |
| Default model      | `gpt-5-mini`                                       |
| Override           | `PRACTICE_TITLE_MODEL`                             |
| Base URL           | `OPENAI_BASE_URL` hoặc `https://api.openai.com/v1` |
| Input limit        | 2.000 ký tự đầu của first message                  |
| Output token limit | 256 output tokens                                  |
| Reasoning          | `low` cho GPT-5/GPT-6 family                       |
| Timeout            | 8 giây                                             |
| Retry              | Tắt retry ở SDK để giữ latency bound               |
| Storage            | `store: false`                                     |
| API key            | Server-side `OPENAI_API_KEY`                       |

Request chính:

```ts
await client.responses.create({
  model,
  instructions: "Create a concise conversation title ...",
  input: firstMessage,
  reasoning: { effort: "low" },
  max_output_tokens: 256,
  store: false,
});
```

`gpt-5-mini` có thể dùng output-token budget cho reasoning trước khi sinh visible text. Giới hạn 64 hoặc 128 tokens với reasoning mặc định/`low` đã được kiểm chứng có thể trả response `incomplete` với `reason: max_output_tokens` và `output_text` rỗng. Cấu hình `low` + 256 tokens bảo đảm còn budget cho title ngắn và tương thích với SDK đang khóa trong project; reasoning control chỉ được thêm cho model family GPT-5/GPT-6 để giữ khả năng inject model khác trong test hoặc cấu hình tùy chỉnh.

Attachment-only message dùng filename làm title input, không gửi filesystem path hoặc raw attachment ID cho title model.

## 7. Chuẩn hóa title

`normalizeConversationTitle` áp dụng các bước:

1. Unicode NFKC normalization.
2. Chỉ lấy dòng đầu tiên.
3. Bỏ heading Markdown và prefix `Title:` phổ biến.
4. Bỏ quotes/backticks ở hai đầu.
5. Gộp whitespace liên tiếp.
6. Bỏ ending punctuation.
7. Giới hạn tối đa 80 Unicode characters.

Ví dụ:

```text
## Title: “  Ghibli   movie night!  ”
```

trở thành:

```text
Ghibli movie night
```

Title rỗng hoặc vẫn bằng `New conversation` bị bỏ qua.

## 8. Không ghi đè manual rename

Chỉ kiểm tra title trước khi gọi model là chưa đủ, vì user có thể rename trong thời gian network request đang chạy. Implementation dùng hai lớp bảo vệ:

1. `ConversationTitleService` đọc title trước request và skip ngay nếu title không còn là default.
2. Sau khi model trả kết quả, `ConversationService.updateTitleIfDefault` chạy trong per-thread exclusive queue và kiểm tra lại title ngay trước khi ghi.

Đây là compare-and-set theo application layer:

```text
update generated title only if current title == "New conversation"
```

Nếu manual rename xảy ra giữa hai bước, generated result trả `{ updated: false }` và title của user được giữ nguyên.

Các update pin/archive/title hiện có vẫn dùng cùng per-thread serialization queue, nên metadata không bị mất khi mutation diễn ra đồng thời.

## 9. Failure isolation

Title là enhancement, không phải điều kiện để gửi message thành công. Các lỗi sau được catch trong `ConversationTitleService`:

- thiếu API key;
- provider timeout;
- HTTP error;
- invalid provider response;
- empty/invalid normalized title.

Server chỉ log structured event:

```json
{ "event": "practice_title_generation_failed", "errorType": "..." }
```

Log không chứa user message, API response hoặc credential. Conversation giữ title `New conversation` và message vẫn được trả về client bình thường.

## 10. Frontend refresh

Message POST hoàn thành sau khi title generation đã được thử. Client invalidate riêng:

```ts
["practice", "thread", threadId][("practice", "threads")];
```

Việc refresh diễn ra trước agent run dài hơn, nên title mới xuất hiện trên header/sidebar mà không cần đợi assistant response hoàn tất. Messages query không bị invalidate ở bước này để tránh duplicate hydration trong active agent session.

## 11. Persistence và migration

Không có database migration. Generated title dùng field title chuẩn của Mastra thread, giống manual rename. Vì vậy:

- title tồn tại sau restart;
- conversation search nhìn thấy title mới trong lần index sync tiếp theo;
- archive/pin metadata không thay đổi;
- API list/get hiện có tự trả title mới.

## 12. Code thay đổi

| File                                                  | Nội dung                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `src/lib/practice/contracts.ts`                       | Shared `DEFAULT_CONVERSATION_TITLE`                         |
| `src/mastra/services/conversation-title.ts`           | Provider request, normalization và generation orchestration |
| `src/mastra/services/conversations.ts`                | First-message state và atomic `updateTitleIfDefault`        |
| `src/mastra/services/practice.ts`                     | Shared `ConversationTitleService` instance                  |
| `src/mastra/routes/practice.ts`                       | Trigger title generation sau first persisted message        |
| `src/components/practice/ghibli-chat.tsx`             | Refresh title/sidebar trước agent run                       |
| `src/mastra/services/__tests__/conversations.test.ts` | Generation, normalization và concurrent manual-rename tests |
| `.env.example`                                        | `PRACTICE_TITLE_MODEL`                                      |
| `README.md`                                           | Configuration reference                                     |

## 13. Kiểm thử

Tests dùng injected deterministic provider, không gọi network. Cases bao phủ:

- first message được nhận diện và tạo title;
- retry cùng first-message ID không gọi model lần hai sau khi title đã có;
- model nhận đúng input và model name;
- title được normalize;
- second message không có `isFirstMessage`;
- title đã rename trước khi generation bắt đầu làm provider bị skip hoàn toàn;
- title user đặt trong lúc provider đang pending không bị ghi đè;
- provider failure được cô lập và giữ title mặc định;
- message kế tiếp có thể self-heal một title mặc định sau provider failure;
- title dài bị giới hạn 80 Unicode characters.

Verification ngày 2026-10-05:

```text
npm test                         7 files, 23 tests passed
npm run typecheck               passed
npx eslint src scripts          passed
npm run vite:build              passed (existing bundle warnings)
git diff --check                passed
```

## 14. Giới hạn và bước tiếp theo

- First message request có thể chậm thêm tối đa 8 giây vì hiện chờ title provider trước khi trả response. Có thể chuyển sang durable background job nếu latency trở thành vấn đề.
- Provider failure giữ title mặc định; chưa có scheduled retry sau khi assistant run hoàn tất.
- Title quality chưa có evaluation dataset. Có thể thêm fixtures đa ngôn ngữ và human rating.
- Điều kiện bảo vệ theo yêu cầu là exact title value `New conversation`. Nếu sau này cần phân biệt user cố ý đặt đúng chuỗi này, nên lưu thêm `titleSource` trong metadata.
- `OPENAI_BASE_URL` tùy chỉnh phải hỗ trợ Responses API; test vẫn có thể inject `ConversationTitleProvider` mà không gọi network.
