# xiyouji-dunhuang-motion · 西游记敦煌重彩「三国式场景」动画流水线

用**代码**画敦煌重彩壁画，把《西游记》人物系列做成**一幕一个具名场景**的动画：确定性帧引擎 + 8 部场景版短片 + 逐帧渲染 + 复用配音烧字幕 + 活气 QA + 发布门禁，全部本地完成，不依赖云服务或 AI 绘画。

```
齐天大圣 · 孙悟空      玄奘 · 唐僧          天蓬 · 猪八戒        卷帘 · 沙僧
西海 · 白龙马          观音 · 南海          二郎神 · 灌江        灵山 · 八十一难（收口）
```

## 这是什么

用户原本的西游工程是「中央竖幅立像卷」：固定敦煌地仗 + 满屏立像 + 小前景。本仓库交付的是**场景化改造版**——保留 `20_dunhuang` 敦煌重彩材质（土红地仗 / 石青背光 / 火焰纹 / 藻井团花 / 铁线描），只把幕型重写成三国式：

| 层 | 内容 |
|---|---|
| 一幕 | 一个具名场景（右上竖排榜题 + 事件名 + 钤印），有远中近纵深、群演与事件动作 |
| 人物 | 从「满屏立像」降为「走进场景里的演员」，悟空原 rig 按脚底映射缩到 `s=0.52`，其余角色用「剪影 + 头饰 + 法宝 + 专色」四件套区分 |
| 场景构件 | `xy_scene_common.js`：三层远山 / 殿宇洞府 / 塔桥山门 / 莲台 / 九宫难簿 / 河岸 / 旗幡 / 可倒伏群演 / 火焰尘烟 / 日轮飘带 / 榜题钤印 / 判词卡 |
| 事件动作 | `xy_scene_films.js`：石猴出世 / 水帘洞 / 龙宫 / 大闹天宫 / 炼丹炉 / 五行山 / 揭符 / 取经 / 渡河 / 莲台 / 斗法 / 化马 / 钉耙 / 诵经 / 灵山 等 16 类 |
| 流水线 | 仓库根 `_*.py`：配置生成 / 3 段并发渲染 / 拼接合成 / 活气 QA / 批量收口 |
| 配音 / 发布 | `voice/`：台词轴、`build_voice_remake.py`（edge-tts + ASS 字幕）、`ambience.py`、`prepare_channels_remake.py`（视频号四件套） |

**独立工程**：外部依赖只有 Python + Playwright（Chromium）+ ffmpeg + edge-tts + Node（可选，仅用于语法检查）。

### 为什么仓库里还有 `_v2` 台词轴

8 部场景版**逐字复用**紧凑版的旁白、配音与字幕（30.4s 一字节不改），元数据用 `voice_key` 指向旧配音工作目录。因此 `voice/lines_*_v2.json` 与 `发布元数据_复刻.json` 中旧 8 条条目作为**配音源台词轴与文案来源**保留；**紧凑版的画面代码、段落表与成片已全部移除**，仓库只包含场景版画面链路。这是一次「只重画画面、不动音轨」的改造，不是两个系列并存。

## 系列结构

- 全 8 部统一 **8 幕 × 3.8s = 30.4s**，1920×1080 / 60fps，8 句旁白一句一幕（每句 10~16 字，全片 ≥95 字），转场时长已嵌入 `dur`。
- 分段边界 `0 / 11.4 / 22.8 / 30.4`，3 段并发渲染绕开 Chromium 内存累积。
- 转场白名单：`organic` / `crossfade` / `dotBloom` / `pageTurn`；禁 `radiant` / `lampGlow` / `ripple`。
- 封面人物片 13.30s、收口片 24.70s，一律从 `cover_video` 指向的**同源未烧字幕无声片**抽帧，避免烧录字幕与封面标题叠成双层文字。

### SCENE_LIBS 顺序是隐式依赖，不可换

```
场景版  common → figure → series → actors → scene_common → scene_films   场景 id v1..v8
```

**绝不加载 `xy_tight.js`**——一旦加载就会把中央竖幅海报框带回来。旧紧凑版画面代码不在本仓库内。

## 快速开始

### 1. 环境

```bash
pip install playwright pillow numpy edge-tts
python -m playwright install chromium
# ffmpeg 加入 PATH，或 export FFMPEG_BIN=/path/to/ffmpeg
# 封面字体可用 FONT_BOLD / FONT_KAI 覆盖（默认 Windows 系统字体）
```

### 2. 本地看片（零依赖预览）

```bash
cd engine
python -m http.server 8080
# 浏览器打开 http://127.0.0.1:8080/index.html?film=sunwukong_scene
```

`?film=<key>` 读 `eras_<key>.js`，不加参数默认也是 `sunwukong_scene`。
可用 key：`sunwukong_scene` `tangseng_scene` `bajie_scene` `shaseng_scene`
`bailongma_scene` `guanyin_scene` `erlang_scene` `finale_scene`。

### 3. 渲染 + 配音 + 合成 + QA + 待发箱

```bash
# 8 部 × 3 段 = 24 段并发渲染（约 20~30 分钟，建议后台跑并重定向日志）
python _批量渲染_紧凑版.py --keys sunwukong_scene --workers 3

# 配音：voice_key 指向的工作目录（台词轴逐字复用，--sub-style clear）
python voice/build_voice_remake.py --lines voice/lines_sunwukong_v2.json \
    --eras engine/eras_sunwukong_scene.js --video <任一无声母片.mp4> \
    --outdir _配音_sunwukong_v2 --sub-style clear --no-burn

# 拼接新画面 + 复用 mix.wav / sub.ass 烧字幕
python _合成_场景版.py --key sunwukong_scene
# 活气 QA（幕内 <0.10% 死帧、>32% 跳变）
python _qa_系列.py --key sunwukong_scene
# 视频号四件套
python voice/prepare_channels_remake.py --key sunwukong_scene --force
```

也可一条龙：`python _批量收口_场景版.py --keys sunwukong_scene`（含合成 → QA → 四件套，8 部串行约 16 分钟，**务必后台运行**）。

> `_合成_场景版.py` 会把工作目录切到 `_配音_<voice_key>/`，因为 `subtitles=sub.ass` 用相对文件名；`subtitle` 字段仍指向旧字幕文件，发布门禁据此校验。

### 4. 新增一支片

1. 在 `engine/scenes/xy_scene_films.js` 的 `SPECS` 加 8 幕 spec（每幕 `t` 榜题 / `s` 回目 / `env` 环境组合 / `ev` 事件动作），必要时在 `xy_scene_common.js` 加构件；
2. 复制 `engine/eras_*_scene.js` 改 `SERIES_KEY`，复制 `voice/lines_*_scene.json` 写 8 句旁白；
3. 在 `voice/发布元数据_复刻.json` 加一条 films（含 `voice_key` / `cover_video` / `subtitle`）；
4. 静态契约自检：8 句、每句 10~16 字、`t1` 对齐幕边界、`dur` 之和 = `total = 30.4`、转场名无格式化空格、`SCENE_LIBS` 顺序断言。

`_生成_场景版配置.py` 是当年从紧凑版**一次性派生** 8 部配置的脚本（保留作方法论证据）；当前配置已固化，重跑会重建台词轴与元数据，日常新增片子按上面四步即可。

## 硬契约与已知坑（都踩过）

| 坑 | 解法 |
|---|---|
| 「做成 X 那样有场景」 | 先只读比对**风格 / 幕型 / 工程结构**三层，确认差异层级再决定重画范围；本次是幕型，不是风格 |
| 新旧链路串味 | 另存 `*_scene` key + 独立 `SCENE_LIBS` + `v1..v8`，旧文件一个字节不改 |
| 气氛层被盖 | 火焰 / 尘烟必须在建筑与事件动作**之后**画，先画会被后画的炉身整片盖住 |
| 等高火苗 = 栅栏 | 固定随机高度 + 时间脉动 + 亮金内焰，别排成一列 |
| 满屏立像进场景画出画外 | 按脚底映射 `translate(x,gy) → scale(s) → translate(-960,-980)` |
| 榜题被飘带横穿 | 右上竖排榜题**最后画**；判词卡与钤印按 y 区间排开 |
| 复用配音找不到字幕 | `cwd` 指向旧配音目录，`sub.ass` 用相对文件名 |
| 8 幕封面双层文字 | 字幕占满 3.3~3.6s/幕，无法按 `sub.ass` 反推安全点；改从 `cover_video` 无声母片抽帧 |
| 批量收口「SIGTERM + 空输出」 | 8 部串行约 16 分钟，前台会被超时杀掉；后台运行 + 日志重定向即可，不是脚本失败 |
| 活气中位 8% 目标 | 为「大面积连续运动」校准的软目标；场景版静态山水底实测 2.774~6.741%，按「0 死帧 + 0 跳变 + 可见运动链」判 PASS，不加噪点凑数 |
| `ss(lo,hi,x)` 是 smoothstep 阈值 | 返回 0..1，不是区间插值；要 `[a,b]` 写 `a+(b-a)*ss(0,1,x)` |
| 屏幕空间覆盖层消失 | 帘 / 判词卡 / 结句底必须在 camera `restore()` 之后画，且只 clip 一次 |

## 验收（场景版 8 部）

| 项 | 结果 |
|---|---|
| 分段渲染 | 8 × 3 = **24/24 段**，0 失败（119.3MB） |
| 复用配音 | 8/8 `mix.wav` + `sub.ass`，**64 句零 TTS**、零台词改动 |
| 活气 QA | 每部 76 帧，**8/8 死帧 0 / 跳变 0 / PASS**，中位 2.774~6.741% |
| 待发箱 | 8/8 四件套齐、`gate.passed=true` |
| 封面 | 8 张 1080×1440 目视复核通过，无双层文字 / 黑块 / 缺字 |
| 旧片零回归 | 改造前后旧 8 部 manifest 逐项复核未变 |

逐部数据与全部红线见 `docs/西游记人物选题研究.md` 第九、十、十一节。

## 维护口径（2026-11-12）

源工程已由用户删除并归档，**本仓库是后续修正与新增片的唯一底本**：改 bug、调画面、加第三批都直接改这里，不再从旧工程反向同步。

本副本做过一轮端到端实跑验证（在独立沙箱内进行，不改动交付副本）：源码与源工程逐字节只差换行归一化、配置生成器重跑幂等、`render.py` 渲出真实 mp4、`_qa_系列.py` 用真实成片跑出 PASS；验证中发现并修正的过期口径见 `_脱敏报告_xiyouji-dunhuang-motion.md` 第 5.4 节。所有修正写在构建脚本 `patch()` 中，重跑构建不会回退。

2026-11-12 又完成一次**真实修正**（方法论第十节）：用户人工审片指出三部「分镜与台词、主角不匹配」，直接在本仓库内按台词轴重排 `SPECS` 并新增专用事件动作，重渲 9 段、复用旧音轨零 TTS、QA 与四件套 3/3 全绿，其余 5 部逐像素零回归；产物移出后副本仍为 113 文件，只读校验器 `32/32 ALL PASS`。维护口径由此通过实修验证。

同日继续人工审片，第四部《天蓬·猪八戒·场景版》反馈「形象与配音不匹配」，按同一范式再修一轮（方法论第十一节）：8 幕逐句重排 + 补齐「猪」的正面识别符（扇耳 / 长吻 / 獠牙 / 九齿耙），重渲 3 段、复用旧音轨零 TTS、QA 与四件套全绿，其余 7 部 `t0=13.30s` 帧逐像素零回归。这一次补上了前一轮漏掉的一层——**幕对了不等于形象对了**。

## 目录

```
xiyouji-dunhuang-motion/
├── engine/                       帧引擎（本地起服务打开 index.html 即可预览）
│   ├── index.html                入口：lib 全量加载 → 读 ?film=<key> → 载 eras_<key>.js
│   ├── engine.js / transitions.js / render.py
│   ├── eras_*_scene.js ×8        8 部场景版段落表（v1..v8）
│   ├── lib/                      16 个通用绘制库 + fonts/（48 项，SIL OFL）
│   └── scenes/                   7 个场景层（common / figure / series / actors /
│                                scene_common / scene_films / index）
├── voice/                        配音与发布
│   ├── build_voice_remake.py     edge-tts + ASS 字幕 + 环境音混轨
│   ├── ambience.py               环境音预设
│   ├── prepare_channels_remake.py 视频号四件套与发布门禁
│   ├── lines_*.json ×16          8 份场景版台词轴 + 8 份配音源台词轴
│   └── 发布元数据_复刻.json       16 条（8 场景版 + 8 配音源）
├── docs/
│   └── 西游记人物选题研究.md      十一节方法论（一至八节紧凑版史料，九节场景版改造，十 / 十一节人工审片修正）
├── _qa_系列.py / _合成_场景版.py / _批量渲染_紧凑版.py
├── _批量收口_场景版.py / _生成_场景版配置.py
└── README / LICENSE / NOTICE / .gitignore
```

**成片、封面、字幕、审片帧、渲染分段不在仓库内**（体积与发布用途），需本地自行渲染。元数据的 `video` / `subtitle` / `cover_video` 是渲染产物的**相对路径占位**，流水线运行后会生成对应文件。

## 与姊妹仓库的关系

本仓库与 [sanguo-ink-motion](https://github.com/dabing110/sanguo-ink-motion)（三国水墨）、[shuihu-ink-motion](https://github.com/dabing110/shuihu-ink-motion)（水浒版画）、[piying-shadow-motion](https://github.com/dabing110/piying-shadow-motion)（皮影复刻）、[honglou-nouveau-motion](https://github.com/dabing110/honglou-nouveau-motion)（红楼慕夏新艺术）、[baxian-papercut-motion](https://github.com/dabing110/baxian-papercut-motion)（八仙民俗剪纸）**引擎底座完全同源**，均来自花叔 huashu-art-motion。差异全在内容层的美术语言与剧本：

| 仓库 | 视觉 | 片长 / 幕数 |
|---|---|---|
| 三国 | 干笔 + 平涂 + 描边水墨 | 25s / 6 幕 |
| 水浒 | 焦墨勾线 + 宣纸底 + 钤印版画 | 24.8~33.6s / 6~10 幕 |
| 皮影 | 幕布 + 皮件 + 操杆 | 19.6~30.4s / 4~6 幕 |
| 红楼 | 慕夏新艺术金彩仕女 + 敦煌重彩收口 | 30.4s / 8 幕 |
| 八仙 | 中国民俗套色剪纸 · 一人一专色 | 30.4s / 8 幕 |
| **西游（本仓库）** | **敦煌重彩 · 一幕一具名场景** | **30.4s / 8 幕** |

## 许可

- 代码：MIT（版权 © 2026 dabing110），第三方归属见 `NOTICE`
- 台词、场景代码、剧本与发布文案：原创
- 《西游记》原著与相关民间传说：公共领域
- 字体：各开源字体沿用各自 SIL OFL 1.1（见 `engine/lib/fonts/LICENSES.md`）
- **TTS 服务条款提示**：`voice/build_voice_remake.py` 使用 edge-tts（调用微软 Edge 在线 TTS 服务），使用前请自行确认微软服务条款对你的场景可用。
- 本仓库为《西游记》人物的视觉语言致敬向导读，不主张任何影视改编形象的权利；画面、旁白与配音均为程序化生成 / AI 合成。

## 致谢

**引擎底座来自花叔的 [huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion)**（MIT © 花叔 Huashu）：`engine/engine.js`、`engine/index.html`、`engine/transitions.js` 与 `engine/lib/` 的绘画/动效库均复制自该技能的 `scripts/engine/`，`engine/render.py` 亦源自其渲染器（本仓库仅做 ffmpeg 路径参数化、秒制 `dur` 适配与目录布局调整）。

本仓库的原创部分：8 部片的剧本与台词轴、7 个场景层、8 张段落表、敦煌神魔 rig、三国式场景构件库与事件动作、复用配音的合成链路、活气 QA、发布流水线，以及十一节方法论文档。

幕型思路受三国「一幕一具名场景」影响；视觉语言来自敦煌壁画（土红地仗、石青石绿、铁线描、藻井团花、飞天飘带）的观察，全部画面由本仓库代码程序化绘制。
