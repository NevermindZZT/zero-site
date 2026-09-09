# ZeroSite

ZeroSite 是一个轻量的个人网站示例，运行时通过 `public/js/config.json` 配置站点行为（导航卡、背景、登录用户等）。

## 主要特性

- 运行时可编辑配置：`public/js/config.json`。
- 支持 `public/pages/*.html` 与 `public/pages/*.md`（后端会将 Markdown 渲染为 HTML）。
- 简易后端 API：`/api/config`、`/api/login`、`/api/logout`、`/api/pages/:name`、`/api/nav-cards`、`/api/nav-cards/order`、`/api/favicon`。
- 登录使用 HttpOnly 会话 cookie（示例实现，后端当前使用内存会话存储）。

## 快速开始

### 开发模式（快速迭代）

1. 安装依赖并启动 Vite 开发服务器：

```bash
npm install
npm run dev
```

2. 在另一个终端启动后端（可选，用于 API）：

```bash
cd server
npm install
npm start
```

前端默认在 `http://localhost:5173`，后端在 `http://localhost:8080`。在开发中可在 `vite.config.js` 添加代理将 `/api` 转发到后端。

### 生产模拟（构建 + 后端）

构建前端并用后端提供静态文件与 API：

```bash
# 在项目根
npm install
npm run build

# 启动后端（在 server/）
cd server
npm install
npm start

# 打开 http://localhost:8080
```

后端会优先返回 `dist/index.html`（若存在），并提供 `/api/*` 接口，适合验证 HttpOnly cookie、Markdown 渲染与生产行为。

## Docker 部署提示（挂载 `public`）

建议在容器运行时将主机的 `public` 目录挂载到容器内，以便在运行期修改配置或页面而无需重建镜像。示例：

```bash
# 使用 docker run（示例）
docker run -d \
	-p 8080:8080 \
	-v "$(pwd)/public:/app/public:rw" \
	--name zerosite zerosite:latest
```

Docker Compose 覆盖示例（`docker-compose.override.yml` 或直接在 compose 文件中添加）：

```yaml
services:
	zerosite:
		image: zerosite:latest
		ports:
			- "8080:8080"
		volumes:
			- ./public:/app/public:rw
```

要点：

- 卡片管理需要 `public` 可写，示例使用 `:rw`；使用 `:ro` 会禁止保存新增卡片。
- 确认容器中应用使用的 `public` 路径（镜像工作目录可能不同）。  
- 生产环境请避免在 `public/js/config.json` 中放置明文敏感信息。

## 配置示例

示例 `public/js/config.json`：

```json
{
	"background": { "source": "bing", "resolution": "1920x1080", "random": false },
	"auth": { "users": [ { "username": "admin", "password": "password" } ] }
}
```

- `background.source` 支持 `bing`（使用 `bing.img.run` 获取高分辨率壁纸）或 `custom`（请提供 `customUrl`）。
- 页面放 `public/pages/*.html` 或 `public/pages/*.md`，后端会优先返回 HTML。

## 首页卡片管理

登录后点击右下角菜单中的“添加卡片”，填写卡片名称和链接即可将新卡片写入 `public/js/config.json`，刷新页面后仍会保留。点击“调整顺序”即可使用上下箭头重新排列首页卡片，保存后立即生效。链接支持：

- `http://` / `https://` 外部网站
- `#about` 形式的站内 Markdown 页面
- 可选的自定义图标地址（支持站内路径或 `http(s)` 地址）

如果外部链接没有填写图标，首页会调用后端 `/api/favicon?url=...`：服务端读取网站的 `rel=icon`、`apple-touch-icon` 等声明，并回退到网站根目录的 `/favicon.ico`，以避免浏览器跨域限制。获取失败时会显示卡片名称首字母。

卡片写入接口需要登录会话：`POST /api/nav-cards`；调整顺序使用 `PUT /api/nav-cards/order`。接口会校验链接协议、图标地址和卡片数量，并使用临时文件替换配置文件。部署容器时需要将 `public` 目录挂载为可写持久化卷，否则容器重建后新增卡片或顺序不会保留。

## 安全说明

- 当前示例使用**内存会话存储**（仅用于演示）。生产请改用持久化会话（例如 Redis）、密码哈希和 HTTPS。  
- 若需在容器中启用 HttpOnly cookie 的 `secure` 标志，请在生产环境通过 HTTPS 提供服务并设置 `NODE_ENV=production`。
