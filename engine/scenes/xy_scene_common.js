// 西游记 · 场景版公共构件库（window.XY_SCENE）
// ---------------------------------------------------------------------------
// 目标：把「中央竖幅立像 + 纹样」换成三国式「一幕一个具名场景」：
//       远中近三层纵深 + 山水/殿宇/洞府/河岸 + 群演 + 事件动作 + 榜题 + 钤印。
// 材质仍是 20_dunhuang（土红地仗 / 石青石绿 / 铁线描 / 火焰纹 / 藻井团花）。
// 本文件不加载 xy_series / xy_tight，不画中央海报框，旧 8 部逐像素零回归。
(() => {
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const X = window.XY;
  const { poly, F, ell, dot, vtext, htext, ss, clamp, lerp, rng, pmod } = X;

  // 敦煌重彩 · 场景色板（比立像版更沉，给远景留出空气）
  const C = {
    sky0: '#e9d3a8', sky1: '#d8ae7c', sky2: '#b9764a',
    earth: '#8a3b22', earthDk: '#5b2416', earthHi: '#bd6a3c',
    blue: '#2c6a78', blueDk: '#1c4552', blueHi: '#63a2a8',
    green: '#4c7c58', greenDk: '#31543c', greenHi: '#87a979',
    gold: '#d3a449', goldDk: '#9a712a', goldHi: '#f2dd9a',
    paper: '#f4e8cd', ink: '#2b1b10', red: '#b23a2c', white: '#fff6e4',
    shade: 'rgba(43,27,16,.55)',
  };

  // ---------------------------------------------------------------- 底 / 地仗
  // 缓存整屏地仗（每帧只 drawImage）；斑点与外框都在底图里。
  function ground(g, t, opt = {}) {
    const key = 'xy_scene_ground_' + (opt.bgKey || 'default');
    const bg = window.PAINT.cached(key, W, H, (k) => {
      const gr = k.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, C.sky0); gr.addColorStop(0.46, C.sky1); gr.addColorStop(1, C.sky2);
      k.fillStyle = gr; k.fillRect(0, 0, W, H);
      const r = rng(7331);
      for (let i = 0; i < 1500; i++) {
        const x = r() * W, y = r() * H, rr = 3 + r() * 26;
        k.beginPath(); k.arc(x, y, rr, 0, TAU);
        k.fillStyle = r() > 0.5
          ? `rgba(244,232,205,${0.012 + r() * 0.05})`
          : `rgba(90,36,20,${0.012 + r() * 0.05})`;
        k.fill();
      }
      // 顶部藻井团花带（场景版仍保留敦煌识别符，但不占中央）
      for (let i = 0; i < 16; i++) {
        const x = 60 + i * 120;
        k.strokeStyle = 'rgba(154,113,42,.30)'; k.lineWidth = 2.4;
        k.beginPath(); k.arc(x, 52, 26, 0, TAU); k.stroke();
        k.beginPath(); k.arc(x, 52, 12, 0, TAU); k.stroke();
      }
      k.strokeStyle = C.earthDk; k.lineWidth = 10; k.strokeRect(18, 18, W - 36, H - 36);
      k.strokeStyle = C.gold; k.lineWidth = 3.6; k.strokeRect(34, 34, W - 68, H - 68);
    });
    g.drawImage(bg, 0, 0);
    // 地面：一条起伏的土红线 + 赭底，人物/群演都站在这条线上
    const gy = opt.groundY || 886;
    g.save();
    g.fillStyle = 'rgba(91,36,22,.34)';
    g.beginPath(); g.moveTo(0, gy + 8);
    for (let x = 0; x <= W; x += 80) g.lineTo(x, gy + Math.sin(x * 0.004 + 1.2) * 7);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    g.strokeStyle = C.earthDk; g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, gy);
    for (let x = 0; x <= W; x += 80) g.lineTo(x, gy + Math.sin(x * 0.004 + 1.2) * 7);
    g.stroke();
    g.strokeStyle = C.gold; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, gy - 9);
    for (let x = 0; x <= W; x += 80) g.lineTo(x, gy - 9 + Math.sin(x * 0.004 + 1.2) * 7);
    g.stroke();
    g.restore();
    groundDetail(g, gy);
  }

  // 地面带砖缝：避免 y>groundY 的大片纯棕，同时不干扰字幕（字幕另在成片里烧）
  function groundDetail(g, gy) {
    g.save(); g.globalAlpha = 0.30;
    g.strokeStyle = C.earthDk; g.lineWidth = 2;
    for (let y = gy + 34, row = 0; y < H; y += 42, row++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (let x = (row % 2) * 60; x < W; x += 120) {
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 42); g.stroke();
      }
    }
    g.restore();
  }

  // 天空装饰：左上金日轮 + 循环飞天飘带，补敦煌壁画识别符与上半屏留白
  function skyOrnament(g, t) {
    const x = 232, y = 186;
    g.save(); g.globalAlpha = 0.72;
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = i % 2 ? C.goldHi : C.earthHi; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 74 + i * 20 + Math.sin(t * 0.6 + i) * 3, 0, TAU); g.stroke();
    }
    F(g, ell(x, y, 62, 62, 0), C.goldHi, C.goldDk, 3.4);
    g.restore();
    g.save(); g.globalAlpha = 0.42;
    for (let i = 0; i < 3; i++) {
      const ox = pmod(t * (26 + i * 11) + i * 620, W + 700) - 350;
      const oy = 150 + i * 74 + Math.sin(t * 0.8 + i) * 14;
      g.strokeStyle = [C.red, C.blue, C.green][i]; g.lineWidth = 11; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ox, oy);
      g.bezierCurveTo(ox + 120, oy - 52, ox + 230, oy + 58, ox + 360, oy - 12);
      g.stroke();
      g.strokeStyle = C.goldHi; g.lineWidth = 3;
      g.beginPath(); g.moveTo(ox + 20, oy + 8);
      g.bezierCurveTo(ox + 140, oy - 40, ox + 240, oy + 50, ox + 340, oy);
      g.stroke();
    }
    g.restore();
  }

  // ---------------------------------------------------------------- 远景：三层山
  function mountains(g, t, opt = {}) {
    const gy = opt.groundY || 886;
    const layers = [
      { y: gy - 330, amp: 96, col: 'rgba(44,106,120,.42)', line: 'rgba(28,69,82,.55)', seed: 11, step: 210, drift: 4 },
      { y: gy - 220, amp: 78, col: 'rgba(76,124,88,.48)', line: 'rgba(49,84,60,.62)', seed: 23, step: 170, drift: 8 },
      { y: gy - 120, amp: 54, col: 'rgba(138,59,34,.52)', line: 'rgba(91,36,22,.70)', seed: 37, step: 140, drift: 13 },
    ];
    layers.forEach((L, li) => {
      const r = rng(L.seed), dx = Math.sin(t * 0.12 + li) * L.drift;
      const pts = [];
      for (let x = -220; x <= W + 220; x += L.step) {
        const y = L.y - r() * L.amp;
        pts.push([x + dx, y]);
      }
      const p = poly([[-220 + dx, gy], ...pts, [W + 220 + dx, gy]]);
      F(g, p, L.col, L.line, 3.2);
      // 山脊铁线描 + 岩纹
      g.save(); g.strokeStyle = L.line; g.lineWidth = 2;
      for (let i = 1; i < pts.length - 1; i += 2) {
        const a = pts[i], b = pts[i + 1];
        g.beginPath(); g.moveTo(a[0], a[1] + 26); g.lineTo(a[0] + 22, a[1] + 60); g.lineTo(b[0] - 18, b[1] + 42); g.stroke();
      }
      g.restore();
    });
  }

  // 云海 / 火焰纹飘带（横向循环，给活气）
  function cloudSea(g, t, opt = {}) {
    const y0 = opt.y || 300, n = opt.n || 7;
    for (let i = 0; i < n; i++) {
      const x = pmod(i * 310 + t * (18 + i % 3 * 9), W + 500) - 250;
      const y = y0 + (i % 3) * 92 + Math.sin(t * 0.7 + i) * 10;
      g.save(); g.globalAlpha = 0.52 + 0.18 * Math.sin(t + i);
      const p = poly([
        [x - 150, y], [x - 96, y - 30], [x - 30, y - 38], [x + 30, y - 18],
        [x + 96, y - 34], [x + 156, y - 6], [x + 110, y + 26], [x + 20, y + 22], [x - 90, y + 28],
      ]);
      F(g, p, C.paper, C.gold, 2.6);
      // 火焰回卷的内心
      g.beginPath(); g.moveTo(x + 20, y + 8);
      g.quadraticCurveTo(x + 70, y - 26, x + 110, y + 4);
      g.strokeStyle = C.earthHi; g.lineWidth = 3; g.stroke();
      g.restore();
    }
  }

  // ---------------------------------------------------------------- 建筑 / 地貌
  function hall(g, t, opt = {}) {
    // 殿宇：台基 + 列柱 + 斗拱 + 歇山顶 + 匾
    const x = opt.x || 960, y = opt.y || 560, w = opt.w || 720, h = opt.h || 300;
    g.save();
    F(g, poly([[x - w / 2 - 40, y + h], [x + w / 2 + 40, y + h],
               [x + w / 2 + 20, y + h + 34], [x - w / 2 - 20, y + h + 34]]), C.earthDk, C.gold, 3);
    F(g, poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x - w / 2, y + h]]),
      'rgba(244,232,205,.72)', C.earthDk, 4);
    for (let i = 0; i <= 6; i++) {
      const px = x - w / 2 + i * w / 6;
      F(g, poly([[px - 13, y + 20], [px + 13, y + 20], [px + 13, y + h], [px - 13, y + h]]), C.red, C.goldDk, 2.4);
      F(g, poly([[px - 22, y + 12], [px + 22, y + 12], [px + 16, y + 26], [px - 16, y + 26]]), C.gold, C.earthDk, 2);
    }
    // 屋顶：起翘的歇山
    F(g, poly([[x - w / 2 - 70, y + 6], [x - w / 2 + 40, y - 76], [x + w / 2 - 40, y - 76],
               [x + w / 2 + 70, y + 6], [x + w / 2, y + 30], [x - w / 2, y + 30]]), C.blueDk, C.gold, 4.2);
    F(g, poly([[x - w / 2 - 70, y + 6], [x - w / 2 - 108, y - 22], [x - w / 2 - 44, y - 14]]), C.gold, C.earthDk, 2);
    F(g, poly([[x + w / 2 + 70, y + 6], [x + w / 2 + 108, y - 22], [x + w / 2 + 44, y - 14]]), C.gold, C.earthDk, 2);
    if (opt.plaque) {
      F(g, poly([[x - 108, y + 42], [x + 108, y + 42], [x + 108, y + 96], [x - 108, y + 96]]), C.earthDk, C.gold, 3);
      htext(g, opt.plaque, x, y + 82, 34, C.paper, 1);
    }
    g.restore();
  }

  function cave(g, t, opt = {}) {
    // 洞府：拱形石门 + 水滴帘 + 石笋
    const x = opt.x || 960, y = opt.y || 430, w = opt.w || 560, h = opt.h || 440;
    g.save();
    g.beginPath();
    g.moveTo(x - w / 2, y + h);
    g.lineTo(x - w / 2, y + 150);
    g.quadraticCurveTo(x - w / 2, y - 90, x, y - 90);
    g.quadraticCurveTo(x + w / 2, y - 90, x + w / 2, y + 150);
    g.lineTo(x + w / 2, y + h);
    g.closePath();
    g.fillStyle = C.earthDk; g.fill();
    g.strokeStyle = C.gold; g.lineWidth = 8; g.stroke();
    g.save(); g.clip();
    const gr = g.createLinearGradient(0, y - 90, 0, y + h);
    gr.addColorStop(0, 'rgba(28,69,82,.92)'); gr.addColorStop(1, 'rgba(44,106,120,.30)');
    g.fillStyle = gr; g.fillRect(x - w / 2, y - 90, w, h + 90);
    // 水帘：纵向流线随时间移动
    for (let i = 0; i < 22; i++) {
      const px = x - w / 2 + 16 + i * (w - 32) / 22;
      const off = pmod(t * (120 + i % 5 * 40) + i * 53, h + 160) - 80;
      g.strokeStyle = `rgba(244,232,205,${0.18 + (i % 3) * 0.12})`; g.lineWidth = 3 + (i % 3);
      g.beginPath(); g.moveTo(px, y - 90 + off); g.lineTo(px + Math.sin(t + i) * 6, y - 90 + off + 120); g.stroke();
    }
    // 洞内石笋
    for (let i = 0; i < 7; i++) {
      const px = x - w / 2 + 40 + i * (w - 80) / 7;
      F(g, poly([[px - 22, y + h], [px, y + h - 90 - (i % 3) * 40], [px + 22, y + h]]), C.blueDk, null, 0);
    }
    g.restore(); g.restore();
  }

  function pagoda(g, t, opt = {}) {
    const x = opt.x || 1540, y = opt.y || 300, w = opt.w || 160, lv = opt.lv || 5;
    for (let i = 0; i < lv; i++) {
      const yy = y + i * 104, ww = w - i * 14;
      F(g, poly([[x - ww / 2, yy + 82], [x + ww / 2, yy + 82], [x + ww / 2, yy + 12], [x - ww / 2, yy + 12]]),
        'rgba(244,232,205,.78)', C.earthDk, 3);
      F(g, poly([[x - ww / 2 - 22, yy + 16], [x, yy - 18], [x + ww / 2 + 22, yy + 16]]), C.blueDk, C.gold, 3);
      dot(g, x, yy - 22, 6, C.goldHi, C.earthDk, 1.6);
    }
  }

  function bridge(g, t, opt = {}) {
    const y = opt.y || 720;
    g.save(); g.strokeStyle = C.earthDk; g.lineWidth = 18;
    g.beginPath(); g.moveTo(60, y + 40); g.quadraticCurveTo(480, y - 90, 900, y + 10); g.stroke();
    g.strokeStyle = C.gold; g.lineWidth = 4;
    g.beginPath(); g.moveTo(60, y + 24); g.quadraticCurveTo(480, y - 106, 900, y - 6); g.stroke();
    for (let i = 0; i < 9; i++) {
      const x = 120 + i * 92;
      g.strokeStyle = C.earthDk; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x, y - 10 + Math.sin(i) * 8); g.lineTo(x, y - 54); g.stroke();
    }
    g.restore();
  }

  function gate(g, t, opt = {}) {
    const x = opt.x || 300, y = opt.y || 560, w = opt.w || 340;
    F(g, poly([[x - w / 2, y + 320], [x - w / 2, y + 40], [x - w / 2 + 30, y], [x + w / 2 - 30, y],
               [x + w / 2, y + 40], [x + w / 2, y + 320]]), C.earth, C.gold, 4);
    F(g, poly([[x - 90, y + 320], [x - 90, y + 130], [x, y + 90], [x + 90, y + 130], [x + 90, y + 320]]), C.ink, C.gold, 3);
    F(g, poly([[x - 130, y + 30], [x + 130, y + 30], [x + 130, y + 74], [x - 130, y + 74]]), C.earthDk, C.gold, 3);
    if (opt.plaque) htext(g, opt.plaque, x, y + 63, 28, C.paper, 1);
  }

  function lotusThrone(g, t, opt = {}) {
    const x = opt.x || 960, y = opt.y || 760, w = opt.w || 420;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + i / 8 * Math.PI;
      F(g, poly([[x, y], [x + Math.cos(a) * w / 2, y + Math.sin(a) * 92],
                 [x + Math.cos(a + 0.18) * w / 2, y + Math.sin(a + 0.18) * 92]]),
        i % 2 ? C.paper : C.goldHi, C.earthDk, 2.4);
    }
    F(g, poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 30, y + 44], [x - w / 2 + 30, y + 44]]), C.red, C.gold, 3);
  }

  function sutraHall(g, t, opt = {}) {
    // 经卷台：九宫格难簿 / 藏经架，收口片用
    const x = opt.x || 960, y = opt.y || 400, cell = opt.cell || 92, n = opt.n || 9;
    const w = cell * n;
    F(g, poly([[x - w / 2 - 26, y - 26], [x + w / 2 + 26, y - 26],
               [x + w / 2 + 26, y + w + 26], [x - w / 2 - 26, y + w + 26]]), C.earthDk, C.gold, 5);
    for (let r0 = 0; r0 < n; r0++) for (let c0 = 0; c0 < n; c0++) {
      const lit = (opt.lit === undefined ? 81 : opt.lit) > r0 * n + c0;
      F(g, poly([[x - w / 2 + c0 * cell, y + r0 * cell],
                 [x - w / 2 + (c0 + 1) * cell - 4, y + r0 * cell],
                 [x - w / 2 + (c0 + 1) * cell - 4, y + (r0 + 1) * cell - 4],
                 [x - w / 2 + c0 * cell, y + (r0 + 1) * cell - 4]]),
        lit ? C.goldHi : '#6b4a32', C.goldDk, 1.8);
      if (lit) dot(g, x - w / 2 + c0 * cell + cell / 2, y + r0 * cell + cell / 2, 6, C.red, null, 0);
    }
  }

  function river(g, t, opt = {}) {
    const y = opt.y || 720;
    const gr = g.createLinearGradient(0, y, 0, H);
    gr.addColorStop(0, 'rgba(44,106,120,.72)'); gr.addColorStop(1, 'rgba(28,69,82,.92)');
    g.fillStyle = gr; g.fillRect(0, y, W, H - y);
    for (let k = 0; k < 7; k++) {
      const yy = y + 24 + k * 46;
      g.strokeStyle = `rgba(244,232,205,${0.30 - k * 0.025})`; g.lineWidth = 3 + (k % 2) * 2;
      g.beginPath();
      for (let x = -40; x <= W + 40; x += 40) {
        const wy = yy + Math.sin(x * 0.011 + t * (1.4 + k * 0.12) + k) * (9 + k * 2);
        if (x === -40) g.moveTo(x, wy); else g.lineTo(x, wy);
      }
      g.stroke();
    }
  }

  // ---------------------------------------------------------------- 群演 / 气氛
  function banners(g, t, opt = {}) {
    const n = opt.n || 12, y = opt.y || 760;
    const r = rng(91);
    for (let i = 0; i < n; i++) {
      const x = 70 + i * (W - 140) / n + r() * 40;
      const h = 150 + r() * 110, sway = Math.sin(t * 1.5 + i * 0.7) * 14;
      g.save(); g.globalAlpha = opt.alpha === undefined ? 0.68 : opt.alpha;
      g.strokeStyle = C.earthDk; g.lineWidth = 7;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke();
      F(g, poly([[x, y - h], [x + 74 + sway, y - h + 16], [x + 62 + sway, y - h + 74],
                 [x, y - h + 60]]), i % 3 ? C.red : C.blueDk, C.gold, 2.6);
      g.restore();
    }
  }

  // 群演剪影：可逐节倒伏 / 横移 / 合十，是「场景里有事件」的关键
  function crowd(g, t, opt = {}) {
    const n = opt.n || 9, y = opt.y || 882, spread = opt.spread || 1700;
    const r = rng(opt.seed || 421), fall = opt.fall || 0, march = opt.march || 0;
    for (let i = 0; i < n; i++) {
      const x = 110 + i * spread / Math.max(1, n - 1) + (r() - 0.5) * 46 + Math.sin(t * 0.6 + i) * march;
      const s = 0.82 + (i % 3) * 0.12, a = opt.alpha === undefined ? 0.82 : opt.alpha;
      const f = clamp((fall - i * 0.13) / 0.4) * (i % 2 ? 1.08 : -1.08);
      g.save(); g.translate(x, y); g.rotate(f); g.scale(s, s); g.globalAlpha = a;
      F(g, poly([[-24, 0], [-16, -92], [16, -92], [24, 0]]), C.ink, null, 0);
      F(g, ell(0, -108, 15, 17, 0), C.ink, null, 0);
      // 手臂 / 兵器：随摆动改变，避免死板
      g.strokeStyle = C.ink; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-14, -78); g.lineTo(-40 + Math.sin(t * 1.3 + i) * 8, -46); g.stroke();
      g.beginPath(); g.moveTo(14, -78); g.lineTo(38 + Math.sin(t * 1.1 + i) * 8, -52); g.stroke();
      if (opt.spear) {
        g.strokeStyle = C.goldDk; g.lineWidth = 4;
        g.beginPath(); g.moveTo(34, -130); g.lineTo(34, 6); g.stroke();
        F(g, poly([[34, -142], [28, -124], [40, -124]]), C.goldHi, null, 0);
      }
      if (opt.palm) {
        // 合十：两臂收拢到胸前（僧众 / 信众）
        g.strokeStyle = C.ink; g.lineWidth = 7;
        g.beginPath(); g.moveTo(-14, -78); g.lineTo(0, -66); g.lineTo(14, -78); g.stroke();
      }
      g.restore();
    }
  }

  function dust(g, t, opt = {}) {
    const x = opt.x || 900, y = opt.y || 880, n = opt.n || 8;
    const r = rng(opt.seed || 17);
    for (let i = 0; i < n; i++) {
      const ph = pmod(t * (0.45 + r() * 0.5) + i * 0.37, 1);
      const px = x + (r() - 0.5) * 340 - ph * 120;
      const py = y - ph * (90 + r() * 130);
      const rr = 16 + ph * 54;
      g.save(); g.globalAlpha = (1 - ph) * (opt.alpha || 0.30);
      F(g, ell(px, py, rr, rr * 0.66, 0), C.paper, null, 0);
      g.restore();
    }
  }

  function fire(g, t, opt = {}) {
    const x = opt.x || 960, y = opt.y || 700, n = opt.n || 11, w = opt.w || 300;
    const r = rng(opt.seed || 5);
    for (let i = 0; i < n; i++) {
      const px = x - w / 2 + (i + 0.5) * w / n;
      // 每簇高度由固定随机数 + 时间脉动决定，避免等高火苗排成「栅栏」
      const h = (64 + r() * 82) + Math.abs(Math.sin(t * 2.1 + i * 0.9)) * 76;
      const sway = Math.sin(t * 1.7 + i) * 11;
      const col = i % 3 === 0 ? C.goldHi : (i % 3 === 1 ? C.red : C.earthHi);
      F(g, poly([[px - 23, y], [px - 11, y - h * 0.55], [px + sway, y - h],
                 [px + 13, y - h * 0.46], [px + 25, y]]), col, C.earthDk, 2.4);
      // 内焰：亮金，让火苗有层次而不是一根根纯色条
      F(g, poly([[px - 9, y], [px + sway * 0.5, y - h * 0.58], [px + 9, y]]), C.goldHi, null, 0);
    }
  }

  function tree(g, t, opt = {}) {
    const x = opt.x || 1640, y = opt.y || 886, s = opt.s || 1;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.strokeStyle = C.earthDk; g.lineWidth = 20; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -160, 16, -300); g.stroke();
    g.lineWidth = 9;
    g.beginPath(); g.moveTo(4, -170); g.quadraticCurveTo(-90, -230, -140, -226); g.stroke();
    g.beginPath(); g.moveTo(10, -230); g.quadraticCurveTo(96, -280, 140, -268); g.stroke();
    // 叶团（石绿 + 石青）
    [[-140, -232, 54], [140, -276, 60], [16, -318, 66], [-66, -270, 40]].forEach((p, i) => {
      F(g, ell(p[0] + Math.sin(t + i) * 5, p[1], p[2], p[2] * 0.62, 0),
        i % 2 ? C.green : C.blue, C.greenDk, 3);
    });
    g.restore();
  }

  // ---------------------------------------------------------------- 榜题 / 钤印
  function colophon(g, t, lt, title, sub) {
    // 三国式右上角竖排题跋：事件名 + 回目小字，入幕 0.30s 淡入
    const a = ss(0, 1, clamp(lt / 0.30));
    g.save(); g.globalAlpha = a;
    F(g, poly([[1680, 66], [1872, 66], [1872, 452], [1680, 452]]), 'rgba(91,36,22,.90)', C.gold, 3.4);
    F(g, poly([[1690, 76], [1862, 76], [1862, 442], [1690, 442]]), null, C.goldDk, 1.8);
    vtext(g, title, 1806, 104, 44, C.paper, 1.16);
    vtext(g, sub, 1724, 120, 24, C.goldHi, 1.10);
    // 顶部一朵团花
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * TAU + t * 0.2;
      dot(g, 1776 + Math.cos(ang) * 15, 448 + Math.sin(ang) * 15, 5, C.goldHi, null, 0);
    }
    g.restore();
  }

  function seal(g, t, lt, txt) {
    const p = ss(0, 1, clamp((lt - 0.9) / 0.45));
    g.save(); g.globalAlpha = p;
    const x = 1690, y = 918, w = 132;
    F(g, poly([[x, y], [x + w, y], [x + w, y + w], [x, y + w]]), C.red, C.goldHi, 3.4);
    F(g, poly([[x + 10, y + 10], [x + w - 10, y + 10], [x + w - 10, y + w - 10], [x + 10, y + w - 10]]), null, C.paper, 2);
    htext(g, txt[0] || '西', x + w / 2, y + 56, 40, C.paper, 0);
    htext(g, txt[1] || '游', x + w / 2, y + 104, 40, C.paper, 0);
    g.restore();
  }

  // ---------------------------------------------------------------- 人物缩放
  // 把「满屏立像 rig」按目标脚底 (x, gy) 与缩放 s 放进场景。
  // rig 内部坐标恒为 CX=960 / GY=980，先把它俩映射到原点再平移到目标点。
  function figure(g, t, drawFn, opt = {}) {
    const x = opt.x === undefined ? 1080 : opt.x;
    const gy = opt.groundY === undefined ? 886 : opt.groundY;
    const s = opt.s === undefined ? 0.52 : opt.s;
    g.save();
    g.translate(x, gy);
    g.scale(s, s);
    g.translate(-960, -980);
    if (opt.alpha !== undefined) g.globalAlpha *= opt.alpha;
    drawFn(g, t, opt);
    g.restore();
  }

  // ---------------------------------------------------------------- 活气层
  function motion(g, t, amp = 1) {
    // 扫光（土红地仗上的一道金光，横向循环）
    const sx = pmod(t * 190, W + 700) - 350;
    const lg = g.createLinearGradient(sx, 0, sx + 260, 0);
    lg.addColorStop(0, 'rgba(242,221,154,0)');
    lg.addColorStop(0.5, `rgba(242,221,154,${0.13 * amp})`);
    lg.addColorStop(1, 'rgba(242,221,154,0)');
    g.save(); g.fillStyle = lg; g.fillRect(0, 0, W, H); g.restore();
    // 天花 / 飘带粒子：34 枚，避免死帧
    const r = rng(8801);
    for (let i = 0; i < 34; i++) {
      const px = pmod(r() * W + t * (26 + i % 5 * 13), W + 60) - 30;
      const py = 90 + r() * 780 + Math.sin(t * 0.9 + i) * 12;
      const rr = 2 + r() * 5;
      g.save(); g.globalAlpha = (0.28 + 0.36 * r()) * amp;
      dot(g, px, py, rr, i % 3 ? C.goldHi : C.paper, null, 0);
      g.restore();
    }
  }

  // 近景剪影：左右下角的栏杆 / 松枝，制造纵深
  function near(g, t, opt = {}) {
    g.save(); g.globalAlpha = 0.86;
    F(g, poly([[0, 1010], [0, 884], [36, 884], [36, 1010]]), C.earthDk, C.gold, 2.4);
    F(g, poly([[1884, 1010], [1884, 884], [1920, 884], [1920, 1010]]), C.earthDk, C.gold, 2.4);
    g.strokeStyle = C.earthDk; g.lineWidth = 9;
    g.beginPath(); g.moveTo(0, 906); g.lineTo(1920, 906); g.stroke();
    // 左下松枝
    g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-20, 1050); g.quadraticCurveTo(120, 940, 250, 920); g.stroke();
    for (let i = 0; i < 6; i++) {
      const px = 60 + i * 34, py = 1000 - i * 14;
      F(g, ell(px + Math.sin(t + i) * 4, py, 26, 10, -0.5), C.greenDk, null, 0);
    }
    g.restore();
  }

  // 判词卡（第 7 幕）：深赭外框 + 纸白内页 + 竖排两行
  function verdict(g, t, lt, v1, v2) {
    const p = ss(0, 1, clamp(lt / 0.9));
    g.save(); g.globalAlpha = p;
    const x = 560, y = 250, w = 800, h = 480;
    F(g, poly([[x - 16, y - 16], [x + w + 16, y - 16], [x + w + 16, y + h + 16], [x - 16, y + h + 16]]),
      C.earthDk, C.gold, 6);
    F(g, poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]), C.paper, C.goldDk, 3);
    for (let i = 0; i < 4; i++) dot(g, x + 70 + i * 220, y + 52, 10, C.gold, C.earthDk, 1.6);
    vtext(g, v1, x + w - 150, y + 110, 46, C.ink, 1.18);
    vtext(g, v2, x + w - 270, y + 110, 46, C.ink, 1.18);
    htext(g, '判 词', x + w / 2, y + h - 52, 30, C.earthDk, 2);
    g.restore();
  }

  // 结句（第 8 幕）：深墨底 + 纸白大字，早现长持
  function ending(g, t, lt, endingText, caption) {
    const a = ss(0, 1, clamp((lt - 0.30) / 1.0));
    g.save(); g.globalAlpha = a;
    F(g, poly([[CX0() - 340, 620], [CX0() + 340, 620], [CX0() + 340, 800], [CX0() - 340, 800]]),
      C.ink, C.gold, 3.6);
    htext(g, endingText, CX0(), 694, 54, C.white, 0);
    htext(g, caption, CX0(), 758, 34, C.goldHi, 1);
    g.restore();
  }
  const CX0 = () => 960;

  window.XY_SCENE = {
    W, H, C, ground, groundDetail, skyOrnament, mountains, cloudSea,
    hall, cave, pagoda, bridge, gate,
    lotusThrone, sutraHall, river, banners, crowd, dust, fire, tree,
    colophon, seal, figure, motion, near, verdict, ending,
    poly, F, ell, dot, vtext, htext, ss, clamp, lerp, rng, pmod,
  };
})();
