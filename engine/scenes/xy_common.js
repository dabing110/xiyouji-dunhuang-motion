// 西游记 · 敦煌重彩 —— 公共绘制库（window.XY）
// 由红楼 hlm_common.js 原样移植：色板 / 舞台 / 铁线描工具逐字节保留，
// 仅替换默认文案、缓存前缀与导出名。drawLady 保留但本工程不调用（人物走 xy_figure.js）。
// 设计：同一帧「王熙凤立像」× 三套风格渲染器（10_nouveau / 05_gothic / 20_dunhuang）。
// 角色是「装饰性平面仕女」而非写实拟人：造型由几何路径构成，脸与衣纹都过风格材料，
// 因此可以合法走全代码 A 法，且确定性、可开源、与既有流水线一致。
// 坐标：1920×1080 横屏，中央竖幅海报框 516..1404 × 34..1046，人物中心 x=960，脚底 y=980。
(() => {
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const { clamp, lerp, ss, rng } = U;
  const P = window.PAINT;
  const pmod = (a, n) => ((a % n) + n) % n;          // JS 负数取模会跑出画面，必须正模

  const BOX = { x0: 516, y0: 34, x1: 1404, y1: 1046 };
  const CX = 960, GY = 980, HY = 306, SY = 452, WY = 676;
  const FONT = 'LXGWWenKai-500';

  // ---------- 三套色板 ----------
  const PAL = {
    nouveau: {
      name: '慕夏新艺术', tag: 'A',
      bg0: '#eee3c6', bg1: '#d9c9a8', bg2: '#e8d2b6',
      ink: '#4e3320', gold: '#c9a24a', goldDk: '#9c7a2e', goldHi: '#f6dc8a',
      paper: '#f6eedb', robe: '#b8342f', robeDk: '#7e1f22', robeHi: '#d9655b',
      shawl: '#cf7f7b', shawlDk: '#8a4d4c', skin: '#f7e0c8', hair: '#3b2a20',
      hairHi: '#6a4a30', lip: '#b8342f', accent: '#3d7763', flower: '#d9706a',
      lw: 2.4, lwOut: 5.4,
    },
    gothic: {
      name: '哥特泥金册页', tag: 'B',
      bg0: '#e9dcba', bg1: '#d6c096', bg2: '#e9dcba',
      ink: '#2b1a12', gold: '#d9a63a', goldDk: '#9c6a1a', goldHi: '#f8de86',
      paper: '#f8f2e2', robe: '#c3262e', robeDk: '#7e1318', robeHi: '#d9585e',
      shawl: '#24449e', shawlDk: '#142a6a', skin: '#f5dcc2', hair: '#7a4a10',
      hairHi: '#e9b746', lip: '#a71e26', accent: '#55a03c', flower: '#e7a3aa',
      lw: 4.2, lwOut: 4.2,
    },
    // 《林黛玉·进贾府》：仍是慕夏 A 方向的几何 / 材质，只把色板整体转冷（竹青 / 月白）。
    // 不新开第四种「风格」——stage() 的材质分支按 style==='nouveau' 走，色板由 opt.pal 注入。
    daiyu: {
      name: '竹青月白', tag: 'A',
      bg0: '#e6ece1', bg1: '#cbd8cd', bg2: '#dfe7d9',
      ink: '#33473f', gold: '#b9ad7a', goldDk: '#8b8252', goldHi: '#f0e7b8',
      paper: '#f5f7f0', robe: '#9fb8ad', robeDk: '#5c7d74', robeHi: '#ceddd3',
      shawl: '#8fa9a0', shawlDk: '#4e6b62', skin: '#f8e7d8', hair: '#302a2c',
      hairHi: '#5c504b', lip: '#b8787c', accent: '#5a7f68', flower: '#e8eef0',
      lw: 2.4, lwOut: 5.4,
    },
    // 《薛宝钗·扑蝶》：蜜合 / 金，暖而不红，与凤姐的大红织金拉开
    baochai: {
      name: '蜜合金', tag: 'A',
      bg0: '#f2e7c8', bg1: '#e2cf9e', bg2: '#f0dfb8',
      ink: '#4a3a1e', gold: '#c9a24a', goldDk: '#9c7a2e', goldHi: '#f8e6a0',
      paper: '#faf3df', robe: '#d8a24a', robeDk: '#9a6a22', robeHi: '#ecc77e',
      shawl: '#e6c98f', shawlDk: '#b08a48', skin: '#f8e2c8', hair: '#3a2a20',
      hairHi: '#6a4a30', lip: '#c46a4a', accent: '#6f8f5a', flower: '#e8b45c',
      lw: 2.4, lwOut: 5.4,
    },
    // 《史湘云·醉眠芍药裀》：芍药粉，全系列最明媚的一支
    xiangyun: {
      name: '芍药粉', tag: 'A',
      bg0: '#f6e3e0', bg1: '#e9c4c4', bg2: '#f4dcd6',
      ink: '#4c2c34', gold: '#d8a85c', goldDk: '#a97b34', goldHi: '#fbe3a4',
      paper: '#fdf3ec', robe: '#d96f86', robeDk: '#9c3f57', robeHi: '#eea0ae',
      shawl: '#efb9c0', shawlDk: '#b76c80', skin: '#fbe4d2', hair: '#38272a',
      hairHi: '#6b4640', lip: '#c84e68', accent: '#5c8a72', flower: '#f08a9a',
      lw: 2.4, lwOut: 5.4,
    },
    // 《妙玉·栊翠庵》：青灰素白 + 一点梅红，全系列最冷最静的一支
    miaoyu: {
      name: '青灰素白', tag: 'A',
      bg0: '#e4e9e6', bg1: '#c8d2cf', bg2: '#dde5e0',
      ink: '#2f403c', gold: '#a9a888', goldDk: '#77795c', goldHi: '#e8e6c4',
      paper: '#f7f8f3', robe: '#8b9c9a', robeDk: '#4f6362', robeHi: '#c3d0cb',
      shawl: '#b9c6bf', shawlDk: '#6d817b', skin: '#f7e8dc', hair: '#2b2b2e',
      hairHi: '#55504f', lip: '#a46f72', accent: '#4d7a6a', flower: '#f2f4ef',
      lw: 2.4, lwOut: 5.4,
    },
    // 《贾元春·省亲》：金箔 + 朱紫，把 18_klimt 备选折进 A 的色板里
    yuanchun: {
      name: '金箔朱紫', tag: 'A',
      bg0: '#f0dcae', bg1: '#d9b877', bg2: '#eed6a2',
      ink: '#4a2418', gold: '#e0b852', goldDk: '#a87c26', goldHi: '#ffe9a6',
      paper: '#fbf1d8', robe: '#a8443f', robeDk: '#6d2427', robeHi: '#cf7360',
      shawl: '#7a4a86', shawlDk: '#4c2a58', skin: '#f9e2c8', hair: '#2e211c',
      hairHi: '#63412c', lip: '#b8342f', accent: '#3f7a6a', flower: '#e8b45c',
      lw: 2.4, lwOut: 5.4,
    },
    // ---- 续六钗（2026-11-06 晚）：仍是慕夏 A 的几何材质，只换色板 ----
    // 每支 bgKey 必须唯一，否则 stage() 的 P.cached 会命中别的片子的底图。
    yingchun: {
      name: '藕荷灰黄', tag: 'A',
      bg0: '#e9e2d4', bg1: '#cbc4b4', bg2: '#e3ddd0',
      ink: '#4a4038', gold: '#b9a479', goldDk: '#8b7750', goldHi: '#eee0b8',
      paper: '#f6f1e5', robe: '#9d8fa8', robeDk: '#655a70', robeHi: '#c6b9cf',
      shawl: '#b9ae9c', shawlDk: '#7e7364', skin: '#f6e5d6', hair: '#332c2a',
      hairHi: '#5e514a', lip: '#a97b78', accent: '#6c7f72', flower: '#c9b6a0',
      lw: 2.4, lwOut: 5.4,
    },
    tanchun: {
      name: '石青胭脂', tag: 'A',
      bg0: '#e2e9e3', bg1: '#bfd0c8', bg2: '#dbe6dc',
      ink: '#2b403c', gold: '#c9a45a', goldDk: '#91702c', goldHi: '#f4dc98',
      paper: '#f4f6ee', robe: '#3f7e86', robeDk: '#26545c', robeHi: '#72aab0',
      shawl: '#c96a72', shawlDk: '#8c3e48', skin: '#f8e4d2', hair: '#2e2724',
      hairHi: '#5b4740', lip: '#c0525c', accent: '#6b8c58', flower: '#d47a80',
      lw: 2.4, lwOut: 5.4,
    },
    xichun: {
      name: '雪青缁白', tag: 'A',
      bg0: '#e4e8ee', bg1: '#c6ced9', bg2: '#dde3ea',
      ink: '#2c3442', gold: '#a8a9b8', goldDk: '#73768a', goldHi: '#e6e6f0',
      paper: '#f7f8fa', robe: '#8792a6', robeDk: '#515a6e', robeHi: '#bcc4d2',
      shawl: '#d3d8e2', shawlDk: '#8d95a6', skin: '#f7eae0', hair: '#282a30',
      hairHi: '#4f5058', lip: '#9a7a82', accent: '#5a7b80', flower: '#eef1f6',
      lw: 2.4, lwOut: 5.4,
    },
    liwan: {
      name: '稻香杏白', tag: 'A',
      bg0: '#f0ead8', bg1: '#dcd2b4', bg2: '#eee6d2',
      ink: '#4b4434', gold: '#c2a86c', goldDk: '#8e7840', goldHi: '#f2e2b2',
      paper: '#faf5e8', robe: '#c9b48c', robeDk: '#8a7752', robeHi: '#e2d2ae',
      shawl: '#e6dcc4', shawlDk: '#ab9d7c', skin: '#f9e8d6', hair: '#342d26',
      hairHi: '#615141', lip: '#b98a7c', accent: '#7d9668', flower: '#f2ded0',
      lw: 2.4, lwOut: 5.4,
    },
    qiaojie: {
      name: '靛蓝土布', tag: 'A',
      bg0: '#e3e6df', bg1: '#c2c9c2', bg2: '#dce0d8',
      ink: '#33403e', gold: '#b39a6a', goldDk: '#7f6a42', goldHi: '#e8d6a8',
      paper: '#f4f2e8', robe: '#4f6b83', robeDk: '#2f465b', robeHi: '#7d98ad',
      shawl: '#b08464', shawlDk: '#75563f', skin: '#f5e2ce', hair: '#302b27',
      hairHi: '#574a3f', lip: '#a97168', accent: '#6f8a62', flower: '#d9c9a8',
      lw: 2.4, lwOut: 5.4,
    },
    keqing: {
      name: '海棠烟紫', tag: 'A',
      bg0: '#ece0e2', bg1: '#cfb6bd', bg2: '#e7d7da',
      ink: '#42303a', gold: '#c49a72', goldDk: '#8f6a4c', goldHi: '#f2d9ba',
      paper: '#faf2ef', robe: '#8b5f80', robeDk: '#5c3a55', robeHi: '#b98aa8',
      shawl: '#d9aeb2', shawlDk: '#9c7078', skin: '#f9e6da', hair: '#2f2329',
      hairHi: '#5a3c46', lip: '#b95f72', accent: '#6a7f78', flower: '#e2a0ae',
      lw: 2.4, lwOut: 5.4,
    },
    dunhuang: {
      name: '敦煌重彩', tag: 'C',
      bg0: '#b9633f', bg1: '#8f402c', bg2: '#b9633f',
      ink: '#5a2414', gold: '#d8b05a', goldDk: '#9a6a25', goldHi: '#f0cf86',
      paper: '#ecdfc4', robe: '#a5452f', robeDk: '#7a2e1e', robeHi: '#d07748',
      shawl: '#2f5f8f', shawlDk: '#20436a', skin: '#f2dcc4', hair: '#2a1a14',
      hairHi: '#6a3a20', lip: '#a5452f', accent: '#3f8f6e', flower: '#e08a3a',
      lw: 2.7, lwOut: 2.7,
    },
  };

  // ---------- 小工具 ----------
  const poly = (pts, close = true) => {
    const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]));
    if (close) p.closePath(); return p;
  };
  const F = (g, p, fill, line, lw = 2) => {
    if (!p) return;
    if (fill) { g.fillStyle = fill; g.fill(p); }
    if (line && lw) { g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(p); }
  };
  const ell = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; };
  const dot = (g, x, y, r, fill, line, lw = 1.4) => F(g, ell(x, y, r, r), fill, line, lw);

  // 慕夏鞭线：点列按 Catmull-Rom 加密，逐点沿法线两侧偏移 w(q) 成闭合多边形，两头尖中间粗。
  function ribbon(g, pts, wmax, fill, line, lw = 1.6, phase = 0) {
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < 8; k++) {
        const u = k / 8, u2 = u * u, u3 = u2 * u;
        dense.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
        ]);
      }
    }
    dense.push(pts[pts.length - 1]);
    const L = [], R = [];
    for (let i = 0; i < dense.length; i++) {
      const q = i / (dense.length - 1);
      const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      const nx = -dy / m, ny = dx / m;
      const w = Math.max(0.6, wmax * Math.sin(Math.PI * q) ** 0.65 + 0.6) / 2;
      L.push([dense[i][0] + nx * w, dense[i][1] + ny * w]);
      R.push([dense[i][0] - nx * w, dense[i][1] - ny * w]);
    }
    const shape = poly(L.concat(R.reverse()));
    F(g, shape, fill, line, lw);
    return shape;
  }
  // 螺旋收尾（鞭线末端 / 缠枝卷须）
  const spiral = (g, cx, cy, r0, a0, turns, dir, col, lw = 2) => {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const q = i / 60, r = r0 * (1 - 0.85 * q), a = a0 + dir * q * turns * TAU;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.stroke();
  };
  const floret = (g, x, y, r, col, core, n = 6, rot = 0) => {
    for (let k = 0; k < n; k++) {
      const a = rot + k / n * TAU;
      F(g, ell(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.62, r * 0.34, a + Math.PI / 2), col, null);
    }
    dot(g, x, y, r * 0.28, core);
  };
  // 竖排中文（canvas 无竖排，逐字）
  function vtext(g, str, x, y, size, col, gap = 1.16, align = 'center') {
    g.save(); g.font = `${size}px "${FONT}"`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...str].forEach((ch, i) => g.fillText(ch, x, y + i * size * gap));
    g.restore();
  }
  function htext(g, str, x, y, size, col, spacing = 0, align = 'center') {
    g.save(); g.font = `${size}px "${FONT}"`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle';
    if (!spacing) g.fillText(str, x, y);
    else { const chars = [...str], total = chars.length * size + (chars.length - 1) * spacing;
      let sx = align === 'center' ? x - total / 2 : x;
      g.textAlign = 'left';
      chars.forEach(ch => { g.fillText(ch, sx, y); sx += size + spacing; }); }
    g.restore();
  }
  // 贝塞尔裙/袖路径
  const bez = (d) => { const p = new Path2D(); d.forEach(s => {
    if (s[0] === 'M') p.moveTo(s[1], s[2]);
    else if (s[0] === 'L') p.lineTo(s[1], s[2]);
    else if (s[0] === 'C') p.bezierCurveTo(s[1], s[2], s[3], s[4], s[5], s[6]);
    else if (s[0] === 'Q') p.quadraticCurveTo(s[1], s[2], s[3], s[4]);
    else if (s[0] === 'Z') p.closePath();
  }); return p; };

  // ---------- 人物骨架（相对 CX 的局部坐标，y 绝对） ----------
  // 全部走同一组路径，换风格只换色板/线宽/材料，保证「同一帧」可比。
  const bodyPaths = () => ({
    skirt: bez([['M', -92, 650], ['C', -118, 762, -186, 884, -220, GY], ['Q', 0, GY + 14, 220, GY],
                ['C', 186, 884, 118, 762, 92, 650], ['Q', 0, 678, -92, 650], ['Z']]),
    robe: bez([['M', -118, SY], ['Q', -130, 446, -120, 472], ['C', -106, 540, -94, 604, -88, 660],
               ['Q', 0, 686, 88, 660], ['C', 94, 604, 106, 540, 120, 472], ['Q', 130, 446, 118, SY],
               ['Q', 0, 424, -118, SY], ['Z']]),
    sleeveL: bez([['M', -118, SY], ['C', -166, 482, -196, 562, -214, 648], ['Q', -174, 680, -140, 650],
                  ['L', -88, 660], ['Z']]),
    sleeveR: bez([['M', 118, SY], ['C', 166, 458, 206, 478, 234, 520], ['Q', 220, 562, 188, 556],
                  ['L', 88, 660], ['Z']]),
    collar: bez([['M', -50, 424], ['Q', 0, 468, 50, 424], ['Q', 38, 494, 0, 510], ['Q', -38, 494, -50, 424], ['Z']]),
    neck: poly([[-27, 388], [27, 388], [30, 438], [-30, 438]]),
    face: bez([['M', 0, 202], ['C', 50, 202, 69, 252, 68, 308], ['C', 66, 368, 38, 408, 0, 412],
               ['C', -38, 408, -66, 368, -68, 308], ['C', -69, 252, -50, 202, 0, 202], ['Z']]),
    hairBack: bez([['M', 0, 164], ['C', 82, 164, 90, 254, 84, 330], ['C', 78, 380, 58, 402, 38, 404],
                   ['L', -38, 404], ['C', -58, 402, -78, 380, -84, 330], ['C', -90, 254, -82, 164, 0, 164], ['Z']]),
    bun: bez([['M', -56, 182], ['C', -74, 126, -30, 104, 0, 108], ['C', 30, 104, 74, 126, 56, 182],
              ['C', 34, 164, -34, 164, -56, 182], ['Z']]),
  });

  // ---------- 王熙凤立像 ----------
  // opt: { style, pal(色板覆盖), t, alpha, half, reveal, lift, blink,
  //        motif:'bamboo'(竹叶纹，默认团花), prop:'petal'(落花，默认牡丹团扇),
  //        pin:'bamboo'(竹簪，默认金凤钗), softFace:true(罥烟眉含情目，默认丹凤眼) }
  function drawLady(g, opt) {
    const S = opt.pal || PAL[opt.style] || PAL.nouveau, t = opt.t || 0;
    const A = opt.alpha == null ? 1 : opt.alpha;
    const lift = opt.lift || 0, reveal = opt.reveal == null ? 1 : opt.reveal;
    if (A <= 0.001) return;
    const B = bodyPaths();
    const line = S.ink, lw = S.lw, lwOut = S.lwOut;

    g.save();
    g.translate(CX, 0);
    g.globalAlpha = A;
    if (opt.half) { g.beginPath(); g.rect(-500, 0, 1000, 720); g.clip(); }

    // ① 背后披帛：两条 S 形飘带（全片同一动线，随风摆动）
    const sway = Math.sin(t * 1.35) * 22, sway2 = Math.cos(t * 0.95) * 16;
    // 披帛是贴身下垂的两条长带，末端向外飘——不能两端往中央收，否则会读成一个「呼啦圈」。
    const s1 = [[-112, 462], [-168, 540 + sway * 0.6], [-188, 672 + sway2 * 0.6],
                [-176, 812 + sway * 0.6], [-248, 946 + sway2 * 0.4]];
    const s2 = [[112, 462], [168, 540 - sway * 0.6], [188, 672 - sway2 * 0.6],
                [176, 812 - sway * 0.6], [248, 946 - sway2 * 0.4]];
    ribbon(g, s1, 18, S.shawl, S.shawlDk, 2.2);
    ribbon(g, s2, 17, S.shawl, S.shawlDk, 2.2);
    g.save(); g.globalAlpha = A * 0.62;
    ribbon(g, s1.map(([x, y]) => [x + 5, y]), 3.2, S.paper, null);
    ribbon(g, s2.map(([x, y]) => [x - 5, y]), 3.0, S.paper, null);
    g.restore();
    spiral(g, -248, 946 + sway2 * 0.4, 22, 0, 1.1, -1, S.gold, 2.4);
    spiral(g, 248, 946 - sway2 * 0.4, 20, 0, 1.1, 1, S.gold, 2.4);

    // ② 裙摆
    F(g, B.skirt, S.robeDk, line, lwOut);
    g.save(); g.beginPath(); g.rect(-240, 670, 480, 320); g.clip();
    for (let k = -7; k <= 7; k++) {
      g.beginPath(); g.moveTo(k * 13, 670); g.quadraticCurveTo(k * 22, 830, k * 31, GY);
      g.strokeStyle = S.goldDk; g.lineWidth = 2.0; g.globalAlpha = 0.62; g.stroke();
    }
    g.restore();
    // 裙襕金边
    g.beginPath(); g.moveTo(-212, 942); g.quadraticCurveTo(0, 968, 212, 942);
    g.strokeStyle = S.gold; g.lineWidth = 7; g.stroke();
    g.beginPath(); g.moveTo(-216, 958); g.quadraticCurveTo(0, 984, 216, 958);
    g.strokeStyle = S.goldHi; g.lineWidth = 2.2; g.stroke();

    // ③ 袖、身、领（袖口金边 + 腰带，避免读成方块身子）
    F(g, B.sleeveL, S.robe, line, lwOut);
    F(g, B.sleeveR, S.robe, line, lwOut);
    g.beginPath(); g.moveTo(-214, 640); g.lineTo(-172, 674);
    g.moveTo(230, 512); g.lineTo(190, 556);
    g.strokeStyle = S.gold; g.lineWidth = 5; g.stroke();
    F(g, B.robe, S.robeHi, line, lwOut);
    F(g, B.neck, S.skin, line, lw);
    F(g, B.collar, S.paper, S.gold, 3.4);
    F(g, poly([[-90, 648], [90, 648], [94, 676], [-94, 676]]), S.gold, S.goldDk, 2.2);
    dot(g, 0, 662, 13, S.flower, S.goldHi, 2);

    // ④ 织金纹样：clip 在衣身内，缠枝 + 团花随 reveal 显影、随时间流光
    g.save(); g.clip(B.robe);
    g.globalAlpha = A * (0.28 + 0.72 * reveal);
    const r = rng(97);
    for (let i = 0; i < 36; i++) {
      const x = -108 + r() * 216, y = 460 + r() * 190;
      const glow = 0.45 + 0.55 * Math.sin(t * 1.6 + i * 0.7) ** 2;
      g.globalAlpha = A * reveal * glow * 0.8;
      if (opt.motif === 'bamboo') {
        // 黛玉：竹叶纹，三片一组斜生，不用团花
        for (let k = 0; k < 3; k++) {
          const a = -0.9 + k * 0.62 + Math.sin(t * 0.7 + i) * 0.06;
          F(g, ell(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 4.2, 15, a + Math.PI / 2),
            k === 1 ? S.goldHi : S.gold, null);
        }
        g.beginPath(); g.moveTo(x - 14, y + 12); g.lineTo(x + 14, y - 12);
        g.strokeStyle = S.goldDk; g.lineWidth = 1.4; g.stroke();
      } else if (opt.motif === 'spray') {
        // 湘云：芍药飞花，五瓣略大 + 两点飞瓣；用花色而不是金线，才读得出「花裀」
        floret(g, x, y, 13 + (i % 3) * 2, S.flower, S.goldHi, 5, t * 0.22 + i);
        F(g, ell(x + 15, y - 13, 4, 8, 0.7), S.paper, S.goldDk, 0.9);
      } else {
        floret(g, x, y, 10 + (i % 3) * 2, S.gold, S.goldHi, 6, t * 0.2 + i);
      }
    }
    g.globalAlpha = A * reveal * 0.85;
    for (let k = 0; k < 5; k++) {
      const yy = 480 + k * 42;
      g.beginPath(); g.moveTo(-120, yy);
      for (let x = -120; x <= 120; x += 12) g.lineTo(x, yy + Math.sin(x * 0.055 + t * 1.1 + k) * 7);
      g.strokeStyle = S.goldDk; g.lineWidth = 2.1; g.stroke();
    }
    g.restore();

    // ⑤ 手与手持道具（右手抬起 lift 时更明显）
    // 凤姐 = 三层牡丹团扇；黛玉 = 一枝素白落花（进贾府不扛花锄，用花枝承接「质本洁来」）
    const hx = 238 + lift * 26, hy = 528 - lift * 130;
    F(g, ell(hx, hy, 21, 17, -0.5), S.skin, line, lw);
    F(g, ell(-208, 644, 20, 16, 0.4), S.skin, line, lw);
    const fx = hx + 48, fy = hy - 48;
    g.save(); g.translate(fx, fy); g.rotate(Math.sin(t * 0.9) * 0.06);
    if (opt.prop === 'petal') {
      // 斜生花枝：主干 + 两处分叉，末端三朵五瓣素花，再加两片飘落花瓣
      g.beginPath(); g.moveTo(-14, 70); g.quadraticCurveTo(2, 10, -6, -66);
      g.strokeStyle = S.goldDk; g.lineWidth = 5; g.lineCap = 'round'; g.stroke();
      g.beginPath(); g.moveTo(-2, 6); g.quadraticCurveTo(30, -12, 34, -44);
      g.moveTo(-4, -22); g.quadraticCurveTo(-34, -34, -38, -58);
      g.lineWidth = 3; g.stroke();
      for (const [px, py, pr] of [[-6, -68, 20], [34, -46, 15], [-38, -58, 13]]) {
        floret(g, px, py, pr, S.paper, S.goldHi, 5, t * 0.15 + px);
        dot(g, px, py, 4.5, S.gold, S.goldDk, 1.2);
      }
      for (let k = 0; k < 2; k++) {
        const dy = pmod(t * 26 + k * 42, 110);
        F(g, ell(24 + k * 22, 18 + dy, 5, 9, 0.6 + k), S.paper, S.goldDk, 1);
      }
    } else if (opt.prop === 'tea') {
      // 妙玉：手托青瓷盖碗（托 + 碗 + 盖 + 两缕茶烟）。
      // 茶烟是浅色，必须画深色描边才不会消失在纸白底上（版画片踩过的「白线画白底」坑）。
      F(g, ell(0, 34, 52, 13), S.gold, S.goldDk, 2.6);
      F(g, bez([['M', -40, -8], ['Q', -36, 30, 0, 32], ['Q', 36, 30, 40, -8], ['Z']]),
        S.accent, S.ink, 3.2);
      F(g, ell(0, -8, 40, 11), S.paper, S.goldDk, 2.4);
      F(g, bez([['M', -34, -14], ['Q', 0, -40, 34, -14], ['Q', 0, -8, -34, -14], ['Z']]),
        S.robeHi, S.goldDk, 2.4);
      dot(g, 0, -34, 7, S.goldHi, S.goldDk, 1.8);
      for (let k = 0; k < 2; k++) {
        const sx = -14 + k * 26;
        g.beginPath(); g.moveTo(sx, -40);
        g.bezierCurveTo(sx - 16, -66, sx + 18, -78, sx + 2 + Math.sin(t * 1.3 + k) * 8, -104);
        g.strokeStyle = S.goldDk; g.lineWidth = 2.6; g.lineCap = 'round'; g.stroke();
      }
    } else if (opt.prop === 'chess') {
      // 迎春：扁棋盒 + 黑白二子（那一局她始终不争）
      F(g, ell(0, 18, 62, 26), S.gold, S.goldDk, 3.2);
      F(g, ell(0, 12, 56, 20), S.paper, S.goldDk, 2.2);
      dot(g, -20, 8, 12, S.ink, S.goldDk, 1.6);
      dot(g, 16, 14, 12, S.paper, S.goldDk, 2);
      F(g, poly([[-58, 34], [58, 34], [50, 48], [-50, 48]]), S.robeDk, S.gold, 2.4);
    } else if (opt.prop === 'brush') {
      // 探春：一支笔（理家削弊），笔杆 + 笔锋 + 竿帽
      g.save(); g.rotate(-0.42);
      F(g, poly([[-7, -76], [7, -76], [7, 26], [-7, 26]]), S.robeDk, S.gold, 2.6);
      F(g, poly([[-11, 22], [11, 22], [0, 74]]), S.ink, S.goldDk, 2.2);
      F(g, poly([[-9, -82], [9, -82], [9, -72], [-9, -72]]), S.goldHi, S.goldDk, 2);
      g.restore();
      dot(g, 34, -46, 8, S.goldHi, S.goldDk, 1.4);
    } else if (opt.prop === 'scroll') {
      // 惜春：半展画卷，两轴 + 纸面 + 几笔未画完的亭台
      F(g, poly([[-58, -40], [58, -40], [58, 46], [-58, 46]]), S.paper, S.goldDk, 3);
      for (const sx of [-58, 58]) {
        F(g, poly([[sx - 7, -50], [sx + 7, -50], [sx + 7, 56], [sx - 7, 56]]), S.robeDk, S.gold, 2.4);
        dot(g, sx, -52, 6, S.goldHi, S.goldDk, 1.4);
        dot(g, sx, 58, 6, S.goldHi, S.goldDk, 1.4);
      }
      for (let k = 0; k < 3; k++) {
        g.beginPath(); g.moveTo(-40 + k * 12, 30);
        g.lineTo(-14 + k * 14, -16 - k * 8);
        g.strokeStyle = S.accent; g.lineWidth = 2.4; g.stroke();
      }
      dot(g, 28, -20, 9, S.flower, S.goldDk, 1.4);
    } else if (opt.prop === 'thread') {
      // 巧姐：纺锤与线团。线用深金而非纸白——浅色线画在浅底等于没画。
      F(g, ell(0, 16, 40, 44), S.paper, S.goldDk, 2.8);
      for (let k = 0; k < 5; k++) {
        g.beginPath(); g.ellipse(0, 16, 40 - k * 4, 44 - k * 6, k * 0.28, 0, Math.PI * 2);
        g.strokeStyle = S.goldDk; g.lineWidth = 1.8; g.stroke();
      }
      F(g, poly([[-4, -74], [4, -74], [4, -28], [-4, -28]]), S.robeDk, S.gold, 2);
      g.beginPath(); g.moveTo(0, -28);
      g.bezierCurveTo(34, -12, 40, 32, 22, 58);
      g.strokeStyle = S.goldDk; g.lineWidth = 3.6; g.lineCap = 'round'; g.stroke();
    } else {
      F(g, ell(0, 0, 72, 72), S.paper, S.gold, 6);
      F(g, ell(0, 0, 62, 62), null, S.goldDk, 2);
      // 三层牡丹：外瓣深红 → 中瓣珊瑚 → 内瓣奶白，中心金蕊；单靠一层小 floret 会读成「靶子」
      for (let layer = 0; layer < 3; layer++) {
        const rr = [38, 25, 13][layer], col = [S.robeDk, S.flower, S.paper][layer];
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * TAU + layer * 0.38 + t * 0.12;
          F(g, ell(Math.cos(a) * rr * 0.62, Math.sin(a) * rr * 0.62, rr * 0.56, rr * 0.34, a + Math.PI / 2), col, S.goldDk, 1.2);
        }
      }
      dot(g, 0, 0, 9, S.goldHi, S.goldDk, 1.8);
    }
    g.restore();
    g.beginPath(); g.moveTo(hx + 8, hy - 6);
    g.lineTo(fx - 2, fy + (opt.prop === 'petal' ? 70 : opt.prop === 'tea' ? 34 : 64));
    g.strokeStyle = (opt.prop === 'petal' || opt.prop === 'tea') ? S.goldDk : S.gold;
    g.lineWidth = (opt.prop === 'petal' || opt.prop === 'tea') ? 5 : 8; g.lineCap = 'round'; g.stroke();

    // ⑥ 脸、发、五官
    F(g, B.hairBack, S.hair, line, lwOut);
    // 慕夏式 S 卷发：7 绺行波（其余风格也保留，只改色）
    for (let k = 0; k < 7; k++) {
      const ph = k * 0.85, side = k < 4 ? -1 : 1, baseX = side * (64 + (k % 4) * 7);
      const pts = [];
      for (let q = 0; q <= 10; q++) {
        const u = q / 10;
        pts.push([baseX + Math.sin(7.4 * u - t * 1.8 + ph) * (5 + 18 * u) * side,
                  212 + u * 194]);
      }
      ribbon(g, pts, 11 - k * 0.5, S.hair, null);
      spiral(g, pts[10][0], pts[10][1] + 12, 13, 0, 1.1, side, S.hairHi, 1.8);
    }
    F(g, B.face, S.skin, line, lwOut);
    F(g, B.bun, S.hair, line, lwOut);
    // 鬓发贴脸
    g.beginPath(); g.moveTo(-64, 258); g.quadraticCurveTo(-76, 326, -54, 384);
    g.moveTo(64, 258); g.quadraticCurveTo(76, 326, 54, 384);
    g.strokeStyle = S.hair; g.lineWidth = 10; g.lineCap = 'round'; g.stroke();
    // 额发（发际线抬高，别把额头压没）
    F(g, bez([['M', -64, 238], ['Q', 0, 208, 64, 238], ['Q', 34, 222, 0, 230], ['Q', -34, 222, -64, 238], ['Z']]), S.hair, null);
    // 眉 / 丹凤眼（上挑）/ 瞳 / 鼻 / 唇 / 花钿
    const blink = opt.blink || 0, soft = !!opt.softFace;
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      // 凤姐 = 上挑丹凤眼；黛玉 = 罥烟眉（平而淡）+ 略圆的含情目
      g.beginPath();
      if (soft) { g.moveTo(s * 16, 287); g.quadraticCurveTo(s * 42, 279, s * 60, 285); }
      else { g.moveTo(s * 16, 286); g.quadraticCurveTo(s * 42, 274, s * 60, 282); }
      g.strokeStyle = S.hair; g.lineWidth = soft ? 3.8 : 5; g.stroke();
      const eye = new Path2D();
      eye.moveTo(s * 14, 308);
      if (soft) {
        eye.quadraticCurveTo(s * 38, 292 - blink * 9, s * 60, 305);
        eye.quadraticCurveTo(s * 38, 320 + blink * 9, s * 14, 308);
      } else {
        eye.quadraticCurveTo(s * 38, 296 - blink * 8, s * 60, 300);
        eye.quadraticCurveTo(s * 38, 314 + blink * 8, s * 14, 308);
      }
      eye.closePath();
      F(g, eye, S.paper, S.ink, 3.4);
      if (blink < 0.6) dot(g, s * 38, soft ? 305 : 305, soft ? 4.6 : 5.2, S.ink);
    }
    g.beginPath(); g.moveTo(0, 312); g.quadraticCurveTo(-4, 336, 4, 340);
    g.strokeStyle = S.goldDk; g.lineWidth = 2.4; g.stroke();
    F(g, bez([['M', -18, 362], ['Q', 0, 352, 18, 362], ['Q', 0, 376, -18, 362], ['Z']]), S.lip, null);
    floret(g, 0, 260, 9, S.gold, S.lip, 5, t * 0.3);

    // ⑦ 头饰：凤姐 = 金凤钗；黛玉 = 竹节簪 + 三片竹叶 + 一朵月白垂花
    g.save(); g.translate(0, 174); g.rotate(Math.sin(t * 1.2) * 0.02);
    if (opt.pin === 'bamboo') {
      F(g, poly([[-96, 0], [104, 0], [104, 7], [-96, 7]]), S.accent, S.goldDk, 2);
      for (let k = 0; k < 4; k++) {
        const bx = -60 + k * 40;
        g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx, 7);
        g.strokeStyle = S.goldDk; g.lineWidth = 2; g.stroke();
      }
      for (let k = 0; k < 3; k++) {
        const a = -1.25 + k * 0.55;
        F(g, ell(90 + Math.cos(a) * 26, -22 + Math.sin(a) * 22, 7, 22, a + Math.PI / 2),
          k === 1 ? S.robeHi : S.accent, S.goldDk, 1.6);
      }
      g.beginPath(); g.moveTo(-84, 7); g.quadraticCurveTo(-94 + Math.sin(t * 1.5) * 4, 40, -88, 66);
      g.strokeStyle = S.gold; g.lineWidth = 2.2; g.stroke();
      floret(g, -88, 70, 11, S.paper, S.goldHi, 5, t * 0.2);
    } else if (opt.pin === 'peony') {
      // 宝钗：横簪 + 一朵三层牡丹 + 两朵小蕾 + 两串垂珠
      F(g, poly([[-92, 0], [98, 0], [98, 8], [-92, 8]]), S.gold, S.goldDk, 2);
      for (let layer = 0; layer < 3; layer++) {
        const rr = [34, 22, 11][layer], col = [S.robeDk, S.flower, S.paper][layer];
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * TAU + layer * 0.4 + t * 0.1;
          F(g, ell(56 + Math.cos(a) * rr * 0.55, -26 + Math.sin(a) * rr * 0.55,
                   rr * 0.5, rr * 0.32, a + Math.PI / 2), col, S.goldDk, 1.2);
        }
      }
      dot(g, 56, -26, 7, S.goldHi, S.goldDk, 1.6);
      for (const [bx, by, br] of [[-52, -14, 12], [-22, -22, 10]])
        floret(g, bx, by, br, S.flower, S.goldHi, 6, t * 0.2);
      for (let k = 0; k < 2; k++) {
        const bx = 70 + k * 18;
        g.beginPath(); g.moveTo(bx, 8); g.quadraticCurveTo(bx + 6, 34, bx + 2, 52);
        g.strokeStyle = S.gold; g.lineWidth = 2; g.stroke();
        dot(g, bx + 2, 56, 5, S.paper, S.goldDk, 1.2);
      }
    } else if (opt.pin === 'jade') {
      // 妙玉：素玉簪 + 两朵白梅，全片最不戴金的一支
      F(g, poly([[-88, 0], [92, 0], [92, 6], [-88, 6]]), S.paper, S.goldDk, 2);
      F(g, ell(92, 0, 12, 12), S.accent, S.goldDk, 2);
      for (let k = 0; k < 2; k++) {
        const bx = -56 + k * 18;
        g.beginPath(); g.moveTo(bx, 6); g.quadraticCurveTo(bx - 6, 32, bx - 2, 50);
        g.strokeStyle = S.goldDk; g.lineWidth = 1.8; g.stroke();
        floret(g, bx - 2, 54, 9, S.flower, S.goldHi, 5, t * 0.15 + k);
      }
    } else if (opt.pin === 'court') {
      // 元春：金冠 + 三排珠旒 + 双侧凤翼；冠体在发髻上方（绝对 y≈92），不遮脸
      F(g, bez([['M', -96, 4], ['Q', -78, -78, 0, -82], ['Q', 78, -78, 96, 4], ['Z']]), S.gold, S.goldDk, 3.4);
      F(g, bez([['M', -74, -6], ['Q', -60, -58, 0, -62], ['Q', 60, -58, 74, -6], ['Z']]), S.goldHi, S.goldDk, 2);
      for (let k = 0; k < 3; k++) {
        const yy = -26 + k * 16;
        for (let j = 0; j < 7; j++) {
          const bx = -72 + j * 24;
          g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx, yy + 24);
          g.strokeStyle = S.gold; g.lineWidth = 1.8; g.stroke();
          dot(g, bx, yy + 28, 5, j % 2 ? S.paper : S.robeHi, S.goldDk, 1.1);
        }
      }
      for (const s of [-1, 1]) {
        F(g, bez([['M', s * 88, -6], ['Q', s * 150, -52, s * 172, -16],
                  ['Q', s * 132, -14, s * 88, 6], ['Z']]), S.goldHi, S.goldDk, 2.2);
        dot(g, s * 158, -22, 4, S.lip);
      }
      dot(g, 0, -70, 9, S.robeHi, S.goldDk, 2);
    } else {
      F(g, poly([[-92, 0], [96, 0], [96, 8], [-92, 8]]), S.gold, S.goldDk, 2);
      F(g, bez([['M', 58, -2], ['Q', 96, -42, 128, -18], ['Q', 108, -6, 96, 8], ['Q', 80, 2, 58, -2], ['Z']]), S.goldHi, S.goldDk, 2.4);
      dot(g, 116, -22, 4, S.lip);
      for (let k = 0; k < 3; k++) {
        const bx = 84 + k * 16;
        g.beginPath(); g.moveTo(bx, 6); g.quadraticCurveTo(bx + 10 + Math.sin(t * 1.6 + k) * 5, 40, bx + 4, 62 + k * 9);
        g.strokeStyle = S.gold; g.lineWidth = 2.4; g.stroke();
        dot(g, bx + 4, 66 + k * 9, 6, S.flower, S.goldDk, 1.4);
      }
    }
    g.restore();

    g.restore();
  }

  // ---------- 风格化舞台（背景 + 装饰框 + 侧栏） ----------
  function stage(g, style, t, opt = {}) {
    // opt.pal 可整套换色板而复用同一套慕夏材质；bgKey 必须随之区分，否则 P.cached 会命中旧底图。
    const S = opt.pal || PAL[style] || PAL.nouveau;
    const bg = P.cached('xy_bg_' + (opt.bgKey || style), W, H, (k) => {
      const gr = k.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, S.bg0); gr.addColorStop(0.55, S.bg1); gr.addColorStop(1, S.bg2);
      k.fillStyle = gr; k.fillRect(0, 0, W, H);
      const r = rng(style === 'nouveau' ? 11 : style === 'gothic' ? 23 : 37);
      // 材质底纹（只在背景层）
      if (style === 'nouveau') {
        for (let y = 0; y < H; y += 54) for (let x = 0; x < W; x += 62) {
          const xx = x + ((y / 54 | 0) % 2) * 31;
          k.beginPath(); k.arc(xx, y, 10, 0, TAU); k.strokeStyle = 'rgba(120,140,100,.30)'; k.lineWidth = 2; k.stroke();
          k.beginPath(); k.arc(xx, y, 2.6, 0, TAU); k.fillStyle = 'rgba(120,140,100,.34)'; k.fill();
        }
      } else if (style === 'gothic') {
        for (let i = 0; i < 900; i++) {
          const x = r() * W, y = r() * H;
          k.fillStyle = `rgba(120,90,40,${0.02 + r() * 0.045})`; k.fillRect(x, y, 3 + r() * 22, 1 + r() * 3);
        }
        k.strokeStyle = 'rgba(120,80,40,.16)'; k.lineWidth = 1.4;
        for (let x = 0; x < W; x += 46) { k.beginPath(); k.moveTo(x, 0); k.lineTo(x + 180, H); k.stroke(); }
      } else {
        for (let i = 0; i < 1400; i++) {
          const x = r() * W, y = r() * H, rr = 4 + r() * 30;
          k.beginPath(); k.arc(x, y, rr, 0, TAU);
          k.fillStyle = `rgba(${r() > 0.5 ? '216,198,162' : '90,36,20'},${0.015 + r() * 0.055})`; k.fill();
        }
      }
      // 外框
      k.strokeStyle = S.ink; k.lineWidth = 9; k.strokeRect(20, 20, W - 40, H - 40);
      k.strokeStyle = S.gold; k.lineWidth = 4; k.strokeRect(32, 32, W - 64, H - 64);
      // 中央竖幅画框
      k.fillStyle = S.paper; k.fillRect(BOX.x0 - 10, BOX.y0 - 10, BOX.x1 - BOX.x0 + 20, BOX.y1 - BOX.y0 + 20);
      k.strokeStyle = S.goldDk; k.lineWidth = 7; k.strokeRect(BOX.x0 - 10, BOX.y0 - 10, BOX.x1 - BOX.x0 + 20, BOX.y1 - BOX.y0 + 20);
      k.strokeStyle = S.gold; k.lineWidth = 3; k.strokeRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
      k.strokeStyle = S.ink; k.lineWidth = 1.6; k.strokeRect(BOX.x0 + 12, BOX.y0 + 12, BOX.x1 - BOX.x0 - 24, BOX.y1 - BOX.y0 - 24);
    });
    g.drawImage(bg, 0, 0);

    // 中央画框内的风格底（暖光晕 / 金箔 / 石青背光），避开人物保护区
    g.save(); g.beginPath(); g.rect(BOX.x0 + 12, BOX.y0 + 12, BOX.x1 - BOX.x0 - 24, BOX.y1 - BOX.y0 - 24); g.clip();
    if (style === 'nouveau') {
      const gr = g.createRadialGradient(CX, 470, 40, CX, 470, 560);
      const halo = opt.halo || (opt.pal ? 'rgba(245,247,240,.92)' : 'rgba(246,238,219,.92)');
      const halo0 = opt.halo0 || (opt.pal ? 'rgba(245,247,240,0)' : 'rgba(246,238,219,0)');
      gr.addColorStop(0, halo); gr.addColorStop(1, halo0);
      g.fillStyle = gr; g.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
      // 慕夏光环：18 金钉 + 32 花瓣，双层反向转
      g.save(); g.translate(CX, 348);
      g.strokeStyle = S.gold; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 218, 0, TAU); g.stroke();
      g.strokeStyle = S.accent; g.lineWidth = 2.2; g.beginPath(); g.arc(0, 0, 202, 0, TAU); g.stroke();
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t * 0.32; dot(g, Math.cos(a) * 218, Math.sin(a) * 218, 8, S.goldHi, S.goldDk, 1.6); }
      const petal = opt.petalCol || (opt.pal ? 'rgba(232,238,240,.72)' : 'rgba(235,184,178,.62)');
      for (let i = 0; i < 32; i++) { const a = i / 32 * TAU - t * 0.21; F(g, ell(Math.cos(a) * 180, Math.sin(a) * 180, 14, 28, a + Math.PI / 2), petal, null); }
      g.restore();
      // 缠枝花框（左右各一组，随时间摇摆）；外移到 ±408，避开右侧团扇
      for (const side of [-1, 1]) {
        const bx = CX + side * 408;
        const pts = [[bx, 1000], [bx + side * 30, 820], [bx - side * 24, 640], [bx + side * 26, 460], [bx - side * 18, 280], [bx + side * 12, 120]];
        ribbon(g, pts, 15, S.accent, S.goldDk, 1.4);
        for (let k = 0; k < 5; k++) {
          const yy = 200 + k * 190;
          floret(g, bx + side * (18 + Math.sin(t * 1.1 + k) * 12), yy, 22, S.flower, S.goldHi, 6, t * 0.25 + k);
        }
        spiral(g, bx + side * 12, 120, 34, -Math.PI / 2, 1.2, side, S.gold, 3);
      }
    } else if (style === 'gothic') {
      // 哥特尖拱 + 金箔方框光环 + 斜向扫光
      g.fillStyle = 'rgba(216,166,58,.30)'; g.fillRect(BOX.x0 + 20, BOX.y0 + 20, BOX.x1 - BOX.x0 - 40, BOX.y1 - BOX.y0 - 40);
      g.strokeStyle = S.gold; g.lineWidth = 10;
      g.beginPath(); g.moveTo(BOX.x0 + 60, BOX.y1 - 60); g.lineTo(BOX.x0 + 60, 366);
      g.quadraticCurveTo(CX, 142, BOX.x1 - 60, 366); g.lineTo(BOX.x1 - 60, BOX.y1 - 60); g.stroke();
      g.save(); g.translate(CX, 352);
      g.strokeStyle = S.goldHi; g.lineWidth = 12; g.strokeRect(-200, -200, 400, 400);
      g.strokeStyle = S.goldDk; g.lineWidth = 3; g.strokeRect(-184, -184, 368, 368);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 0.18; dot(g, Math.cos(a) * 200, Math.sin(a) * 200, 9, S.goldHi, S.goldDk, 1.6); }
      g.restore();
      const sweep = pmod(t * 190, 1600) - 300;
      const lg = g.createLinearGradient(sweep, 0, sweep + 220, H);
      lg.addColorStop(0, 'rgba(248,222,134,0)'); lg.addColorStop(0.5, 'rgba(248,222,134,.30)'); lg.addColorStop(1, 'rgba(248,222,134,0)');
      g.fillStyle = lg; g.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
      // 四角蔓草
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        g.save(); g.translate(CX + sx * 370, 540 + sy * 430); g.scale(sx, sy);
        spiral(g, 0, 0, 46, 0, 1.4, 1, S.gold, 4); g.restore();
      }
    } else {
      // 敦煌：石青背光 + 火焰纹 + 藻井团花 + 飘带
      g.save(); g.translate(CX, 400);
      for (let k = 0; k < 3; k++) {
        g.beginPath(); g.arc(0, 0, 196 + k * 22, 0, TAU);
        g.strokeStyle = [S.shawl, S.accent, S.gold][k]; g.lineWidth = k === 0 ? 16 : 6; g.globalAlpha = 0.75; g.stroke();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU + t * 0.12;
        g.beginPath(); g.moveTo(Math.cos(a) * 244, Math.sin(a) * 244);
        g.quadraticCurveTo(Math.cos(a + 0.12) * 274, Math.sin(a + 0.12) * 274, Math.cos(a) * 296, Math.sin(a) * 296);
        g.strokeStyle = i % 2 ? S.gold : S.flower; g.lineWidth = 4; g.stroke();
      }
      g.restore();
      for (let k = 0; k < 5; k++) {
        const x = BOX.x0 + 90 + k * 170, y = 120 + Math.sin(t * 0.7 + k) * 8;
        floret(g, x, y, 30, k % 2 ? S.accent : S.flower, S.paper, 8, t * 0.1 + k);
      }
      const r2 = rng(53);
      for (let i = 0; i < 26; i++) {
        const x = BOX.x0 + 30 + r2() * (BOX.x1 - BOX.x0 - 60), y = BOX.y0 + 30 + pmod(r2() * 1000 - t * 34, 980);
        g.globalAlpha = 0.45; floret(g, x, y, 7, S.paper, S.gold, 5, t + i); g.globalAlpha = 1;
      }
    }
    g.restore();

    // 左右侧栏：花签 + 判词（同帧三方向都有，保证构图一致）
    sideCols(g, S, t, opt);
  }

  function sideCols(g, S, t, opt) {
    const title = opt.title || '西天取经路';
    const name = opt.name || '孙悟空';
    const ink = opt.sideInk || S.ink;          // 敦煌土红底要改浅色字，默认分支不变
    const verdict = opt.verdict || '灵根育孕源流出';
    const verdict2 = opt.verdict2 || '心性修持大道生';
    const seal = opt.seal || ['悟', '空'];
    const sealCol = opt.sealCol || S.robe;      // 钤印统一朱红，冷色板也不改
    // 左侧：花签
    g.save();
    g.strokeStyle = S.gold; g.lineWidth = 3; g.strokeRect(88, 130, 300, 820);
    g.strokeStyle = S.goldDk; g.lineWidth = 1.6; g.strokeRect(98, 140, 280, 800);
    // 花饰沿边框两侧排，别压在中间那列竖排字上（上一版 8 朵全压字，已修）
    for (const fx of [130, 346]) for (let i = 0; i < 7; i++)
      floret(g, fx, 190 + i * 108, 12, S.flower, S.goldHi, 6, t * 0.15 + i);
    vtext(g, title, 238, 196, 46, ink, 1.26);
    g.restore();
    // 右侧：判词
    g.save();
    g.strokeStyle = S.gold; g.lineWidth = 3; g.strokeRect(1532, 130, 300, 820);
    g.strokeStyle = S.goldDk; g.lineWidth = 1.6; g.strokeRect(1542, 140, 280, 800);
    // 判词卡压入时隐藏右栏原判词，避免同句三重重复 + 卡片边缘截出半截残字
    if (!opt.hideVerdict) {
      vtext(g, verdict, 1610, 190, 44, ink, 1.24);
      vtext(g, verdict2, 1740, 190, 44, ink, 1.24);
    }
    // 朱红钤印
    g.fillStyle = sealCol; g.fillRect(1600, 826, 92, 92);
    g.strokeStyle = S.paper; g.lineWidth = 3; g.strokeRect(1608, 834, 76, 76);
    htext(g, seal[0], 1646, 856, 30, S.paper); htext(g, seal[1], 1646, 890, 30, S.paper);
    g.restore();
    // 画框顶部标题：不透明纸白横幅压住身后的光环/拱线，保证字不被金线穿过
    g.save();
    g.fillStyle = S.paper; g.fillRect(CX - 182, 44, 364, 62);
    g.strokeStyle = S.gold; g.lineWidth = 2.4; g.strokeRect(CX - 182, 44, 364, 62);
    htext(g, name, CX, 76, 54, S.ink, 12);
    g.beginPath(); g.moveTo(CX - 148, 118); g.lineTo(CX + 148, 118);
    g.lineWidth = 3; g.stroke();
    g.restore();
    if (opt.label) {
      g.save(); g.fillStyle = 'rgba(30,22,16,.78)'; g.fillRect(60, 986, 420, 58);
      htext(g, `${S.tag} · ${S.name}`, 270, 1015, 32, S.paper, 2); g.restore();
    }
  }

  // ---------- 幕布（开场「未见其人，先闻其声」） ----------
  function curtain(g, S, t, open, opt = {}) {
    const half = (BOX.x1 - BOX.x0) / 2;
    // 帘缝透光：前 5 秒不能是一张静帧，中央光缝随时间明暗脉动
    if (open < 0.9) {
      const gap = 12 + Math.sin(t * 1.6) * 6;
      const lg = g.createLinearGradient(CX - gap * 4, 0, CX + gap * 4, 0);
      lg.addColorStop(0, 'rgba(246,220,150,0)');
      lg.addColorStop(0.5, `rgba(246,220,150,${0.26 + 0.14 * Math.sin(t * 2.2)})`);
      lg.addColorStop(1, 'rgba(246,220,150,0)');
      g.save(); g.beginPath(); g.rect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0); g.clip();
      g.fillStyle = lg; g.fillRect(CX - gap * 4, BOX.y0, gap * 8, BOX.y1 - BOX.y0);
      g.restore();
    }
    for (const side of [-1, 1]) {
      const w = half * (1 - clamp(open)) + Math.sin(t * 1.1 + (side < 0 ? 0 : 1.4)) * 6;
      g.save();
      g.beginPath(); g.rect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0); g.clip();
      const x0 = side < 0 ? BOX.x0 : CX + half * clamp(open);
      const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
      gr.addColorStop(0, S.robeDk); gr.addColorStop(0.5, S.robe); gr.addColorStop(1, S.robeHi);
      g.fillStyle = gr; g.fillRect(x0, BOX.y0, w, BOX.y1 - BOX.y0);
      for (let k = 0; k < 7; k++) {
        const xx = x0 + k * w / 7;
        g.beginPath(); g.moveTo(xx, BOX.y0); g.lineTo(xx + Math.sin(t * 1.4 + k) * 6, BOX.y1);
        g.strokeStyle = S.gold; g.lineWidth = 3; g.globalAlpha = 0.65; g.stroke();
      }
      // 帘上织金暗纹：5 秒的空帘幕不能是一片纯红
      g.globalAlpha = 0.34;
      for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
        const fx2 = x0 + (col + 0.5) * w / 3, fy2 = 190 + row * 230;
        floret(g, fx2, fy2, 18, S.goldHi, S.goldDk, 6, t * 0.18 + row + col);
      }
      g.globalAlpha = 1; g.restore();
    }
    // 笑声波纹：同心弧从画框中心向外扩散（凤姐专属；黛玉掀帘用 opt.waves=false 关掉）
    if (open < 0.9 && opt.waves !== false) {
      g.save(); g.beginPath(); g.rect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0); g.clip();
      for (let k = 0; k < 7; k++) {
        const ph = pmod(t * 0.8 - k / 7, 1);
        g.beginPath(); g.arc(CX, 540, 60 + ph * 560, -0.9, 0.9);
        g.strokeStyle = S.goldHi; g.lineWidth = 7 - ph * 3; g.globalAlpha = (1 - ph) * 0.9; g.stroke();
        g.beginPath(); g.arc(CX, 540, 60 + ph * 560, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
      }
      // 帘中央的鎏金铺首门环：给「未见其人」一个视觉落点
      g.save(); g.globalAlpha = 0.92 * (1 - open);
      g.strokeStyle = S.gold; g.lineWidth = 9; g.beginPath(); g.arc(CX, 540, 56, 0, TAU); g.stroke();
      g.strokeStyle = S.goldHi; g.lineWidth = 3.4; g.beginPath(); g.arc(CX, 540, 44, 0, TAU); g.stroke();
      dot(g, CX, 508, 15, S.goldHi, S.goldDk, 2.4);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU + t * 0.1;
        dot(g, CX + Math.cos(a) * 56, 540 + Math.sin(a) * 56, 4.5, S.goldHi);
      }
      g.restore();
      g.restore();
    }
  }

  // ---------- 哥特判词卡（复用方向 B） ----------
  function verdictCard(g, t, p, opt = {}) {
    const S = opt.pal || PAL.gothic, x = 1180, y = 150, w = 560, h = 760;
    const v1 = opt.v1 || '灵根育孕源流出', v2 = opt.v2 || '心性修持大道生';
    const slide = ss(0, 1, p);
    g.save(); g.globalAlpha = slide;
    g.translate(lerp(500, 0, slide), 0);
    g.fillStyle = 'rgba(20,12,8,.28)'; g.fillRect(x + 14, y + 14, w, h);
    g.fillStyle = S.paper; g.fillRect(x, y, w, h);
    g.strokeStyle = S.gold; g.lineWidth = 12; g.strokeRect(x, y, w, h);
    g.strokeStyle = S.goldDk; g.lineWidth = 2.4; g.strokeRect(x + 16, y + 16, w - 32, h - 32);
    for (let i = 0; i < 4; i++) floret(g, x + 60 + i * 150, y + 58, 16, S.gold, S.robe, 6, t * 0.2 + i);
    vtext(g, v1, x + 190, y + 140, 58, S.ink, 1.2);
    vtext(g, v2, x + 360, y + 140, 58, S.ink, 1.2);
    const sweep = pmod(t * 300, 900) - 200;
    const lg = g.createLinearGradient(x + sweep, 0, x + sweep + 160, 0);
    lg.addColorStop(0, 'rgba(248,222,134,0)'); lg.addColorStop(.5, 'rgba(248,222,134,.55)'); lg.addColorStop(1, 'rgba(248,222,134,0)');
    g.fillStyle = lg; g.fillRect(x, y, w, h);
    htext(g, '灵山 · 难簿', x + w / 2, y + 700, 34, S.goldDk, 4);
    g.restore();
  }

  window.XY = { W, H, BOX, CX, GY, PAL, FONT, poly, F, ell, dot, ribbon, spiral, floret, vtext, htext, bez,
                 bodyPaths, drawLady, stage, sideCols, curtain, verdictCard, pmod, ss, clamp, lerp, rng };
})();
