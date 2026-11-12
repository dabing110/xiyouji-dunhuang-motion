#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""西游记 · 场景版配置生成器（一次性派生工具；当前配置已固化，日常新增片不必重跑）

产出：
  engine/eras_<key>_scene.js × 8   —— 8 幕 v1..v8，一幕一具名场景链路
  voice/lines_<key>_scene.json × 8   —— 复制旧台词轴（不改一句、不改时长）
  voice/发布元数据_复刻.json         —— 追加 8 条 films（旧 8 条原样保留）

设计：画面重画、台词/voice/字幕/30.4s 全部复用；
      subtitle 仍指向旧工作目录的 sub.ass，合成脚本直接复用 mix.wav + sub.ass，
      因此整批不需要重新 TTS（规避 edge-tts 连续 40+ 句的瞬时故障）。
"""
import copy
import io
import json
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
CODE = os.path.join(ROOT, "engine")
VOICE = os.path.join(ROOT, "voice")
META = os.path.join(VOICE, "发布元数据_复刻.json")

# (新场景版 key, 旧紧凑版 key) —— voice_key 决定复用哪个配音工作目录
PAIRS = [
    ("sunwukong_scene", "sunwukong_v2"),
    ("tangseng_scene",  "tangseng_v2"),
    ("bajie_scene",     "bajie_v2"),
    ("shaseng_scene",   "shaseng_v2"),
    ("bailongma_scene", "bailongma_v2"),
    ("guanyin_scene",   "guanyin_v2"),
    ("erlang_scene",    "erlang_v2"),
    ("finale_scene",    "finale"),
]

LIBS = [
    "scenes/xy_common.js",
    "scenes/xy_figure.js",
    "scenes/xy_series.js",
    "scenes/xy_actors.js",
    "scenes/xy_scene_common.js",
    "scenes/xy_scene_films.js",
]
TRANS = ["", "organic", "crossfade", "dotBloom", "pageTurn", "organic", "crossfade", "crossfade"]

ERAS_TPL = """// 西游记 · 场景版《%(name)s》段落表：8 幕 × 3.8s = 30.4s。
// 一幕 = 一个具名场景（榜题 + 环境 + 群演 + 事件动作 + 钤印），仿三国 z*_*.js 幕型。
// 与旧紧凑版完全隔离：只注册 SCENES['v1'..'v8']，不加载 xy_tight.js。
window.SERIES_KEY = '%(key)s';
window.SCENE_LIBS = %(libs)s;
window.ERAS = [
%(eras)s];
"""


def build_eras(key, old_name):
    lines = []
    for i in range(8):
        tr = TRANS[i]
        if tr:
            lines.append("  { id: 'v%d', dur: 3.8, transition: { type: '%s', dur: 0.26 } }%s"
                         % (i + 1, tr, "," if i < 7 else ""))
        else:
            lines.append("  { id: 'v1', dur: 3.8 },")
    libs = "[\n  " + ",\n  ".join("'%s'" % x for x in LIBS) + "\n]"
    return ERAS_TPL % {"name": old_name, "key": key, "libs": libs, "eras": "\n".join(lines)}


def main():
    meta = json.load(io.open(META, encoding="utf-8"))
    films = meta["films"]
    added = []
    for key, old in PAIRS:
        if old not in films:
            raise SystemExit("旧元数据缺失：%s" % old)
        src = films[old]

        # 1) eras
        p = os.path.join(CODE, "eras_%s.js" % key)
        io.open(p, "w", encoding="utf-8").write(build_eras(key, src["name"]))

        # 2) lines（逐字复用，只改 film 标记）
        lp = os.path.join(VOICE, "lines_%s.json" % old)
        lj = json.load(io.open(lp, encoding="utf-8"))
        lj["film"] = key
        lj["note"] = (lj.get("note", "") + " / 场景版复用同一台词轴").strip(" /")
        json.dump(lj, io.open(os.path.join(VOICE, "lines_%s.json" % key), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)

        # 3) 元数据（深拷贝旧条目，只改指向与文案）
        m = copy.deepcopy(src)
        name = src["name"].replace("·紧凑版", "") + "·场景版"
        m["name"] = name
        m["video"] = "成片_有声/%s.mp4" % name
        m["cover_video"] = "成片/%s_无声.mp4" % name
        m["subtitle"] = src["subtitle"]            # 仍指向旧工作目录的 sub.ass
        m["voice_key"] = old                        # 合成脚本据此复用 mix.wav
        m["cover_time"] = 13.30 if key != "finale_scene" else 24.70
        m["cover_note"] = ("v4 场景动作幕（11.4–15.2s）；封面一律从同源未烧字幕无声片抽帧，"
                           "避免烧录字幕与封面标题双层文字")
        m["title"] = src.get("title", name).replace("敦煌动画", "敦煌场景动画")
        m["sub"] = "西游记 · 敦煌重彩 · 场景版"
        m["desc"] = (src.get("desc", "") +
                     "\n\n【场景版】按三国式幕型重绘：每一幕都是一个具名场景，"
                     "有山水殿宇的远中近纵深、群演与事件动作、右上角竖排榜题与钤印；"
                     "人物不再是满屏立像，而是走进场景里的演员。旁白与字幕沿用紧凑版。")
        m["tags"] = list(src.get("tags", [])) + ["#场景动画", "#国风山水"]
        m["spec"] = dict(src.get("spec", {"w": 1920, "h": 1080, "dur": 30.4, "orientation": "横屏"}))
        films[key] = m
        added.append(key)

    json.dump(meta, io.open(META, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("eras:", len(added), "lines:", len(added), "films:", len(films))
    for k in added:
        print("  %-18s name=%s  voice_key=%s" % (k, films[k]["name"], films[k]["voice_key"]))
    print("旧条目数:", len(films) - len(added), "（应仍为 8）")


if __name__ == "__main__":
    main()
