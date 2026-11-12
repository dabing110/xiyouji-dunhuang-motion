// 西游记 · 敦煌重彩 —— 系列共享模板（window.XY_SERIES）
// ---------------------------------------------------------------------------
// 结构对齐红楼 H.SERIES：舞台参数 / 镜头表 / 运动层 / 演员包装 / 通用道具。
// 但演员不复用仕女 drawLady，一律走 xy_figure.js 的 drawWukong（神魔 rig）。
// 加载顺序是隐式依赖（场景版）：xy_common → xy_figure → xy_series → xy_actors →
// xy_scene_common → xy_scene_films；本文件消费 window.XY 与 window.XY_FIGURE，
// 下游场景层消费本文件导出。紧凑版 xy_tight.js 不在本仓库内。
//
// 红线 01：同一 rig 换 pose 只能做样张；正式 8 幕必须叠加 tilt + 子镜头 + 推近 + 幕专属前景。
// 红线 02：深色赭块上的线一律用纸白 / 金色；竖向元素止于 y≈610，不横跨人物头顶。
(() => {
  const H = window.XY, FIG = window.XY_FIGURE;
  if (!H || !FIG) {
    window.__bootErrors = (window.__bootErrors || []).concat(
      ['xy_series.js: 缺 xy_common.js 或 xy_figure.js（SCENE_LIBS 顺序须为 common → figure → series → tight）']);
    return;
  }
  const { F, poly, ell, dot, ribbon, floret, htext, vtext, pmod, ss, clamp, lerp } = H;
  const P = H.PAL.dunhuang;
  const BOX = H.BOX, CX = H.CX, GY = H.GY, TAU = Math.PI * 2;
  const PAPER = P.paper, GOLD = P.gold, GOLDD = P.goldDk, GOLDHI = P.goldHi;
  const INK = P.ink, RED = P.robe, REDDK = P.robeDk, REDHI = P.robeHi;
  const BLUE = P.shawl, BLUEDK = P.shawlDk, ORANGE = P.flower;
  const ACT = 3.8;

  // ---------------------------------------------------------------- 片子配置
  // 第二批六位（SERIES_KEY 带 _v2 后缀，与 eras / lines / 元数据保持一致）。
  // 新增人物：此处加一条 + xy_actors.js 里加 rig + FORES 八幕前景即可，公共层不动。
  const FILMS = {
    sunwukong: {
      name: '齐天大圣', title: '西天取经路',
      v1: '灵根育孕源流出', v2: '心性修持大道生',
      seal: ['悟', '空'], sealCol: RED,
      ending: '斗战胜佛', caption: '西游记 · 齐天大圣',
    },
    tangseng_v2: {
      name: '玄奘法师', title: '西天取经路',
      v1: '江流儿出金山寺', v2: '一袭袈裟向西行',
      seal: ['玄', '奘'], sealCol: RED,
      ending: '旃檀功德佛', caption: '西游记 · 玄奘法师',
    },
    bajie_v2: {
      name: '天蓬八戒', title: '西天取经路',
      v1: '天蓬贬入凡尘间', v2: '九齿钉耙挑一路',
      seal: ['悟', '能'], sealCol: RED,
      ending: '净坛使者', caption: '西游记 · 天蓬八戒',
    },
    shaseng_v2: {
      name: '卷帘沙僧', title: '西天取经路',
      v1: '卷帘碎盏谪流沙', v2: '默默挑担到灵山',
      seal: ['悟', '净'], sealCol: RED,
      ending: '金身罗汉', caption: '西游记 · 卷帘沙僧',
    },
    bailongma_v2: {
      name: '西海白龙', title: '西天取经路',
      v1: '西海三子化白马', v2: '驮经踏过鹰愁涧',
      seal: ['玉', '龙'], sealCol: RED,
      ending: '八部天龙', caption: '西游记 · 西海白龙',
    },
    guanyin_v2: {
      name: '南海观音', title: '西天取经路',
      v1: '潮音洞前柳枝青', v2: '寻得取经一行人',
      seal: ['观', '音'], sealCol: RED,
      ending: '南海观世音', caption: '西游记 · 南海观音',
    },
    erlang_v2: {
      name: '灌江二郎', title: '西天取经路',
      v1: '灌江口开第三眼', v2: '七十二变逢对手',
      seal: ['二', '郎'], sealCol: RED,
      ending: '显圣真君', caption: '西游记 · 灌江二郎',
    },
  };
  function cfg() { return FILMS[window.SERIES_KEY || 'sunwukong'] || FILMS.sunwukong; }

  function clipBox(c) {
    c.beginPath();
    c.rect(BOX.x0 + 12, BOX.y0 + 12, BOX.x1 - BOX.x0 - 24, BOX.y1 - BOX.y0 - 24);
    c.clip();
  }

  function stageOpt(n) {
    const f = cfg();
    return {
      pal: P, bgKey: 'xy_dunhuang', sideInk: '#f7ecd2',
      title: f.title, name: f.name,
      verdict: f.v1, verdict2: f.v2,
      seal: f.seal, sealCol: f.sealCol,
      label: false, hideVerdict: n >= 7,
    };
  }

  // ---------------------------------------------------------------- 镜头
  // z 在幕内连续变化（不是硬切）；只作用于演员层，舞台 / 侧栏 / 画框 / 文字固定在屏幕坐标系。
  const CAM = [
    { z: 1.00, dx: 0,   dy: 0 },      // ① 缘起：全景（仙石，不画人）
    { z: 1.05, dx: -18, dy: 0 },      // ② 掀帘
    { z: 1.07, dx: 0,   dy: -14 },    // ③ 显影
    { z: 1.11, dx: 26,  dy: 8 },      // ④ 主动作
    { z: 1.20, dx: 62,  dy: -54 },    // ⑤ 转折：推到山 / 压帖
    { z: 1.17, dx: -46, dy: -34 },    // ⑥ 内心：推到侧脸 / 揭帖
    { z: 1.00, dx: -60, dy: 0 },      // ⑦ 判词：人物左移，给右侧难簿卡片让位（首轮卡片压肩）
    { z: 1.04, dx: 0,   dy: 0 },      // ⑧ 收印
  ];
  function camOf(n, lt, t) {
    const q = CAM[n - 1], u = ss(0, 1, clamp(lt / ACT));
    return {
      z: 1 + (q.z - 1) * (0.35 + 0.65 * u) + 0.018 * Math.sin(t * 1.15),
      dx: q.dx * u + Math.sin(t * 0.62) * 9,
      dy: q.dy * u + Math.cos(t * 0.78) * 7,
    };
  }

  // ---------------------------------------------------------------- 运动层
  // 天花：26 片四瓣花（样张 dust 的加强版），正模取余循环，负数不会滑出画面。
  function particles(c, t, count) {
    const n = count || 22;
    for (let i = 0; i < n; i++) {
      const x = BOX.x0 + 40 + pmod(i * 151 + t * (40 + (i % 4) * 15), BOX.x1 - BOX.x0 - 80);
      const y = BOX.y0 + 30 + pmod(i * 211 + t * (58 + (i % 3) * 21), BOX.y1 - BOX.y0 - 60);
      c.save(); c.translate(x, y); c.rotate(t * 0.8 + i);
      floret(c, 0, 0, 7 + (i % 3) * 3, i % 3 ? PAPER : GOLDHI, GOLD, 5, t + i);
      c.restore();
    }
  }

  // 画在 camera 之外 = 镜头前的飘花与扫光，不随推近放大，避免糊脸。
  // 22 枚大前景粒子比幕内天花大一倍、快一倍，是活气中位 ≥8% 的主来源。
  function motion(c, t, k) {
    c.save(); clipBox(c);
    const x = pmod(t * 260, 1600) - 400;
    const lg = c.createLinearGradient(x, 0, x + 280, 0);
    lg.addColorStop(0, 'rgba(255,244,206,0)');
    lg.addColorStop(0.5, `rgba(255,244,206,${0.17 * k})`);
    lg.addColorStop(1, 'rgba(255,244,206,0)');
    c.fillStyle = lg;
    c.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
    for (let i = 0; i < 22; i++) {
      const px = BOX.x0 + 40 + pmod(i * 137 + t * (95 + (i % 5) * 26), BOX.x1 - BOX.x0 - 80);
      const py = BOX.y0 + 20 + pmod(i * 211 + t * (52 + (i % 4) * 19), BOX.y1 - BOX.y0 - 40);
      c.save(); c.translate(px, py); c.rotate(t * 1.5 + i);
      const r = 9 + (i % 4) * 3.5;
      if (i % 3 === 0)
        F(c, poly([[-r, 0], [0, -r * 1.4], [r, 0], [0, r * 1.4]]), GOLDHI, GOLDD, 1.6);
      else
        F(c, ell(0, 0, r * 0.55, r, 0), i % 3 === 1 ? PAPER : ORANGE, GOLDD, 1.5);
      c.restore();
    }
    c.restore();
  }

  // ---------------------------------------------------------------- 演员层
  // 紧箍：皈依之后才出现，画在额上（猴头中心 CX,330，冠下沿约 y=300）。
  // 不改 rig，作为可选叠加层，保证样张三幕与第①~⑤幕逐像素不变。
  function hoop(c, t, alpha) {
    c.save();
    c.globalAlpha = alpha === undefined ? 1 : alpha;   // 必须跟随人物淡出，否则 k8 会留下悬浮金箍
    // 位置在凤翅冠下沿与额发之间（y≈268），避开火眼金睛（y≈314）
    c.beginPath(); c.ellipse(CX, 268, 100, 20, 0, 0, TAU);
    c.strokeStyle = GOLDHI; c.lineWidth = 13; c.stroke();
    c.beginPath(); c.ellipse(CX, 268, 100, 20, 0, 0, TAU);
    c.strokeStyle = GOLDD; c.lineWidth = 2.8; c.stroke();
    for (let k = -1; k <= 1; k++)
      F(c, poly([[CX + k * 38 - 10, 250], [CX + k * 38, 238], [CX + k * 38 + 10, 250],
                 [CX + k * 38, 262]]), RED, GOLDD, 1.8);
    c.restore();
  }

  function hero(c, t, opt) {
    const o = opt || {};
    // 第二批六位走 xy_actors.js 的独立 rig；悟空（无 XY_ACTORS 命中）保持原路径逐像素不变。
    // 新 rig 的所有叠加部件都在 figure() 的同一套 tilt/lift/alpha 变换内，天然满足红线 04。
    const A = window.XY_ACTORS;
    if (A && A.has(window.SERIES_KEY)) { A.draw(c, t, o); return; }
    const tilt = o.tilt || 0, lift = o.lift || 0;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    FIG.drawWukong(c, { pose: o.pose || 'stand', t: t, tilt: tilt, lift: lift, alpha: alpha });
    if (o.hoop) {
      // 叠加层必须复现 drawWukong 的同一套变换，否则 tilt 时金箍会飘在脸外
      c.save();
      c.translate(CX, GY); c.rotate(tilt); c.translate(-CX, -GY - lift);
      hoop(c, t, alpha);
      c.restore();
    }
  }

  // ---------------------------------------------------------------- 通用道具
  function plaque(c, text, x, y) {
    F(c, poly([[x - 34, y], [x + 34, y], [x + 34, y + 190], [x, y + 214], [x - 34, y + 190]]),
      REDDK, GOLD, 3.4);
    F(c, poly([[x - 22, y + 12], [x + 22, y + 12], [x + 22, y + 180], [x, y + 198], [x - 22, y + 180]]),
      null, GOLDHI, 2);
    vtext(c, text, x, y + 32, 34, PAPER, 1.22);
  }

  // 水帘：竖向纸白线，止于 y≈610，绝不越过脸（红线 02）
  function waterFall(c, t) {
    c.save();
    for (let k = 0; k < 10; k++) {
      const x = BOX.x0 + 56 + k * 82;
      c.beginPath(); c.moveTo(x, BOX.y0 + 24);
      c.lineTo(x + Math.sin(t * 1.3 + k) * 10, 610 + (k % 3) * 46);
      // 首轮 0.42/3.2 在 1100px 降采样后读不出，加粗提亮（深赭底上必须够亮）
      c.strokeStyle = 'rgba(236,223,196,.72)'; c.lineWidth = 5.5; c.stroke();
    }
    for (const x of [BOX.x0 + 70, BOX.x1 - 70]) {
      F(c, poly([[x - 22, 300], [x + 22, 300], [x + 26, 940], [x - 26, 940]]), REDDK, GOLD, 3.2);
      F(c, poly([[x - 34, 300], [x + 34, 300], [x + 34, 326], [x - 34, 326]]), GOLDHI, INK, 2.4);
    }
    c.restore();
  }

  // 仙石迸裂（首轮画成蓝色盾牌徽章，读不出「石」与「裂」，已重画）：
  // 土褐不规则岩块 + 石青受光面 + 一道劈开石身的锯齿金裂 + 石猴从裂口上冲。
  // 上方三道云气填满石青背光环，避免无人幕变成「空镜框」。
  function stone(c, t, u) {
    c.save();
    const sx = CX, sy = 742;
    F(c, ell(sx, sy + 14, 152, 28), 'rgba(42,26,20,.30)', null);
    F(c, poly([[sx - 138, sy + 4], [sx - 126, sy - 96], [sx - 84, sy - 178],
               [sx - 14, sy - 214], [sx + 64, sy - 190], [sx + 122, sy - 108],
               [sx + 134, sy + 4], [sx + 92, sy + 18], [sx - 98, sy + 18]]),
      '#6b4a32', INK, 5);
    F(c, poly([[sx - 126, sy - 96], [sx - 84, sy - 178], [sx - 14, sy - 214],
               [sx + 10, sy - 142], [sx - 38, sy - 70], [sx - 104, sy - 6]]), BLUE, GOLDD, 2.6);
    F(c, poly([[sx + 64, sy - 190], [sx + 122, sy - 108], [sx + 134, sy + 4],
               [sx + 92, sy + 18], [sx + 50, sy - 64], [sx + 10, sy - 142]]), REDDK, GOLDD, 2.2);
    for (let k = 0; k < 9; k++)
      dot(c, sx - 100 + (k * 67) % 210, sy - 150 + (k * 83) % 140, 3 + (k % 3) * 2,
          'rgba(236,223,196,.30)', null);
    // 主裂：一道锯齿金线把石身劈成两半，内芯用深墨压出「裂开」而不是「描花」
    const crack = () => {
      c.beginPath(); c.moveTo(sx - 6, sy - 212);
      c.lineTo(sx + 14, sy - 170); c.lineTo(sx - 16, sy - 130);
      c.lineTo(sx + 18, sy - 84); c.lineTo(sx - 10, sy - 40); c.lineTo(sx + 8, sy + 6);
    };
    crack(); c.strokeStyle = GOLDHI; c.lineWidth = 10; c.stroke();
    crack(); c.strokeStyle = INK; c.lineWidth = 3.4; c.stroke();
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI * 0.94 + k * 0.27;
      const rr = 42 + 128 * u;
      c.beginPath(); c.moveTo(sx + Math.cos(a) * 26, sy - 108 + Math.sin(a) * 26);
      c.lineTo(sx + Math.cos(a) * rr, sy - 108 + Math.sin(a) * rr);
      c.strokeStyle = GOLDHI; c.lineWidth = 5 - k * 0.3;
      c.globalAlpha = 0.42 + 0.5 * u; c.stroke();
    }
    c.globalAlpha = 1;
    for (let k = 0; k < 4; k++) {
      const ph = pmod(t * 0.75 - k / 4, 1);
      c.beginPath(); c.arc(sx, sy - 108, 66 + ph * 300, -1.15, 1.15);
      c.strokeStyle = PAPER; c.lineWidth = 6 - ph * 4;
      c.globalAlpha = (1 - ph) * 0.5; c.stroke();
    }
    c.globalAlpha = 1;
    // 石猴：从裂口向上冲的剪影，随时间上移；不是后面八幕的立像，不会雷同
    const my = sy - 118 - 132 * u;
    c.save(); c.translate(sx, my); c.rotate(0.14 * Math.sin(t * 2));
    F(c, ell(0, 0, 30, 38), INK, GOLDHI, 3);
    F(c, ell(0, -44, 25, 24), REDHI, GOLDHI, 2.6);
    for (const s of [-1, 1]) {
      dot(c, s * 23, -44, 8, REDHI, GOLDHI, 1.8);
      c.beginPath(); c.moveTo(s * 20, 4); c.lineTo(s * 48, 26 + 10 * Math.sin(t * 5 + s));
      c.strokeStyle = GOLDHI; c.lineWidth = 8; c.stroke();
      c.beginPath(); c.moveTo(s * 14, 30); c.lineTo(s * 28, 58);
      c.strokeStyle = INK; c.lineWidth = 9; c.stroke();
    }
    dot(c, -9, -48, 4, INK, null); dot(c, 9, -48, 4, INK, null);
    c.restore();
    // 云气：三道横向金线填住上方空环
    for (let k = 0; k < 3; k++) {
      const yy = 214 + k * 54;
      c.beginPath(); c.moveTo(sx - 180, yy);
      c.bezierCurveTo(sx - 70, yy - 30 + Math.sin(t + k) * 10, sx + 70, yy + 30, sx + 180, yy - 10);
      c.strokeStyle = k % 2 ? GOLDHI : PAPER; c.lineWidth = 3.4;
      c.globalAlpha = 0.46; c.stroke();
    }
    c.globalAlpha = 1;
    c.restore();
  }

  // 东海：三道纸白浪 + 定海神针的竖向金光柱（不横跨头顶，柱体止于 y=620）
  function seaWave(c, t) {
    c.save();
    for (let k = 0; k < 3; k++) {
      const y = 812 + k * 52;
      c.beginPath(); c.moveTo(BOX.x0 + 20, y);
      for (let x = BOX.x0 + 20; x <= BOX.x1 - 20; x += 28)
        c.lineTo(x, y + Math.sin(x * 0.022 + t * 1.8 + k) * 16);
      c.strokeStyle = k % 2 ? 'rgba(236,223,196,.72)' : 'rgba(47,95,143,.85)';
      c.lineWidth = 6 - k; c.stroke();
    }
    const gx = CX + 236;
    const lg = c.createLinearGradient(gx - 46, 0, gx + 46, 0);
    lg.addColorStop(0, 'rgba(240,207,134,0)');
    lg.addColorStop(0.5, 'rgba(240,207,134,.42)');
    lg.addColorStop(1, 'rgba(240,207,134,0)');
    c.fillStyle = lg; c.fillRect(gx - 46, 620, 92, 330);
    F(c, poly([[gx - 9, 620], [gx + 9, 620], [gx + 9, 940], [gx - 9, 940]]), GOLDHI, GOLDD, 2.4);
    c.restore();
  }

  // 云阶：只在人物下方，不画横梁压头
  function cloudSteps(c, t) {
    for (let k = 0; k < 4; k++) {
      const y = 790 + k * 52, w = 300 - k * 46;
      F(c, poly([[CX - w, y], [CX + w, y], [CX + w + 20, y + 26], [CX - w - 20, y + 26]]),
        k % 2 ? REDDK : BLUEDK, GOLD, 3);
    }
  }

  // 天兵：远处剪影列，只用暗块 + 金边，不画兵器相击与血光（留白暗写）
  function troops(c, t) {
    c.save(); c.globalAlpha = 0.88;
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const px = CX + s * (272 + k * 74), py = 646 + k * 26;
      F(c, poly([[px - 19, py], [px + 19, py], [px + 23, py + 132], [px - 23, py + 132]]),
        INK, GOLD, 2.4);
      dot(c, px, py - 18, 17, INK, GOLD, 2.2);
      c.beginPath(); c.moveTo(px - 26, py + 16); c.lineTo(px + 26, py + 16);
      c.strokeStyle = GOLDHI; c.lineWidth = 3; c.stroke();
    }
    c.restore();
  }

  // 五行山：压住下半身。深色赭块上的石纹必须用纸白线（红线 02）
  function mountain(c, t) {
    F(c, poly([[BOX.x0 + 20, 980], [BOX.x0 + 120, 700], [CX - 250, 620],
               [CX - 120, 560], [CX + 60, 600], [CX + 240, 570],
               [BOX.x1 - 110, 720], [BOX.x1 - 20, 980]]), REDDK, INK, 5);
    for (let k = 0; k < 7; k++) {
      const x = BOX.x0 + 120 + k * 112;
      c.beginPath(); c.moveTo(x, 980); c.lineTo(x + 40 + (k % 3) * 18, 700 + (k % 4) * 30);
      c.strokeStyle = 'rgba(236,223,196,.55)'; c.lineWidth = 3.4; c.stroke();
    }
  }

  // 压帖 / 揭帖：纸白符 + 朱红六字；u=1 时符纸向上飞起并淡出
  function talisman(c, t, u) {
    c.save();
    c.translate(0, -150 * u);
    c.globalAlpha = 1 - 0.85 * u;
    c.rotate(u * 0.14);
    const cy = 646;
    F(c, poly([[CX - 74, cy - 80], [CX + 74, cy - 80], [CX + 74, cy + 80], [CX - 74, cy + 80]]),
      PAPER, GOLD, 3.6);
    F(c, poly([[CX - 62, cy - 68], [CX + 62, cy - 68], [CX + 62, cy + 68], [CX - 62, cy + 68]]),
      null, RED, 2);
    htext(c, '唵嘛', CX, cy - 34, 30, RED, 0);
    htext(c, '呢叭', CX, cy + 10, 30, RED, 0);
    htext(c, '咪吽', CX, cy + 54, 30, RED, 0);
    c.restore();
  }

  // 唐僧 / 白马侧影：不画正脸，只给一袭袈裟 + 锡杖 + 马首，留白暗写「皈依」
  function pilgrim(c, t, u) {
    c.save(); c.globalAlpha = 0.80 + 0.16 * u;
    const px = CX - 306 + 26 * u;
    // 首轮只有一根黄柱 + 白圆，被读成路灯；白马头颈像弯钩。
    // 改为：远山 + 取经路 + 明确的光头僧人（袈裟田相格 / 合十 / 锡杖双环），去掉白马。
    F(c, poly([[BOX.x0 + 20, 900], [BOX.x0 + 150, 812], [BOX.x0 + 270, 880],
               [BOX.x0 + 380, 826], [BOX.x0 + 470, 900]]), 'rgba(122,46,30,.42)', null);
    F(c, poly([[BOX.x0 + 20, 906], [BOX.x1 - 20, 906],
               [BOX.x1 - 20, 918], [BOX.x0 + 20, 918]]), GOLDD, null);
    F(c, poly([[px - 58, 686], [px + 58, 686], [px + 76, 936], [px - 76, 936]]), ORANGE, INK, 4);
    F(c, poly([[px - 24, 686], [px + 24, 686], [px + 50, 936], [px - 50, 936]]), REDDK, GOLDHI, 2.4);
    for (let k = 0; k < 4; k++) {
      c.beginPath(); c.moveTo(px - 70, 736 + k * 52); c.lineTo(px + 70, 736 + k * 52);
      c.strokeStyle = GOLDHI; c.lineWidth = 2.4; c.globalAlpha = 0.55; c.stroke();
    }
    c.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      c.beginPath(); c.moveTo(px - 52 + k * 40, 700); c.lineTo(px - 52 + k * 40, 930);
      c.strokeStyle = GOLDHI; c.lineWidth = 2; c.globalAlpha = 0.4; c.stroke();
    }
    c.globalAlpha = 1;
    dot(c, px, 650, 36, PAPER, INK, 3);
    F(c, ell(px, 628, 36, 10), GOLDHI, INK, 2);
    dot(c, px - 11, 652, 3.5, INK, null); dot(c, px + 11, 652, 3.5, INK, null);
    F(c, poly([[px - 16, 706], [px, 690], [px + 16, 706], [px, 742]]), PAPER, INK, 2.4);
    // 锡杖竖杆与双环，顶端止于 y≈540，绝不横跨人物头顶
    c.beginPath(); c.moveTo(px + 92, 566); c.lineTo(px + 92, 950);
    c.strokeStyle = GOLDHI; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.arc(px + 92, 556, 16, 0, TAU);
    c.strokeStyle = GOLD; c.lineWidth = 5; c.stroke();
    c.beginPath(); c.arc(px + 112, 556, 12, 0, TAU);
    c.strokeStyle = GOLDHI; c.lineWidth = 4; c.stroke();
    c.restore();
  }

  // 众猴剪影：三只小猴在帘外下拜，给「拜他为王」一个可见落点
  function smallMonkeys(c, t, n) {
    c.save();
    // 固定落在人物两侧（首轮等距三只，中间那只被猴王与飘带完全盖住，且尺寸太小读不出）
    const spots = [[648, 884], [1252, 884], [1320, 926]];
    for (let k = 0; k < Math.min(n, spots.length); k++) {
      const px = spots[k][0], py = spots[k][1];
      c.globalAlpha = 0.78 + 0.18 * Math.sin(t * 1.6 + k);
      F(c, ell(px, py, 42, 22), INK, GOLDD, 2.4);
      F(c, ell(px, py - 46, 32, 36), REDDK, GOLDHI, 2.4);
      dot(c, px, py - 82, 22, REDHI, GOLDHI, 2.2);
      for (const s of [-1, 1]) dot(c, px + s * 22, py - 82, 9, REDHI, GOLDHI, 1.8);
      c.beginPath(); c.moveTo(px - 18, py - 24); c.lineTo(px, py - 6); c.lineTo(px + 18, py - 24);
      c.strokeStyle = GOLDHI; c.lineWidth = 4; c.stroke();
    }
    c.restore();
  }

  // 金箍棒缩小归耳：幕⑧收束动作，从右侧长棒收到一枚小针飞向耳侧
  function staffHome(c, t, u) {
    c.save();
    // 首轮收敛太慢：静帧 u≈0.5 时仍是一根 180px 长金条悬在右上角。
    // 加速衰减，让「棒 → 针」在幕前半段就完成，后半段只剩耳侧一点金光。
    const q = ss(0, 1, Math.min(1, u * 1.7));
    const px = lerp(CX + 300, CX + 96, q);
    const py = lerp(360, 322, q);
    const len = lerp(220, 18, q);
    const a = -0.35 + 0.35 * q;
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    FIG.bar(c, px - dx, py - dy, px + dx, py + dy, lerp(18, 6, q), GOLDHI, GOLDD, 2);
    for (let k = 0; k < 3; k++) {
      c.beginPath(); c.arc(px, py, 18 + k * 18 + (1 - q) * 24, -1.0, 0.9);
      c.strokeStyle = k % 2 ? PAPER : GOLDHI; c.lineWidth = 4 - k;
      c.globalAlpha = (0.6 - k * 0.14) * (1 - 0.5 * q); c.stroke();
    }
    c.restore();
  }

  // 掀帘（首轮踩坑）：H.curtain 在 camera 变换内部又按 BOX 定义了一层 clip，
  // 两层裁剪求交后帘被吞掉，k1/k2 与 k3 几乎同图。改为屏幕空间绘制，
  // 由 act() 在 camera restore 之后调用，帘必定盖得住演员层。
  function curtainScreen(c, t, open) {
    c.save(); clipBox(c);
    const half = (BOX.x1 - BOX.x0) / 2;
    const o = Math.max(0, Math.min(1, open));
    const gap = 12 + Math.sin(t * 1.6) * 6;
    const lg = c.createLinearGradient(CX - gap * 4, 0, CX + gap * 4, 0);
    lg.addColorStop(0, 'rgba(246,220,150,0)');
    lg.addColorStop(0.5, `rgba(246,220,150,${0.24 + 0.12 * Math.sin(t * 2.2)})`);
    lg.addColorStop(1, 'rgba(246,220,150,0)');
    c.fillStyle = lg; c.fillRect(CX - gap * 4, BOX.y0, gap * 8, BOX.y1 - BOX.y0);
    for (const side of [-1, 1]) {
      const w = half * (1 - o) + Math.sin(t * 1.1 + (side < 0 ? 0 : 1.4)) * 6;
      const x0 = side < 0 ? BOX.x0 : BOX.x1 - w;
      const gr = c.createLinearGradient(x0, 0, x0 + w, 0);
      gr.addColorStop(0, REDDK); gr.addColorStop(0.5, RED); gr.addColorStop(1, REDHI);
      c.fillStyle = gr; c.fillRect(x0, BOX.y0, w, BOX.y1 - BOX.y0);
      for (let k = 0; k < 7; k++) {
        const xx = x0 + k * w / 7;
        c.beginPath(); c.moveTo(xx, BOX.y0);
        c.lineTo(xx + Math.sin(t * 1.4 + k) * 6, BOX.y1);
        c.strokeStyle = GOLD; c.lineWidth = 3; c.globalAlpha = 0.65; c.stroke();
      }
      c.globalAlpha = 0.34;
      for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++)
        floret(c, x0 + (col + 0.5) * w / 3, 190 + row * 230, 18,
               GOLDHI, GOLDD, 6, t * 0.18 + row + col);
      c.globalAlpha = 1;
      const ex = side < 0 ? x0 + w : x0;
      c.beginPath(); c.moveTo(ex, BOX.y0); c.lineTo(ex, BOX.y1);
      c.strokeStyle = GOLDHI; c.lineWidth = 6; c.stroke();
    }
    c.restore();
  }

  // 收印：圆环收束 + 朱红方印（承接红楼 v2 的收口语法，但换西游文字）
  function sealStamp(c, t, p, f) {
    const close = ss(0.05, 0.92, clamp(p));
    c.save(); c.translate(CX, 540);
    const rr = lerp(340, 128, close);
    c.beginPath(); c.arc(0, 0, rr, 0, TAU);
    c.strokeStyle = GOLD; c.lineWidth = 6 - 2.5 * close; c.globalAlpha = 0.8; c.stroke();
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU + t * 0.3 * (1 - close);
      c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a + Math.PI / 2);
      F(c, ell(0, 0, 5.5, 12, 0), PAPER, GOLDD, 1.2);
      c.restore();
    }
    c.restore();
    c.save(); c.globalAlpha = close;
    c.fillStyle = f.sealCol; c.fillRect(CX - 56, 486, 112, 112);
    c.strokeStyle = PAPER; c.lineWidth = 3.4; c.strokeRect(CX - 47, 495, 94, 94);
    htext(c, f.seal[0], CX, 528, 42, PAPER);
    htext(c, f.seal[1], CX, 568, 42, PAPER);
    c.restore();
  }

  window.XY_SERIES = {
    ACT, FILMS, cfg, P, clipBox, stageOpt, camOf, particles, motion, hero, hoop,
    plaque, waterFall, stone, seaWave, cloudSteps, troops, mountain, talisman,
    pilgrim, smallMonkeys, staffHome, curtainScreen, sealStamp,
  };
})();
