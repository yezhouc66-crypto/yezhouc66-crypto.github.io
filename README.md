# 早风爽的作品集

纯静态 HTML / CSS / JavaScript，无外部依赖，无构建步骤，适合 GitHub Pages。

## 页面功能

- 保留原来的个人介绍、作品卡片、倒立摆插图与 GitHub 入口。作品少于两个时，在「全部」视图显示「更多作品开发中」占位卡；占位不是作品，不参与数量统计、标签或键盘交互。
- 作品卡片保留直接试玩入口，可通过独立的「玩法与详情」链接打开详情页，两个链接互不嵌套。
- 「关于我 / 技能」只包含已确认的信息：深圳技术大学机器人工程大二，会 AI 工具与编程、机器人控制。
- 主题按钮按「跟随系统 → 浅色 → 深色 → 跟随系统」循环。默认跟随系统；手动选择保存在浏览器 `localStorage` 的 `portfolio-theme` 中，刷新后继续生效。返回跟随系统会清除手动偏好，并自动响应系统主题变化。存储被禁用时仍可在当前页切换；同源标签页之间会同步选择。
- 标签筛选为单选，默认「全部」。标签根据 `projects.js` 自动收集、去重，按第一次出现的顺序显示。筛选保留原作品顺序；「全部」也显示没有标签的作品。无标签时隐藏筛选按钮；数组为空时显示空状态。
- 提供页面标题、description、Open Graph 标题／描述／类型／站点名／语言，以及倒立摆造型的 SVG favicon。
- `404.html` 保持相同配色与排版，带 GitHub 入口和 `noindex`。脚本会从错误路径逐级向上查找带主页标识的 `index.html`，定位首页后加载共享样式和主题按钮，因此不需要预先写死仓库名。不要删除主页的 `application-name` 元标签。脚本关闭或定位请求失败时仍有独立基础样式，提供站点根目录、上一页和 GitHub 的恢复提示；仓库子路径的精确首页恢复需要 JavaScript。

## 无障碍与移动端

- 页面声明简体中文，使用语义化标题、导航、主内容与页脚。
- 首个键盘入口为「跳到主要内容」；链接和按钮有可见的焦点轮廓。
- 主题按钮读出当前模式与下一模式；筛选按钮用 `aria-pressed` 表示单选状态，并通过 `aria-controls` 关联作品区。
- 筛选结果通过 `role="status"` 播报；外部作品链接的无障碍描述提示「在新标签页打开」。
- 导航与按钮的触控高度至少 44px；导航、标签和技能允许换行，卡片网格自动适配宽度。
- 正文和作品卡片默认完整可见；入场动画只做轻微位移，不改变透明度，也不依赖 JavaScript 或 IntersectionObserver。支持 `prefers-reduced-motion`，减少动态效果时关闭动画、过渡和卡片悬停位移。
- `index.html` 包含完整静态作品卡片；禁用 JavaScript、模块加载失败或直接通过 `file://` 打开时，仍能看到个人信息、作品插图、标题、描述、标签和作品入口。脚本成功加载后增强作品渲染和标签筛选。

## 添加新作品

在 `projects.js` 导出的 `projects` 数组末尾追加一项，并同步 `index.html` 中的静态作品卡片，无需修改渲染代码。例如（将示例地址替换为实际作品地址）：

```js
{
  title: "我的新作品",
  description: "用一句话介绍这个作品。",
  link: "https://你的用户名.github.io/作品仓库/",
  detail: "./projects/真实作品名.html", // 可选；不需要详情页时省略
  image: null,
  tags: ["小工具", "开源"],
},
```

- `title`、`description`：作品标题和简短介绍，建议用简体中文。
- `link`：作品地址。第一项倒立摆小游戏固定为 `./pendulum/`；后续作品在各自仓库开发、部署，这里只添加外链，可指向作品网站或仓库页面。不同站点的链接会在新标签页打开。
- `detail`：可选的站内详情页地址，如 `./projects/pendulum.html`。只为真实作品填写；省略时不显示详情链接。
- `image`：可填图片地址（HTTPS 地址或相对于主页的路径，如 `./images/demo.webp`）；没有图片时填 `null` 或空字符串，页面自动显示占位预览，倒立摆保留原有插图。图片以 2:1 区域裁切显示，手机上比例略有调整，主体建议放在中央。动态图片保留 `loading="lazy"`、`decoding="async"`，缩略图容器预留比例以减少布局跳动。手动添加静态图片时也应加这两个属性，并填写真实图片的 `width`、`height`；预览只是标题的装饰补充时用 `alt=""`，包含独立信息时写明图片含义。现有倒立摆预览是内联 SVG，无需额外图片请求或懒加载。
- `tags`：标签数组，没有标签时填 `[]`。新增标签会自动成为筛选按钮；保持同类标签的文字一致。名为「全部」的项目标签仍是独立筛选项，不影响默认全部作品入口。

数组顺序就是卡片显示顺序，请保留倒立摆为第一项。卡片网格随屏幕宽度自动调整列数。

修改作品后，也请同步 `index.html` 中的静态作品卡片，保证脚本不可用时内容与 `projects.js` 一致。

## 添加独立详情页

1. 复制 `projects/template.html` 为 `projects/真实作品名.html`，替换标题、description、简介、玩法和真实链接；按需参考 `projects/pendulum.html` 添加分享元数据。
2. 写清楚哪些功能已经存在、哪些只是「可尝试」的方向；原理说明附来源，不填写未验证的数据和经历。
3. 发布真实页面前移除模板的 `noindex`。在 `projects.js` 添加 `detail` 字段，并同步首页静态卡片中的独立详情链接。模板没有加入首页作品列表。
4. 在 `scripts/generate-sitemap.py` 的 `pages` 中加入新页面路径，再以实际部署地址重新生成站点地图；不要收录模板与 404 页。

详情页无脚本也完整可读，使用 `../` 相对路径共享资源与返回主页，可在 GitHub Pages 仓库子路径下使用。主题切换由共用 `theme.js` 独立增强，不加载首页筛选代码。

## 修改主页

- `index.html`：名字、个人简介、关于我／技能、导航、SEO 与分享元数据、GitHub 链接。
- `style.css`：颜色变量、字体、筛选／主题按钮、404 共用样式和响应式布局。系统深色在 `prefers-color-scheme: dark` 中，手动深色在 `:root[data-theme="dark"]` 中；修改配色时也同步 `404.html` 的基础颜色，保证错误页尚未找到共享资源时风格一致。
- `theme.js`：绘制前恢复主题偏好、按钮切换和多标签页同步。
- `projects.js`：动态渲染与标签筛选使用的作品数据列表；静态卡片在 `index.html` 中。
- `main.js`：读取数据、生成筛选按钮并渲染卡片，不需要为每个新作品修改它。
- `favicon.svg`：浏览器标签页图标。
- `404.html`：错误页及深层错误路径下的首页定位逻辑。
- `projects/pendulum.html`：倒立摆详情页，包含现有玩法、可尝试的 PID 调参、LQR 拓展思路及原理来源。没有编造实现、实物经历或实验数据。
- `projects/template.html`：可复制的静态详情模板，共用主题、样式、跳转导航和键盘焦点，模板本身带 `noindex`。
- `sitemap.xml`、`robots.txt`：站点地图与爬虫入口；正式 URL 未确认时地图暂为空，见下方生成说明。
- `scripts/generate-sitemap.py`：可选的一次性站点索引生成工具；访问站点不需要 Python 或构建。
- `pendulum/`：已有小游戏目录，保持原样。

## 本地预览

直接双击 `index.html` 可查看完整静态内容。页面的标签筛选使用原生 JavaScript 模块，请通过静态 HTTP 服务器预览该功能。若已安装 Python，在本目录运行：

```sh
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/`。也可使用编辑器的静态服务器功能，无需安装项目依赖。

Python 的简单服务器不会自动使用自定义错误页；可直接访问 `/404.html` 查看样式。多级错误路径的实际回退行为在 GitHub Pages 上验证。

建议检查：系统浅／深色；手动切换后刷新；返回系统模式后改变系统主题；点击每个标签再返回「全部」；用 Tab、Enter 和空格操作；在 320px、390px、768px 和桌面宽度检查换行与溢出；访问一个不存在的多级路径确认首页恢复。检查用的示例作品无需写入正式数据。

## GitHub Pages

在仓库的 Pages 设置中选择存放页面文件的分支及根目录 `/ (root)`。将 `index.html`、`style.css`、`projects.js`、`main.js`、`theme.js`、`favicon.svg`、`404.html`、`projects/`、`sitemap.xml`、`robots.txt` 与原有 `pendulum/` 放在仓库根目录，保持相对位置即可，不需要构建工具。首页本地资源均使用相对路径，支持 GitHub Pages 的仓库子路径。

确定正式部署地址后，可在 `index.html` 的 head 中添加 canonical 与 `og:url`（两者使用同一个完整 HTTPS 首页地址，仓库子路径和结尾 `/` 都要保留）。当前没有已确认的部署地址，因此未写入猜测的链接。

分享预览已有静态的 Open Graph 标题和描述。若需要分享大图，请另行提供真实的 PNG／JPEG 图片，并添加使用完整 HTTPS 地址的 `og:image` 与对应 `og:image:alt`；SVG favicon 仅用于浏览器图标。

## 站点地图与爬虫

仓库中尚未确认正式部署 URL，因此 `sitemap.xml` 当前仅保留 XML 结构（尚不能作为完整站点地图提交），`robots.txt` 允许抓取，暂不声明猜测的 Sitemap 地址。确认实际 HTTPS 首页地址后运行：

```sh
python3 scripts/generate-sitemap.py 'https://实际域名/实际仓库子路径/'
```

请替换为真实部署地址；用户主页仓库部署在域名根目录时不带仓库子路径。该命令会生成首页、倒立摆详情页和原小游戏三个真实页面的绝对 URL，并更新 `robots.txt` 的 `Sitemap` 行。保留末尾 `/` 与正确的仓库子路径，不使用虚构域名，也不伪造 `lastmod`。在 GitHub Pages 的项目站点中，仓库内的 `robots.txt` 只位于该项目子路径；爬虫对 robots 的发现以域名根目录为准，可另行在搜索平台提交实际 `sitemap.xml` 地址。

## 本轮检查与截图

本轮调整了作品区标题层次、分区间距、占位卡、移动端描述字号与键盘焦点。占位文字沿用正文辅助色，浅／深色对比度通过离线计算检查。图片懒加载和异步解码保持生效，SVG 插图无需图片加载脚本；内容没有使用透明度或滚动观察器延迟显示。

建议通过本地静态服务器预览后执行（高度加大以检查完整页面）：

```sh
chromium --headless --no-sandbox --virtual-time-budget=3000 --force-device-scale-factor=1 --window-size=1280,1500 --screenshot=/workspace/hp10-desktop.png http://127.0.0.1:8000/
chromium --headless --no-sandbox --virtual-time-budget=3000 --force-device-scale-factor=1 --window-size=390,1900 --screenshot=/workspace/hp10-mobile.png http://127.0.0.1:8000/
```

当前执行环境没有 `chromium` 命令；尝试现有 Chrome 内核时，启动因沙箱的 socket 权限限制退出，本地 HTTP 服务器也被同一限制阻止。本轮未生成或替用旧截图，不能声称已目视确认；离线内容、链接、渲染与对比度检查结果见交付说明。`pendulum/` 以修改前后 SHA-256 校验确认不变。此环境无可用 Git 元数据，未执行提交、推送或上线操作。
