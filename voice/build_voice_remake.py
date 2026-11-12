#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""动画复刻专用：旁白配音 + 环境音层 + 字幕烧录（可插拔 TTS 后端）
=====================================================================

相对水浒工程 build_voice_hq.py 的差异（2026-10-31 复刻工程）：

  后端
   1. 双后端且都零成本：edge-tts（Neural 音色，联网，默认）/ winrt（离线兜底）
      —— 本机只有 Huihui/Yaoyao/Kangkang 三个 V110 老音色，故默认走 edge-tts
   2. 音色与语速由 lines json 的 voice/rate 决定，命令行可覆盖

  环境音（复刻片此前完全无声，这是补齐"粒度感"的主手段）
   3. ambience.py 参数化配方库，当前 9 种：
      sea / rain / snow / water / kitchen / salon / city / warm / paper
   4. 旁白 ducking：旁白出现时环境音压低（30ms attack / 400ms release），
      Hann 卷积实现，不用 ffmpeg sidechaincompress（更可控）
   5. --underwater 指定水下闷音段（低通 450Hz + 压暗），如《鹬》第三幕
   6. --eras 传 eras_<key>.js：自动校验 lines 的 t0/t1 与幕表累计时长一致，
      不一致则以幕表为准（无人值守时的自动兜底）

  继承 hq 版的成熟机制（注释不重复）：
   逐句 RMS 归一 0.16 / 气口 250ms / 软限幅 -1dBFS / atempo 压拍（≤+30% P0 红线）
   / 字幕提前 120ms / 字号自适应 / 句内句号剥除 / 覆盖写轨 +faststart

用法
----
  python build_voice_remake.py --lines lines_<key>.json \
      --eras ../engine/eras_<key>.js \
      --video ../成片/<片名>.mp4 --outdir ../_配音_<key> \
      --final ../审片/<片名>_带旁白.mp4
"""

import argparse
import asyncio
import io
import json
import os
import shutil
import re
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ambience

FF = os.environ.get("FFMPEG_BIN") or shutil.which("ffmpeg") or "ffmpeg"
PY = sys.executable
SR = 44100

WINRT_VOICE = r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_KangkangM"
EDGE_VOICE = "zh-CN-XiaoxiaoNeural"
LANG = "zh-CN"

# 字幕样式：KaiTi，米白底框（&H50B8DCEE，BGR 序），描边 2 + 投影 1，底部安全区 MarginV 60
ASS_STYLE = (
    "Style: 字幕,KaiTi,58,&H00141414,&H00141414,&H50B8DCEE,&H00000000,"
    "1,0,0,0,100,100,1,0,3,4,0,2,60,60,60,1"
)
# 重做版清晰字幕：纸白大字 + 深棕 75% 不透明底衬 + 深墨描边，底部安全区抬高到 86px
ASS_STYLE_CLEAR = (
    "Style: 字幕,KaiTi,72,&H00E6F0F6,&H00E6F0F6,&H000A142A,&H400A142A,"
    "1,0,0,0,100,100,1,0,3,5,0,2,80,80,86,1"
)

RMS_TARGET = 0.16        # 逐句 RMS 目标
PEAK_CEIL = 0.89         # -1dBFS
LEAD = 0.12              # 语音起点 = 幕首 + 0.12s
GAP = 0.25               # 句间气口
SUB_LEAD = 0.12          # 字幕比语音提前 120ms
MAX_TEMPO = 1.30         # P0 红线：atempo 不得超过 +30%

AMB_GAIN = 0.55
DUCK = 0.30


# ---------------------------------------------------------------- TTS
async def _edge_async(voice, text, out_mp3, rate):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=rate)
    await c.save(out_mp3)
    return os.path.getsize(out_mp3)


def strip_wav_header(data):
    if data[:4] != b"RIFF":
        return data
    i = data.find(b"data")
    if i < 0 or i > 1024:
        return data
    return data[i + 8:]


async def _winrt_async(voice_id, text, raw_path, rate):
    from winrt.windows.media.speechsynthesis import SpeechSynthesizer
    from winrt.windows.storage.streams import Buffer, InputStreamOptions

    s = SpeechSynthesizer()
    for v in SpeechSynthesizer.all_voices:
        if v.id == voice_id:
            s.voice = v
            break

    esc = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    ssml = (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="%s">'
        '<voice name="%s"><prosody rate="%s">%s</prosody></voice></speak>'
    ) % (LANG, voice_id, rate, esc)
    st = await s.synthesize_ssml_to_stream_async(ssml)
    buf = Buffer(st.size)
    ib = await st.read_async(buf, buf.capacity, InputStreamOptions.READ_AHEAD)
    data = strip_wav_header(bytes(memoryview(ib)))
    with open(raw_path, "wb") as f:
        f.write(data)
    return len(data)


def synth_one(text, raw_path, backend, voice, rate):
    subprocess.run(
        [PY, os.path.abspath(__file__), "--worker", "--backend", backend,
         "--voice", voice, "--text", text, "--raw", raw_path, "--rate", rate],
        check=True, timeout=180,
    )


# ---------------------------------------------------------------- 音频工具
def load_wav(p):
    with wave.open(p, "rb") as w:
        n, ch, fr = w.getnframes(), w.getnchannels(), w.getframerate()
        raw = w.readframes(n)
    x = np.frombuffer(raw, dtype=np.int16).astype(np.int32)
    mono = (x[0::2] + x[1::2]) // 2 if ch == 2 else x
    return mono.astype(np.int16), fr


def trim_tail(samples, fr, thr=300, pad=0.10):
    nz = np.where(np.abs(samples.astype(np.int32)) > thr)[0]
    if len(nz):
        samples = samples[: min(len(samples), nz[-1] + int(pad * fr))]
    return samples


def resample(samples, fr, target=SR):
    if fr == target:
        return samples
    n = int(len(samples) * target / fr)
    idx = np.linspace(0, len(samples) - 1, n)
    return np.interp(idx, np.arange(len(samples)), samples.astype(np.float64)).astype(np.int16)


def to_stereo(samples):
    st = np.zeros((len(samples), 2), dtype=np.int16)
    st[:, 0] = samples
    st[:, 1] = samples
    return st


def polish(samples, sr=SR):
    if not len(samples):
        return samples
    x = samples.astype(np.float64)
    x -= x.mean()
    n_in, n_out = int(0.006 * sr), int(0.010 * sr)
    if len(x) > n_in + n_out:
        x[:n_in] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n_in))
        x[-n_out:] *= 0.5 - 0.5 * np.cos(np.linspace(np.pi, 0, n_out))
    return np.clip(x, -32768, 32767).astype(np.int16)


def norm_rms(samples, target=RMS_TARGET, ceil=PEAK_CEIL):
    if not len(samples):
        return samples
    x = samples.astype(np.float64)
    rms = float(np.sqrt((x ** 2).mean()))
    if rms < 1e-6:
        return samples
    g = min(target * 32767 / rms, 4.0)
    x = x * g
    peak = float(np.abs(x).max())
    if peak > ceil * 32767:
        x = x * (ceil * 32767 / peak)
    return np.clip(x, -32768, 32767).astype(np.int16)


def write_wav(p, arr, sr=SR):
    with wave.open(p, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(arr.tobytes())


def ts(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def sub_fs(text, style="classic"):
    t = text.rstrip("。")
    n = len(re.sub(r"[，。：、？！]", "", t))
    if style == "clear":
        return (72 if n <= 10 else (66 if n <= 14 else 60)), t
    return (58 if n <= 10 else (50 if n <= 14 else 44)), t


def duck_envelope(n, spans, sr=SR):
    """旁白区间 -> 环境音压低曲线（Hann 卷积实现软 attack/release）。"""
    m = np.ones(n)
    for s, e in spans:
        i0, i1 = int(s * sr), int(e * sr)
        m[max(i0 - int(0.03 * sr), 0):min(i1 + int(0.40 * sr), n)] = DUCK
    w = int(0.12 * sr)
    if w > 3:
        k = np.hanning(w)
        k /= k.sum()
        m = np.convolve(m, k, mode="same")
    return m[:, None]


def parse_eras(path):
    """eras_<key>.js -> [(id, dur), ...]；转场时长已嵌入 dur，不额外叠加。"""
    txt = io.open(path, encoding="utf-8").read()
    out = []
    for m in re.finditer(r"\{[^}]*id:\s*'([^']+)'[^}]*?\}", txt):
        d = re.search(r"dur:\s*([\d.]+)", m.group(0))
        if d:
            out.append((m.group(1), float(d.group(1))))
    return out


# ---------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser(description="动画复刻：旁白 + 环境音 + 字幕")
    ap.add_argument("--lines")
    ap.add_argument("--video")
    ap.add_argument("--outdir")
    ap.add_argument("--final")
    ap.add_argument("--eras", help="eras_<key>.js 路径，用于自动校验时间轴")
    ap.add_argument("--backend", default="edge", choices=["edge", "winrt"])
    ap.add_argument("--voice", default=None)
    ap.add_argument("--rate", default=None)
    ap.add_argument("--amb", default="auto",
                    help="环境音配方：auto | none | " + "|".join(ambience.list_amb()))
    ap.add_argument("--amb-gain", type=float, default=AMB_GAIN)
    ap.add_argument("--sub-style", choices=["classic", "clear"], default="classic",
                    help="clear = 纸白大字 + 深棕底衬（重做版），classic = 米白小字底框（其余 11 部）")
    ap.add_argument("--underwater", default=None, help="水下闷音段 起,止（秒），如 9.05,14.15")
    ap.add_argument("--amb-events", default=None, help="覆盖事件表：'秒:类型:强度' 逗号分隔")
    ap.add_argument("--no-burn", action="store_true")
    ap.add_argument("--worker", action="store_true")
    ap.add_argument("--text")
    ap.add_argument("--raw")
    a = ap.parse_args()

    if a.worker:
        if a.backend == "edge":
            mp3 = a.raw + ".mp3"
            asyncio.run(_edge_async(a.voice, a.text, mp3, a.rate))
            subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3,
                            "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", a.raw], check=True)
            os.remove(mp3)
        else:
            asyncio.run(_winrt_async(a.voice, a.text, a.raw, a.rate))
        return

    for k, v in (("--lines", a.lines), ("--video", a.video), ("--outdir", a.outdir)):
        if not v:
            ap.error(f"缺少 {k}")

    cfg = json.load(open(a.lines, encoding="utf-8"))
    video = os.path.abspath(a.video)
    outdir = os.path.abspath(a.outdir)
    os.makedirs(outdir, exist_ok=True)
    final = os.path.abspath(a.final) if a.final else None

    backend = a.backend
    voice = a.voice or cfg.get("voice") or (EDGE_VOICE if backend == "edge" else WINRT_VOICE)
    rate = a.rate or cfg.get("rate") or "+0%"

    total = float(cfg.get("total") or 0)
    if total <= 0:
        r = subprocess.run([FF, "-i", video], capture_output=True, text=True,
                           encoding="utf-8", errors="ignore")
        m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr or "")
        total = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))

    lines = [l for l in cfg["lines"] if l.get("text")]

    # ---- 幕表校验（以 eras 为准） ----
    if a.eras and os.path.exists(a.eras):
        eras = parse_eras(a.eras)
        acc, bounds = 0.0, []
        for eid, d in eras:
            bounds.append((eid, acc, acc + d))
            acc += d
        if abs(acc - total) > 0.05:
            print(f"  ⚠️ 幕表累计 {acc:.2f}s ≠ 片长 {total:.2f}s", flush=True)
        if len(bounds) != len(lines):
            print(f"  ⚠️ 幕数不匹配：eras {len(bounds)} 幕 vs lines {len(lines)} 句", flush=True)
        for i, ln in enumerate(lines):
            if i < len(bounds):
                _, b0, b1 = bounds[i]
                if abs(float(ln.get("t0", -1)) - b0) > 0.05 or abs(float(ln.get("t1", -1)) - b1) > 0.05:
                    print(f"  ⚠️ {ln.get('id')} 时间轴不符，以 eras 为准", flush=True)
                    ln["t0"], ln["t1"] = round(b0, 2), round(b1, 2)
        print(f"  幕表校验：{len(bounds)} 幕 · 累计 {acc:.2f}s", flush=True)

    print(f"{cfg.get('film','')} · 片长 {total:.2f}s · 后端 {backend} · {voice}（rate {rate}）· {len(lines)} 幕", flush=True)

    track = np.zeros((int(total * SR), 2), dtype=np.int16)
    sched, subs, spans = [], [], []
    prev_end = 0

    def _stretch(seg, target_len):
        tempo = len(seg) / float(target_len)
        if abs(tempo - 1.0) <= 0.03:
            return seg, 1.0
        if tempo > MAX_TEMPO:
            print(f"    ⚠️ 需要 tempo={tempo:.2f}，超 P0 红线 +30%，截断到 1.30 —— 请改短文案", flush=True)
            tempo = MAX_TEMPO
        ti, to = os.path.join(outdir, "_st_in.wav"), os.path.join(outdir, "_st_out.wav")
        write_wav(ti, to_stereo(seg))
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", ti,
                        "-af", f"atempo={tempo:.4f}", to], check=True)
        s2, _ = load_wav(to)
        return s2, tempo

    for i, ln in enumerate(lines):
        t0, t1 = float(ln.get("t0", 0)), float(ln.get("t1", total))
        lead = float(ln.get("lead", LEAD))
        budget = (t1 - t0) - lead - GAP - 0.08

        raw = os.path.join(outdir, f"line_{i}.wav")
        synth_one(ln["text"], raw, backend, voice, rate)
        seg, fr = load_wav(raw)
        seg = norm_rms(polish(resample(trim_tail(seg, fr), fr)))

        desired = int((t0 + lead) * SR)
        start = max(desired, prev_end)
        next_t0 = float(lines[i + 1].get("t0", total)) if i + 1 < len(lines) else total
        allowed_end = min(int(next_t0 * SR) - int(GAP * SR), len(track))
        max_dur = max(allowed_end - start, int(0.5 * SR))
        tempo = 1.0
        if len(seg) > max_dur:
            seg, tempo = _stretch(seg, max_dur)
        seg = to_stereo(seg)

        end = min(start + len(seg), len(track))
        track[start:end] = seg[: end - start]
        d = len(seg) / SR
        prev_end = end
        spans.append((start / SR, start / SR + d))

        n_chars = len(re.sub(r"[，。：、？！\s]", "", ln["text"]))
        flag = "" if d <= budget else "  ⚠️ 超预算"
        print(f"  {ln.get('id','L'+str(i)):>12} {d:5.2f}s / 预算 {budget:4.2f}s  "
              f"@{start/SR:6.2f}s  {n_chars}字 {n_chars/max(d,1e-6):4.1f}字/s  tempo={tempo:.2f}{flag}", flush=True)

        sched.append(dict(id=ln.get("id", f"L{i}"), text=ln["text"].rstrip("。"),
                          t0=t0, t1=t1, start=start / SR, dur=d, tempo=tempo))

    vp = os.path.join(outdir, "voice.wav")
    write_wav(vp, track)
    print(f"配音轨 -> {vp} ({len(track)/SR:.2f}s)", flush=True)

    # ---------------- 环境音 + ducking + 混音 ----------------
    amb_kind = a.amb
    if amb_kind == "auto":
        amb_kind = cfg.get("amb", "none")
    mix_path = os.path.join(outdir, "mix.wav")

    if amb_kind in ("none", "off") or amb_kind not in ambience.list_amb():
        mix = track.astype(np.float64)
        print(f"环境音 -> 关闭（{amb_kind}）", flush=True)
    else:
        uw = None
        if a.underwater:
            try:
                u0, u1 = [float(x) for x in a.underwater.split(",")]
                uw = (u0, u1)
            except ValueError:
                print(f"  ⚠️ --underwater 格式不对，忽略：{a.underwater}", flush=True)
        ev = None
        if a.amb_events:
            try:
                ev = []
                for p in a.amb_events.split(","):
                    p1, p2, p3 = p.split(":")
                    ev.append((float(p1), p2, float(p3)))
            except Exception:
                print("  ⚠️ --amb-events 格式不对，忽略", flush=True)
                ev = None
        amb = ambience.build_amb(amb_kind, total, events=ev, underwater=uw) * a.amb_gain
        amb *= duck_envelope(len(amb), spans)
        mix = track.astype(np.float64) + amb * 32767.0
        print(f"环境音 -> {amb_kind}（ducking {DUCK} · 总线 {a.amb_gain} · 水下段 {uw}）", flush=True)

    mix = np.clip(mix, -32767, 32767).astype(np.int16)
    write_wav(mix_path, mix)
    print(f"混音轨 -> {mix_path}（峰值 {np.abs(mix).max()/32767:.2f}）", flush=True)

    # ---------------- 字幕 ----------------
    for s in sched:
        sub_start = max(0.0, s["start"] - SUB_LEAD)
        e = min(s["start"] + s["dur"] + 0.15, s["t1"])
        fs, clean = sub_fs(s["text"], a.sub_style)
        fad = r"\fad(150,150)" if a.sub_style == "clear" else ""
        subs.append(f"Dialogue: 0,{ts(sub_start)},{ts(e)},字幕,,0,0,0,,{{\\fs{fs}{fad}}}{clean}")

    ass = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
""" + (ASS_STYLE_CLEAR if a.sub_style == "clear" else ASS_STYLE) + """

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(subs) + "\n"

    apath = os.path.join(outdir, "sub.ass")
    with open(apath, "w", encoding="utf-8-sig") as f:
        f.write(ass)
    json.dump(sched, open(os.path.join(outdir, "sched.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"字幕 -> {apath}（{len(subs)} 条）", flush=True)

    if a.no_burn or not final:
        print("（--no-burn：跳过烧录）", flush=True)
        return

    os.makedirs(os.path.dirname(final), exist_ok=True)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", video, "-i", mix_path,
                    "-vf", f"subtitles={os.path.basename(apath)}",
                    "-af", "alimiter=limit=0.89",
                    "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                    "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", final],
                   cwd=outdir, check=True)
    print(f"终版 -> {final}", flush=True)


if __name__ == "__main__":
    main()
