#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""环境音配方库（numpy 纯合成，零素材依赖）
=============================================

为什么不用素材库：版权。皮影复刻与 12 部短片若要对外发布，任何第三方
音效素材都有授权风险；纯合成的输出版权自持，可商用。

设计：合成器固定，配方只是参数表。新增一种环境音 = 加一个 RECIPES 条目。

  build_amb('sea', 19.0)  ->  np.ndarray (n, 2) float, 立体声, 峰值 0.x

配方字段
--------
  swell    : 起伏周期（秒）；0 表示不起伏
  layers   : [(噪色, (低频, 高频), 幅度, 声道错开秒), ...]
            噪色 pink=低频厚（远浪/闷响），white=高频薄（泡沫/雨丝/纸屑）
  events   : [(时刻秒, 事件类型, 强度), ...]
  duckable : 是否参与旁白 ducking（默认 True）

事件类型
--------
  crash 宽频冲击（浪拍岸/撞击）   splash 短促水花      bubble 气泡上滑
  thunder 低频闷雷                drip 水滴下潜        tick 连续咔哒（剪刀/机械）
  sizzle 油炸滋滋                 chime 琴音/铃        gong 锣
  wind 长风（自带慢起伏）
"""

import numpy as np

SR = 44100


# ---------------------------------------------------------------- 基础件
def _white(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def _pink(n, seed):
    """白噪 -> 频域 1/sqrt(f) 整形 -> 粉噪。低频厚、无高频毛刺。"""
    x = _white(n, seed)
    sp = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    f[0] = 1.0
    sp = sp / np.sqrt(f)
    sp[0] = 0.0
    out = np.fft.irfft(sp, n)
    return out


def _band(x, lo, hi, width=60):
    """FFT 频域带通（cos 过渡边缘），本机无 scipy 也能用。"""
    n = len(x)
    sp = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    m = np.ones_like(f)
    m[f < max(lo - width, 0)] = 0.0
    m[f > hi + width] = 0.0
    if width > 0:
        i_lo = (f >= max(lo - width, 0)) & (f < lo)
        m[i_lo] = 0.5 - 0.5 * np.cos(np.pi * (f[i_lo] - max(lo - width, 0)) / max(width, 1))
        i_hi = (f > hi) & (f <= hi + width)
        m[i_hi] = 0.5 + 0.5 * np.cos(np.pi * (f[i_hi] - hi) / max(width, 1))
    return np.fft.irfft(sp * m, n)


def _unit(a):
    p = np.abs(a).max()
    return a / (p + 1e-9) if p > 0 else a


def _ar(n, t0, attack, release, sr=SR):
    """attack 线性上升 + release 指数衰减的包络。"""
    t = np.arange(n) / sr - t0
    e = np.zeros(n)
    i = t >= 0
    tt = t[i]
    e[i] = np.clip(tt / max(attack, 1e-6), 0, 1) * np.exp(-tt / max(release, 1e-6))
    return e


def _tone(n, t0, f0, f1, dur, amp, sr=SR):
    """上滑/下潜正弦（气泡、水滴）。"""
    ln = int(dur * sr)
    i0 = int(t0 * sr)
    if i0 + ln > n:
        ln = max(0, n - i0)
    if ln <= 0:
        return np.zeros(n)
    tt = np.arange(ln) / sr
    fr = f0 + (f1 - f0) * (tt / max(dur, 1e-6))
    ph = 2 * np.pi * np.cumsum(fr) / sr
    e = np.exp(-tt / (dur / 3.0))
    out = np.zeros(n)
    out[i0:i0 + ln] = np.sin(ph) * e * amp
    return out


def _swell(n, period, phase=0.0, sr=SR):
    """浪的呼吸：0~1 的慢起伏，指数化让峰值更"顶"。"""
    t = np.arange(n) / sr
    s = 0.5 - 0.5 * np.cos(2 * np.pi * (t / period + phase))
    return s ** 1.6


# ---------------------------------------------------------------- 事件
def _event(n, kind, t0, amp, seed, sr=SR):
    s = seed + int(t0 * 1000) % 997
    if kind == "crash":                       # 浪拍岸：宽频，attack 慢、尾巴长
        x = _band(_white(n, s), 300, 5200, width=700)
        return _unit(x) * _ar(n, t0, 0.09, 0.75) * amp
    if kind == "splash":                      # 水花：高频、极短
        x = _band(_white(n, s), 900, 7200, width=800)
        return _unit(x) * _ar(n, t0, 0.015, 0.26) * amp
    if kind == "bubble":
        return _tone(n, t0, 620, 1520, 0.045, amp, sr)
    if kind == "thunder":
        x = _band(_pink(n, s), 30, 220, width=60)
        return _unit(x) * _ar(n, t0, 0.25, 1.6) * amp
    if kind == "drip":
        return _tone(n, t0, 1400, 700, 0.09, amp, sr)
    if kind == "tick":                            # 剪刀/机械：三连咔哒
        out = np.zeros(n)
        x = _band(_white(n, s), 1800, 6500, width=900)
        for k in range(3):
            out += _unit(x) * _ar(n, t0 + k * 0.13, 0.003, 0.02) * amp
        return out
    if kind == "sizzle":                          # 油炸：1.6s 高频滋滋，带随机抖动
        x = _band(_white(n, s), 3500, 9000, width=900)
        env = _ar(n, t0, 0.06, 0.55) * (0.75 + 0.25 * _swell(n, 0.11))
        return _unit(x) * env * amp
    if kind == "chime":                           # 琴音：基频 + 五度，长衰减
        out = np.zeros(n)
        for f in (523.25, 784.0):
            tt = np.arange(n) / sr
            out += np.sin(2 * np.pi * f * np.clip(tt - t0, 0, None)) * np.exp(-np.clip(tt - t0, 0, None) / 1.6)
        return out * amp * 0.22
    if kind == "gong":                            # 锣：非谐分音 + 长尾
        out = np.zeros(n)
        for f in (180, 267, 411, 538):
            tt = np.arange(n) / sr
            out += np.sin(2 * np.pi * f * np.clip(tt - t0, 0, None)) * np.exp(-np.clip(tt - t0, 0, None) / 2.2)
        return out * amp * 0.16
    if kind == "wind":                         # 长风：自带更慢的次级起伏
        x = _band(_pink(n, s), 120, 900, width=200)
        env = 0.45 + 0.55 * _swell(n, 5.2)
        return _unit(x) * env * amp
    raise ValueError(f"未知事件类型: {kind}")


# ---------------------------------------------------------------- 配方表
RECIPES = {
    # 已验证（《鹬》）
    "sea": dict(
        swell=2.4,
        layers=[("pink", (0, 900), 0.55, 0.0), ("white", (1500, 6500), 0.30, 0.45)],
        events=[(0.6, "crash", 0.35), (4.75, "crash", 1.00), (9.35, "splash", 0.50),
                (14.55, "splash", 0.40)],
    ),
    # 《皮影复刻》：幕布质感 + 锣鼓点 + 皮影关节咔哒
    "paper": dict(
        swell=0.0,
        layers=[("pink", (0, 400), 0.20, 0.0), ("white", (2500, 8000), 0.10, 0.0)],
        events=[(0.3, "gong", 0.9), (5.0, "tick", 0.35), (10.0, "gong", 0.7),
                (15.0, "tick", 0.3), (20.0, "gong", 0.6), (25.0, "tick", 0.3)],
    ),
    # 《回忆积木小屋》：水 + 木屋
    "water": dict(
        swell=3.2,
        layers=[("pink", (0, 500), 0.38, 0.0), ("white", (800, 4200), 0.16, 0.7)],
        events=[(0.5, "splash", 0.35), (5.0, "drip", 0.25), (9.6, "splash", 0.3),
                (14.6, "bubble", 0.2)],
    ),
    # 《包宝宝》/《美味盛宴》：厨房（蒸笼 + 油炸 + 锅铲）
    "kitchen": dict(
        swell=1.8,
        layers=[("pink", (0, 500), 0.28, 0.0), ("white", (2000, 8000), 0.20, 0.3)],
        events=[(0.4, "sizzle", 0.45), (4.9, "tick", 0.30), (9.3, "sizzle", 0.40),
                (14.5, "tick", 0.25)],
    ),
    # 《发之爱》：理发店（剪刀咔嚓 + 吹风机嗡鸣）
    "salon": dict(
        swell=2.6,
        layers=[("white", (400, 3000), 0.16, 0.0), ("pink", (0, 350), 0.22, 0.0)],
        events=[(0.5, "tick", 0.30), (4.9, "tick", 0.35), (9.3, "tick", 0.28),
                (14.5, "tick", 0.32)],
    ),
    # 《失物招领》/《熊的故事》：城市街道与机械
    "city": dict(
        swell=4.0,
        layers=[("pink", (0, 700), 0.36, 0.0), ("white", (300, 3000), 0.14, 0.6)],
        events=[(0.4, "tick", 0.25), (4.9, "tick", 0.30), (9.3, "tick", 0.22),
                (14.5, "chime", 0.30)],
    ),
    # 《战争结束了》：战壕雨 + 闷雷 + 风
    "rain": dict(
        swell=3.5,
        layers=[("white", (600, 9000), 0.40, 0.0), ("pink", (0, 300), 0.32, 0.0)],
        events=[(0.5, "wind", 0.35), (5.0, "thunder", 0.55), (9.5, "drip", 0.3),
                (14.6, "wind", 0.30)],
    ),
    # 《男孩鼹鼠狐狸和马》：雪原旷野长风
    "snow": dict(
        swell=6.0,
        layers=[("white", (200, 1500), 0.26, 0.9), ("pink", (0, 260), 0.18, 0.0)],
        events=[(0.4, "wind", 0.40), (9.4, "wind", 0.30), (14.6, "chime", 0.25)],
    ),
    # 《金陵十二钗·林黛玉·进贾府》：深宅庭院，落花微风 + 门环轻响 + 檐下滴水
    "garden": dict(
        swell=5.5,
        layers=[("pink", (0, 420), 0.20, 0.0), ("white", (700, 4200), 0.10, 0.7)],
        events=[(0.4, "wind", 0.30), (9.4, "chime", 0.24), (14.6, "drip", 0.22),
                (24.8, "chime", 0.20)],
    ),
    # 《薛宝钗·扑蝶》：园中微风 + 蝶翅轻响 + 远处铃音（比 garden 更轻快）
    "breeze": dict(
        swell=4.2,
        layers=[("pink", (0, 460), 0.16, 0.0), ("white", (900, 5200), 0.08, 0.6)],
        events=[(0.4, "wind", 0.24), (4.9, "tick", 0.16), (9.4, "chime", 0.22),
                (14.6, "tick", 0.15), (19.8, "chime", 0.20)],
    ),
    # 《妙玉·栊翠庵》：庵檐滴水 + 远磬 + 极轻的风，全系列最静
    "tea": dict(
        swell=6.5,
        layers=[("pink", (0, 380), 0.14, 0.0), ("white", (1000, 4800), 0.06, 0.8)],
        events=[(0.5, "drip", 0.20), (5.0, "chime", 0.20), (9.6, "drip", 0.18),
                (15.0, "chime", 0.18), (24.8, "wind", 0.16)],
    ),
    # 《贾元春·省亲》：宫磬 + 仪仗风声 + 金铃，最隆重的一支
    "palace": dict(
        swell=5.0,
        layers=[("pink", (0, 520), 0.22, 0.0), ("white", (800, 4600), 0.10, 0.5)],
        events=[(0.4, "gong", 0.55), (5.0, "chime", 0.26), (9.6, "wind", 0.22),
                (15.0, "gong", 0.42), (24.8, "chime", 0.24)],
    ),
    # 《太虚幻境·判词》收口片：空灵磬声 + 长风，不用锣的喜庆感
    "temple": dict(
        swell=7.0,
        layers=[("pink", (0, 400), 0.18, 0.0), ("white", (700, 4200), 0.07, 0.9)],
        events=[(0.4, "gong", 0.38), (5.0, "chime", 0.22), (10.0, "wind", 0.20),
                (15.2, "chime", 0.20), (20.2, "gong", 0.30), (25.4, "chime", 0.18)],
    ),
    # 《无论如何我爱你》/《亲爱的篮球》/《皆为爱》：温馨室内
    "warm": dict(
        swell=5.0,
        layers=[("pink", (0, 600), 0.24, 0.0), ("white", (1200, 5200), 0.08, 0.5)],
        events=[(0.4, "chime", 0.30), (9.4, "chime", 0.28), (14.6, "chime", 0.35)],
    ),
    # ---- 续六钗（2026-11-06 晚）：纯新增预设，既有条目逐字节不动 ----
    # 《贾迎春·紫菱洲》：水榭微风 + 棋子轻落 + 远处更漏
    "chess": dict(
        swell=6.0,
        layers=[("pink", (0, 420), 0.16, 0.0), ("white", (800, 4200), 0.07, 0.7)],
        events=[(0.4, "wind", 0.22), (5.0, "tick", 0.20), (9.4, "tick", 0.18),
                (14.6, "tick", 0.22), (20.2, "chime", 0.16), (25.4, "tick", 0.16)],
    ),
    # 《贾探春·秋爽斋》：书斋静气 + 笔落纸 + 远钟
    "study": dict(
        swell=5.4,
        layers=[("pink", (0, 400), 0.18, 0.0), ("white", (1200, 5000), 0.06, 0.6)],
        events=[(0.4, "tick", 0.20), (5.0, "chime", 0.20), (9.4, "tick", 0.18),
                (15.0, "chime", 0.22), (24.8, "tick", 0.18)],
    ),
    # 《巧姐·纺线》：纺车咔哒 + 田野长风，不用宫磬
    "loom": dict(
        swell=4.6,
        layers=[("pink", (0, 520), 0.20, 0.0), ("white", (700, 3800), 0.09, 0.8)],
        events=[(0.4, "tick", 0.24), (4.9, "tick", 0.22), (9.4, "wind", 0.22),
                (14.6, "tick", 0.24), (19.8, "tick", 0.20), (25.4, "wind", 0.20)],
    ),
    # 《秦可卿·宁府夜》：夜风 + 远磬 + 更漏，全系列最幽
    "night": dict(
        swell=7.2,
        layers=[("pink", (0, 360), 0.15, 0.0), ("white", (600, 3600), 0.06, 0.9)],
        events=[(0.4, "wind", 0.24), (5.0, "chime", 0.18), (10.0, "tick", 0.16),
                (15.2, "chime", 0.20), (20.2, "wind", 0.20), (25.4, "chime", 0.16)],
    ),
}

DEFAULT_AMB = "warm"


def list_amb():
    return sorted(RECIPES)


# ---------------------------------------------------------------- 合成入口
def build_amb(kind, total, seed=2026, sr=SR, events=None, underwater=None):
    """合成一段环境音。

    kind      配方名（见 RECIPES）
    total     时长（秒）
    events    覆盖默认事件表 [(t, 类型, 强度), ...]
    underwater  (起, 止) 秒 —— 该区间整体低通压暗，模拟水下闷音
    """
    if kind not in RECIPES:
        kind = DEFAULT_AMB
    cfg = RECIPES[kind]
    n = int(total * sr)
    t = np.arange(n) / sr
    out = np.zeros(n)

    # 1) 持续层：噪色 + 带通 + 慢起伏，左右声道错开制造宽度
    for i, (noise, (lo, hi), amp, lag) in enumerate(cfg["layers"]):
        x = _pink(n, seed + i * 7) if noise == "pink" else _white(n, seed + i * 7)
        x = _unit(_band(x, lo, hi, width=max(150, int((hi - lo) * 0.25))))
        if cfg["swell"] > 0:
            env = 0.45 + 0.55 * _swell(n, cfg["swell"], phase=lag / max(cfg["swell"], 1e-6))
        else:
            env = np.ones(n)
        out += x * env * amp

    # 2) 事件层：对准画面节拍
    for j, (t0, ev, amp) in enumerate(events if events is not None else cfg["events"]):
        if t0 >= total:
            continue
        if ev == "bubble":
            for k, bt in enumerate([t0, t0 + 0.7, t0 + 1.6, t0 + 2.5, t0 + 3.5]):
                if bt < total:
                    out += _tone(n, bt, 620, 1520, 0.045, amp, sr)
            continue
        out += _event(n, ev, t0, amp, seed + 100 + j * 13, sr)

    # 3) 水下段：低通 + 压暗
    if underwater:
        u0, u1 = int(underwater[0] * sr), int(underwater[1] * sr)
        u0, u1 = max(0, u0), min(n, u1)
        if u1 > u0:
            for ch in range(1):
                seg = out[u0:u1]
                seg = _unit(_band(seg, 0, 450, width=180)) * 0.42
                out[u0:u1] = seg

    # 4) 片头片尾淡入淡出
    fi, fo = int(0.6 * sr), int(1.0 * sr)
    if n > fi + fo:
        w = np.ones(n)
        w[:fi] = np.linspace(0, 1, fi)
        w[-fo:] = np.linspace(1, 0, fo)
        out *= w

    out = _unit(out) * 0.72
    # 立体声：右声道用不同种子的高频层轻微去相关，制造声场宽度
    r = _band(_white(n, seed + 555), 1200, 6000, width=900)
    r = _unit(r) * 0.10 * (0.4 + 0.6 * (_swell(n, cfg["swell"] or 4.0, phase=0.3)))
    return np.stack([out, out * 0.92 + r], axis=1)


if __name__ == "__main__":
    import sys
    k = sys.argv[1] if len(sys.argv) > 1 else "sea"
    a = build_amb(k, 5.0)
    print(k, a.shape, f"峰值 {np.abs(a).max():.2f}")
    print("可用配方:", ", ".join(list_amb()))
