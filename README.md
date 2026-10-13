# 早风爽的个人主页

纯静态页面，无外部依赖，也不需要构建。直接用浏览器打开 `index.html` 即可预览。

- 修改 `index.html` 中的名字、简介、作品标题与描述，以及链接的 `href`。
- 修改 `style.css` 中的颜色变量、字体大小和间距；深色模式颜色在 `prefers-color-scheme: dark` 中。
- 新增作品时，在作品区复制一段 `project-card` 链接并修改内容。
- `pendulum/` 是现有小游戏目录，主页通过 `./pendulum/index.html` 访问它。

发布到 GitHub Pages 时，选择存放这些文件的分支及根目录 `/ (root)`。保留 `index.html`、`style.css` 与 `pendulum/` 的相对位置即可，无需安装依赖。
