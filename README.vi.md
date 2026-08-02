# DeckForge Web Slides Agent Skills

> Xây dựng trải nghiệm trình chiếu chạy trực tiếp trên web với AI Coding Agents.

DeckForge là một **bộ skill đa tác tử** giúp AI coding agents thiết kế và xây dựng các sản phẩm slide chạy trực tiếp trên trình duyệt, thay vì chỉ dừng ở PowerPoint hoặc PDF tĩnh. Dự án tập trung vào **WebUI hiện đại**, **thanh công cụ chỉnh sửa**, **presenter mode**, **template system**, **interactive components** và **luồng publish** cho webapp trình chiếu.

**Ngôn ngữ:** [English](./README.md) · [Tiếng Việt](./README.vi.md) · [简体中文](./README.zh-CN.md)

## Minh họa tổng quan

![DeckForge hero](./docs/images/hero-overview.png)

## Giá trị chính

- Tạo **slide web-native** hiển thị trực tiếp trên trình duyệt.
- Hỗ trợ đồng thời **editor mode** và **presenter mode**.
- Định hướng **UI/UX chuyên nghiệp**, hạn chế AI slop, tăng tính hài hòa và khả dụng.
- Có cấu trúc thân thiện với nhiều coding agent: Claude Code, Codex, Grok, Gemini, Cursor, Windsurf, Aider, OpenCode, Cline, Roo.
- Bổ sung các **quality gates** cho accessibility, responsiveness, performance và interaction quality.

## Quy trình hoạt động

![How DeckForge works](./docs/images/how-it-works.png)

6 bước chính:

1. Cài skill
2. Lập kế hoạch nội dung và audience
3. Chọn template, layout, theme
4. Chỉnh sửa trên editor WebUI
5. Trình chiếu với presenter runtime
6. Publish cho web, embed hoặc export

## Kiến trúc repo

![DeckForge architecture](./docs/images/architecture.png)

Repo hiện đã bổ sung `.agents/plugins/marketplace.json` để phù hợp hơn với mô hình tổ chức plugin discovery cho nhiều agent ngoài Claude/Codex.

## Showcase template

![Template showcase](./docs/images/template-showcase.png)

## Cài đặt nhanh

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

Cài toàn bộ skill:

```bash
npx skills@latest add tph-kds/deckforge --skill '*' --agent claude-code --agent codex --agent cursor --agent opencode
```

## Tài nguyên chính

- [`AGENTS.md`](./AGENTS.md)
- [`INSTALL_WITH_SKILLS_CLI.md`](./INSTALL_WITH_SKILLS_CLI.md)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md)

## License

MIT
