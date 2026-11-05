# 陈俊烨 Chen Junye · 作品博物志

**A Natural History of Works** —— 个人介绍与作品集，面向企业投递。
AI 应用开发者：从一段能跑的代码，到一个真实在用的系统；长远方向是 AI for Life Science 与人文艺术。

纯静态站点：一个 HTML、一份 CSS、一段可有可无的 JS。网站本身没有构建步骤、没有外部依赖；
`tools/` 里的生成与验收脚本只在开发时用。

## 设计

整本页面按一册博物志来编排，顺序按「企业最先想知道什么」排：

| 部分 | 内容 |
| --- | --- |
| 封面 | **Fig. 1** 程序生成的放射虫形态网络，向 Ernst Haeckel《自然的艺术形态》（1904）致意；标本签代替名片（含档期） |
| I 总述 | 给企业的自我总述：开发 + AI 活动 + 空档期（每周 5–7 天）；四格数据、行动区（简历 / 邮件 / 微信）、擅长、**Film 1** 九十秒自述视频与文字稿 |
| II 标本 | 14 件，按重要性分三类：**甲 合作与在用**（No.01–06）→ **乙 行业系统**（No.07–11）→ **丙 创意与原型**（No.12–14） |
| III 履历 | 教育、合作与校内、讲台、人文线索；重点条目用赭色标出 |
| IV 记录 | 11 个月、29 场 AI 活动的全链路时间线：获奖盖朱砂「奖」印，组织 / 指导 / 评委用赭色 |
| V 方向 | **Fig. 2** 双链：石绿为生命科学，赭石为人文艺术，横档是连接二者的方法 |
| VI 通信 | 联系方式、档期、简历 PDF |
| 封底 | 版本记录（Colophon），含统计的隐私说明 |
| 两侧 | 左「观察指南」：能怎么玩；右「采集册」：九枚彩蛋的进度（见下文「互动与彩蛋」） |

颜色取自中国传统矿物颜料：赭石 `#9C6A1E`、石绿 `#3E6B5C`、朱砂 `#B5432B`（只用于印章）。

## 结构

```
public/
  index.html            全部内容（改文案直接改这里）
  styles.css            配色与排版
  main.js               渐进增强：顶栏状态、阅读进度、段落揭示、当前章节、Fig.1 指针视差、
                        视频离屏暂停、复制微信号、匿名访问统计
  play.js               互动与彩蛋：两侧观察指南 / 采集册、拖转 Fig.1、盖章、显微镜、键盘翻章
  stats/index.html      访问统计面板（nginx 用密码保护，见「访问统计」）
  works/*.webp          图版：大图版有 *-lg.webp 1440×900 与 960×600 两档（srcset），卡片 960×600
  media/                Film 1：cjy-intro.mp4（1080p · 无声 · 约 4 MB）与封面帧 cjy-intro-poster.webp
  files/                简历 PDF（chen-junye-resume-2026-10.pdf）
  og.png                社交分享卡片 1200×630（由 tools/figures.py --og 生成）
  favicon.svg           朱砂印「陈」
  apple-touch-icon.png  同一枚印，180×180（由 tools/figures.py --icons 生成）
  icon-512.png          同一枚印，512×512（供 site.webmanifest）
  site.webmanifest  sitemap.xml  robots.txt  404.html
tools/figures.py        生成 Fig.1 / Fig.2 并注入 index.html；--og 重绘分享卡，--icons 重绘印章图标
tools/check.cjs         一键验收（见下）
tools/fixtures/         统计面板的样本日志（含 XSS 样本），供验收用
docker/40-cjy-stats.sh  容器启动时准备统计日志目录与 /stats/ 密码
.github/workflows/      每次推送与 PR 自动跑验收
Dockerfile              nginx 静态托管，Zeabur 自动识别
default.conf.template   nginx 配置（缓存、压缩、安全头、__ORIGIN__ 替换）
```

## 重新生成插图

Fig. 1 与 Fig. 2 是内联 SVG，位于 `index.html` 中的
`<!--specimen:start-->…<!--specimen:end-->`、`<!--helix:…-->`、`<!--helixband:…-->` 标记之间。
不要手改这几段，改 `tools/figures.py` 后重新运行：

```bash
python3 tools/figures.py            # 只重写 SVG
python3 tools/figures.py --og       # 同时重绘 og.png（需要 Pillow 与文泉驿/Liberation 字体）
python3 tools/figures.py --icons    # 同时重绘 apple-touch-icon.png 与 icon-512.png
```

放射虫的形态由随机种子 `1904` 决定，每次生成结果一致。分享卡上的文案在 `og_png()` 里改。

## 一键验收

每次改完都跑一遍，有失败项时退出码为 1：

```bash
npm install --no-save --no-package-lock playwright axe-core   # 第一次需要；装过可跳过
node tools/check.cjs                       # 自带静态服务器，直接读 public/
node tools/check.cjs --shots shots/        # 顺便按章节截图，人工过目
node tools/check.cjs --url https://线上地址/  # 检查任意地址
```

它会检查：

- **五种宽度**（360 / 375 / 768 / 1280 / 1920）：
  - 横向溢出，包括被 `overflow-x: clip` 裁掉、不出滚动条的内容；
  - 图片是否都加载成功、控制台是否报错、有没有请求失败与 4xx；
  - 页内锚点是否都有目标、id 是否重复、段落揭示是否都触发、视频是否被提前下载。
- **数字核对**：记录与总述里写的场数、获奖数、在线作品数、分类件数，是否和页面上实际的条目数一致；`<meta name="description">` 是否同步。
- **关掉 JS、开启「减少动态效果」**时页面是否完整可读。
- **两侧与彩蛋**：页边标签、`?` 与 Esc、J 翻章、敲 cjy 开显微镜、盖三枚章不溢出不跳转、控制台问候、
  404 迷路、进度保存与计数；1920px 在纸面停靠、到封底收起；页边标签不压正文；手机底部抽屉。
- **统计**：一次访问只发一条 view、滚动会发「读到某章」；统计面板用样本日志渲染，日志里的 HTML 只能当文字显示。
- **axe-core 无障碍检测**（WCAG A/AA）：serious 及以上算失败；另测两侧停靠与采集册展开两种状态。

推送到 GitHub 后，`.github/workflows/check.yml` 会自动再跑一遍，并检查 SVG 是否与 `figures.py` 一致。
截图作为附件上传，可以在 Actions 页面下载查看。

## 访问统计

自建、匿名，不用任何第三方服务。页面通过 `/hit` 发信标，nginx 把参数逐行写成 JSON（`hits.log`），
统计面板 `/stats/` 读这份日志在浏览器里汇总：访问、新访客、停留、读到哪一章、从哪里来、打开简历 / 发邮件 / 复制微信、
点开了哪些作品、采到哪些彩蛋，以及最近 30 次访问的明细。

**记录什么**：事件名、章节或作品编号、会话随机号（关掉标签页即失效）、是否第一次来、来源域名、`?from=` 标签、
屏幕宽度、语言、浏览器类型（User-Agent）。**不记录**：IP、Cookie、任何能认出具体某人的信息。
浏览器开启「请勿追踪」或「全局隐私控制」时一条也不发。

**在 Zeabur 开启**（两步，不做也不影响网站本身）：

1. 服务的环境变量里加 `STATS_PASSWORD`（自己定一个密码）。没有它，`/stats/` 谁也进不去。
2. 服务的「硬盘 / Volumes」里挂一个卷到 `/var/lib/cjy-stats`。不挂也能用，但每次重新部署日志会清空。

然后打开 `https://你的域名/stats/`，用户名 `cjy`，密码就是上面那个。打开过统计页的浏览器会自动标记为本人，不再计入。

**区分投递渠道**：发出去的链接后面加 `?from=标签`，例如 `/?from=boss`、`/?from=bytedance`、`/?from=resume`，
统计面板的「从哪里来」会分开显示。`?notrack=1` 让当前浏览器不再计入（`?notrack=0` 恢复）。

- 自动化与爬虫（User-Agent 含 bot / spider / Headless 等）在面板里自动排除，所以跑验收脚本不会污染数据。
- 每个访客每秒最多 10 条信标（突发 40 条），超过返回 429，且不写进日志。
- 用 `python3 -m http.server` 本地预览时没有 `/hit`，信标会 404，不影响页面。

## 互动与彩蛋

两侧在宽屏（≥1640px）的纸面区域停在页边，封面与封底收起；更窄时收成页边标签，点开是抽屉；≤880px 是底部两枚小按钮。
没有 JS 时两侧整体不出现，页面照常可读；「减少动态效果」下涟漪、印章动画、惯性旋转都关掉。

- **观察指南**（左）：拖动放射虫、拿起印章盖章、J / K / ? 键盘操作、彩蛋提示在右侧。
- **采集册**（右）：九枚彩蛋，没找到的只显示提示；进度存在访客自己浏览器的 `localStorage`（`cjy-eggs`），
  集齐后出现一句邀请和邮箱。每采到一枚会发一条匿名信标，统计面板「彩蛋」一栏能看到。

<details>
<summary>九枚彩蛋（剧透）</summary>

| 彩蛋 | 怎么触发 |
| --- | --- |
| 细胞核 | 点封面放射虫的正中心 |
| 离心力 | 把放射虫拖着转满三圈（1080°） |
| 三枚印 | 拿起印章，盖满三枚 |
| 显微镜 | 键盘敲 `cjy`；手机上长按放射虫 |
| 九十秒 | 把 Film 1 看完 |
| 封底 | 读到版本记录 |
| 迷路 | 打开任何不存在的地址（404 页） |
| 夜读 | 23:00–5:00 之间来访 |
| 控制台 | 在开发者工具里输入 `cjy.hello()` |

改彩蛋：`public/play.js` 顶部的 `EGGS` 数组（名字、提示、采到后的话），触发逻辑在同一个文件里；
迷路在 `404.html` 的内联脚本里。统计面板的中文名在 `public/stats/index.html` 的 `EGGS`。
</details>

## 重新压缩视频

原片是 1080p 的无声动效，用 `-tune animation` 压到约 4 MB，文字依旧清晰：

```bash
ffmpeg -i 原片.mp4 -an -c:v libx264 -preset slow -tune animation -crf 30 \
       -profile:v high -pix_fmt yuv420p -movflags +faststart public/media/cjy-intro.mp4
```

页面里用 `preload="none"` 加封面帧，访客点了才下载；没有 JS 时浏览器自带的播放控件照样能用。
视频下方有默认折叠的「影片文字稿」，换视频时一并更新。

## 本地预览

```bash
cd public && python3 -m http.server 8000
# 或与线上一致：
docker build -t cjy-natural-history . && docker run --rm -p 8080:8080 cjy-natural-history
```

用 `python3 -m http.server` 预览时，`<head>` 里的 `__ORIGIN__` 不会被替换，这是正常现象（见下）。

## 部署（Zeabur）

导入仓库即可，Zeabur 会识别根目录的 `Dockerfile` 自动构建。

- **绝对地址不用配置**：分享卡 `og:image`、`og:url`、`canonical`、`sitemap.xml` 与 `robots.txt` 里的地址都写成 `__ORIGIN__`，
  由 nginx 按访客实际访问的协议和域名替换（协议优先取 `X-Forwarded-Proto`）。换域名、换平台都不用改文件；
  换成不经 nginx 的静态托管时，要把 `__ORIGIN__` 改成真实域名。
- **缓存**：页面本身 `no-cache`，每次都向服务器确认，新版本上线立即可见。CSS / JS / 图片 / 视频 / PDF 缓存 7 天。
- **版本号自动更新**：构建镜像时，Dockerfile 会按文件内容哈希重写 `styles.css`、`main.js`、`play.js` 的 `?v=…`，
  忘了手改版本号也不会命中旧缓存。手动改仍然有效，本地预览时用的就是手写的版本号。

## 常见修改

- **加一件标本**：先定它属于哪一类——有合作方或真实使用者放「甲」，可运行的行业系统放「乙」，自己的创意放「丙」。
  在对应 `<section class="kind">` 的 `.cabinet` 里复制一个 `<article class="card">`，截图放进 `public/works/`（960×600 WebP）。
  大图版再加一张 1440×900 的 `*-lg.webp`，并照现有大图写好 `srcset`。
- **藏品号按展示顺序排**：插入新作品后，后面的 `id="no-xx"`、`No. xx`、`Pl. xx` 要整体后移，
  「V 方向」两条链、「III 履历」和「IV 记录」里的 `#no-xx` 互见链接也要一起改。
- **作品 ↔ 经历互见**：卡片里的 `<p class="rel">` 指向经历（`#ev-0612`、`#campus-agents`…），经历里的 `No.xx` 指回作品。
- **加一条活动记录**：在「IV 记录」的 `.events` 里按日期插一行 `<li class="ev">`；获奖加 `ev--award` 和「奖」印，
  组织 / 指导 / 评委加 `ev--lead`。同时更新四处数字：封面标本签、总述四格、记录顶部的计数、`<meta name="description">`。
  漏改哪一处，`tools/check.cjs` 都会报出来。
- **换简历**：新 PDF 放进 `public/files/`，文件名带上日期（缓存 7 天，同名替换会被旧缓存挡住）；
  再改 `index.html` 里三处链接（总述行动区、通信两处）和标注的页数、大小。放上去之前先确认里面没有电话、院名等不该公开的信息。
- **改微信号**：改通信里的文字，以及两个按钮的 `data-copy` 属性。
- **改方向**：「V 方向」左右两列是普通列表；螺旋上的五个方法标签在 `tools/figures.py` 的 `HELIX_RUNGS`。

## 设计约束（改样式前请看）

- **只用系统字体**，不引用 Google Fonts —— 该服务在中国大陆不稳定，可能导致首屏白屏数秒。
- **对比度已实测（WCAG）**：正文与链接用 `--ochre-text #7A4F12`（6.0:1，浅赭底上 5.5:1）；`--ochre #9C6A1E` 只有 4.0:1，
  只用于大字、线条与装饰。石绿旗标 5.2:1，朱砂「奖」印上的奶油字 5.0:1；深赭主按钮上的奶油字 7.4:1，次按钮 6.5:1。
  封面与封底的渐变最亮处 `#8C5E1C`，奶油色文字全程 ≥ 5.1:1，再调亮会不达标。
- **朱砂只用于印章**：封面与顶栏的「陈」、库房藏品的「藏」、获奖的「奖」、触屏图标，以及观察指南里的「拿起印章」
  按钮和盖下的印（奶油字 5.0:1）。别把它用成正文颜色。
- **医院名称不出现**：No.01 与 No.02 的截图都已抹去院名，文案只写「县级医院」。重截图时同样处理。
- **研究生院督导管理系统（No.03）涉及校内隐私平台**：只写名称与角色，不放链接、截图或任何细节。
- 竖排姓名用逐字堆叠而不是 `writing-mode`：部分系统字体缺竖排度量，会叠字。
- 没有 JS 时页面完整可读，复制按钮保持隐藏；JS 加载失败时会自动撤掉隐藏状态。
  尊重「减少动态效果」系统设置，视频从不自动播放。
- 统计面板只用 `textContent` 往页面里写日志内容：日志来自访客，可能含有恶意 HTML。验收脚本的样本日志专门测这一条。
- 所有内容都在 `<main>` 等地标里；`<dl>` 里只放 `<div>` 包着的 `<dt>` / `<dd>`。axe 会检查这两条。
