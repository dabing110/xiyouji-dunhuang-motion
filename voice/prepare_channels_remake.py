#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""西游记·敦煌重彩人物 · 视频号待发箱打包器（对标三国/水浒/红楼/皮影工程 prepare_channels.py）
=========================================================================

产物（每人一个目录）
-------------------
    _视频号待发箱/<日期>-<片名>/
        <片名>_带旁白.mp4   成片副本
        封面.jpg            1080x1440（9:16），含标题与「AI 生成」角标
        发布文案.md          标题/描述/话题 + 视频号助手上传步骤
        manifest.json       结构化信息 + 发布门禁结论

发布门禁（gate）
---------------
    voice    : 成片必须含音轨
    subtitle : 必须存在 sub.ass
    issues   : 逐条记录问题；任一失败则 passed=false，目录仍产出但标红

用法
----
    python prepare_channels_remake.py --key piper
    python prepare_channels_remake.py --all
    python prepare_channels_remake.py --key piper --cover-time 2.0 --force
"""

import argparse
import io
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
META = os.path.join(HERE, "发布元数据_复刻.json")
OUT_ROOT = os.path.join(ROOT, "_视频号待发箱")

FFMPEG = os.environ.get("FFMPEG_BIN") or shutil.which("ffmpeg") or "ffmpeg"
FONT_BOLD = os.environ.get("FONT_BOLD") or os.path.join(os.environ.get("SystemRoot", ""), "Fonts", "msyhbd.ttc")
FONT_KAI = os.environ.get("FONT_KAI") or os.path.join(os.environ.get("SystemRoot", ""), "Fonts", "simkai.ttf")

COVER_W, COVER_H = 1080, 1440


# ---------------------------------------------------------------- 工具
def probe(path):
    """本机无 ffprobe，用 ffmpeg -i 的输出抓规格。"""
    r = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True,
                       encoding="utf-8", errors="ignore")
    txt = r.stderr or ""
    w = h = None
    dur = None
    for line in txt.splitlines():
        s = line.strip()
        if s.startswith("Stream") and "Video:" in s:
            for seg in s.split(","):
                tk = seg.strip()
                if "x" in tk and tk.split("x")[0].isdigit():
                    try:
                        w, h = [int(x) for x in tk.split(" ")[0].split("x")]
                    except ValueError:
                        pass
                    break
        if s.startswith("Duration:"):
            try:
                hh, mm, ss = s.split("Duration:")[1].split(",")[0].strip().split(":")
                dur = int(hh) * 3600 + int(mm) * 60 + float(ss)
            except (ValueError, IndexError):
                pass
    return {"w": w, "h": h, "dur": dur, "audio": "Audio:" in txt}


def grab_frame(video, t, out):
    """抽单帧。本机 ffmpeg 抽单帧必须加 -update 1，否则写成序列。"""
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.3f}",
                    "-i", video, "-frames:v", "1", "-update", "1", out],
                   capture_output=True)
    return os.path.exists(out)


def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def fit_font(draw, text, font_path, size, max_w):
    while size > 24:
        f = load_font(font_path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return load_font(font_path, size)


def text_with_shadow(draw, xy, text, font, fill, shadow, off=3):
    x, y = xy
    draw.text((x + off, y + off), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)


def make_cover(frame_path, out_path, title, sub):
    im = Image.open(frame_path).convert("RGB")
    iw, ih = im.size

    # 背景：原帧铺满 + 高斯模糊 + 压暗（横屏片在 9:16 下不留黑边）
    bg = im.resize((COVER_W, COVER_H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(36))
    bg = bg.point(lambda p: int(p * 0.72))

    # 前景：等比 fit 居中，一个像素都不裁
    scale = min(COVER_W / iw, COVER_H / ih)
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    fg = im.resize((nw, nh), Image.LANCZOS)
    canvas = bg.copy()
    canvas.paste(fg, ((COVER_W - nw) // 2, (COVER_H - nh) // 2))

    # 底部渐变黑幕，保证标题压得住
    band = 560
    arr = np.zeros((COVER_H, COVER_W), dtype=np.uint8)
    arr[COVER_H - band:, :] = np.linspace(0, 225, band).astype(np.uint8)[:, None]
    ov = Image.new("RGBA", (COVER_W, COVER_H), (0, 0, 0, 0))
    ov.putalpha(Image.fromarray(arr))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), ov).convert("RGB")

    d = ImageDraw.Draw(canvas)
    pad = 80
    max_w = COVER_W - pad * 2

    f1 = fit_font(d, title, FONT_KAI, 82, max_w)
    w1 = d.textlength(title, font=f1)
    y1 = COVER_H - 300
    text_with_shadow(d, ((COVER_W - w1) / 2, y1), title, f1, "#FFF6E8", (0, 0, 0), off=4)

    f2 = fit_font(d, sub, FONT_BOLD, 38, max_w)
    w2 = d.textlength(sub, font=f2)
    text_with_shadow(d, ((COVER_W - w2) / 2, y1 + 108), sub, f2, "#FFD9A0", (0, 0, 0), off=2)

    # 「AI 生成」角标（AI 内容标识合规）
    f3 = load_font(FONT_BOLD, 26)
    tag = "AI 生成"
    tw = d.textlength(tag, font=f3)
    bx0, by0 = COVER_W - 40 - tw - 26, 40
    d.rounded_rectangle([bx0, by0, bx0 + tw + 26, by0 + 46], radius=10,
                        fill=(255, 255, 255, 210))
    d.text((bx0 + 13, by0 + 8), tag, font=f3, fill=(26, 26, 26))

    canvas.save(out_path, "JPEG", quality=92)
    return out_path


UPLOAD_STEPS = """## 上传步骤（视频号助手 PC 端，约 30 秒）

1. 浏览器打开 <https://channels.weixin.qq.com/> ，微信扫码登录
2. 【内容管理】→【发表视频】→ 上传本目录下的成片 mp4
3. 封面选【自定义上传】→ 用本目录下的 `封面.jpg`（1080×1440 已做好）
4. 把上面的标题、描述、话题分别粘贴进对应输入框
5. 点【发表】旁边的下拉 →【定时发表】→ 选未来 7 天内的时间
   （官方原生能力，设好之后到点自动发，无需值守）
6. 若要改期：视频号助手【内容管理】→ 找到"等待发表"→ 取消发表 → 回到草稿箱重设

## 注意事项

- 描述里已注明 AI 生成身份，封面右下角有「AI 生成」角标，符合平台标识要求
- 同一账号短时间内连续发多条容易触发风控，建议每部之间间隔
- 本批为《西游记》人物的敦煌重彩视觉语言「致敬/导读」向内容，全代码绘制，不主张任何影视改编形象权利
"""


# ---------------------------------------------------------------- 打包
def build(cfg, key, cover_time=None, force=False):
    meta = cfg["films"][key]
    name = meta["name"]
    src = os.path.join(ROOT, meta["video"].replace("/", os.sep))
    # 封面帧优先从「未烧字幕的无声片」抽：8 幕紧凑版字幕占满 3.3~3.6s/幕，
    # 幕间空隙只有 0.2~0.5s 且叠着转场，按 sub.ass 反推也找不到安全点。
    # 用同源无声片可从根上杜绝「烧录字幕 + 封面标题」双层文字（红楼红线 12 的等效解法）。
    cover_src = os.path.join(ROOT, meta.get("cover_video", meta["video"]).replace("/", os.sep))
    if not os.path.exists(cover_src):
        cover_src = src
    issues = []

    if not os.path.exists(src):
        print(f"  [失败] {key}: 找不到成片 {src}")
        return None

    info = probe(src)
    size_mb = os.path.getsize(src) / 1024 / 1024

    # ---- 发布门禁 ----
    voice_ok = bool(info["audio"])
    sub_path = os.path.join(ROOT, meta.get("subtitle", "").replace("/", os.sep))
    sub_ok = bool(meta.get("subtitle")) and os.path.exists(sub_path)
    if not voice_ok:
        issues.append("成片无音轨（配音未烧录）")
    if not sub_ok:
        issues.append("缺少字幕文件 sub.ass")
    if info["dur"] and abs(info["dur"] - float(meta.get("spec", {}).get("dur", 0))) > 0.3:
        issues.append(f"时长与元数据不符：实测 {info['dur']:.2f}s")
    passed = not issues

    stamp = datetime.now().strftime("%Y-%m-%d")
    folder = os.path.join(OUT_ROOT, f"{stamp}-{name}".replace(":", "、"))
    if os.path.isdir(folder) and not force:
        print(f"  [跳过] {key}: 待发箱已存在（加 --force 覆盖） → {folder}")
        return folder
    os.makedirs(folder, exist_ok=True)

    # ---- 成片副本 ----
    vname = name + ".mp4"
    shutil.copy2(src, os.path.join(folder, vname))

    # ---- 封面 ----
    t = cover_time if cover_time is not None else float(meta.get("cover_time", 1.5))
    tmp = os.path.join(folder, "_frame.png")
    if not grab_frame(cover_src, t, tmp):
        issues.append(f"封面帧抽取失败 @{t}s")
    else:
        make_cover(tmp, os.path.join(folder, "封面.jpg"),
                   meta.get("title", name), meta.get("sub", ""))
    if os.path.exists(tmp):
        os.remove(tmp)

    # ---- 文案 ----
    tags = meta.get("tags", [])
    tagline = " ".join(tags)
    warn = "" if passed else "\n> ⚠️ 门禁未通过：" + "；".join(issues) + "\n"
    md = f"""# {meta.get('title', name)}

> 待发箱打包时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}　　规格：{info['w']}x{info['h']} · {'横屏' if info['w'] > info['h'] else '竖屏'} · {info['dur']:.2f}s · {size_mb:.1f}MB
> 封面帧取自 {t:.2f}s（{meta.get('cover_note', '')}）
> {'✅ 配音 + 字幕齐全，符合流水线规范' if passed else '❌ 门禁未通过'}{warn}

## 标题（复制这段）

{meta.get('title', name)}

## 描述 / 正文（复制这段）

{meta.get('desc', '').strip()}

{tagline}

{UPLOAD_STEPS}"""
    io.open(os.path.join(folder, "发布文案.md"), "w", encoding="utf-8").write(md)

    # ---- manifest ----
    spec = dict(w=info["w"], h=info["h"], dur=round(info["dur"] or 0, 2),
             size_mb=round(size_mb, 2),
             orientation="横屏" if info["w"] > info["h"] else "竖屏")
    man = dict(key=key, name=name, title=meta.get("title", name),
               sub=meta.get("sub", ""), desc=meta.get("desc", ""),
               tags=tags, video=vname, cover="封面.jpg", cover_time=t,
               cover_source=os.path.basename(cover_src),
               cover_note=meta.get("cover_note", ""),
               spec=spec,
               warnings=(["横屏片，视频号竖屏展示会上下留黑边（封面已做模糊填充）"]
                         if (info["w"] or 0) > (info["h"] or 0) else []),
               gate=dict(voice=voice_ok, subtitle=sub_ok, issues=issues, passed=passed),
               source=meta.get("video", ""),
               created=datetime.now().isoformat(timespec="seconds"),
               status="pending_upload" if passed else "gate_failed",
               publish_hint="视频号无开放发布 API；人工上传后勾【定时发表】实现定时全自动")
    json.dump(man, io.open(os.path.join(folder, "manifest.json"), "w", encoding="utf-8"),
             ensure_ascii=False, indent=1)

    mark = "✅" if passed else "❌"
    print(f"  {mark} {key:<12} {name:<16} {spec['dur']:5.2f}s {size_mb:5.1f}MB  封面@{t:.2f}s"
          + ("" if passed else "  " + "；".join(issues)), flush=True)
    return folder


def main():
    ap = argparse.ArgumentParser(description="西游记·敦煌重彩人物 · 视频号待发箱打包")
    ap.add_argument("--key")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--cover-time", type=float)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--meta", default=META)
    a = ap.parse_args()

    cfg = json.load(io.open(a.meta, encoding="utf-8"))
    keys = list(cfg["films"]) if a.all else ([a.key] if a.key else [])
    if not keys:
        ap.error("需要 --key <key> 或 --all")

    print(f"待发箱打包 · {len(keys)} 部 · 输出 {OUT_ROOT}", flush=True)
    okn = 0
    for k in keys:
        f = build(cfg, k, cover_time=a.cover_time, force=a.force)
        if f:
            okn += 1
    print(f"完成 {okn}/{len(keys)}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
