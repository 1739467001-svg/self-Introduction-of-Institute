# 陈俊烨 Chen Junye · 个人主页

学术风个人主页与作品集。土黄（赭石）+ 羊皮纸配色，纯静态，零依赖、零 JS。

## 结构

```
public/
  index.html      全部内容都在这一个文件里（改文案直接改这里）
  styles.css      配色与排版
  works/*.webp    11 个项目截图（960×600，16:10）
  og.png          社交分享卡片 1200×630
  favicon.svg
  404.html
Dockerfile               nginx 静态托管，Zeabur 自动识别
default.conf.template    nginx 配置（gzip / 缓存 / nosniff / 监听 $PORT）
```

## 本地预览

```bash
cd public && python3 -m http.server 8000
# 或与线上一致：
docker build -t cjy-homepage . && docker run --rm -p 8080:8080 cjy-homepage
```

## 部署（Zeabur）

导入仓库即可，Zeabur 会识别根目录的 `Dockerfile` 自动构建。

## 常见修改

- **加 / 改项目**：在 `index.html` 的「02 项目」里复制一个 `<li class="work">`，
  截图放进 `public/works/`（建议 960×600 的 WebP）。编号由 CSS 计数器自动生成，不用手写。
- **换头像**：题头左侧目前是「陈」字方印。换成照片时，把 `.hero__mark` 里的 `<span>` 换成 `<img>`。

## 设计约束（改样式前请看）

- **只用系统字体**，不引用 Google Fonts —— 该服务在中国大陆不稳定，可能导致首屏白屏数秒。
- **对比度已实测**：正文、链接、小字只用 `--ochre-deep #7A4F12`（羊皮纸上 6.2:1）。
  `--ochre #9C6A1E` 仅 4.1:1，只能用于大字、边框和装饰；`--ochre-light` 仅 2.4:1，纯装饰。
- 题头渐变收在 `#5E3D0E → #8C5E1C`，奶油色文字全程 ≥ 5.1:1；再调亮会不达标。
