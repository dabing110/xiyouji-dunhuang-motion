#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""西游记 · 敦煌重彩 —— 场景版批量分段渲染
=========================================================================
分段边界必须落在幕边界（3.8s 的整数倍）：
    3 幕 (0~11.4) / 3 幕 (11.4~22.8) / 2 幕 (22.8~30.4)
输出 _渲染分段/<key>_<i>.mp4。

用法：python _批量渲染_紧凑版.py [--keys sunwukong_scene] [--workers 3]
"""
import argparse
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).parent
CODE = ROOT / "engine"
SEG = ROOT / "_渲染分段"
PY = sys.executable
# 场景版 8 部 × 3 段 = 24 段，并发 3；分段边界落在幕边界（见 BOUNDS）。
KEYS = ["sunwukong_scene", "tangseng_scene", "bajie_scene", "shaseng_scene",
        "bailongma_scene", "guanyin_scene", "erlang_scene", "finale_scene"]
BOUNDS = [(0, 11.4), (11.4, 22.8), (22.8, 30.4)]


def job(args):
    k, i, t0, t1 = args
    out = SEG / f"{k}_{i}.mp4"
    cmd = [PY, "render.py", "--film", k, "--from", str(t0), "--to", str(t1),
           "--fps", "60", "--crf", "14", "--out", str(out)]
    r = subprocess.run(cmd, cwd=str(CODE), capture_output=True, text=True,
                       encoding="utf-8", errors="ignore")
    ok = r.returncode == 0 and out.exists() and out.stat().st_size > 100000
    return k, i, ok, (r.stdout or "").strip()[-200:], (r.stderr or "").strip()[-600:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keys", nargs="*", default=KEYS)
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    SEG.mkdir(exist_ok=True)
    jobs = [(k, i, t0, t1) for k in a.keys for i, (t0, t1) in enumerate(BOUNDS, 1)]
    print(f"场景版批量渲染 {len(jobs)} 段 · 并发 {a.workers}", flush=True)
    fail = []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        for k, i, ok, so, se in ex.map(job, jobs):
            print(f"{'OK  ' if ok else 'FAIL'} {k}_{i}  {so[-120:]}", flush=True)
            if not ok:
                print("  stderr:", se[-500:], flush=True)
                fail.append((k, i))
    print("完成 · 失败段：", fail, flush=True)
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
