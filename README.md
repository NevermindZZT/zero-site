# ZeroSite

个人网站示例。功能与实现要点：

- 使用 `js/config.json` 存放站点配置（包括登录用户、导航卡片、搜索引擎）。
- 登录（客户端验证配置中的用户名/密码）并用 cookie 管理会话（仅示例用途，不安全，用于本地验证）。
- 首页 (`index.html`) 读取配置渲染导航卡片并提供搜索（默认必应）。
- 支持跟随系统主题并可切换（保存到 `localStorage`）。

运行（本地静态服务器）
--------------------------------
该项目是静态前端示例，推荐使用任意静态服务器运行。示例：

```bash
# 在项目根运行 Python 简单服务器
python -m http.server 8000
```
然后访问 `http://localhost:8000/`（首次会跳转到 `/login.html`）。

使用 Docker Compose（推荐）
--------------------------------
已包含 `Dockerfile` 与 `docker-compose.yml`，使用 nginx 作为静态服务器并暴露到本地 `8080` 端口：

```bash
# 构建并启动
docker compose up --build -d

# 访问 http://localhost:8080

# 停止并移除容器
docker compose down
```

默认登录凭据（位于 `js/config.json`）：
- 用户名：`admin`
- 密码：`password`

实现说明与安全提示
--------------------------------
- 配置存放在 `js/config.json`，包含 `site`、`auth`、`search`、`navCards` 等字段。
- 当前认证逻辑为前端读取配置并在客户端验证，登录状态用 cookie（示例用途）。这种方式**不安全**，不应用于生产环境。生产环境应将认证移到后端并使用安全的会话管理与密码哈希。
- 前端遵循可访问性与性能实践：尊重 `prefers-reduced-motion`，在动画上优先使用 `transform`/`opacity`，并为深色/浅色提供主题变量。

背景与图标配置
--------------------------------
- 背景：在 `js/config.json` 的 `background` 段设置 `source` 为 `bing`（默认）或 `custom`。当为 `bing` 时，页面会请求 Bing 的每日壁纸并作为背景图；如为 `custom`，请填 `customUrl` 为图片地址。

Bing 壁纸接口：项目现在默认使用 `bing.img.run` 公共接口获取高分辨率壁纸。你也可以在 `public/js/config.json` 中设置 `background.source` 为 `custom` 并填入 `customUrl` 使用自定义图片。

示例配置（使用 bing.img.run）：

```json
{
	"background": {
		"source": "bing",
		"resolution": "1920x1080",
		"random": false
	}
}
```
	 - 遮罩控制：可通过下列字段调节背景上方的渐变遮罩（默认保留现有兼容性）：
		 - `overlayOpacity`：整体遮罩强度（0 - 1），默认 `0.45`。
		 - `overlayTop`：顶部渐变不透明度（0 - 1），可选（例如 `0.18`）。
		 - `overlayBottom`：底部渐变不透明度（0 - 1），可选（例如 `0.28`）。
- 图标：导航卡片现在支持 `iconUrl` 或 `iconSvg` 字段，以使用设计感更强的 SVG 图标。示例图标位于 `assets/icons/`。
  
注意：仓库已清理重复副本，运行时使用的权威资源位于 `public/js/config.json` 和 `public/assets/`。如果你的本地工作区中仍然存在根目录下的空 `js/` 或 `assets/` 目录，你可以在本地终端运行下列命令将其删除：

Windows (PowerShell):
```powershell
Remove-Item -Recurse -Force .\js -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\assets -ErrorAction SilentlyContinue
```

Unix / macOS:
```bash
rm -rf js assets
```

视觉效果
--------------------------------
- 毛玻璃（frosted glass）已应用于头部与卡片，使用 `backdrop-filter` 并提供回退样式。
 - 毛玻璃（frosted glass）已应用于头部、卡片与搜索框，使用 `backdrop-filter` 并提供回退样式。搜索框现在有独立的毛玻璃样式，可在 `src/styles.css` 中调整模糊半径与阴影。
- 导航卡片使用发光渐变（glow）与柔和阴影以提升质感。
- 所有动效在 `prefers-reduced-motion` 下会自动降级。

设计与扩展
--------------------------------
- 代码模块化：资源位于 `js/`、`css/` 目录，便于后续扩展页面与组件。
- UI 参考了 `premium-frontend-ui` 技能的原则：流式排版、预加载、可降级的动效策略以及性能守则。
- 现在项目已迁移到 React + Vite，前端使用 `framer-motion` 实现动画并通过 `lenis` 提供可选的平滑滚动。

本地开发（React + Vite）
--------------------------------
安装依赖并启动开发服务器：

```bash
npm install
npm run dev
```

构建生产包：

```bash
npm run build
```

快速本地验证（无需 Docker）
--------------------------------
下面给出两种不用 Docker 的快速验证方法：

1) 生产模拟（推荐，最接近部署行为）

```bash
# 在项目根安装前端依赖并构建静态文件
npm install
npm run build

# 然后安装并启动后端（server）以同时提供 API 与静态文件
cd server
npm install
npm start   # 或 node index.js

# 在浏览器打开 http://localhost:8080
```

说明：该流程会把前端构建产物放在 `dist/`，后端会在同一端口提供 `/api/*` 接口和 SPA 页面，这样可以验证 HttpOnly 会话(cookie)、页面加载和服务器端渲染的 Markdown 页面。

2) 开发并行调试（迭代开发时使用）

```bash
# 在项目根启动 vite 开发服务器
npm install
npm run dev

# 在另一个终端中启动后端（API）
cd server
npm install
npm start

# 默认：Vite 在 http://localhost:5173，后端在 http://localhost:8080
# 若要在开发模式下让前端请求到后端 API，需要在浏览器中直接访问后端地址，
# 或在 Vite 配置中添加代理将 `/api` 转发到 http://localhost:8080。
```

Vite 代理示例（在 vite.config.js 中添加）

```js
export default defineConfig({
	// ...其他配置
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8080',
				changeOrigin: true,
				secure: false,
			}
		}
	}
})
```

注意事项
- 后端示例使用内存会话存储（仅用于本地验证与演示）。生产请改用 Redis 或其他持久化会话存储。
- 为使 HttpOnly cookie 在本地生效并带有 `secure` 标志，需在生产环境下使用 HTTPS；开发时 `secure` 仅在 `NODE_ENV=production` 时自动启用。
- 如果遇到端口占用或构建错误，先查看终端日志并确认已在 `server/` 和项目根运行 `npm install`。

动画与平滑滚动
--------------------------------
本项目在不降低可访问性的前提下为桌面及指针设备添加了动效：
- 使用 `GSAP` + `ScrollTrigger` 实现入场、滚动触发的动画。
- 使用 `Lenis` 提供平滑滚动体验，并与 `ScrollTrigger` 集成。
- 动画仅在 `prefers-reduced-motion: no-preference` 时启用，移动端和触摸设备会自动降级到轻量样式。

这些库以 CDN 方式直接加载（见 `index.html` 中的 script 引用），无需额外构建步骤。

如果你希望我：
- 将认证迁移到一个小型 Node.js 后端（含 Docker），或
- 在首页增加作品集页面与示例内容，或
- 用 `premium-frontend-ui` 风格进一步增强动画/排版（Framer Motion / GSAP），
 - 在 `js/config.json` 中调整背景遮罩默认值或添加自定义图片，或
 - 我可以把 README 中的“配置示例”同步到 `public/js/config.json` 的注释范例中以帮助部署。
请告诉我下一步偏好。
