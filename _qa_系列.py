#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""西游记 · 敦煌重彩 —— 系列通用活气 QA
=========================================================================
每 0.4s 抽一帧，算相邻帧「灰度差 >8 的像素占比」。
判据沿用系列红线：幕内 <0.10% 死帧、>32% 跳变；转场边界 ±0.6/0.7s 豁免。
幕边界直接取 lines_<key>.json 的 t1（合成时已与 eras 逐幕对齐校验过）。

用法：python _qa_系列.py --key sunwukong_scene
"""
import argparse
import io
import json
import os
import subprocess
import time

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
FF = os.environ.get("FFMPEG_BIN") or "ffmpeg"
META = os.path.join(ROOT, "voice", "发布元数据_复刻.json")
TH_DEAD, TH_JUMP = 0.0010, 0.32


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    a = ap.parse_args()
    meta = json.load(io.open(META, encoding="utf-8"))["films"][a.key]
    src = os.path.join(ROOT, meta["video"])
    lines_path = os.path.join(ROOT, "voice", f"lines_{a.key}.json")
    lines = json.load(io.open(lines_path, encoding="utf-8"))["lines"]
    bounds = [float(l["t1"]) for l in lines[:-1]]
    if not os.path.exists(src):
        raise SystemExit(f"找不到成片 {src}")

    # 不整目录删旧抽帧（本机安全策略拦截 >50 文件批量删除），每次写独立时间戳目录
    tmp = os.path.join(ROOT, "_审片", time.strftime("qa_%Y%m%d_%H%M%S") + f"_{os.getpid()}")
    os.makedirs(tmp, exist_ok=True)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-vf", "fps=2.5",
                    os.path.join(tmp, "f_%04d.png")], check=True)
    files = sorted(f for f in os.listdir(tmp) if f.endswith(".png"))

    def in_tr(t):
        return any(b - 0.6 <= t <= b + 0.7 for b in bounds)

    prev, ratios, dead, jump = None, [], [], []
    for i, fn in enumerate(files):
        im = np.asarray(Image.open(os.path.join(tmp, fn)).convert("L"), dtype=np.float32)
        t = i * 0.4
        if prev is not None:
            frac = float((np.abs(im - prev) > 8).mean())
            ratios.append(frac)
            if not in_tr(t):
                if frac < TH_DEAD:
                    dead.append((round(t - 0.4, 2), t, frac))
                elif frac > TH_JUMP:
                    jump.append((round(t - 0.4, 2), t, frac))
        prev = im
    body = [f for i, f in enumerate(ratios) if not in_tr((i + 1) * 0.4)]
    print(f"\n=== {meta['name']} · {len(files)} 帧 · 幕边界 {bounds} ===")
    if body:
        print(f"幕内活气占比：最小 {min(body)*100:.3f}%  "
              f"中位 {sorted(body)[len(body)//2]*100:.3f}%  最大 {max(body)*100:.3f}%")
    print(f"死帧嫌疑 {len(dead)} 处 {dead[:6]}；跳变嫌疑 {len(jump)} 处 {jump[:6]}")
    ok = not dead and not jump and bool(body)
    print("QA 结论:", "PASS" if ok else "需人工复核")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
