ZeroSite - 需求与当前实现摘要

目标概述
- 构建一个可配置的个人网站（ZeroSite），以 JSON 配置驱动首页内容、导航卡片与认证（示例用）。
- 视觉上采用“premium frontend”风格：毛玻璃、发光渐变、平滑动效、响应式排版。

关键功能（已实现）
- 配置驱动：`public/js/config.json` 提供 `site`、`auth`、`search`、`background`、`navCards` 等字段。
- 登录（示例）：前端读取 `auth.users` 并使用 cookie 做会话（仅示例）。
- 导航卡片：支持 `iconUrl` 指向 `public/assets/icons/` 中的 SVGs。
- 背景：支持 `background.source` = `bing`（每日壁纸）或 `custom`（自定义 URL）。请求 Bing 时支持直接请求，若被 CORS 拦截则回退到 AllOrigins 代理。
- 背景遮罩可配置：`overlayOpacity`（必填默认）、可选 `overlayTop`、`overlayBottom` 控制渐变两端不透明度。
- 搜索框毛玻璃：`.search-input-wrap` 使用 `backdrop-filter: blur(...)`，并在深色主题下做对比调整。
- 导航卡片布局已优化：固定图标尺寸并增大卡片最小宽度以避免图标压缩。

待办（可选）
- 将前端认证迁移到后端服务（推荐用于生产）。
- 增加 README 中的完整 `config.json` 示例片段（可选，当前 `public/js/config.json` 为工作示例）。

部署与验证
- 本地开发：`npm install`、`npm run dev`。
- 生产构建：`npm run build`；可使用 `docker compose up --build -d` 部署静态 nginx 容器。

配置示例说明（背景段）
{
  "background": {
    "source": "bing",
    "customUrl": "",
    "overlayOpacity": 0.45,
    "overlayTop": 0.18,
    "overlayBottom": 0.28
  }
}

备注
- `overlayTop` 与 `overlayBottom` 为可选，若未指定则使用默认渐变停点的不透明度。
- 若你想要更多定制（例如用 Unsplash 作为备用源），我可以添加额外的回退逻辑。
