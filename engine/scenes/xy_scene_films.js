// 西游记 · 场景版八幕引擎（window.XY_SCENE_FILMS）
// ---------------------------------------------------------------------------
// 与旧片完全隔离：只注册 SCENES['v1'..'v8']，不加载 xy_tight.js，不画中央海报框。
// 一幕 = 一个具名场景（榜题 + 环境 + 群演 + 事件动作 + 钤印），仿三国 z*_*.js 的幕型。
// 台词轴 / 时长 / 配音全部沿用旧 key，只换画面。
(() => {
  const X = window.XY, S = window.XY_SCENE, FIG = window.XY_FIGURE;
  const { poly, F, ell, dot, vtext, htext, ss, clamp, lerp, rng, pmod } = S;
  const C = S.C, W = S.W, H = S.H, TAU = Math.PI * 2;
  const GY = 886;

  // ---------------------------------------------------------------- 人物剪影
  // 场景版把人物缩小成「环境里的演员」：剪影 + 头饰 + 法宝 + 专色四件套。
  // 只有悟空复用原 rig（按脚底缩放 0.52），其余用可辨识剪影，避免满屏立像抢场景。
  function silhouette(g, t, opt = {}) {
    const x = opt.x || 1000, y = opt.groundY || GY, s = opt.s || 1;
    const a = opt.alpha === undefined ? 1 : opt.alpha;
    const kind = opt.kind || 'monk';
    const col = opt.col || C.red;
    const swing = Math.sin(t * 1.15 + x * 0.003) * 0.05;
    g.save(); g.translate(x, y); g.rotate((opt.tilt || 0) + swing); g.scale(s, s); g.globalAlpha = a;

    if (kind === 'horse') {
      // 白马：躯干 + 四腿 + 鬃 + 鞍，腿随时间交错
      F(g, poly([[-92, -150], [76, -150], [104, -112], [78, -78], [-88, -78], [-112, -112]]), C.paper, C.earthDk, 3.4);
      F(g, poly([[62, -150], [112, -214], [146, -222], [138, -190], [104, -152]]), C.paper, C.earthDk, 3.2);
      F(g, ell(130, -226, 24, 16, -0.2), C.paper, C.earthDk, 2.6);
      F(g, poly([[104, -228], [116, -254], [126, -226]]), C.gold, C.earthDk, 1.8);
      for (let i = 0; i < 4; i++) {
        const lx = [-78, -42, 46, 76][i];
        const ph = Math.sin(t * 6 + i * 1.6) * 12;
        g.strokeStyle = C.earthDk; g.lineWidth = 11; g.lineCap = 'round';
        g.beginPath(); g.moveTo(lx, -86); g.lineTo(lx + ph, -6); g.stroke();
      }
      F(g, poly([[-52, -158], [30, -158], [22, -122], [-44, -122]]), C.red, C.gold, 2.4);
      g.restore(); return;
    }

    // 通用立姿：袍 + 头 + 双臂
    F(g, poly([[-58, 0], [-40, -176], [40, -176], [58, 0]]), col, C.earthDk, 3.4);
    F(g, poly([[-40, -176], [0, -196], [40, -176]]), C.gold, C.earthDk, 2.4);
    F(g, ell(0, -220, 30, 34, 0), C.paper, C.earthDk, 3);
    g.strokeStyle = C.earthDk; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-38, -160); g.lineTo(-66, -92); g.stroke();
    g.beginPath(); g.moveTo(38, -160); g.lineTo(66, -92); g.stroke();

    if (kind === 'monk') {
      F(g, poly([[-40, -250], [40, -250], [30, -278], [-30, -278]]), C.gold, C.earthDk, 3);
      F(g, poly([[-46, -172], [46, -172], [40, -104], [-40, -104]]), C.red, C.gold, 2.4);
      g.strokeStyle = C.goldDk || C.gold; g.lineWidth = 6;
      g.beginPath(); g.moveTo(72, -60); g.lineTo(72, -300); g.stroke();
      for (let i = 0; i < 3; i++) F(g, ell(72, -300 + i * 12, 9, 5, 0), C.gold, null, 0);
    } else if (kind === 'pig') {
      F(g, poly([[-32, -246], [-62, -280], [-58, -226]]), col, C.earthDk, 2.6);
      F(g, poly([[32, -246], [62, -280], [58, -226]]), col, C.earthDk, 2.6);
      F(g, ell(0, -222, 26, 20, 0), C.paper, C.earthDk, 2.4);
      g.strokeStyle = C.gold; g.lineWidth = 7;
      g.beginPath(); g.moveTo(78, -40); g.lineTo(78, -286); g.stroke();
      g.strokeStyle = C.gold; g.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.moveTo(56 + i * 11, -286); g.lineTo(56 + i * 11, -256); g.stroke();
      }
    } else if (kind === 'sha') {
      F(g, poly([[-36, -254], [36, -254], [26, -272], [-26, -272]]), C.blueDk, C.gold, 2.6);
      for (let i = 0; i < 7; i++) dot(g, -30 + i * 10, -186 + Math.sin(t + i) * 3, 8, C.paper, C.earthDk, 1.4);
      g.strokeStyle = C.gold; g.lineWidth = 8;
      g.beginPath(); g.moveTo(76, -30); g.lineTo(76, -310); g.stroke();
      F(g, poly([[62, -310], [90, -310], [76, -338]]), C.goldHi, C.earthDk, 2);
    } else if (kind === 'guanyin') {
      F(g, poly([[-40, -256], [40, -256], [0, -306]]), C.goldHi, C.earthDk, 3);
      F(g, ell(0, -300, 12, 14, 0), C.red, null, 0);
      F(g, poly([[-66, 0], [66, 0], [52, -30], [-52, -30]]), C.goldHi, C.earthDk, 2.6);
      // 净瓶 + 柳枝
      F(g, poly([[64, -128], [88, -128], [92, -82], [60, -82]]), C.paper, C.blueDk, 2.6);
      g.strokeStyle = C.green; g.lineWidth = 4;
      g.beginPath(); g.moveTo(76, -128); g.quadraticCurveTo(112, -220, 96, -280); g.stroke();
      for (let i = 0; i < 5; i++) F(g, ell(96 + Math.sin(t + i) * 6, -180 - i * 22, 9, 4, 0.5), C.greenHi || C.green, null, 0);
    } else if (kind === 'erlang') {
      F(g, poly([[-38, -254], [38, -254], [0, -292]]), C.blue, C.gold, 3);
      F(g, ell(0, -256, 9, 12, 0), C.goldHi, C.earthDk, 1.4);
      g.strokeStyle = C.gold; g.lineWidth = 8;
      g.beginPath(); g.moveTo(80, -20); g.lineTo(80, -330); g.stroke();
      F(g, poly([[80, -346], [64, -308], [96, -308]]), C.goldHi, C.earthDk, 2);
      F(g, poly([[80, -346], [80, -282], [96, -308]]), C.blueHi || C.blue, null, 0);
    } else if (kind === 'wukongMini') {
      F(g, poly([[-38, -250], [38, -250], [0, -288]]), C.gold, C.earthDk, 3);
      F(g, poly([[-86, -278], [-52, -308], [-30, -272]]), C.red, C.goldDk || C.gold, 2);
      F(g, poly([[86, -278], [52, -308], [30, -272]]), C.red, C.goldDk || C.gold, 2);
      g.strokeStyle = C.gold; g.lineWidth = 9;
      g.beginPath(); g.moveTo(78, -30); g.lineTo(78, -320); g.stroke();
    } else if (kind === 'buddha') {
      F(g, poly([[-96, 0], [-72, -120], [72, -120], [96, 0]]), C.red, C.gold, 3.4);
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = C.goldHi; g.lineWidth = 3;
        g.beginPath(); g.arc(0, -238, 52 + i * 16, Math.PI, TAU); g.stroke();
      }
    }
    g.restore();
  }

  // ------------------------------------------------ 分镜修正专用构件（2026-11-12）
  // 教训：原 SPECS 是「按人物生平拟的 8 个场景」，没有逐句对照台词轴；而事件库里
  // 硬编码了悟空 / 唐僧，导致白龙马片满屏悟空、沙僧片主角变唐僧。以下构件只服务
  // 本轮重排的三部，不改动任何既有 case，保证其余 5 部逐像素零回归。
  function dragon(g, t, o = {}) {
    const x = o.x === undefined ? 960 : o.x, y = o.y === undefined ? GY - 190 : o.y;
    const s = o.s || 1, a = o.alpha === undefined ? 1 : o.alpha;
    const py = (i) => 90 - Math.sin(i / 10 * Math.PI) * 170 + Math.sin(t * 1.5 + i * 0.55) * 12;
    g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a;
    // 纸白亮边 + 深青主体：土红地仗上必须能一眼读出龙形
    for (const [lw, col] of [[76, C.paper], [58, C.blueDk]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i <= 10; i++) {
        const px = -300 + i * 60;
        if (i === 0) g.moveTo(px, py(i)); else g.lineTo(px, py(i));
      }
      g.stroke();
    }
    for (let i = 1; i < 10; i++) {
      const px = -300 + i * 60, yy = py(i) - 30;
      F(g, poly([[px - 16, yy + 8], [px, yy - 26], [px + 16, yy + 8]]), C.goldHi, C.earthDk, 1.6);
    }
    g.strokeStyle = C.goldHi; g.lineWidth = 5;
    for (let i = 1; i < 10; i++) {
      const px = -300 + i * 60, yy = py(i);
      g.beginPath(); g.moveTo(px - 14, yy - 20); g.lineTo(px + 14, yy + 20); g.stroke();
    }
    F(g, poly([[250, -130], [360, -186], [430, -140], [400, -30], [270, -40]]), C.blueDk, C.gold, 4.4);
    F(g, poly([[296, -182], [322, -262], [348, -184]]), C.goldHi, C.earthDk, 2.4);
    F(g, poly([[362, -184], [404, -248], [412, -170]]), C.goldHi, C.earthDk, 2.4);
    F(g, poly([[330, -70], [420, -70], [420, -44], [330, -44]]), C.paper, C.earthDk, 2);
    dot(g, 366, -132, 12, C.red, C.gold, 2);
    g.strokeStyle = C.paper; g.lineWidth = 5;
    g.beginPath(); g.moveTo(420, -70); g.quadraticCurveTo(500, -30, 520, 40); g.stroke();
    g.beginPath(); g.moveTo(402, -46); g.quadraticCurveTo(470, 10, 446, 72); g.stroke();
    for (let i = 0; i < 3; i++) {
      const px = -160 + i * 190, yy = 70 + (i % 2) * 30;
      g.strokeStyle = C.goldHi; g.lineWidth = 10;
      g.beginPath(); g.moveTo(px, yy); g.lineTo(px + 20, yy + 58); g.stroke();
    }
    g.restore();
  }

  function halo(g, t, x, y, r, col) {
    g.save();
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = 0.50 - i * 0.09;
      g.strokeStyle = col || C.goldHi; g.lineWidth = 10 - i * 1.8;
      g.beginPath(); g.arc(x, y, r + i * 26 + Math.sin(t * 1.2 + i) * 6, 0, TAU); g.stroke();
    }
    g.globalAlpha = 0.8;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU + t * 0.25;
      dot(g, x + Math.cos(a) * (r + 70), y + Math.sin(a) * (r + 70), 5, C.goldHi, null, 0);
    }
    g.restore();
  }

  function waterfall(g, t, x, y, w, h) {
    g.save();
    for (let i = 0; i < 22; i++) {
      const px = x - w / 2 + (i + 0.5) * w / 22, wob = Math.sin(t * 2.2 + i * 0.7) * 9;
      g.strokeStyle = i % 3 === 0 ? C.paper : (i % 3 === 1 ? (C.blueHi || C.blue) : C.goldHi);
      g.globalAlpha = 0.35 + (i % 4) * 0.12;
      g.lineWidth = 4 + (i % 3) * 3;
      g.beginPath(); g.moveTo(px + wob * 0.3, y); g.lineTo(px + wob, y + h); g.stroke();
    }
    g.globalAlpha = 0.9;
    for (let i = 0; i < 14; i++)
      dot(g, x - w / 2 + ((i * 137 + t * 90) % w), y + h - 8 + Math.sin(t * 3 + i) * 10, 5, C.paper, null, 0);
    g.restore();
  }

  function pearl(g, t, x, y, s, crack) {
    g.save(); g.translate(x, y); g.scale(s || 1, s || 1);
    halo(g, t, 0, 0, 44);
    F(g, ell(0, 0, 46, 46, 0), C.paper, C.gold, 4);
    F(g, ell(-14, -16, 14, 9, -0.4), C.goldHi, null, 0);
    if (crack > 0) {
      g.save(); g.globalAlpha = crack;
      g.strokeStyle = C.earthDk; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-30, -20); g.lineTo(0, 4); g.lineTo(28, -16); g.stroke();
      for (let i = 0; i < 5; i++) {
        const fx = -36 + i * 18, fh = 26 + Math.sin(t * 3 + i) * 12;
        F(g, poly([[fx - 8, 46], [fx, fh], [fx + 8, 46]]), C.red, C.goldHi, 1.4);
      }
      g.restore();
    }
    g.restore();
  }

  function sutraBox(g, t, x, y, w) {
    const ww = w || 150;
    F(g, poly([[x - ww / 2, y], [x + ww / 2, y], [x + ww / 2, y + 66], [x - ww / 2, y + 66]]), C.earthDk, C.gold, 3);
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = C.gold; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(x - ww / 2 + 12, y + 14 + i * 18); g.lineTo(x + ww / 2 - 12, y + 14 + i * 18); g.stroke();
    }
  }

  // ============ 八戒片专用构件（2026-11-12 第二轮人工审片修正） ============
  // 旧 pig 剪影只有两只三角耳 + 圆脸，在土红地仗上读不出「猪」，且 8 幕里
  // 6 幕被通用事件画成唐僧 / 僧人 / 佛祖。以下构件只服务 bajie_scene 的 8 个
  // 专属 case，不改动任何既有 case / silhouette / act / drawEnv，
  // 保证其余 7 部逐像素零回归。
  function rakeNine(g, t, o = {}) {
    const x = o.x === undefined ? 0 : o.x, y = o.y === undefined ? 0 : o.y;
    const s = o.s || 1, rot = o.rot || 0, a = o.alpha === undefined ? 1 : o.alpha;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = a;
    F(g, poly([[-9, 0], [9, 0], [9, -292], [-9, -292]]), C.earthDk, C.gold, 2.8);
    for (const yy of [-42, -258]) {
      F(g, poly([[-15, yy - 16], [15, yy - 16], [15, yy], [-15, yy]]), C.goldHi, C.earthDk, 1.8);
    }
    F(g, poly([[-96, -322], [96, -322], [96, -286], [-96, -286]]), C.gold, C.earthDk, 3.2);
    for (let i = 0; i < 9; i++) {
      const px = -84 + i * 21;
      F(g, poly([[px - 6, -286], [px + 6, -286], [px + 4, -248],
                 [px, -232], [px - 4, -248]]), C.paper, C.earthDk, 1.8);
    }
    g.restore();
  }

  // 猪八戒本尊：扇耳 / 长吻双鼻孔 / 獠牙 / 胖肚 / 短腿，九齿钉耙随手。
  function bajie(g, t, o = {}) {
    const x = o.x === undefined ? 960 : o.x, y = o.y === undefined ? GY : o.y;
    const s = o.s || 1, a = o.alpha === undefined ? 1 : o.alpha;
    const pose = o.pose || 'stand', col = o.col || C.blueDk;
    const swing = Math.sin(t * 1.05 + x * 0.003) * 0.025;
    g.save(); g.translate(x, y); g.rotate((o.tilt || 0) + swing); g.scale(s, s); g.globalAlpha = a;

    // 短腿 + 鞋（先画，胖肚压在上面）
    F(g, poly([[-48, 0], [-40, -74], [-8, -74], [-6, 0]]), C.earthDk, C.ink, 2.6);
    F(g, poly([[6, 0], [8, -74], [40, -74], [48, 0]]), C.earthDk, C.ink, 2.6);
    F(g, ell(-27, -8, 28, 11, 0), C.ink, null, 0);
    F(g, ell(27, -8, 28, 11, 0), C.ink, null, 0);

    // 胖肚僧衣 + 纸白肚兜（浅色必须画在深色之后）
    F(g, ell(0, -166, 88, 106, 0), col, C.earthDk, 4.2);
    F(g, ell(0, -152, 58, 74, 0), C.paper, C.goldDk, 2.8);
    F(g, poly([[-88, -122], [88, -122], [88, -100], [-88, -100]]), C.red, C.gold, 2.4);
    dot(g, 0, -111, 10, C.goldHi, C.earthDk, 1.8);

    // 双臂 / 袖
    F(g, ell(-78, -228, 32, 46, -0.32), col, C.earthDk, 3);
    F(g, ell(78, -228, 32, 46, 0.32), col, C.earthDk, 3);
    g.strokeStyle = C.earthDk; g.lineWidth = 15; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-74, -220); g.lineTo(-90, -142); g.stroke();
    g.beginPath(); g.moveTo(74, -220); g.lineTo(92, -142); g.stroke();

    // 扇耳（画在脸之前，左右都明显超出头部）
    F(g, poly([[-44, -312], [-124, -352], [-110, -278], [-50, -274]]), C.paper, C.earthDk, 3.4);
    F(g, poly([[44, -312], [124, -352], [110, -278], [50, -274]]), C.paper, C.earthDk, 3.4);
    F(g, poly([[-52, -308], [-106, -334], [-98, -292]]), C.red, null, 0);
    F(g, poly([[52, -308], [106, -334], [98, -292]]), C.red, null, 0);

    // 猪头 + 长吻 + 鼻孔 + 獠牙
    F(g, ell(0, -292, 56, 50, 0), C.paper, C.earthDk, 4);
    F(g, ell(0, -274, 40, 24, 0), C.earthHi, C.earthDk, 3);
    dot(g, -15, -274, 6, C.earthDk, null, 0);
    dot(g, 15, -274, 6, C.earthDk, null, 0);
    if (pose === 'sleep' || pose === 'drunk') {
      g.strokeStyle = C.earthDk; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-32, -308); g.lineTo(-14, -304); g.stroke();
      g.beginPath(); g.moveTo(14, -304); g.lineTo(32, -308); g.stroke();
    } else {
      dot(g, -23, -308, 6, C.earthDk, null, 0);
      dot(g, 23, -308, 6, C.earthDk, null, 0);
    }
    F(g, poly([[-34, -260], [-24, -238], [-16, -260]]), C.paper, C.earthDk, 1.8);
    F(g, poly([[16, -260], [24, -238], [34, -260]]), C.paper, C.earthDk, 1.8);
    // 僧帽 / 天蓬金冠
    if (pose === 'marshal') {
      F(g, poly([[-56, -330], [56, -330], [40, -360], [-40, -360]]), C.gold, C.earthDk, 3);
      F(g, poly([[-14, -360], [0, -396], [14, -360]]), C.goldHi, C.earthDk, 2.4);
    } else {
      F(g, poly([[-54, -330], [54, -330], [38, -352], [-38, -352]]), C.blueDk, C.gold, 2.8);
      dot(g, 0, -340, 8, C.goldHi, C.earthDk, 1.6);
    }

    // 九齿钉耙（默认握在右手；guard 横举、rest 斜靠肩）
    if (o.rake !== false) {
      const rr = o.rakeRot === undefined ? 0.10 : o.rakeRot;
      rakeNine(g, t, { x: o.rakeX === undefined ? 96 : o.rakeX,
                       y: o.rakeY === undefined ? -128 : o.rakeY,
                       s: o.rakeS || 0.86, rot: rr, alpha: a });
    }
    g.restore();
  }

  function jar(g, t, x, y, s) {
    const k = s || 1;
    g.save(); g.translate(x, y); g.scale(k, k);
    F(g, poly([[-32, 0], [-42, -46], [-26, -84], [26, -84], [42, -46], [32, 0]]), C.earthDk, C.gold, 3);
    F(g, poly([[-26, -84], [26, -84], [26, -98], [-26, -98]]), C.gold, C.earthDk, 2.4);
    F(g, ell(0, -50, 30, 14, 0), C.earthHi, null, 0);
    g.strokeStyle = C.goldHi; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-18, -30); g.quadraticCurveTo(0, -22, 18, -30); g.stroke();
    g.restore();
  }

  // 担子：扁担 + 两只箱 + 垂绳（组合道具必须有连接件）
  function load(g, t, x, y, s) {
    const k = s || 1, bob = Math.sin(t * 1.5) * 5;
    g.save(); g.translate(x, y + bob); g.scale(k, k);
    g.strokeStyle = C.earthDk; g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-150, -268); g.quadraticCurveTo(0, -284, 150, -268); g.stroke();
    for (const px of [-132, 132]) {
      g.strokeStyle = C.gold; g.lineWidth = 4;
      g.beginPath(); g.moveTo(px, -270); g.lineTo(px, -192); g.stroke();
      F(g, poly([[px - 52, -192], [px + 52, -192], [px + 44, -86], [px - 44, -86]]),
        C.earthDk, C.gold, 3);
      F(g, poly([[px - 34, -176], [px + 34, -176], [px + 30, -104], [px - 30, -104]]),
        C.red, C.goldDk, 2);
    }
    g.restore();
  }

  function bun(g, t, x, y, s) {
    const k = s || 1;
    g.save(); g.translate(x, y); g.scale(k, k);
    F(g, poly([[-62, 0], [62, 0], [48, -30], [-48, -30]]), C.paper, C.earthDk, 2.8);
    for (let i = 0; i < 3; i++) {
      F(g, ell(-34 + i * 34, -40, 22, 16, 0), C.paper, C.goldDk, 2.2);
      g.strokeStyle = C.goldDk; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-34 + i * 34, -52); g.lineTo(-34 + i * 34, -30); g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = C.paper; g.globalAlpha = 0.6; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-28 + i * 16, -62);
      g.quadraticCurveTo(-22 + i * 16 + Math.sin(t * 2 + i) * 8, -90,
                         -28 + i * 16, -116 - (i % 2) * 18); g.stroke();
    }
    g.restore();
  }

  function bundle(g, t, x, y, s) {
    const k = s || 1;
    g.save(); g.translate(x, y); g.scale(k, k);
    F(g, poly([[-56, 0], [-64, -66], [0, -92], [64, -66], [56, 0]]), C.red, C.gold, 3);
    g.strokeStyle = C.goldHi; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-64, -60); g.lineTo(64, -60); g.stroke();
    g.beginPath(); g.moveTo(0, -92); g.lineTo(0, 0); g.stroke();
    F(g, poly([[-16, -92], [16, -92], [16, -112], [-16, -112]]), C.earthDk, C.gold, 2);
    g.restore();
  }

  function altar(g, t, x, y, s) {
    const k = s || 1;
    g.save(); g.translate(x, y); g.scale(k, k);
    F(g, poly([[-180, 0], [-180, -42], [180, -42], [180, 0]]), C.earthDk, C.gold, 3.4);
    F(g, poly([[-158, -42], [158, -42], [140, -120], [-140, -120]]), C.red, C.gold, 3);
    F(g, ell(0, -140, 46, 16, 0), C.gold, C.earthDk, 2.6);
    F(g, poly([[-30, -140], [-22, -186], [22, -186], [30, -140]]), C.goldHi, C.earthDk, 2.6);
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = C.paper; g.globalAlpha = 0.65; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-12 + i * 12, -186);
      g.quadraticCurveTo(-6 + i * 12 + Math.sin(t * 1.4 + i) * 12, -222,
                         -12 + i * 12, -258 - i * 12); g.stroke();
    }
    g.restore();
  }

  function fog(g, t, x, y, w) {
    g.save(); g.translate(x, y);
    const wd = w || 520, r = rng(97);
    for (let i = 0; i < 9; i++) {
      const px = -wd / 2 + i * wd / 8 + Math.sin(t * 0.8 + i) * 22;
      g.globalAlpha = 0.30 + (i % 3) * 0.10;
      F(g, ell(px, -60 - (i % 3) * 42, 110, 56, 0), C.blueDk, null, 0);
    }
    g.globalAlpha = 0.9;
    dot(g, -wd / 5, -104, 9, C.red, C.goldHi, 2);
    dot(g, wd / 6, -92, 9, C.red, C.goldHi, 2);
    g.restore();
  }

  function shout(g, t, x, y) {
    g.save();
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = 0.72 - i * 0.14;
      g.strokeStyle = i % 2 ? C.goldHi : C.paper; g.lineWidth = 9 - i * 1.6;
      g.beginPath(); g.arc(x, y, 70 + i * 52 + Math.sin(t * 3 + i) * 6, -0.9, 0.9); g.stroke();
    }
    g.restore();
  }

  // 悟空 rig 缩放包装
  function wukong(g, t, opt = {}) {
    if (!FIG || !FIG.drawWukong) return;
    S.figure(g, t, (gg, tt) => FIG.drawWukong(gg, {
      pose: opt.pose || 'stand', t: tt,
      tilt: opt.tilt || 0, lift: opt.lift || 0,
      alpha: opt.alpha === undefined ? 1 : opt.alpha,
    }), { x: opt.x === undefined ? 1000 : opt.x, groundY: opt.groundY || GY,
           s: opt.s || 0.52, alpha: opt.alpha });
  }

  // ---------------------------------------------------------------- 环境组合
  function drawEnv(g, t, env, sp) {
    const parts = (env || '').split('+');
    parts.forEach((p) => {
      if (p === 'mount') S.mountains(g, t);
      else if (p === 'cloud') S.cloudSea(g, t, { y: 230, n: 7 });
      else if (p === 'tree') S.tree(g, t, { x: 1620, y: GY, s: 1.05 });
      else if (p === 'hall') S.hall(g, t, { x: 960, y: 470, w: 760, plaque: sp.hall || '宝 殿' });
      else if (p === 'cave') S.cave(g, t, { x: 760, y: 350, w: 620, h: 520 });
      else if (p === 'pagoda') S.pagoda(g, t, { x: 1560, y: 260, lv: 5 });
      else if (p === 'bridge') S.bridge(g, t, { y: 720 });
      else if (p === 'gate') S.gate(g, t, { x: 330, y: 500, plaque: sp.gate || '山 门' });
      else if (p === 'lotus') S.lotusThrone(g, t, { x: 1000, y: 790, w: 460 });
      else if (p === 'river') S.river(g, t, { y: 740 });
      else if (p === 'banners') S.banners(g, t, { n: 11, y: 790 });
      else if (p === 'fire') { /* 火焰延后到事件之后画前景，否则会被炉身/殿宇盖住 */ }
      else if (p === 'sutra') S.sutraHall(g, t, { x: 960, y: 250, cell: 76, n: 9, lit: sp.lit || 0 });
    });
  }

  // ---------------------------------------------------------------- 事件动作
  function drawEvent(g, t, lt, sp, n) {
    const ev = sp.ev, u = clamp(lt / 3.8), r = rng(17 + n * 13);
    const cast = (o) => silhouette(g, t, Object.assign({ groundY: GY }, o));

    switch (ev) {
      case 'stoneSplit': {
        // 仙石迸裂：石卵 + 裂纹 + 放射金光 + 石猴小影
        const x = 900, y = GY - 150, burst = ss(0, 1, clamp((lt - 0.55) / 1.2));
        F(g, poly([[x - 130, GY], [x - 118, y - 180], [x - 40, y - 260],
                   [x + 46, y - 258], [x + 122, y - 170], [x + 130, GY]]), C.blueDk, C.gold, 5);
        g.save(); g.globalAlpha = burst;
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * TAU + t * 0.2;
          g.strokeStyle = i % 2 ? C.goldHi : C.paper; g.lineWidth = 5 - (i % 3);
          g.beginPath(); g.moveTo(x + Math.cos(a) * 110, y - 120 + Math.sin(a) * 110);
          g.lineTo(x + Math.cos(a) * (240 + r() * 90), y - 120 + Math.sin(a) * (240 + r() * 90)); g.stroke();
        }
        g.restore();
        cast({ kind: 'wukongMini', x: x + 24, s: 0.70 * burst + 0.20,
               alpha: 0.35 + 0.65 * burst, col: C.gold });
        S.dust(g, t, { x, y: GY, n: 9, seed: 3 });
        break;
      }
      case 'curtain': {
        // 水帘洞：群猴下拜 + 悟空显影
        S.crowd(g, t, { n: 6, y: GY, seed: 31, palm: true, alpha: 0.72, spread: 900 });
        wukong(g, t, { x: 1080, s: 0.50, pose: 'stand', alpha: 0.30 + 0.70 * ss(0, 1, clamp(lt / 2.2)) });
        S.dust(g, t, { x: 760, y: GY, n: 6, seed: 8 });
        break;
      }
      case 'dragonPalace': {
        // 龙宫：两根盘龙柱 + 定海神针金光 + 水波
        for (const px of [420, 1500]) {
          F(g, poly([[px - 30, GY], [px - 30, 380], [px + 30, 380], [px + 30, GY]]), C.blue, C.gold, 4);
          for (let i = 0; i < 6; i++) {
            g.strokeStyle = C.goldHi; g.lineWidth = 4;
            g.beginPath(); g.arc(px, 420 + i * 78, 32, 0, TAU); g.stroke();
          }
        }
        const grow = ss(0, 1, clamp((lt - 0.4) / 1.6));
        F(g, poly([[940, GY], [940, GY - 420 * grow], [980, GY - 420 * grow], [980, GY]]), C.goldHi, C.earthDk, 4);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + t * 0.8;
          dot(g, 960 + Math.cos(a) * 120, GY - 220 + Math.sin(a) * 120, 6, C.goldHi, null, 0);
        }
        wukong(g, t, { x: 1160, s: 0.50, pose: 'smash', tilt: -0.03 });
        S.crowd(g, t, { n: 5, y: GY, seed: 55, alpha: 0.66, spread: 700 });
        break;
      }
      case 'battle': {
        // 大闹天宫：旗海 + 天兵 + 三道挥棒弧
        S.crowd(g, t, { n: 11, y: GY, seed: 71, spear: true, fall: clamp((lt - 0.8) / 1.8), spread: 1700 });
        wukong(g, t, { x: 980 + Math.sin(t * 1.2) * 90, s: 0.56, pose: 'smash', tilt: -0.08 });
        for (let k = 0; k < 3; k++) {
          g.save(); g.globalAlpha = 0.72 - k * 0.18;
          g.strokeStyle = k % 2 ? C.goldHi : C.paper; g.lineWidth = 8 - k * 2;
          g.beginPath(); g.arc(1060, 520, 150 + k * 66 + t * 22, -1.2, 0.7); g.stroke();
          g.restore();
        }
        S.dust(g, t, { x: 860, y: GY, n: 9, seed: 12 });
        S.dust(g, t, { x: 1360, y: GY, n: 7, seed: 19 });
        break;
      }
      case 'furnace': {
        // 八卦炉：炉身 + 火焰 + 悟空跃出
        F(g, poly([[820, GY], [820, 560], [1100, 560], [1100, GY]]), C.earthDk, C.gold, 5);
        F(g, poly([[790, 560], [1130, 560], [1080, 480], [840, 480]]), C.blueDk, C.gold, 4);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          F(g, poly([[960 + Math.cos(a) * 60 - 12, 700 + Math.sin(a) * 60],
                     [960 + Math.cos(a) * 60 + 12, 700 + Math.sin(a) * 60],
                     [960 + Math.cos(a + 0.4) * 60, 700 + Math.sin(a + 0.4) * 60]]), C.goldHi, null, 0);
        }
        S.fire(g, t, { x: 960, y: 786, w: 340, n: 12 });
        wukong(g, t, { x: 1320, s: 0.50, pose: 'smash', lift: 30 + Math.sin(t * 2) * 12, alpha: ss(0, 1, clamp((lt - 0.7) / 1.1)) });
        break;
      }
      case 'mountainFall': {
        // 五行山落下：山体自上压下 + 六字压帖
        const drop = ss(0, 1, clamp((lt - 0.35) / 1.5));
        g.save(); g.translate(0, -560 * (1 - drop));
        F(g, poly([[640, GY], [700, 520], [820, 380], [960, 300], [1120, 380], [1240, 540], [1280, GY]]),
          C.greenDk, C.gold, 5);
        for (let i = 0; i < 5; i++) {
          g.strokeStyle = C.earthDk; g.lineWidth = 3;
          g.beginPath(); g.moveTo(760 + i * 100, 480 + (i % 2) * 60);
          g.lineTo(820 + i * 100, 620); g.stroke();
        }
        g.restore();
        F(g, poly([[900, 420], [1020, 420], [1020, 520], [900, 520]]), C.paper, C.red, 3);
        htext(g, '唵嘛呢叭咪吽', 960, 480, 22, C.red, 0);
        S.dust(g, t, { x: 960, y: GY, n: 10, seed: 27 });
        break;
      }
      case 'unseal': {
        // 揭帖：唐僧白马侧影 + 悟空起身
        const lift = ss(0, 1, clamp((lt - 0.6) / 1.3));
        g.save(); g.globalAlpha = 1 - lift;
        F(g, poly([[900, 420], [1020, 420], [1020, 520], [900, 520]]), C.paper, C.red, 3);
        g.restore();
        cast({ kind: 'monk', x: 520, s: 0.86, col: C.red });
        cast({ kind: 'horse', x: 720, s: 0.72 });
        wukong(g, t, { x: 1120, s: 0.48 + 0.06 * lift, pose: 'stand', alpha: 0.45 + 0.55 * lift });
        S.mountains(g, t);
        break;
      }
      case 'journey': {
        // 取经路：山道纵深 + 四人一马横移
        g.save();
        F(g, poly([[0, GY], [420, 690], [820, 660], [1200, 706], [1920, 640], [1920, GY]]), C.earthHi || C.earth, C.earthDk, 4);
        g.restore();
        const shift = Math.sin(t * 0.35) * 60;
        cast({ kind: 'monk', x: 620 + shift, s: 0.78, col: C.red });
        cast({ kind: 'horse', x: 790 + shift, s: 0.62 });
        cast({ kind: 'wukongMini', x: 1010 + shift, s: 0.66, col: C.gold });
        cast({ kind: 'pig', x: 1190 + shift, s: 0.70, col: C.blueDk });
        cast({ kind: 'sha', x: 1350 + shift, s: 0.68, col: C.greenDk });
        S.dust(g, t, { x: 760 + shift, y: GY, n: 8, seed: 33 });
        break;
      }
      case 'temple': {
        // 寺院讲经：僧众合十 + 主尊
        S.crowd(g, t, { n: 10, y: GY, seed: 43, palm: true, alpha: 0.78, spread: 1700 });
        cast({ kind: 'monk', x: 960, s: 1.08, col: C.red });
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * TAU + t * 0.25;
          dot(g, 960 + Math.cos(a) * 170, 560 + Math.sin(a) * 90, 7, C.goldHi, null, 0);
        }
        break;
      }
      case 'riverCross': {
        // 渡河：舟 + 篙 + 水波
        const bob = Math.sin(t * 1.4) * 9;
        g.save(); g.translate(0, bob);
        F(g, poly([[700, 800], [1220, 800], [1140, 862], [780, 862]]), C.earthDk, C.gold, 4);
        F(g, poly([[720, 796], [1200, 796], [1200, 786], [720, 786]]), C.gold, null, 0);
        g.restore();
        cast({ kind: 'monk', x: 900, groundY: 800 + bob, s: 0.66, col: C.red });
        cast({ kind: 'sha', x: 1080, groundY: 800 + bob, s: 0.62, col: C.greenDk });
        g.strokeStyle = C.gold; g.lineWidth = 6;
        g.beginPath(); g.moveTo(1150, 790 + bob); g.lineTo(1260, 620 + bob); g.stroke();
        break;
      }
      case 'lotus': {
        // 南海莲台：净瓶杨柳 + 信众
        S.crowd(g, t, { n: 8, y: GY, seed: 61, palm: true, alpha: 0.66, spread: 1600 });
        cast({ kind: 'guanyin', x: 1000, groundY: 790, s: 1.12, col: C.paper });
        for (let i = 0; i < 12; i++) {
          const px = pmod(i * 190 + t * 60, W + 200) - 100, py = 250 + (i % 4) * 120;
          g.save(); g.globalAlpha = 0.55;
          F(g, ell(px, py, 22, 10, 0), C.paper, C.gold, 1.8); g.restore();
        }
        break;
      }
      case 'duel': {
        // 灌江口斗法：两阵对峙 + 哮天犬 + 六兄弟
        S.crowd(g, t, { n: 6, y: GY, seed: 81, spear: true, alpha: 0.76, spread: 700 });
        wukong(g, t, { x: 620, s: 0.50, pose: 'smash', tilt: 0.05 });
        cast({ kind: 'erlang', x: 1360, s: 1.05, col: C.blue });
        // 哮天犬
        F(g, poly([[1500, GY], [1500, GY - 62], [1580, GY - 62], [1580, GY]]), C.earthDk, C.gold, 2.4);
        F(g, poly([[1580, GY - 62], [1620, GY - 96], [1632, GY - 62]]), C.earthDk, C.gold, 2.4);
        for (let k = 0; k < 3; k++) {
          g.save(); g.globalAlpha = 0.66 - k * 0.16;
          g.strokeStyle = k % 2 ? C.goldHi : C.paper; g.lineWidth = 7 - k * 2;
          g.beginPath(); g.arc(990, 560, 190 + k * 70 + t * 18, -1.1, 0.9); g.stroke();
          g.restore();
        }
        break;
      }
      case 'horse': {
        // 鹰愁涧：白马化形 + 涧水
        cast({ kind: 'horse', x: 980, s: 1.20 });
        cast({ kind: 'monk', x: 580, s: 0.78, col: C.red });
        wukong(g, t, { x: 1400, s: 0.46, pose: 'stand' });
        S.dust(g, t, { x: 980, y: GY, n: 8, seed: 47 });
        break;
      }
      case 'rake': {
        // 高老庄：院落 + 九齿耙筑地
        cast({ kind: 'pig', x: 1040, s: 1.14, col: C.blueDk });
        S.crowd(g, t, { n: 5, y: GY, seed: 91, alpha: 0.62, spread: 760 });
        S.dust(g, t, { x: 1200, y: GY, n: 7, seed: 53 });
        break;
      }
      case 'chant': {
        // 经卷 / 贝叶金光
        F(g, poly([[760, 620], [1160, 620], [1160, 780], [760, 780]]), C.paper, C.gold, 4);
        for (let i = 0; i < 7; i++) {
          g.strokeStyle = C.earthDk; g.lineWidth = 3;
          g.beginPath(); g.moveTo(790, 650 + i * 18); g.lineTo(1130, 650 + i * 18); g.stroke();
        }
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU + t * 0.4;
          dot(g, 960 + Math.cos(a) * 280, 700 + Math.sin(a) * 150, 6, C.goldHi, null, 0);
        }
        cast({ kind: 'monk', x: 1400, s: 0.9, col: C.red });
        break;
      }
      case 'sutra': {
        // 收口片：81 格难簿逐幕点亮（每幕点亮 (n-1)/8 的格子）
        S.sutraHall(g, t, { x: 960, y: 230, cell: 76, n: 9, lit: Math.round(n / 8 * 81) });
        cast({ kind: 'buddha', x: 1550, s: 0.78, col: C.red });
        S.crowd(g, t, { n: 7, y: GY, seed: 101, palm: true, alpha: 0.60, spread: 900 });
        break;
      }
      // ================= 悟空片：补齐水帘洞 + 后四幕逐句对齐 =================
      case 'waterCurtain': {
        // 第2幕「水帘洞纵身一跃，众猴拜他为王」：洞口 + 瀑布水帘 + 跃入 + 群猴
        const cx = 960, top = 290;
        F(g, poly([[cx - 330, GY], [cx - 300, top + 190], [cx - 190, top],
                   [cx + 190, top], [cx + 300, top + 190], [cx + 330, GY]]), C.blueDk, C.gold, 5);
        F(g, poly([[cx - 205, GY], [cx - 188, top + 120], [cx + 188, top + 120], [cx + 205, GY]]),
          C.earthDk, C.blue, 3);
        waterfall(g, t, cx, top + 118, 376, GY - top - 118);
        const jump = ss(0, 1, clamp(lt / 2.4));
        cast({ kind: 'wukongMini', x: 420 + 540 * jump,
               groundY: GY - 110 - Math.sin(jump * Math.PI) * 230,
               s: 0.60, tilt: -0.18, col: C.gold, alpha: 0.35 + 0.65 * jump });
        S.crowd(g, t, { n: 7, y: GY, seed: 31, palm: true, alpha: 0.74, spread: 1500 });
        S.dust(g, t, { x: cx, y: GY, n: 6, seed: 8 });
        break;
      }
      case 'guardTang': {
        // 第6幕「揭帖那一日，他转身护唐僧西行」：压帖揭去 + 唐僧白马 + 悟空护送
        g.save(); g.globalAlpha = 1 - ss(0, 1, clamp(lt / 1.4));
        F(g, poly([[900, 420], [1020, 420], [1020, 520], [900, 520]]), C.paper, C.red, 3);
        htext(g, '唵嘛呢叭咪吽', 960, 480, 22, C.red, 0);
        g.restore();
        cast({ kind: 'monk', x: 520, s: 0.94, col: C.red });
        cast({ kind: 'horse', x: 760, s: 0.82 });
        wukong(g, t, { x: 1220, s: 0.56, pose: 'stand', tilt: -0.05 });
        S.dust(g, t, { x: 900, y: GY, n: 6, seed: 27 });
        break;
      }
      case 'buddhaWukong': {
        // 第7幕「八十一难历尽，方成斗战胜佛」：莲台 + 佛光 + 金身
        S.lotusThrone(g, t, { x: 960, y: 790, w: 520 });
        halo(g, t, 960, 470, 118);
        wukong(g, t, { x: 960, groundY: 790, s: 0.58, pose: 'stand' });
        S.crowd(g, t, { n: 9, y: GY, seed: 107, palm: true, alpha: 0.60, spread: 1700 });
        break;
      }
      case 'staffRest': {
        // 第8幕「一根金箍棒，终究收进了耳中」：长棒渐短 + 收势
        const shrink = ss(0, 1, clamp((lt - 0.5) / 1.8));
        const len = 420 * (1 - shrink) + 26;
        F(g, poly([[1240, GY - 150], [1240 + len, GY - 150],
                   [1240 + len, GY - 136], [1240, GY - 136]]), C.goldHi, C.earthDk, 3);
        wukong(g, t, { x: 860, s: 0.54, pose: 'stand' });
        for (let i = 0; i < 10; i++)
          dot(g, 1180 + Math.cos(i * 0.9 + t) * 40 * shrink,
              GY - 150 + Math.sin(i * 0.9 + t) * 40 * shrink, 5, C.goldHi, null, 0);
        halo(g, t, 860, 540, 70);
        break;
      }

      // ================= 白龙马片：全片只有白龙 / 白马，不出现悟空 =================
      case 'dragonPrince': {
        // 1「西海龙宫三子，一怒烧了殿上珠」
        for (const px of [420, 1500]) {
          F(g, poly([[px - 28, GY], [px - 28, 380], [px + 28, 380], [px + 28, GY]]), C.blue, C.gold, 4);
          for (let i = 0; i < 5; i++) {
            g.strokeStyle = C.goldHi; g.lineWidth = 4;
            g.beginPath(); g.arc(px, 430 + i * 86, 30, 0, TAU); g.stroke();
          }
        }
        pearl(g, t, 960, 470, 1.45, ss(0, 1, clamp(lt / 2.0)));
        dragon(g, t, { x: 900, y: GY - 230, s: 0.92, alpha: 0.92 });
        break;
      }
      case 'ravineWait': {
        // 2「悬在鹰愁涧底，等一队人马过河」
        dragon(g, t, { x: 960, y: 620, s: 0.86, alpha: 0.78 });
        g.strokeStyle = C.gold; g.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
          g.beginPath(); g.moveTo(700 + i * 90, 250);
          g.quadraticCurveTo(730 + i * 90, 420, 700 + i * 90, 560); g.stroke();
        }
        cast({ kind: 'monk', x: 300, s: 0.30, col: C.red, alpha: 0.52 });
        cast({ kind: 'horse', x: 440, s: 0.26, alpha: 0.52 });
        cast({ kind: 'sha', x: 1620, s: 0.28, col: C.greenDk, alpha: 0.52 });
        break;
      }
      case 'horseTransform': {
        // 3「观音点化那日，化作白马驮起经」
        cast({ kind: 'guanyin', x: 500, groundY: 790, s: 0.90, col: C.paper });
        dragon(g, t, { x: 1420, y: 590, s: 0.62, alpha: 0.38 * (1 - ss(0, 1, lt / 2.2)) });
        cast({ kind: 'horse', x: 1080, s: 1.02, alpha: ss(0, 1, lt / 2.0) });
        sutraBox(g, t, 1080, GY - 258, 140);
        halo(g, t, 1080, 540, 76, C.blue);
        break;
      }
      case 'horseTread': {
        // 4「蹄声踏过流沙，从不抢一句人话」
        cast({ kind: 'horse', x: 960 + Math.sin(t * 0.6) * 70, s: 1.12 });
        sutraBox(g, t, 960 + Math.sin(t * 0.6) * 70, GY - 258, 140);
        for (let i = 0; i < 6; i++)
          F(g, ell(300 + i * 260, GY + 6, 16, 6, 0), C.earthDk, null, 0);
        S.dust(g, t, { x: 820, y: GY, n: 12, seed: 47 });
        break;
      }
      case 'dragonRescue': {
        // 5「师父被掳那夜，他化龙潜入妖洞」
        F(g, poly([[1300, GY], [1300, 520], [1390, 400], [1560, 400], [1650, 520], [1650, GY]]),
          C.earthDk, C.gold, 4);
        F(g, poly([[1370, GY], [1370, 530], [1440, 452], [1510, 452], [1580, 530], [1580, GY]]),
          C.blueDk, null, 0);
        dragon(g, t, { x: 1000, y: 620, s: 1.00 });
        cast({ kind: 'monk', x: 420, s: 0.42, col: C.red, alpha: 0.58 });
        for (const px of [1520, 1720]) {
          F(g, poly([[px - 10, GY], [px - 10, GY - 150], [px + 10, GY - 150], [px + 10, GY]]),
            C.earthDk, C.gold, 2);
          F(g, poly([[px - 20, GY - 150], [px, GY - 210 + Math.sin(t * 3 + px) * 10],
                     [px + 20, GY - 150]]), C.red, C.goldHi, 1.6);
        }
        break;
      }
      case 'horseReturn': {
        // 6「负伤归来不语，只把缰绳递回去」
        cast({ kind: 'horse', x: 960, s: 1.00 });
        g.strokeStyle = C.gold; g.lineWidth = 5;
        g.beginPath(); g.moveTo(1080, GY - 210);
        g.quadraticCurveTo(1300, GY - 300, 1420, GY - 160); g.stroke();
        cast({ kind: 'monk', x: 1520, s: 0.50, col: C.red, alpha: 0.70 });
        S.dust(g, t, { x: 900, y: GY, n: 7, seed: 59 });
        break;
      }
      case 'dragonPillar': {
        // 7「灵山化柱盘绕，八部天龙受封时」
        F(g, poly([[900, GY], [900, 220], [1020, 220], [1020, GY]]), C.gold, C.earthDk, 4);
        dragon(g, t, { x: 960, y: 520, s: 0.88 });
        halo(g, t, 960, 420, 90);
        S.crowd(g, t, { n: 8, y: GY, seed: 109, palm: true, alpha: 0.60, spread: 1600 });
        break;
      }
      case 'seaReturn': {
        // 8「一副鞍鞯卸下，终于回了西海潮」
        F(g, poly([[360, GY - 40], [560, GY - 40], [540, GY - 110], [380, GY - 110]]),
          C.red, C.gold, 3);
        dragon(g, t, { x: 1120, y: 600, s: 0.92, alpha: ss(0, 1, lt / 2.2) });
        g.strokeStyle = C.blue; g.lineWidth = 6;
        for (let i = 0; i < 5; i++) {
          g.beginPath(); g.moveTo(700 + i * 250, GY - 30);
          g.quadraticCurveTo(760 + i * 250, GY - 84, 820 + i * 250, GY - 30); g.stroke();
        }
        break;
      }

      // ================= 沙僧片：主角恒为沙僧（骷髅项链 + 宝杖） =================
      case 'glassBreak': {
        // 1「卷帘大将失手，琉璃盏碎在瑶池」
        cast({ kind: 'sha', x: 960, s: 1.04, col: C.greenDk });
        const spread = ss(0, 1, clamp(lt / 1.6));
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU + t * 0.3, rr = 90 + spread * 150;
          const cx2 = 960 + Math.cos(a) * rr, cy2 = 520 + Math.sin(a) * rr;
          F(g, poly([[cx2 - 18, cy2 - 12], [cx2 + 20, cy2 - 20], [cx2 + 12, cy2 + 18]]),
            C.paper, C.blueDk, 2);
        }
        halo(g, t, 960, 520, 42, C.blue);
        break;
      }
      case 'skullNecklace': {
        // 2「流沙河八百里，骷髅串成颈上环」
        cast({ kind: 'sha', x: 960, s: 1.06, col: C.greenDk });
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU;
          const sx = 960 + Math.cos(a) * 132, sy = GY - 250 + Math.sin(a) * 54;
          F(g, ell(sx, sy, 18, 20, 0), C.paper, C.earthDk, 2);
          dot(g, sx - 6, sy - 3, 3, C.earthDk, null, 0);
          dot(g, sx + 6, sy - 3, 3, C.earthDk, null, 0);
        }
        break;
      }
      case 'shaJoin': {
        // 3「一柄降妖宝杖，随他拜入取经队」
        cast({ kind: 'sha', x: 1000, s: 1.12, col: C.greenDk });
        cast({ kind: 'guanyin', x: 470, groundY: 790, s: 0.64, col: C.paper, alpha: 0.78 });
        cast({ kind: 'monk', x: 1540, s: 0.44, col: C.red, alpha: 0.56 });
        halo(g, t, 1000, 540, 80);
        break;
      }
      case 'shaCarry': {
        // 4「挑担不问远近，脚步最稳是沉默」
        cast({ kind: 'sha', x: 960, s: 1.02, col: C.greenDk });
        g.strokeStyle = C.gold; g.lineWidth = 8;
        g.beginPath(); g.moveTo(760, GY - 230); g.lineTo(1160, GY - 230); g.stroke();
        for (const px of [740, 1140]) {
          g.strokeStyle = C.earthDk; g.lineWidth = 3;
          g.beginPath(); g.moveTo(px, GY - 230); g.lineTo(px, GY - 140); g.stroke();
          F(g, poly([[px - 52, GY - 140], [px + 52, GY - 140],
                     [px + 52, GY - 60], [px - 52, GY - 60]]), C.earthDk, C.gold, 3);
        }
        S.dust(g, t, { x: 960, y: GY, n: 9, seed: 53 });
        break;
      }
      case 'shaDive': {
        // 5「浊浪卷走经箱，他俯身探入河心」
        cast({ kind: 'sha', x: 960, s: 1.00, col: C.greenDk, tilt: 0.24 });
        sutraBox(g, t, 1300, GY - 46, 160);
        g.strokeStyle = C.blue; g.lineWidth = 7;
        for (let i = 0; i < 5; i++) {
          const wy = GY - 90 + i * 22;
          g.beginPath(); g.moveTo(700, wy);
          g.quadraticCurveTo(960, wy - 30 + Math.sin(t * 2 + i) * 10, 1220, wy); g.stroke();
        }
        break;
      }
      case 'shaSurface': {
        // 6「上岸只说一句，师父经卷都还在」
        cast({ kind: 'sha', x: 880, s: 1.06, col: C.greenDk });
        sutraBox(g, t, 1150, GY - 90, 180);
        cast({ kind: 'monk', x: 1500, s: 0.46, col: C.red, alpha: 0.60 });
        S.dust(g, t, { x: 880, y: GY, n: 7, seed: 61 });
        break;
      }
      case 'arhat': {
        // 7「灵山受封那日，金身罗汉立阶前」
        for (let i = 0; i < 4; i++)
          F(g, poly([[620 - i * 46, GY - i * 26], [1300 + i * 46, GY - i * 26],
                     [1300 + i * 46, GY - i * 26 + 18], [620 - i * 46, GY - i * 26 + 18]]),
            C.gold, C.earthDk, 2);
        halo(g, t, 960, 470, 108);
        cast({ kind: 'sha', x: 960, s: 1.16, col: C.gold });
        S.crowd(g, t, { n: 7, y: GY, seed: 113, palm: true, alpha: 0.58, spread: 1500 });
        break;
      }
      case 'skullSink': {
        // 8「一串骷髅项链，终究沉进了河底」
        const sink = ss(0, 1, lt / 3.2);
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU;
          const sx = 960 + Math.cos(a) * 110, sy = GY - 160 + sink * 220 + Math.sin(a) * 40;
          g.save(); g.globalAlpha = 1 - sink * 0.7;
          F(g, ell(sx, sy, 16, 18, 0), C.paper, C.earthDk, 2);
          dot(g, sx - 5, sy - 3, 3, C.earthDk, null, 0);
          dot(g, sx + 5, sy - 3, 3, C.earthDk, null, 0);
          g.restore();
        }
        cast({ kind: 'sha', x: 1500, s: 0.72, col: C.greenDk, alpha: 0.55 + 0.45 * (1 - sink) });
        break;
      }

      // ============ 八戒片：8 幕逐句对齐，主角全程都是猪八戒 ============
      // 台词轴 lines_bajie_scene.json：
      // 1 天蓬元帅醉酒，被贬下界投错胎 / 2 高老庄一入赘，丈人请人来降他
      // 3 九齿钉耙在手，云栈洞前认了师 / 4 贪睡又贪一口，担子总往肩上挪
      // 5 妖雾遮了前路，他先想着散伙回 / 6 却被师兄一喝，握耙护住师父身
      // 7 一路挑担到灵山，受封净坛使者 / 8 一柄九齿钉耙，终于靠在了肩头
      case 'marshalFall': {
        // 1 天庭醉酒 → 被贬 → 投错猪胎：金冠天蓬 + 酒坛 + 坠落光 + 小猪胎影
        jar(g, t, 560, GY, 1.05);
        jar(g, t, 660, GY, 0.82);
        jar(g, t, 1290, GY, 0.92);
        for (let i = 0; i < 12; i++) {
          g.save(); g.globalAlpha = 0.35 + (i % 4) * 0.13;
          dot(g, 700 + (i * 97) % 620, 400 - ((i * 83 + t * 90) % 300),
              5 + (i % 3) * 3, C.goldHi, null, 0);
          g.restore();
        }
        // 坠落轨迹：从殿前斜向下界（沿殿宇右侧空白走，避开匾额与主角）
        const fall = ss(0, 1, clamp((lt - 0.5) / 1.9));
        g.save(); g.globalAlpha = 0.78;
        g.strokeStyle = C.paper; g.lineWidth = 9; g.setLineDash([20, 14]);
        g.beginPath(); g.moveTo(1210, 300);
        g.quadraticCurveTo(1410, 450 + fall * 110, 1470, GY - 130); g.stroke();
        g.setLineDash([]);
        for (let i = 0; i < 7; i++) {
          const q = (i / 7 + fall * 0.3) % 1;
          dot(g, 1210 + 260 * q, 300 + (GY - 430) * q * q, 5, C.goldHi, null, 0);
        }
        g.restore();
        // 主角左移，让殿宇匾额「天 庭」完整露出
        bajie(g, t, { x: 790, s: 1.00, pose: 'marshal', col: C.gold,
                      tilt: 0.12 + Math.sin(t * 1.3) * 0.03, rakeRot: 0.22 });
        // 投错胎：地面上显影的小猪胎（放大到能读出扇耳 / 猪吻）
        halo(g, t, 1470, GY - 130, 76);
        bajie(g, t, { x: 1470, s: 0.46, alpha: 0.45 + 0.55 * fall,
                      pose: 'stand', col: C.red, rake: false });
        S.dust(g, t, { x: 1470, y: GY, n: 7, seed: 17 });
        break;
      }
      case 'gaolaoGroom': {
        // 2 高老庄入赘：新郎红披 + 灯笼 + 丈人请来的降妖人（悟空持棒）
        for (const px of [560, 1360]) {
          F(g, ell(px, 330, 44, 62, 0), C.red, C.gold, 3.2);
          F(g, poly([[px - 12, 392], [px + 12, 392], [px + 8, 430], [px - 8, 430]]),
            C.gold, C.earthDk, 2);
          g.strokeStyle = C.gold; g.lineWidth = 3;
          g.beginPath(); g.moveTo(px, 268); g.lineTo(px, 220); g.stroke();
        }
        // 新郎红披（画在人物之前会被压住，故用较大的披风轮廓垫底）
        F(g, poly([[790, GY], [812, GY - 210], [900, GY - 250],
                   [1010, GY - 250], [1090, GY - 210], [1070, GY]]), C.red, C.gold, 4);
        bajie(g, t, { x: 940, s: 1.04, pose: 'stand', col: C.red,
                      tilt: -0.04, rakeRot: 0.16 });
        F(g, poly([[860, GY - 246], [940, GY - 210], [1020, GY - 246]]), C.goldHi, C.earthDk, 2.4);
        // 丈人与请来的降妖人（配角压小、压淡，主体仍是八戒）
        cast({ kind: 'monk', x: 380, s: 0.48, col: C.earthDk, alpha: 0.66 });
        wukong(g, t, { x: 1520, s: 0.46, pose: 'smash', tilt: -0.06,
                       alpha: 0.55 + 0.40 * ss(0, 1, clamp(lt / 1.6)) });
        S.crowd(g, t, { n: 4, y: GY, seed: 63, alpha: 0.52, spread: 620 });
        break;
      }
      case 'rakeOath': {
        // 3 云栈洞前认师：九齿钉耙放大显影 + 八戒躬身 + 师父侧影（配角）
        const grow = ss(0, 1, clamp((lt - 0.35) / 1.5));
        rakeNine(g, t, { x: 1180, y: GY - 40, s: 0.62 + 0.72 * grow,
                         rot: -0.16, alpha: 0.42 + 0.58 * grow });
        halo(g, t, 1180, GY - 320, 88);
        bajie(g, t, { x: 760, s: 1.00, pose: 'stand', col: C.blueDk,
                      tilt: 0.17, rakeRot: 0.32, rakeS: 0.72 });
        cast({ kind: 'monk', x: 400, s: 0.62, col: C.red, alpha: 0.72 });
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU + t * 0.35;
          dot(g, 1180 + Math.cos(a) * (150 + i * 8), GY - 330 + Math.sin(a) * 110,
              5, C.goldHi, null, 0);
        }
        S.dust(g, t, { x: 760, y: GY, n: 6, seed: 23 });
        break;
      }
      case 'lazyBite': {
        // 4 贪睡又贪一口 + 担子挪到别人肩上
        bun(g, t, 900, GY - 6, 1.15);
        bajie(g, t, { x: 660, s: 0.98, pose: 'sleep', col: C.blueDk,
                      tilt: 0.19, rakeRot: 0.55, rakeX: 40, rakeY: -90 });
        // 打盹气泡
        for (let i = 0; i < 4; i++) {
          g.save(); g.globalAlpha = 0.62 - i * 0.10;
          dot(g, 730 + i * 22 + Math.sin(t * 1.1 + i) * 8,
              GY - 400 - i * 40, 8 + i * 3, C.paper, C.goldDk, 2);
          g.restore();
        }
        // 担子挪走：沙僧挑担（配角），扁担随时间往右移
        const shift = 90 * ss(0, 1, clamp((lt - 0.8) / 2.0));
        cast({ kind: 'sha', x: 1360 + shift, s: 0.82, col: C.greenDk, alpha: 0.86 });
        load(g, t, 1360 + shift, GY, 0.78);
        S.dust(g, t, { x: 1180, y: GY, n: 5, seed: 37 });
        break;
      }
      case 'fogQuit': {
        // 5 妖雾遮路 + 分行李散伙：八戒回身、三只包袱落地
        fog(g, t, 1180, GY - 90, 700);
        const turn = ss(0, 1, clamp((lt - 0.5) / 1.7));
        g.save(); g.globalAlpha = 0.42;
        g.strokeStyle = C.paper; g.lineWidth = 6; g.setLineDash([16, 12]);
        g.beginPath(); g.moveTo(940, GY - 240);
        g.quadraticCurveTo(620, GY - 360, 380 - turn * 60, GY - 210); g.stroke();
        g.setLineDash([]);
        g.restore();
        bajie(g, t, { x: 900, s: 1.00, pose: 'stand', col: C.blueDk,
                      tilt: -0.10 - turn * 0.06, rakeRot: 0.46, rakeX: 70, rakeY: -110 });
        for (let i = 0; i < 3; i++) {
          const a = 0.45 + 0.55 * ss(0, 1, clamp((lt - 0.6 - i * 0.3) / 0.9));
          g.save(); g.globalAlpha = a;
          bundle(g, t, 1250 + i * 150, GY - i * 8, 0.78);
          g.restore();
        }
        S.crowd(g, t, { n: 4, y: GY, seed: 71, alpha: 0.40, spread: 1500 });
        break;
      }
      case 'roarGuard': {
        // 6 师兄一喝 → 握耙护住师父身：悟空喝止 + 八戒横耙 + 师父在身后
        wukong(g, t, { x: 470, s: 0.50, pose: 'smash', tilt: -0.06 });
        shout(g, t, 560, 520);
        // 师父紧贴八戒身后，让「护住师父身」有明确的护与被护关系
        cast({ kind: 'monk', x: 1280, s: 0.84, col: C.red, alpha: 0.92 });
        bajie(g, t, { x: 1040, s: 1.06, pose: 'stand', col: C.blueDk,
                      tilt: -0.05, rakeRot: -1.24, rakeX: 20, rakeY: -186, rakeS: 0.92 });
        fog(g, t, 1720, GY - 120, 300);
        S.dust(g, t, { x: 1040, y: GY, n: 9, seed: 43 });
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + t * 0.7;
          dot(g, 1040 + Math.cos(a) * 190, 560 + Math.sin(a) * 110,
              5, C.goldHi, null, 0);
        }
        break;
      }
      case 'altarPig': {
        // 7 挑担到灵山、受封净坛使者：莲台 + 净坛供桌 + 佛光 + 八戒受职
        // SPECS 已置 noVerdict，不叠判词卡，让受封场景完整露出
        altar(g, t, 1440, GY - 12, 0.68);
        S.lotusThrone(g, t, { x: 720, y: GY - 36, w: 420 });
        halo(g, t, 720, 480, 116);
        bajie(g, t, { x: 720, groundY: GY - 46, s: 0.94, pose: 'stand',
                      col: C.gold, rakeRot: -0.52, rakeX: 40, rakeY: -140 });
        // 担子收在远处右下，不再与莲台 / 供桌挤成一团
        load(g, t, 1180, GY + 6, 0.50);
        S.crowd(g, t, { n: 8, y: GY, seed: 111, palm: true, alpha: 0.58, spread: 1600 });
        for (let i = 0; i < 14; i++) {
          const px = pmod(i * 170 + t * 55, W + 200) - 100, py = 240 + (i % 4) * 110;
          g.save(); g.globalAlpha = 0.5;
          F(g, ell(px, py, 20, 9, 0), C.paper, C.gold, 1.8); g.restore();
        }
        break;
      }
      case 'rakeRest': {
        // 8 钉耙终于靠在肩头：人物放左侧避开结句横幅 (x620..1300 / y620..800)
        bajie(g, t, { x: 470, s: 0.96, pose: 'stand', col: C.blueDk,
                      tilt: 0.02, rakeRot: -0.32, rakeX: 50, rakeY: -150, rakeS: 0.80 });
        halo(g, t, 470, 500, 74);
        // 收束只留人物肩头这一柄耙，不再放第二把淡耙造成重复
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU + t * 0.3;
          dot(g, 470 + Math.cos(a) * (120 + (i % 3) * 26),
              520 + Math.sin(a) * 96, 5, C.goldHi, null, 0);
        }
        S.dust(g, t, { x: 470, y: GY, n: 6, seed: 57 });
        break;
      }

      default: {
        cast({ kind: 'monk', x: 1000, s: 0.92, col: C.red });
      }
    }
  }

  // ---------------------------------------------------------------- 八部 × 八幕
  // t = 右上角榜题事件名；s = 回目小字；env = 环境构件组合；ev = 事件动作。
  const SPECS = {
    sunwukong_scene: [
      { t: '花果山·仙石', s: '第一回 灵根育孕', env: 'mount+cloud+tree', ev: 'stoneSplit' },
      { t: '水帘洞·跃入', s: '第一回 石猴拜洞', env: 'mount+cloud', ev: 'waterCurtain' },
      { t: '东海·龙宫', s: '第三回 定海神针', env: 'river+pagoda', ev: 'dragonPalace' },
      { t: '大闹·天宫', s: '第七回 齐天大圣', env: 'hall+cloud+banners', ev: 'battle' },
      { t: '五行·山下', s: '第七回 压帖五百年', env: 'mount+tree', ev: 'mountainFall' },
      { t: '揭帖·拜师', s: '第十四回 心猿归正', env: 'mount+gate', ev: 'guardTang' },
      { t: '灵山·成佛', s: '第一百回 斗战胜佛', env: 'lotus+cloud+pagoda', ev: 'buddhaWukong', noVerdict: true },
      { t: '收棒·归真', s: '第一百回 收束', env: 'mount+cloud+tree', ev: 'staffRest' },
    ],
    tangseng_scene: [
      { t: '金山·寺中', s: '附录 江流儿', env: 'gate+pagoda+mount', ev: 'temple' },
      { t: '长安·奉诏', s: '第十二回 观音奉旨', env: 'hall+banners', ev: 'chant' },
      { t: '五行·收徒', s: '第十四回 揭帖收猿', env: 'mount+tree', ev: 'unseal' },
      { t: '鹰愁·涧边', s: '第十五回 意马收缰', env: 'river+mount', ev: 'horse' },
      { t: '高老·庄前', s: '第十八回 收八戒', env: 'gate+tree', ev: 'rake' },
      { t: '流沙·河畔', s: '第二十二回 收沙僧', env: 'river+mount', ev: 'riverCross' },
      { t: '女儿·国境', s: '第五十四回 西梁女国', env: 'hall+banners', ev: 'journey' },
      { t: '灵山·取经', s: '第九十八回 功成', env: 'pagoda+cloud+lotus', ev: 'sutra' },
    ],
    // 逐句对照 lines_bajie_scene.json 重排（2026-11-12 第二轮人工审片）：
    // 旧 SPECS 按生平拟景，8 幕里 6 幕主角被事件库画成唐僧 / 僧人 / 佛祖；
    // 且 pig 剪影只有两只三角耳，读不出「猪」。以下 8 幕一律以 bajie() 为主角。
    bajie_scene: [
      { t: '天河·醉贬', s: '第八回 天蓬被贬', env: 'hall+cloud', hall: '天 庭', ev: 'marshalFall' },
      { t: '高老·入赘', s: '第十八回 招赘', env: 'gate+tree', gate: '高 老 庄', ev: 'gaolaoGroom' },
      { t: '云栈·认师', s: '第十九回 皈依', env: 'cave+mount', ev: 'rakeOath' },
      { t: '贪睡·挪担', s: '第三十二回 偷懒', env: 'mount+tree', ev: 'lazyBite' },
      { t: '妖雾·散伙', s: '第三十二回 分行李', env: 'mount+cloud', ev: 'fogQuit' },
      { t: '一喝·护师', s: '第三十二回 护持', env: 'mount+tree', ev: 'roarGuard' },
      { t: '灵山·净坛', s: '第一百回 受职', env: 'pagoda+cloud+lotus', ev: 'altarPig', noVerdict: true },
      { t: '钉耙·靠肩', s: '第一百回 收束', env: 'mount+cloud+tree', ev: 'rakeRest' },
    ],
    shaseng_scene: [
      { t: '瑶池·碎盏', s: '前身 卷帘', env: 'hall+cloud', ev: 'glassBreak' },
      { t: '流沙·八百里', s: '第二十二回 九骷', env: 'river+mount', ev: 'skullNecklace' },
      { t: '拜入·取经队', s: '第二十二回 皈依', env: 'gate+mount', ev: 'shaJoin' },
      { t: '挑担·沉默', s: '第一百回 一路挑担', env: 'mount+tree', ev: 'shaCarry' },
      { t: '浊浪·探河', s: '第四十三回 黑水', env: 'river+bridge', ev: 'shaDive' },
      { t: '上岸·经卷在', s: '第四十三回 晒经', env: 'river+tree', ev: 'shaSurface' },
      { t: '灵山·金身', s: '第一百回 受职', env: 'pagoda+cloud+lotus', ev: 'arhat', noVerdict: true },
      { t: '骷髅·沉河', s: '第一百回 收束', env: 'river+mount', ev: 'skullSink' },
    ],
    bailongma_scene: [
      { t: '西海·龙宫', s: '第十五回 龙子', env: 'river+pagoda', ev: 'dragonPrince' },
      { t: '鹰愁·涧底', s: '第十五回 待罪', env: 'river+mount', ev: 'ravineWait' },
      { t: '观音·点化', s: '第十五回 意马', env: 'river+cloud', ev: 'horseTransform' },
      { t: '流沙·蹄声', s: '第十五回 驮经', env: 'mount+tree', ev: 'horseTread' },
      { t: '妖洞·化龙', s: '第三十回 救主', env: 'mount+tree', ev: 'dragonRescue' },
      { t: '负伤·归队', s: '第三十回 缰绳', env: 'mount+gate', ev: 'horseReturn' },
      { t: '灵山·化柱', s: '第一百回 天龙', env: 'pagoda+cloud+lotus', ev: 'dragonPillar', noVerdict: true },
      { t: '西海·归潮', s: '第一百回 受职', env: 'river+cloud', ev: 'seaReturn' },
    ],
    guanyin_scene: [
      { t: '南海·紫竹', s: '第八回 慈悲', env: 'lotus+cloud+tree', ev: 'lotus' },
      { t: '莲台·说法', s: '第八回 寻人', env: 'lotus+hall', ev: 'temple' },
      { t: '长安·奉旨', s: '第十二回 化僧', env: 'gate+banners', ev: 'chant' },
      { t: '点化·三徒', s: '第八回 三箍', env: 'mount+cloud', ev: 'journey' },
      { t: '五庄·活树', s: '第二十六回 甘露', env: 'tree+mount', ev: 'rake' },
      { t: '火云·收童', s: '第四十二回 红孩儿', env: 'fire+lotus', ev: 'lotus' },
      { t: '通天·鱼篮', s: '第四十九回 收妖', env: 'river+bridge', ev: 'riverCross' },
      { t: '南海·归位', s: '第一百回 功德', env: 'lotus+cloud+pagoda', ev: 'sutra' },
    ],
    erlang_scene: [
      { t: '灌江·口庙', s: '第六回 显圣', env: 'gate+pagoda', ev: 'chant' },
      { t: '梅山·六圣', s: '第六回 结义', env: 'mount+tree', ev: 'journey' },
      { t: '奉旨·擒猴', s: '第六回 天兵', env: 'hall+banners', ev: 'battle' },
      { t: '斗法·七变', s: '第六回 变化', env: 'cloud+mount', ev: 'duel' },
      { t: '哮天·逐犬', s: '第六回 犬咬', env: 'tree+mount', ev: 'duel' },
      { t: '金刚·琢落', s: '第六回 老君', env: 'cloud+fire', ev: 'furnace' },
      { t: '收兵·归江', s: '第六回 罢战', env: 'mount+bridge', ev: 'journey' },
      { t: '显圣·千秋', s: '第六回 真君', env: 'gate+cloud+pagoda', ev: 'sutra' },
    ],
    finale_scene: [
      { t: '长安·启程', s: '第十二回 取经', env: 'gate+mount', ev: 'journey' },
      { t: '八十一·难起', s: '第九十九回 簿', env: 'sutra+cloud', ev: 'sutra' },
      { t: '山河·历劫', s: '第九十九回 难', env: 'mount+river+tree', ev: 'riverCross' },
      { t: '凌云·渡口', s: '第九十八回 脱胎', env: 'river+bridge', ev: 'riverCross' },
      { t: '无字·真经', s: '第九十八回 白本', env: 'hall+sutra', ev: 'chant' },
      { t: '落水·晒经', s: '第九十九回 晒', env: 'river+tree', ev: 'dust' },
      { t: '五圣·成真', s: '第一百回 受职', env: 'lotus+cloud+pagoda', ev: 'sutra' },
      { t: '灵山·圆满', s: '第一百回 功德', env: 'hall+cloud+lotus', ev: 'sutra' },
    ],
  };

  // 旧 key 的 FILMS 配置（判词 / 结句 / 钤印）直接复用，避免文案分叉。
  function oldCfg(key) {
    const OLD = (window.XY_SERIES && window.XY_SERIES.FILMS) || {};
    if (key === 'finale_scene')
      return { v1: '九九八十一难尽', v2: '功成行满见真如', seal: ['灵', '山'],
               ending: '五圣成真', caption: '西游记 · 灵山八十一难' };
    // 首支的 FILMS key 是 'sunwukong'（无 _v2 后缀），其余六位带 _v2。
    const k = key === 'sunwukong_scene' ? 'sunwukong' : key.replace('_scene', '_v2');
    return OLD[k] || OLD.sunwukong;
  }

  // ---------------------------------------------------------------- 幕包装
  function act(c, lt, t, n) {
    const key = window.SERIES_KEY || 'sunwukong_scene';
    const list = SPECS[key] || SPECS.sunwukong_scene;
    const sp = list[n - 1];
    const cfg = oldCfg(key);

    S.ground(c, t, { bgKey: key, groundY: GY });
    S.skyOrnament(c, t);
    drawEnv(c, t, sp.env, sp);
    drawEvent(c, t, lt, sp, n);
    // 火焰是前景层：必须在炉身 / 殿宇 / 人物之后画，否则会被整片盖住
    if ((sp.env || '').indexOf('fire') >= 0)
      S.fire(c, t, { x: 960, y: 668, w: 300, n: 9 });
    S.motion(c, t, n === 7 ? 0.45 : 1);
    S.near(c, t);
    S.colophon(c, t, lt, sp.t, sp.s);
    if (n >= 7) S.seal(c, t, lt, (cfg.seal || ['西', '游']));

    // 重排版第 7 幕要让「成佛 / 受封」场景真正露出来，不再叠判词卡遮住主角
    if (n === 7 && !sp.noVerdict) S.verdict(c, t, lt, cfg.v1 || '心猿归正', cfg.v2 || '意马收缰');
    if (n === 8) S.ending(c, t, lt, cfg.ending || '功成行满', cfg.caption || '西游记 · 人物场景版');
  }

  ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'].forEach((id, i) => {
    SCENES[id] = { draw(c, lt, t) { act(c, lt, t, i + 1); } };
  });

  window.XY_SCENE_FILMS = { SPECS, act, silhouette, wukong, drawEnv, drawEvent };
})();
