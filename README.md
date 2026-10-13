# 早风爽的作品集

纯静态 HTML / CSS / JavaScript，无外部依赖，无构建步骤，适合 GitHub Pages。

## 添加新作品

只需在 `projects.js` 导出的 `projects` 数组末尾追加一项，无需修改 HTML 或渲染代码。例如（将示例地址替换为实际作品地址）：

```js
{
  title: "我的新作品",
  description: "用一句话介绍这个作品。",
  link: "https://你的用户名.github.io/作品仓库/",
  image: null,
  tags: ["小工具", "开源"],
},
```

- `title`、`description`：作品标题和简短介绍，建议用简体中文。
- `link`：作品地址。第一项倒立摆小游戏固定为 `./pendulum/`；后续作品在各自仓库开发、部署，这里只添加外链，可指向作品网站或仓库页面。不同站点的链接会在新标签页打开。
- `image`：可填图片地址（HTTPS 地址或相对于主页的路径，如 `./images/demo.webp`）；没有图片时填 `null` 或空字符串，页面自动显示占位预览，倒立摆保留原有插图。图片以 2:1 区域裁切显示，手机上比例略有调整，主体建议放在中央。
- `tags`：标签数组，没有标签时填 `[]`。

数组顺序就是卡片显示顺序，请保留倒立摆为第一项。卡片网格随屏幕宽度自动调整列数。

## 修改主页

- `index.html`：名字、个人简介、作品集栏目和 GitHub 链接。
- `style.css`：颜色变量、字体和响应式布局；深色模式颜色在 `prefers-color-scheme: dark` 中。
- `projects.js`：唯一的作品数据列表。
- `main.js`：读取数据并渲染卡片，不需要为每个新作品修改它。
- `pendulum/`：已有小游戏目录，保持原样。

## 本地预览

页面使用原生 JavaScript 模块，请通过静态 HTTP 服务器预览，避免直接双击 `index.html` 导致浏览器阻止模块加载。若已安装 Python，在本目录运行：

```sh
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/`。也可使用编辑器的静态服务器功能，无需安装项目依赖。

## GitHub Pages

在仓库的 Pages 设置中选择存放页面文件的分支及根目录 `/ (root)`。保留 `index.html`、`style.css`、`projects.js`、`main.js` 与 `pendulum/` 的相对位置即可，不需要构建工具。所有本地资源均使用相对路径，支持 GitHub Pages 的仓库子路径。
