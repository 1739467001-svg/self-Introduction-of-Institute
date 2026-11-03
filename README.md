# 陈俊烨 Chen Junye · 作品博物志

**A Natural History of Works** —— 个人介绍与作品集，面向企业投递。
AI 应用开发者：从一段能跑的代码，到一个真实在用的系统；长远方向是 AI for Life Science 与人文艺术。

纯静态站点：一个 HTML、一份 CSS、一段可有可无的 JS。没有构建步骤，没有外部依赖。

## 设计

整本页面按一册博物志来编排，顺序按「企业最先想知道什么」排：

| 部分 | 内容 |
| --- | --- |
| 封面 | **Fig. 1** 程序生成的放射虫形态网络，向 Ernst Haeckel《自然的艺术形态》（1904）致意；标本签代替名片（含档期） |
| I 总述 | 给企业的自我总述：开发 + AI 活动 + 空档期（每周 5–7 天）；四格数据、擅长、**Film 1** 九十秒自述视频 |
| II 标本 | 14 件，按重要性分三类：**甲 合作与在用**（No.01–06）→ **乙 行业系统**（No.07–11）→ **丙 创意与原型**（No.12–14） |
| III 履历 | 教育、合作与校内、讲台、人文线索；重点条目用赭色标出 |
| IV 记录 | 11 个月、29 场 AI 活动的全链路时间线：获奖盖朱砂「奖」印，组织 / 指导 / 评委用赭色 |
| V 方向 | **Fig. 2** 双链：石绿为生命科学，赭石为人文艺术，横档是连接二者的方法 |
| VI 通信 | 联系方式与档期 |
| 封底 | 版本记录（Colophon） |

颜色取自中国传统矿物颜料：赭石 `#9C6A1E`、石绿 `#3E6B5C`、朱砂 `#B5432B`（只用于印章）。

## 结构

```
public/
  index.html        全部内容（改文案直接改这里）
  styles.css        配色与排版
  main.js           渐进增强：顶栏状态、阅读进度、段落揭示、当前章节、Fig.1 指针视差、视频离屏暂停
  works/*.webp      图版：*-lg.webp 1440×900（大图版），其余 960×600
  media/            Film 1：cjy-intro.mp4（1080p · 无声 · 约 4 MB）与封面帧 cjy-intro-poster.webp
  og.png            社交分享卡片 1200×630（由 tools/figures.py 生成）
  favicon.svg       朱砂印「陈」
  404.html
tools/figures.py    生成 Fig.1 / Fig.2 并注入 index.html；--og 同时重绘 og.png
Dockerfile          nginx 静态托管，Zeabur 自动识别
default.conf.template
```

## 重新生成插图

Fig. 1 与 Fig. 2 是内联 SVG，位于 `index.html` 中的
`<!--specimen:start-->…<!--specimen:end-->`、`<!--helix:…-->`、`<!--helixband:…-->` 标记之间。
不要手改这几段，改 `tools/figures.py` 后重新运行：

```bash
python3 tools/figures.py          # 只重写 SVG
python3 tools/figures.py --og     # 同时重绘 og.png（需要 Pillow 与文泉驿/Liberation 字体）
```

放射虫的形态由随机种子 `1904` 决定，每次生成结果一致。分享卡上的文案也在 `og_png()` 里改。

## 重新压缩视频

原片是 1080p 的无声动效，用 `-tune animation` 压到约 4 MB，文字依旧清晰：

```bash
ffmpeg -i 原片.mp4 -an -c:v libx264 -preset slow -tune animation -crf 30 \
       -profile:v high -pix_fmt yuv420p -movflags +faststart public/media/cjy-intro.mp4
```

页面里用 `preload="none"` 加封面帧，访客点了才下载；没有 JS 时浏览器自带的播放控件照样能用。

## 本地预览

```bash
cd public && python3 -m http.server 8000
# 或与线上一致：
docker build -t cjy-natural-history . && docker run --rm -p 8080:8080 cjy-natural-history
```

## 部署（Zeabur）

导入仓库即可，Zeabur 会识别根目录的 `Dockerfile` 自动构建。
CSS / JS / 图片 / 视频缓存 7 天，改动后请把 `index.html`（以及 `404.html`）里 `styles.css?v=…`、`main.js?v=…` 的版本号一起改掉。

## 常见修改

- **加一件标本**：先定它属于哪一类——有合作方或真实使用者放「甲」，可运行的行业系统放「乙」，自己的创意放「丙」。
  在对应 `<section class="kind">` 的 `.cabinet` 里复制一个 `<article class="card">`，截图放进 `public/works/`（960×600 WebP）。
- **藏品号按展示顺序排**：插入新作品后，后面的 `id="no-xx"`、`No. xx`、`Pl. xx` 要整体后移，
  「V 方向」两条链、「III 履历」和「IV 记录」里的 `#no-xx` 互见链接也要一起改。
- **作品 ↔ 经历互见**：卡片里的 `<p class="rel">` 指向经历（`#ev-0612`、`#campus-agents`…），经历里的 `No.xx` 指回作品。
- **加一条活动记录**：在「IV 记录」的 `.events` 里按日期插一行 `<li class="ev">`；获奖加 `ev--award` 和「奖」印，
  组织 / 指导 / 评委加 `ev--lead`。同时更新四处数字：封面标本签、总述四格、记录顶部的计数、`<meta name="description">`。
- **改方向**：「V 方向」左右两列是普通列表；螺旋上的五个方法标签在 `tools/figures.py` 的 `HELIX_RUNGS`。

## 设计约束（改样式前请看）

- **只用系统字体**，不引用 Google Fonts —— 该服务在中国大陆不稳定，可能导致首屏白屏数秒。
- **对比度已实测（WCAG）**：正文与链接用 `--ochre-text #7A4F12`（6.0:1，浅赭底上 5.5:1）；`--ochre #9C6A1E` 只有 4.0:1，
  只用于大字、线条与装饰。石绿旗标 5.2:1，朱砂「奖」印上的奶油字 5.0:1。
  封面与封底的渐变最亮处 `#8C5E1C`，奶油色文字全程 ≥ 5.1:1，再调亮会不达标。
- **朱砂只用于印章**：封面与顶栏的「陈」、库房藏品的「藏」、获奖的「奖」。别把它用成正文颜色。
- **医院名称不出现**：No.01 与 No.02 的截图都已抹去院名，文案只写「县级医院」。重截图时同样处理。
- **研究生院督导管理系统（No.03）涉及校内隐私平台**：只写名称与角色，不放链接、截图或任何细节。
- 竖排姓名用逐字堆叠而不是 `writing-mode`：部分系统字体缺竖排度量，会叠字。
- 没有 JS 时页面完整可读；JS 加载失败时会自动撤掉隐藏状态。尊重「减少动态效果」系统设置，视频从不自动播放。
