# 陈俊烨 Chen Junye · 作品博物志

**A Natural History of Works** —— 个人介绍与作品集。
以智能体为方法，走向生命科学（AI for Life Science）与人文艺术（Humanities & Arts）。

纯静态站点：一个 HTML、一份 CSS、一段可有可无的 JS。没有构建步骤，没有外部依赖。

## 设计

整本页面按一册博物志来编排：

| 部分 | 内容 |
| --- | --- |
| 封面 | **Fig. 1** 程序生成的放射虫形态网络，向 Ernst Haeckel《自然的艺术形态》（1904）致意；标本签代替名片 |
| I 序 | 第一人称简介 |
| II 方向 | **Fig. 2** 双链：石绿为生命科学，赭石为人文艺术，横档是连接二者的方法（智能体、多智能体、数字孪生、RAG、生成式模型） |
| III 标本 | 4 件大图版（No.01 病历智能体是生命科学方向的第一件）+ 8 件标本柜 + 1 件「待入藏」（No.13，留给研究所的工作） |
| IV 履历 · V 记录 · VI 通信 | 教育、项目、教学、人文线索；荣誉与服务；联系方式 |
| 封底 | 版本记录（Colophon） |

颜色取自中国传统矿物颜料：赭石 `#9C6A1E`、石绿 `#3E6B5C`、朱砂 `#B5432B`（只用于印章）。

## 结构

```
public/
  index.html        全部内容（改文案直接改这里）
  styles.css        配色与排版
  main.js           渐进增强：顶栏状态、阅读进度、段落揭示、当前章节、Fig.1 指针视差
  works/*.webp      图版：*-lg.webp 1440×900（大图版），其余 960×600
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

放射虫的形态由随机种子 `1904` 决定，每次生成结果一致。

## 本地预览

```bash
cd public && python3 -m http.server 8000
# 或与线上一致：
docker build -t cjy-natural-history . && docker run --rm -p 8080:8080 cjy-natural-history
```

## 部署（Zeabur）

导入仓库即可，Zeabur 会识别根目录的 `Dockerfile` 自动构建。
CSS / JS 缓存 7 天，改动后请把 `index.html` 里 `styles.css?v=…`、`main.js?v=…` 的版本号一起改掉。

## 常见修改

- **加一件标本**：在「III 标本」的 `.cabinet` 里复制一个 `<article class="card">`，截图放进 `public/works/`（960×600 WebP）。
  生命科学方向的下一件作品完成后，直接替换 `#no-13` 那张「待入藏」卡片。
- **藏品号按展示顺序排**：把新作品插到前面时，后面的 `id="no-xx"`、`No. xx`、`Pl. xx` 要整体后移，
  「II 方向」两条链里的 `#no-xx` 链接也要一起改。
- **改方向**：「II 方向」左右两列是普通列表；螺旋上的五个方法标签在 `tools/figures.py` 的 `HELIX_RUNGS`。

## 设计约束（改样式前请看）

- **只用系统字体**，不引用 Google Fonts —— 该服务在中国大陆不稳定，可能导致首屏白屏数秒。
- **对比度已实测（WCAG）**：正文与链接用 `--ochre-text #7A4F12`（6.0:1）；`--ochre #9C6A1E` 只有 4.0:1，
  只用于大字、线条与装饰。封面与封底的渐变最亮处 `#8C5E1C`，奶油色文字全程 ≥ 5.1:1，再调亮会不达标。
- **No.01 病历智能体不写医院名称**：截图顶部的院名已抹去，文案只写「县级医院」。重截图时同样处理。
- 竖排姓名用逐字堆叠而不是 `writing-mode`：部分系统字体缺竖排度量，会叠字。
- 没有 JS 时页面完整可读；JS 加载失败时会自动撤掉隐藏状态。尊重「减少动态效果」系统设置。
