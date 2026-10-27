#!/usr/bin/env python3
"""
生成站点里的两张程序图，并原地注入 public/index.html：

  Fig. 1  放射虫形态网络 —— 致敬 Ernst Haeckel《自然的艺术形态》(1904)。
          骨架是一张图：节点与连线既像硅藻壳，也像神经网络。
  Fig. 2  DNA 双链 —— 石绿链 = 生命科学，赭石链 = 人文艺术，横档 = 连接二者的方法。

同一份几何也用来画分享卡 public/og.png。

运行（仓库根目录）：python3 tools/figures.py
随机种子固定为 1904，结果可复现。
"""
import math, os, random, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "public", "index.html")

def f(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s

def circ(x, y, r):
    """把圆写成一段 path，便于同类元素合并成单个 <path>。"""
    return f"M{f(x - r)},{f(y)}a{f(r)},{f(r)} 0 1,0 {f(2 * r)},0a{f(r)},{f(r)} 0 1,0 {f(-2 * r)},0"

# ===================================================================== Fig. 1
def specimen_geometry():
    rnd = random.Random(1904)
    R = [26, 58, 96, 140, 186, 226]
    N = [6, 12, 18, 24, 30, 36]
    rings = []
    for k, (r, n) in enumerate(zip(R, N)):
        off = (math.pi / n) if k % 2 else 0.0
        nodes = []
        for i in range(n):
            a = off + 2 * math.pi * i / n - math.pi / 2
            rr = r * (1 + rnd.uniform(-0.012, 0.012))
            nodes.append((rr * math.cos(a), rr * math.sin(a), a, rr))
        rings.append(nodes)

    G = {"ring": [], "link": [], "pore": [], "spine": [], "node": [], "core": [], "pulse": []}

    # 每一圈：相邻节点间以略向外鼓的二次曲线相连（细胞膜般的弧度）
    for k, nodes in enumerate(rings):
        n = len(nodes)
        for i in range(n):
            x0, y0, a0, r0 = nodes[i]
            x1, y1, a1, r1 = nodes[(i + 1) % n]
            am = a0 + (2 * math.pi / n) / 2
            rm = (r0 + r1) / 2 * (1 + 0.035 + 0.01 * k)
            G["ring"].append(("q", (x0, y0), (rm * math.cos(am), rm * math.sin(am)), (x1, y1)))

    # 圈与圈之间：外圈每个节点连向内圈最近的两个节点，织成三角网格
    def angdist(a, b):
        d = (a - b) % (2 * math.pi)
        return min(d, 2 * math.pi - d)
    for k in range(len(rings) - 1):
        inner, outer = rings[k], rings[k + 1]
        for (x, y, a, _) in outer:
            near = sorted(inner, key=lambda p: angdist(p[2], a))[:2]
            for (xi, yi, _, _) in near:
                G["link"].append(("l", (x, y), (xi, yi)))

    # 孔：两圈之间、外圈相邻节点的角平分线上
    for k in range(1, len(rings) - 1):
        r_in, r_out = R[k], R[k + 1]
        outer = rings[k + 1]
        n = len(outer)
        for i in range(n):
            a = outer[i][2] + math.pi / n
            rr = (r_in + r_out) / 2
            gap = min(r_out - r_in, 2 * math.pi * rr / n)
            G["pore"].append(("c", (rr * math.cos(a), rr * math.sin(a)), gap * 0.2))

    # 棘：最外圈长短交替，长棘末端分叉，每第六根挂一颗终端小球
    outer = rings[-1]
    for i, (x, y, a, r) in enumerate(outer):
        L = 36 if i % 2 == 0 else 17
        ex, ey = (r + L) * math.cos(a), (r + L) * math.sin(a)
        G["spine"].append(("l", (x, y), (ex, ey)))
        if i % 2 == 0:
            for s in (-1, 1):
                b = a + s * 0.42
                G["spine"].append(("l", (ex, ey), (ex + 9 * math.cos(b), ey + 9 * math.sin(b))))
            if i % 6 == 0:
                G["core"].append(("c", ((r + L + 6) * math.cos(a), (r + L + 6) * math.sin(a)), 2.4))

    # 核
    G["core"] += [("c", (0, 0), 9), ("co", (0, 0), 15)]
    for (x, y, a, r) in rings[0]:
        G["link"].append(("l", (15 * math.cos(a), 15 * math.sin(a)), (x, y)))

    # 节点；挑几颗做「呼吸」
    sizes = [1.6, 1.7, 1.8, 1.9, 2.0, 2.2]
    pulse_ids = {(2, 3), (3, 7), (3, 19), (4, 4), (4, 17), (5, 9), (5, 26), (1, 8)}
    for k, nodes in enumerate(rings):
        for i, (x, y, _, _) in enumerate(nodes):
            if (k, i) in pulse_ids:
                G["pulse"].append(("c", (x, y), 2.8))
            else:
                G["node"].append(("c", (x, y), sizes[k]))
    return G

def specimen_svg():
    G = specimen_geometry()
    def path(items):
        out = []
        for it in items:
            if it[0] == "l":
                (a, b) = it[1], it[2]
                out.append(f"M{f(a[0])},{f(a[1])}L{f(b[0])},{f(b[1])}")
            elif it[0] == "q":
                (a, c, b) = it[1], it[2], it[3]
                out.append(f"M{f(a[0])},{f(a[1])}Q{f(c[0])},{f(c[1])} {f(b[0])},{f(b[1])}")
            elif it[0] in ("c", "co"):
                out.append(circ(it[1][0], it[1][1], it[2]))
        return "".join(out)

    # 显微镜目镜刻度环
    ticks = []
    for d in range(0, 360, 5):
        a = math.radians(d)
        r0, r1 = 286, (274 if d % 30 == 0 else 281)
        ticks.append(f"M{f(r0*math.cos(a))},{f(r0*math.sin(a))}L{f(r1*math.cos(a))},{f(r1*math.sin(a))}")
    cross = "".join(f"M{f(292*math.cos(a))},{f(292*math.sin(a))}L{f(306*math.cos(a))},{f(306*math.sin(a))}"
                    for a in (0, math.pi/2, math.pi, 3*math.pi/2))

    core_fill = [it for it in G["core"] if it[0] == "c"]
    core_line = [it for it in G["core"] if it[0] == "co"]
    pulses = "".join(
        f'<circle class="pulse" style="animation-delay:{i*0.6:.1f}s" cx="{f(it[1][0])}" cy="{f(it[1][1])}" r="{f(it[2])}"/>'
        for i, it in enumerate(G["pulse"]))

    return (
        '<svg class="specimen__svg" viewBox="-310 -310 620 620" role="img" '
        'aria-label="程序生成的放射虫形态：同心圆环上的节点相互连接，外缘伸出分叉的棘">'
        '<g class="reticle" fill="none" stroke="currentColor">'
        '<circle r="286" stroke-width=".7" stroke-opacity=".5"/>'
        '<circle r="268" stroke-width=".6" stroke-opacity=".28" stroke-dasharray="2 7"/>'
        f'<path d="{"".join(ticks)}" stroke-width=".7" stroke-opacity=".55"/>'
        f'<path d="{cross}" stroke-width="1" stroke-opacity=".8"/>'
        '</g>'
        '<g class="spec">'
        f'<path d="{path(G["link"])}" fill="none" stroke="currentColor" stroke-width=".6" stroke-opacity=".42"/>'
        f'<path d="{path(G["ring"])}" fill="none" stroke="currentColor" stroke-width=".95" stroke-opacity=".78"/>'
        f'<path d="{path(G["pore"])}" fill="none" stroke="currentColor" stroke-width=".6" stroke-opacity=".5"/>'
        f'<path d="{path(G["spine"])}" fill="none" stroke="currentColor" stroke-width=".85" stroke-opacity=".7" stroke-linecap="round"/>'
        f'<path d="{path(core_line)}" fill="none" stroke="currentColor" stroke-width=".9" stroke-opacity=".8"/>'
        f'<path d="{path(core_fill)}" fill="currentColor" fill-opacity=".9"/>'
        f'<path d="{path(G["node"])}" fill="currentColor" fill-opacity=".85"/>'
        f'<g class="pulses" fill="currentColor">{pulses}</g>'
        '</g></svg>'
    )

# ===================================================================== Fig. 2
HELIX_RUNGS = ["智能体 Agents", "多智能体 Multi-agent", "数字孪生 Digital Twins",
               "检索增强 RAG", "生成式模型 GenAI"]

def helix_svg(band=False):
    """竖版用于桌面（带方法标签）；band=True 为窄屏横向条带，不带文字。"""
    if band:
        D, A, P, u0, span = 120, 44, 256, 10, 640
        pt = lambda u, v: (u, v)
    else:
        D, A, P, u0, span = 260, 86, 256, 10, 640
        pt = lambda u, v: (v, u)
    c = D / 2
    va = lambda u: c + A * math.sin(2 * math.pi * (u - u0) / P)
    vb = lambda u: c - A * math.sin(2 * math.pi * (u - u0) / P)
    xy = lambda u, v: "{},{}".format(*map(f, pt(u, v)))
    def pts(fn, ua, ub, step=4):
        us, u = [], ua
        while u < ub:
            us.append(u); u += step
        us.append(ub)
        return "M" + "L".join(xy(u, fn(u)) for u in us)
    mains = [u0 + P / 4 + j * P / 2 for j in range(len(HELIX_RUNGS))]

    parts = []
    # 细横档（碱基对），略过交叉点附近与带标签的横档
    for u in range(u0 + 8, u0 + span, 16):
        s = abs(math.sin(2 * math.pi * (u - u0) / P))
        if s < 0.3 or any(abs(u - m) < 10 for m in mains):
            continue
        parts.append(f'<path class="rung" d="M{xy(u, va(u))}L{xy(u, vb(u))}"/>')
    # 方法横档
    for u in mains:
        parts.append(f'<path class="rung rung--main" d="M{xy(u, va(u))}L{xy(u, vb(u))}"/>')
        for v in (va(u), vb(u)):
            x, y = pt(u, v)
            parts.append(f'<circle class="rung-dot" cx="{f(x)}" cy="{f(y)}" r="3.4"/>')

    # 两条链：按交叉点分段，前后交替，前方的一段加纸色描边形成遮挡
    segs = [(u0 + i * P / 2, u0 + (i + 1) * P / 2) for i in range(int(span / (P / 2)))]
    back, front = [], []
    for i, (ua, ub) in enumerate(segs):
        la, lb = pts(va, ua, ub), pts(vb, ua, ub)
        d = f"--d:{i*0.18:.2f}s"
        if i % 2 == 0:
            front.append((la, "life", d)); back.append((lb, "arts", d))
        else:
            front.append((lb, "arts", d)); back.append((la, "life", d))
    for (dd, cls, d) in back:
        parts.append(f'<path class="hx hx--{cls} is-back" style="{d}" pathLength="1" d="{dd}"/>')
    for (dd, cls, d) in front:
        parts.append(f'<path class="halo" d="{dd}"/>')
        parts.append(f'<path class="hx hx--{cls}" style="{d}" pathLength="1" d="{dd}"/>')

    if not band:
        for label, u in zip(HELIX_RUNGS, mains):
            parts.append(f'<text class="rung-label" x="{f(c)}" y="{f(u + 3.8)}">{label}</text>')

    L = u0 * 2 + span
    w, h = (L, D) if band else (D, L)
    return (f'<svg class="helix__svg" viewBox="0 0 {w} {h}" aria-hidden="true">'
            + "".join(parts) + "</svg>")

# ===================================================================== OG card
def og_png(out):
    from PIL import Image, ImageDraw, ImageFont
    S = 2
    W, H = 1200 * S, 630 * S
    img = Image.new("RGB", (W, H))
    a, b = (0x4E, 0x32, 0x0B), (0x8C, 0x5E, 0x1C)
    px = img.load()
    for y in range(H):
        for x in range(0, W, 2):
            t = min(1, max(0, (x / W) * .7 + (y / H) * .3))
            c = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
            px[x, y] = c
            if x + 1 < W: px[x + 1, y] = c
    d = ImageDraw.Draw(img, "RGBA")
    cream = (251, 243, 226)

    # 标本：复用同一份几何
    cx, cy, sc = 860 * S, 315 * S, 1.02 * S
    T = lambda p: (cx + p[0] * sc, cy + p[1] * sc)
    G = specimen_geometry()
    def draw(items, alpha, width, fill=False):
        col = cream + (alpha,)
        for it in items:
            if it[0] == "l":
                d.line([T(it[1]), T(it[2])], fill=col, width=width)
            elif it[0] == "q":
                p0, c, p1 = it[1], it[2], it[3]
                pts = [T(((1-t)**2*p0[0] + 2*(1-t)*t*c[0] + t*t*p1[0],
                          (1-t)**2*p0[1] + 2*(1-t)*t*c[1] + t*t*p1[1])) for t in [i/8 for i in range(9)]]
                d.line(pts, fill=col, width=width)
            elif it[0] in ("c", "co"):
                (x, y), r = T(it[1]), it[2] * sc
                if fill and it[0] == "c":
                    d.ellipse([x - r, y - r, x + r, y + r], fill=col)
                else:
                    d.ellipse([x - r, y - r, x + r, y + r], outline=col, width=width)
    d.ellipse([cx - 286*sc, cy - 286*sc, cx + 286*sc, cy + 286*sc], outline=cream + (110,), width=S)
    for deg in range(0, 360, 5):
        an = math.radians(deg); r1 = 274 if deg % 30 == 0 else 281
        d.line([(cx + 286*sc*math.cos(an), cy + 286*sc*math.sin(an)),
                (cx + r1*sc*math.cos(an), cy + r1*sc*math.sin(an))], fill=cream + (130,), width=S)
    draw(G["link"], 95, S); draw(G["ring"], 190, S + 1); draw(G["pore"], 120, S)
    draw(G["spine"], 170, S + 1); draw(G["core"], 220, S, fill=True)
    draw(G["node"], 220, S, fill=True); draw(G["pulse"], 245, S, fill=True)

    CJK = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
    LAT = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
    if not os.path.exists(LAT): LAT = CJK
    F = lambda p, s: ImageFont.truetype(p, s * S)
    x0 = 92 * S
    d.text((x0, 96 * S), "A NATURAL HISTORY OF WORKS", font=F(LAT, 20), fill=cream + (210,))
    d.text((x0, 168 * S), "陈俊烨", font=F(CJK, 104), fill=cream)
    d.text((x0, 300 * S), "CHEN  JUNYE", font=F(LAT, 26), fill=cream + (225,))
    d.line([(x0, 352 * S), (x0 + 120 * S, 352 * S)], fill=cream, width=2 * S)
    d.text((x0, 384 * S), "以智能体为方法，", font=F(CJK, 34), fill=cream)
    d.text((x0, 432 * S), "走向生命科学与人文艺术。", font=F(CJK, 34), fill=cream)
    d.text((x0, 520 * S), "杭州医学研究所 · 浙江工商大学", font=F(CJK, 20), fill=cream + (215,))

    img = img.resize((1200, 630), Image.LANCZOS)
    # 256 色抖动量化：渐变不出色带，体积约为真彩的一半
    img.quantize(256, dither=Image.Dither.FLOYDSTEINBERG).save(out, "PNG", optimize=True)
    print("wrote", out, os.path.getsize(out) // 1024, "KB")

# ===================================================================== inject
def inject(html, key, svg):
    pat = re.compile(rf"(<!--{key}:start-->).*?(<!--{key}:end-->)", re.S)
    if not pat.search(html):
        sys.exit(f"marker <!--{key}:start--> not found in index.html")
    return pat.sub(lambda m: m.group(1) + svg + m.group(2), html)

if __name__ == "__main__":
    with open(INDEX, encoding="utf-8") as fh:
        html = fh.read()
    sp, hx, band = specimen_svg(), helix_svg(), helix_svg(band=True)
    html = inject(html, "specimen", sp)
    html = inject(html, "helix", hx)
    html = inject(html, "helixband", band)
    with open(INDEX, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"specimen {len(sp)//1024} KB · helix {len(hx)//1024} KB · band {len(band)//1024} KB → injected into public/index.html")
    if "--og" in sys.argv:
        og_png(os.path.join(ROOT, "public", "og.png"))
