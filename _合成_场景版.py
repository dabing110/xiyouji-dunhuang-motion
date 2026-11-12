#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""西游记 · 场景版合成器（不重新 TTS）

    _渲染分段/<key>_1..3.mp4  →  concat  →  成片/<名>_无声.mp4
                              →  复用 _配音_<voice_key>/mix.wav + sub.ass
                              →  成片_有声/<名>.mp4

与旧 _合成_系列.py 的唯一差别：配音 / 环境音 / 字幕轴全部沿用旧紧凑版工作目录，
只把新画面混轨烧字幕。这样 8 部场景版完全不触发 edge-tts，也不改一句台词。

用法：python _合成_场景版.py --key sunwukong_scene
"""
import argparse
import io
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
FF = os.environ.get("FFMPEG_BIN") or "ffmpeg"
META = os.path.join(ROOT, "voice", "发布元数据_复刻.json")
SEG = os.path.join(ROOT, "_渲染分段")
SILENT_DIR = os.path.join(ROOT, "成片")
FINAL_DIR = os.path.join(ROOT, "成片_有声")


def run(cmd, tag, cwd=ROOT):
    print("\n###", tag, flush=True)
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                       encoding="utf-8", errors="ignore")
    print("\n".join((r.stdout or "").strip().splitlines()[-18:]), flush=True)
    if r.returncode != 0:
        print("STDERR:", (r.stderr or "")[-1200:], flush=True)
        raise SystemExit(f"{tag} 失败 rc={r.returncode}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    a = ap.parse_args()
    meta = json.load(io.open(META, encoding="utf-8"))["films"][a.key]
    name = meta["name"]
    voice_key = meta.get("voice_key", a.key.replace("_scene", "_v2"))
    wd = os.path.join(ROOT, "_配音_%s" % voice_key)
    mix = os.path.join(wd, "mix.wav")
    ass = os.path.join(wd, "sub.ass")
    if not (os.path.exists(mix) and os.path.exists(ass)):
        raise SystemExit(f"复用配音缺失：{mix} / {ass}")

    segs = [os.path.join(SEG, f"{a.key}_{i}.mp4") for i in (1, 2, 3)]
    for p in segs:
        if not os.path.exists(p) or os.path.getsize(p) < 100000:
            raise SystemExit(f"分段未完成或异常：{p}")
    os.makedirs(SILENT_DIR, exist_ok=True)
    os.makedirs(FINAL_DIR, exist_ok=True)

    lst = os.path.join(SEG, f"list_{a.key}.txt")
    with io.open(lst, "w", encoding="utf-8") as f:
        for p in segs:
            f.write("file '" + p.replace("\\", "/") + "'\n")
    silent = os.path.join(SILENT_DIR, f"{name}_无声.mp4")
    run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", lst, "-c", "copy", "-movflags", "+faststart", silent], "拼接三段")

    final = os.path.join(ROOT, meta["video"])
    os.makedirs(os.path.dirname(final), exist_ok=True)
    # cwd 必须是旧配音目录：subtitles=sub.ass 用相对文件名，与 build_voice_remake.py 一致
    run([FF, "-y", "-loglevel", "error", "-i", silent, "-i", mix,
         "-vf", "subtitles=sub.ass",
         "-af", "alimiter=limit=0.89",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "192k", "-shortest",
         "-movflags", "+faststart", final], "复用配音 / 烧录字幕", cwd=wd)

    r = subprocess.run([FF, "-i", final], capture_output=True, text=True,
                       encoding="utf-8", errors="ignore")
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr or "")
    dur = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0
    print(f"\n=== 完成：{final}  时长 {dur:.2f}s  "
          f"{os.path.getsize(final)/1024/1024:.1f}MB（配音复用 {voice_key}）", flush=True)


if __name__ == "__main__":
    main()
