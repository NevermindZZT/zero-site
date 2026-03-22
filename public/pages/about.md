# 关于 ZeroSite

欢迎使用 **ZeroSite**，这是一个以 JSON 配置驱动的个人网站示例。

## 特性

- 配置驱动首页、导航卡片与认证（示例）。
- 支持 Bing 每日壁纸或自定义背景。
- 导航卡片支持本地页面（`#about` 会加载 `public/pages/about.md` 或 `public/pages/about.html`）。
- 搜索框带毛玻璃效果，导航卡片使用光泽渐变样式。

## 示例用法

你可以在 `public/js/config.json` 中将某个导航卡片的 `link` 设置为 `#about`，点击卡片将打开此页面。

示例 Markdown 内容支持基本标题、列表、代码块和链接：

```js
console.log('Hello ZeroSite')
```

感谢使用！
