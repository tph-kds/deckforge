<div align="center">

# DeckForge Web Slides Agent Skills

**Xây dựng trải nghiệm trình chiếu hiện đại, chạy trực tiếp trên trình duyệt bằng AI Coding Agents.**

[English](./README.md) · [Tiếng Việt](./README.vi.md) · [简体中文](./README.zh-CN.md)

</div>

![Tổng quan DeckForge](./docs/images/hero-overview.png)

DeckForge là một **repository skill đa tác tử** dành cho việc lập kế hoạch, thiết kế, triển khai, đánh giá và phát hành các ứng dụng trình chiếu chuyên nghiệp hoạt động trực tiếp trên trình duyệt.

Thay vì xem slide chỉ là đầu ra PowerPoint hoặc PDF tĩnh, DeckForge định hướng AI coding agent xây dựng một sản phẩm hoàn chỉnh: mô hình dữ liệu slide có cấu trúc, template tái sử dụng, thanh công cụ chỉnh sửa, presenter mode, responsive rendering, tương tác với người xem, speaker notes, embed và xuất bản trực tiếp trên web.

## Tại sao cần DeckForge?

Phần lớn công cụ tạo slide chỉ dừng ở việc sinh ra các trang trình bày. DeckForge tập trung vào toàn bộ ứng dụng bao quanh các trang đó.

- **Trình chiếu web-native** — trình bày, chia sẻ và nhúng deck trực tiếp trên web.
- **Editor và presenter trong cùng sản phẩm** — vừa thiết kế vừa trình bày trên một hệ thống nhất quán.
- **UI/UX chuyên nghiệp** — hệ thống phân cấp, spacing, typography, motion và interaction rõ ràng.
- **Khả năng tái sử dụng** — theme, template, layout, block, animation và presenter control.
- **Hợp đồng rõ ràng cho agent** — instructions, references, schema, scripts và quality gates.
- **Định hướng production** — accessibility, responsiveness, performance, security và validation được đưa vào workflow.

## Skill là gì?

Skill là một thư mục độc lập mà AI coding agent có thể tải khi cần. File bắt buộc `SKILL.md` mô tả **khi nào skill nên được kích hoạt** và **agent cần thực hiện công việc như thế nào**.

```text
<skill-name>/
├── SKILL.md          # bắt buộc: YAML frontmatter + hướng dẫn cho agent
├── README.md         # tùy chọn: tài liệu dành cho con người
├── references/       # tùy chọn: tài liệu mở rộng được tải khi cần
├── scripts/          # tùy chọn: công cụ thực thi có kết quả xác định
└── assets/           # tùy chọn: schema, template, icon và tài nguyên khác
```

Trường `description` trong frontmatter của `SKILL.md` là hợp đồng kích hoạt giữa skill và agent. Nội dung này cần mô tả chính xác các tình huống nên sử dụng skill, tránh khiến agent tải toàn bộ repository cho những tác vụ không liên quan.

DeckForge tuân theo nguyên tắc đó bằng cách giữ workflow chính ngắn gọn, đồng thời đặt hướng dẫn chuyên sâu về thiết kế, runtime, validation và implementation trong các file hỗ trợ.

## DeckForge hoạt động như thế nào?

![Quy trình DeckForge](./docs/images/how-it-works.png)

1. **Install** — cài repository vào môi trường coding agent.
2. **Plan** — xác định audience, mục tiêu, narrative và bối cảnh trình bày.
3. **Compose** — chọn template, layout, theme, block và cấu trúc nội dung.
4. **Edit** — xây dựng editor trên trình duyệt với controls và state behavior rõ ràng.
5. **Present** — hỗ trợ keyboard, touch, overview, notes và speaker mode.
6. **Publish** — phát hành deck dưới dạng web experience, embed, route chia sẻ hoặc định dạng export phù hợp.

## Các khả năng đi kèm

| Hạng mục | Số lượng |
|---|---:|
| Presentation template | 48 |
| Visual theme | 60 |
| Layout archetype | 36 |
| Structured block type | 33 |
| Animation pattern | 24 |
| Audience interaction pattern | 26 |
| Presenter control | 20 |
| Export contract | 6 |
| Delivery profile | 4 |
| Presentation archetype | 12 |
| Motion profile | 8 |

Ngoài ra còn có:

- `DeckProject` JSON Schema
- hợp đồng toolbar và keyboard shortcut
- mô hình state cho presenter và speaker view
- hướng dẫn responsive layout
- yêu cầu accessibility và reduced motion
- pattern cho chart, diagram, code, media và citation
- starter component bằng React và TypeScript
- scripts validation và packaging có tính xác định

## Cập nhật độ ổn định DeckForge 3

DeckForge 3 xử lý trực tiếp những lỗi thường gặp trong sản phẩm presentation được AI tạo ra:

- **Semantic layout thay cho tọa độ tùy ý** — mỗi layout có slot rõ ràng, content budget, responsive order, safe margin và collision rules.
- **Mặc định tạo editable deck thực sự** — yêu cầu tạo slide thông thường phải có editor hoạt động, không phải presenter tĩnh với toolbar chỉ để trang trí.
- **Tools side panel đầy đủ** — người dùng có thể chỉnh layout, theme, màu sắc, typography, media, fit, alt text và style của slide hoặc block đang chọn.
- **Authoring có persistence** — mọi thay đổi cập nhật vào `DeckProject`, hiển thị save status, tồn tại sau reload và hỗ trợ undo/redo.
- **Output theo presentation archetype** — pitching, executive, technical, seminar, giáo dục, workshop, portfolio và data report có narrative/layout system khác nhau.
- **Motion có mục đích** — motion profile có reduced-motion fallback, preview trong editor, khả năng ngắt và giới hạn hiệu năng.
- **Shortcut dễ khám phá** — editor và presenter đều có nút trợ giúp cùng hộp thoại mở bằng phím `?`.
- **Quality gate deterministic** — bắt buộc kiểm tra schema, layout, collision, capability truth, build và các luồng thao tác chính.

Chạy example hoàn chỉnh:

```bash
cd examples/02-example
npm install
npm run dev
```

Sau đó mở `http://localhost:5173`. Example có slide rail, toolbar, inspector, notes, themes, layouts, thêm text/ảnh, persistence, undo/redo, save status, presenter mode, fullscreen, blackout, overview và shortcut guidance.

Xem [`docs/DECKFORGE_3_UPGRADE.md`](./docs/DECKFORGE_3_UPGRADE.md) và [`docs/END_USER_FEATURE_MATRIX.md`](./docs/END_USER_FEATURE_MATRIX.md).

## Showcase template

![Showcase template DeckForge](./docs/images/template-showcase.png)

Catalog hỗ trợ các cấu trúc phổ biến như hero, agenda, timeline, comparison, chart, case study, team, architecture diagram, product walkthrough và closing slide. Template được xây dựng như một hệ thống có thể thích nghi, không phải screenshot cứng.

## Danh mục skill

| Skill | Trường hợp sử dụng |
|---|---|
| `deckforge` | Tạo mới, redesign, mở rộng hoặc migrate một trải nghiệm trình chiếu chạy trên web. |
| `deckforge-audit` | Review sản phẩm slide hiện tại về design, accessibility, performance, interaction và architecture. |
| `deckforge-runtime-planner` | Lập kế hoạch editor, presenter, state, rendering và publishing architecture trước khi triển khai. |
| `deckforge-publish` | Chuẩn bị web delivery, embed, export, release checks và publishing behavior. |

## Cài đặt

### Cài skill chính

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

### Xem danh sách skill

```bash
npx skills@latest add tph-kds/deckforge --list
```

### Cài toàn bộ DeckForge skill

```bash
npx skills@latest add tph-kds/deckforge --skill '*'
```

### Cài cho một số agent phổ biến

```bash
npx skills@latest add tph-kds/deckforge --skill '*' \
  --agent claude-code \
  --agent codex \
  --agent cursor \
  --agent opencode \
  --agent windsurf
```

Một số hệ sinh thái agent sử dụng Skills CLI trực tiếp. Các hệ sinh thái khác tải instructions qua cấu hình riêng hoặc cơ chế plugin discovery.

DeckForge cung cấp đồng thời:

```text
.agents/plugins/marketplace.json
.claude-plugin/plugin.json
.codex-plugin/plugin.json
```

## Provider và coding agent được hỗ trợ

DeckForge được thiết kế theo hướng provider-portable. Các liên kết dưới đây trỏ tới trang sản phẩm hoặc tài liệu chính thức của những môi trường coding agent có thể tải, điều chỉnh hoặc thực thi hướng dẫn của DeckForge.

| Provider hoặc coding agent | Tài nguyên chính thức | Cách tích hợp DeckForge |
|---|---|---|
| Anthropic — Claude Code | [Claude Code](https://www.anthropic.com/claude-code) · [Tài liệu](https://docs.anthropic.com/en/docs/claude-code/overview) | Skills CLI hoặc `.claude-plugin/plugin.json` |
| OpenAI — Codex | [Codex](https://openai.com/codex/) · [Bắt đầu sử dụng](https://openai.com/codex/get-started/) | Skills CLI hoặc `.codex-plugin/plugin.json` |
| xAI — Grok / Grok Build | [Tài liệu xAI API](https://docs.x.ai/overview) · [Grok Build](https://docs.x.ai/build/overview) | Tải ở cấp repository thông qua coding harness hoặc agent workflow tương thích |
| Google — Gemini CLI | [Tài liệu Gemini CLI](https://developers.google.com/gemini-code-assist/docs/gemini-cli) | Skills CLI khi được hỗ trợ, hoặc repository instructions và extensions |
| Cursor | [Cursor](https://cursor.com/) · [Cursor CLI](https://cursor.com/cli) | Skills CLI, project rules hoặc repository-level skill loading |
| Windsurf / Devin Desktop | [Windsurf](https://windsurf.com/) · [Tài liệu plugins](https://docs.windsurf.com/plugins/getting-started) | Skills CLI hoặc project instructions |
| Aider | [Aider](https://aider.chat/) · [Tài liệu](https://aider.chat/docs/) | Repository instructions và tham chiếu skill tường minh |
| OpenCode | [OpenCode](https://opencode.ai/) · [Tài liệu](https://opencode.ai/docs/) | Skills CLI hoặc repository-level skill loading |
| Cline | [Cline](https://cline.bot/) · [Tài liệu](https://docs.cline.bot/cline-overview) | Repository instructions hoặc compatible skill import |
| Roo Code | [Tài liệu Roo Code](https://docs.roocode.com/) | Repository instructions, custom instructions hoặc compatible skill import |

“Khả năng tương thích” có nghĩa là instructions, references, scripts và assets của DeckForge được tổ chức để vẫn hữu ích trên nhiều môi trường coding agent. Điều này **không** đồng nghĩa mọi agent có cách cài đặt giống nhau, có feature parity, hoặc DeckForge được provider chính thức chứng thực hay liên kết thương mại.

## Kiến trúc repository

![Kiến trúc DeckForge](./docs/images/architecture.png)

```text
deckforge-web-slides-skills/
├── .agents/plugins/marketplace.json
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── skills/
│   ├── deckforge/
│   │   ├── SKILL.md
│   │   ├── system-prompt.md
│   │   ├── built-in-skills/
│   │   ├── references/
│   │   ├── scripts/
│   │   ├── assets/
│   │   └── starter-components/
│   ├── deckforge-audit/
│   ├── deckforge-runtime-planner/
│   └── deckforge-publish/
├── docs/
├── examples/
├── rules/
├── schemas/
├── scripts/
│   ├── audits/
│   ├── generate/
│   ├── package/
│   ├── rules/
│   ├── sync/
│   ├── tools/
│   └── validate/
└── tests/
```

## Định hướng nhanh cho contributor

```bash
git clone https://github.com/tph-kds/deckforge.git
cd deckforge

npm install
npm run validate
npm run package-skills
```

Các lệnh quan trọng:

```bash
# Kiểm tra rules, metadata, catalog, schema, example và unit test
npm run validate

# Đóng gói ZIP cho từng skill
npm run package-skills

# Xem các skill có trong repository đã publish
npx skills@latest add tph-kds/deckforge --list
```

## Đóng góp

Bug report, cải thiện tài liệu, template mới, interaction pattern mới, validation tooling và integration với agent khác đều được chào đón.

Trước khi mở pull request:

1. Giữ từng skill độc lập và có thể tải theo nhu cầu.
2. Viết trường `description` chính xác vì đây là điều kiện kích hoạt skill.
3. Đưa nội dung chuyên sâu vào `references/`, không làm `SKILL.md` quá lớn.
4. Ưu tiên deterministic scripts cho các thao tác validation hoặc transformation lặp lại.
5. Không thêm asset được generate nếu không có provenance và quyền sử dụng rõ ràng.
6. Cập nhật catalog, schema, example và documentation liên quan cùng lúc.
7. Chạy đầy đủ validation suite.

```bash
npm run validate
npm run package-skills
```

Đọc thêm:

- [`AGENTS.md`](./AGENTS.md)
- [`rules/README.md`](./rules/README.md)
- [`docs/TEMPLATE_AUTHORING.md`](./docs/TEMPLATE_AUTHORING.md)
- [`docs/QUALITY_MODEL.md`](./docs/QUALITY_MODEL.md)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Nguyên tắc thiết kế

Các đóng góp cho DeckForge nên giữ những nguyên tắc sau:

- **Clarity trước decoration**
- **Narrative trước animation**
- **System trước one-off styling**
- **Progressive disclosure trước toolbar quá tải**
- **Purposeful motion trước continuous motion**
- **Accessible defaults trước visual novelty**
- **Inspectable state trước hidden behavior**
- **Real product behavior trước static mockup**

## Tài liệu chính

| Tài liệu | Mục đích |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Điểm vào và hướng dẫn routing cho coding agent. |
| [`INSTALL_WITH_SKILLS_CLI.md`](./INSTALL_WITH_SKILLS_CLI.md) | Hướng dẫn cài đặt và discovery. |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Kiến trúc sản phẩm và runtime được đề xuất. |
| [`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md) | Phạm vi, giới hạn và định hướng dài hạn. |
| [`docs/RESEARCH_FOUNDATIONS.md`](./docs/RESEARCH_FOUNDATIONS.md) | Các pattern nghiên cứu và repository ảnh hưởng tới thiết kế. |
| [`docs/FEATURE_BACKLOG.md`](./docs/FEATURE_BACKLOG.md) | Danh sách cải tiến sản phẩm và skill theo mức ưu tiên. |
| [`docs/QUALITY_MODEL.md`](./docs/QUALITY_MODEL.md) | Tiêu chí đánh giá chất lượng sản phẩm trình chiếu. |
| [`docs/TEMPLATE_AUTHORING.md`](./docs/TEMPLATE_AUTHORING.md) | Hướng dẫn thêm và duy trì template. |
| [`docs/DECKFORGE_3_UPGRADE.md`](./docs/DECKFORGE_3_UPGRADE.md) | Acceptance contract, semantic layout, editor truth và validation của DeckForge 3. |
| [`docs/END_USER_FEATURE_MATRIX.md`](./docs/END_USER_FEATURE_MATRIX.md) | Danh sách chức năng editor và presenter cần có cho end user. |
| [`docs/GENERATED_OUTPUT_FAILURE_ANALYSIS.md`](./docs/GENERATED_OUTPUT_FAILURE_ANALYSIS.md) | Các lỗi output thường gặp và cơ chế ngăn chặn. |

## Ghi nhận

DeckForge là một dự án mã nguồn mở độc lập. Chúng tôi trân trọng ghi nhận những nền tảng, tiêu chuẩn và cộng đồng mã nguồn mở đã góp phần thúc đẩy software development có AI hỗ trợ và các trải nghiệm trình chiếu chạy trực tiếp trên trình duyệt.

### AI coding platforms và providers

- [Anthropic Claude Code](https://www.anthropic.com/claude-code) vì những đóng góp cho agentic coding workflow và mô hình skill được tải theo nhu cầu.
- [OpenAI Codex](https://openai.com/codex/) vì các workflow software engineering theo hướng agent trên CLI, IDE và cloud.
- [xAI Grok và Grok Build](https://docs.x.ai/build/overview) vì các coding-agent và API workflow có khả năng mở rộng.
- [Google Gemini CLI](https://developers.google.com/gemini-code-assist/docs/gemini-cli) vì hệ sinh thái terminal agent và extension mã nguồn mở.
- [Cursor](https://cursor.com/), [Windsurf](https://windsurf.com/), [Aider](https://aider.chat/), [OpenCode](https://opencode.ai/), [Cline](https://cline.bot/) và [Roo Code](https://docs.roocode.com/) vì đã mở rộng những môi trường mà coding agent có thể làm việc dựa trên instructions trong repository.

### Agent Skills standards và tooling

- [Agent Skills specification](https://agentskills.io/specification) cho định dạng `SKILL.md` portable và activation contract.
- [Anthropic Agent Skills reference repository](https://github.com/anthropics/skills) cho các ví dụ và pattern authoring chính thức.
- [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) cho việc discovery, cài đặt và phân phối skill trên nhiều agent.

### Nền tảng web presentation và editor

Định hướng sản phẩm của DeckForge được tham khảo từ các dự án mã nguồn mở có liên quan trực tiếp đến trình chiếu trên web, chỉnh sửa nội dung và tương tác canvas:

- [reveal.js](https://revealjs.com/) — HTML presentation runtime, navigation, overview, speaker notes và plugin patterns.
- [Slidev](https://sli.dev/) — web slides dành cho developer, theme system, interactive components và presenter tooling.
- [Marp](https://marp.app/) — authoring slide theo hướng Markdown-first và publish đa định dạng.
- [Spectacle](https://github.com/FormidableLabs/spectacle) — presentation theo hướng component cho React.
- [Tiptap](https://tiptap.dev/) — pattern xây dựng rich-text editor headless và có khả năng mở rộng.
- [tldraw](https://tldraw.dev/) — pattern về canvas interaction, selection, command và extensibility cho ứng dụng React.

Các nội dung ghi nhận trên chỉ nhằm xác định hệ sinh thái và nền tảng kỹ thuật có liên quan; chúng không thể hiện tài trợ, hợp tác, chứng thực hoặc quyền sở hữu. Tên sản phẩm, logo và nhãn hiệu thuộc về các chủ sở hữu tương ứng.

## Liên kết dự án

| Tài nguyên | Liên kết |
|---|---|
| GitHub repository | [tph-kds/deckforge](https://github.com/tph-kds/deckforge) |
| Báo lỗi và đề xuất tính năng | [GitHub Issues](https://github.com/tph-kds/deckforge/issues) |
| Skill discovery | `npx skills@latest add tph-kds/deckforge --list` |

## Giấy phép

[MIT License](./LICENSE) © [tph-kds](https://github.com/tph-kds) All rights reserved.
