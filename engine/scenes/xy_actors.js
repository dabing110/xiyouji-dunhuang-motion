// 西游记 · 敦煌重彩 —— 第二批六位人物 rig 与八幕画面（window.XY_ACTORS）
// ---------------------------------------------------------------------------
// 扩展范式对齐红楼「续六钗零回归扩展」：
//   xy_common.js → xy_figure.js → xy_series.js → **xy_actors.js** →
//   xy_scene_common.js → xy_scene_films.js（场景版；紧凑版 xy_tight.js 不在本仓库内）
// 悟空片 SERIES_KEY='sunwukong_scene' 由 xy_scene_films.js 直接画，不走本文件分派。
// 本文件不修改任何公共层，只在运行时按 window.SERIES_KEY 分派。
//
// 六套 rig 全部为新建的敦煌神魔人形几何路径（不复用红楼仕女 drawLady，也不复用猴王）：
//   唐僧 光头毗卢帽 / 田相袈裟 / 锡杖      八戒 猪首大耳 / 九齿钉耙
//   沙僧 虬髯骷髅环 / 降妖宝杖 / 经箱      白龙 龙角马鬃 / 缰绳鞍鞯
//   观音 化佛宝冠 / 天衣璎珞 / 净瓶莲台    二郎 额生天眼 / 三尖两刃刀 / 哮天犬
//
// 红线 01：正式 8 幕必须 tilt + 子镜头 + 推近 + 幕专属前景，不以换 pose 凑数。
// 红线 02：深色赭块上的线一律纸白 / 金色；竖向元素止于 y≈610，不横跨人物头顶。
// 红线 04：所有叠加部件（头光 / 法器 / 莲台 / 犬）都画在 figure() 的同一套
//          tilt/lift/alpha 变换内部，人物淡出时不会留下悬浮件。
(() => {
  const H = window.XY, S = window.XY_SERIES, FIG = window.XY_FIGURE;
  if (!H || !S || !FIG) {
    window.__bootErrors = (window.__bootErrors || []).concat(
      ['xy_actors.js: 缺 xy_common / xy_figure / xy_series（SCENE_LIBS 顺序须为 common → figure → series → actors → tight）']);
    return;
  }
  const { F, poly, ell, dot, ribbon, floret, htext, vtext, pmod, ss, clamp, lerp } = H;
  const P = H.PAL.dunhuang;
  const BOX = H.BOX, CX = H.CX, GY = H.GY, TAU = Math.PI * 2;
  const PAPER = P.paper, GOLD = P.gold, GOLDHI = P.goldHi, GOLDD = P.goldDk;
  const INK = P.ink, RED = P.robe, REDDK = P.robeDk, REDHI = P.robeHi;
  const BLUE = P.shawl, BLUEDK = P.shawlDk, ORANGE = P.flower, GREEN = P.accent;
  const SKIN = '#f2dcc4', SKINDK = '#c99a72', WHITE = '#f6f4e8';
  const ACT = 3.8;

  // ============================================================ 共享道具库
  // 动势弧：不画兵器相击、不画血光，只给三道金 / 纸白弧表示「这一下挥出去了」
  function arcs(c, t, x, y, k) {
    c.save();
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.arc(x, y, 100 + i * 52 + t * 14, -1.05, 0.72);
      c.strokeStyle = i % 2 ? GOLDHI : PAPER; c.lineWidth = 5 - i;
      c.globalAlpha = (0.72 - i * 0.16) * (k === undefined ? 1 : k); c.stroke();
    }
    c.restore();
  }

  // 掀帘幕的云雾：横向纸白 / 石青波线，绝不画竖线跨头顶
  function mist(c, t, col) {
    c.save();
    for (let i = 0; i < 5; i++) {
      const y = 300 + i * 132;
      c.beginPath(); c.moveTo(BOX.x0 + 26, y);
      c.bezierCurveTo(BOX.x0 + 240, y - 46 + Math.sin(t * 0.9 + i) * 14,
                       BOX.x1 - 240, y + 46, BOX.x1 - 26, y - 8);
      c.strokeStyle = col || (i % 2 ? PAPER : GOLDHI);
      c.lineWidth = 4.4; c.globalAlpha = 0.46 + 0.16 * Math.sin(t * 1.3 + i); c.stroke();
    }
    c.restore();
  }

  // 塔影（金山寺 / 灵山）：只画剪影 + 金檐，不压人物
  function pagoda(c, t, x, base, s) {
    const px = x === undefined ? BOX.x0 + 150 : x;
    const by = base === undefined ? 950 : base;
    const sc = s === undefined ? 1 : s;
    c.save(); c.translate(px, by); c.scale(sc, sc); c.globalAlpha = 0.82;
    for (let k = 0; k < 4; k++) {
      const w = 116 - k * 18, h = 76;
      const yy = -k * (h + 12);
      F(c, poly([[-w, yy - h], [w, yy - h], [w * 0.86, yy], [-w * 0.86, yy]]), REDDK, GOLD, 3.4);
      F(c, poly([[-w - 22, yy - h], [w + 22, yy - h], [w + 8, yy - h + 15], [-w - 8, yy - h + 15]]), GOLDHI, INK, 2.6);
      for (let j = 0; j < 3; j++) {
        c.beginPath(); c.moveTo(-w * 0.6 + j * w * 0.6, yy - h + 12);
        c.lineTo(-w * 0.6 + j * w * 0.6, yy - 6);
        c.strokeStyle = GOLD; c.lineWidth = 2.4; c.stroke();
      }
    }
    F(c, poly([[-18, -352], [18, -352], [0, -404]]), GOLDHI, INK, 2.6);
    c.restore();
  }

  // 河 / 浪：rough=true 时给浊浪（流沙河），false 时给南海细浪
  function river(c, t, rough) {
    c.save();
    for (let k = 0; k < (rough ? 5 : 3); k++) {
      const y = 760 + k * 48;
      c.beginPath(); c.moveTo(BOX.x0 + 18, y);
      for (let x = BOX.x0 + 18; x <= BOX.x1 - 18; x += 26)
        c.lineTo(x, y + Math.sin(x * 0.024 + t * (rough ? 2.6 : 1.6) + k) * (rough ? 26 : 14));
      c.strokeStyle = k % 2 ? 'rgba(236,223,196,.72)' : (rough ? BLUEDK : BLUE);
      c.lineWidth = rough ? 8 - k : 6 - k; c.globalAlpha = rough ? 0.9 : 0.78; c.stroke();
    }
    c.restore();
  }

  // 山门 / 城门匾：两侧立柱止于 y=610，绝不横跨头顶
  function gate(c, t, label) {
    c.save();
    for (const s of [-1, 1]) {
      const x = CX + s * 292;
      F(c, poly([[x - 26, 320], [x + 26, 320], [x + 32, 940], [x - 32, 940]]), REDDK, GOLD, 3.4);
      F(c, poly([[x - 44, 320], [x + 44, 320], [x + 44, 352], [x - 44, 352]]), GOLDHI, INK, 2.6);
    }
    F(c, poly([[CX - 226, 300], [CX + 226, 300], [CX + 226, 386], [CX - 226, 386]]), REDDK, GOLD, 4);
    F(c, poly([[CX - 210, 312], [CX + 210, 312], [CX + 210, 374], [CX - 210, 374]]), null, GOLDHI, 2.4);
    htext(c, label || '长安', CX, 356, 44, PAPER, 6);
    c.restore();
  }

  // 莲台：多层花瓣，中央给观音站；别的人物不用
  function lotus(c, t, u, x, y, s) {
    const lx = x === undefined ? CX : x, ly = y === undefined ? 966 : y;
    const sc = s === undefined ? 1 : s;
    c.save(); c.translate(lx, ly); c.scale(sc, sc);
    const grow = 0.72 + 0.28 * ss(0, 1, clamp(u));
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 9; i++) {
      const a = Math.PI + i / 8 * Math.PI + ring * 0.16;
      const rr = (ring ? 122 : 86) * grow;
      c.save(); c.translate(Math.cos(a) * rr * 0.62, Math.sin(a) * 30);
      c.rotate(a + Math.PI / 2);
      F(c, ell(0, 0, 26, 62, 0), ring ? REDHI : PAPER, GOLDD, 2.4);
      c.restore();
    }
    F(c, ell(0, -6, 176 * grow, 30), GOLD, INK, 3.4);
    F(c, ell(0, -16, 158 * grow, 20), GOLDHI, GOLDD, 2);
    c.restore();
  }

  // 经卷展开：从窄条展开成整幅，卷轴两端金轴头
  function scroll(c, t, u, y) {
    const cy = y === undefined ? 700 : y;
    const q = ss(0.06, 0.94, clamp(u));
    const w = lerp(56, 330, q);
    F(c, poly([[CX - w, cy - 96], [CX + w, cy - 96], [CX + w, cy + 96], [CX - w, cy + 96]]), PAPER, GOLD, 4);
    F(c, poly([[CX - w + 16, cy - 80], [CX + w - 16, cy - 80],
               [CX + w - 16, cy + 80], [CX - w + 16, cy + 80]]), null, RED, 2);
    for (let k = 0; k < 5; k++) {
      const yy = cy - 60 + k * 30;
      c.beginPath(); c.moveTo(CX - w + 32, yy); c.lineTo(CX + w - 32, yy);
      c.strokeStyle = k % 2 ? GOLDD : INK; c.lineWidth = 2.6; c.globalAlpha = 0.55 * q; c.stroke();
    }
    c.globalAlpha = 1;
    for (const s of [-1, 1])
      F(c, poly([[CX + s * w - 12, cy - 108], [CX + s * w + 12, cy - 108],
                 [CX + s * w + 12, cy + 108], [CX + s * w - 12, cy + 108]]), GOLDHI, INK, 2.6);
  }

  // 经箱担子：挑担给沙僧 / 八戒，扁担与箱之间必须有垂绳（水浒红线：组合道具补连接件）
  function sutraBox(c, t, s) {
    c.save();
    const side = s || 1, bx = CX + side * 258, by = 790;
    c.beginPath(); c.moveTo(CX - 320, 640); c.lineTo(CX + 320, 640);
    c.strokeStyle = GOLDHI; c.lineWidth = 10; c.stroke();
    for (const q of [-1, 1]) {
      const qx = CX + q * 258;
      c.beginPath(); c.moveTo(qx, 646); c.lineTo(qx, 746);
      c.strokeStyle = GOLDD; c.lineWidth = 4.6; c.stroke();
      F(c, poly([[qx - 76, 746], [qx + 76, 746], [qx + 82, 872], [qx - 82, 872]]), REDDK, GOLD, 3.4);
      F(c, poly([[qx - 62, 760], [qx + 62, 760], [qx + 66, 858], [qx - 66, 858]]), ORANGE, GOLDHI, 2.2);
      htext(c, '经', qx, 818, 40, INK, 0);
    }
    c.restore();
  }

  // 明珠 / 金刚琢：金环 + 内光，随时间脉动
  function pearl(c, t, u, x, y) {
    const px = x === undefined ? CX + 300 : x, py = y === undefined ? 420 : y;
    const rr = 44 + 8 * Math.sin(t * 1.8) + 16 * ss(0, 1, clamp(u));
    c.save();
    c.beginPath(); c.arc(px, py, rr + 16, 0, TAU);
    c.strokeStyle = GOLDHI; c.lineWidth = 8; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2.1); c.stroke();
    c.globalAlpha = 1;
    // 首轮内芯用 PAPER（米白）画在米白地仗上等于没画，k1 的明珠整颗消失、背光环空成镜子。
    // 改为深赭底衬 + 金珠 + 纸白高光，深色块上的亮件才读得出来。
    dot(c, px, py, rr + 4, REDDK, GOLDD, 2.6);
    dot(c, px, py, rr, GOLDHI, INK, 3);
    dot(c, px - rr * 0.3, py - rr * 0.32, rr * 0.32, PAPER, null);
    c.restore();
  }

  // 九齿钉耙：横杆 + 九齿，作为八戒主动作幕的放大特写
  function rake(c, t, u, x, y, s) {
    const px = x === undefined ? CX + 250 : x, py = y === undefined ? 520 : y;
    const sc = s === undefined ? 1 : s;
    c.save(); c.translate(px, py); c.scale(sc, sc); c.rotate(-0.2 + 0.1 * Math.sin(t * 1.4));
    FIG.bar(c, -40, 180, -40, -150, 16, GOLDD, INK, 2.4);
    FIG.bar(c, -150, -150, 150, -150, 22, GOLDHI, GOLDD, 2.4);
    for (let i = -4; i <= 4; i++)
      F(c, poly([[i * 34 - 9, -150], [i * 34 + 9, -150], [i * 34 + 6, -206], [i * 34, -222],
                 [i * 34 - 6, -206]]), PAPER, GOLDD, 2.2);
    c.restore();
  }

  // 净瓶 + 杨枝：倾瓶一滴，枯木抽芽（留白，不画水花四溅）
  function vase(c, t, u, x, y, s) {
    const px = x === undefined ? CX + 250 : x, py = y === undefined ? 620 : y;
    const sc = s === undefined ? 1 : s;
    c.save(); c.translate(px, py); c.scale(sc, sc);
    F(c, poly([[-34, -110], [34, -110], [30, -78], [54, -30], [62, 88], [-62, 88],
               [-54, -30], [-30, -78]]), PAPER, GOLDD, 3.4);
    F(c, poly([[-52, 10], [52, 10], [58, 76], [-58, 76]]), BLUE, GOLDHI, 2);
    F(c, poly([[-40, -122], [40, -122], [40, -106], [-40, -106]]), GOLDHI, INK, 2.4);
    // 杨枝
    c.beginPath(); c.moveTo(-8, -112);
    c.bezierCurveTo(-56, -190, 20, -240, 66, -288);
    c.strokeStyle = GREEN; c.lineWidth = 7; c.stroke();
    for (let i = 0; i < 6; i++) {
      const q = i / 6;
      const lx = -8 + 74 * q + Math.sin(t + i) * 5, ly = -112 - 176 * q;
      F(c, ell(lx, ly, 8, 20, -0.6 + i * 0.2), GREEN, GOLDD, 1.6);
    }
    // 一滴净水 + 抽芽
    const dq = pmod(t * 0.6 + u * 0.4, 1);
    dot(c, 26, -60 + dq * 190, 9, PAPER, GOLDHI, 2);
    c.beginPath(); c.moveTo(CX - px + 40, 180);
    c.quadraticCurveTo(CX - px + 60, 120 - 26 * ss(0, 1, u), CX - px + 84, 96 - 46 * ss(0, 1, u));
    c.strokeStyle = GOLDHI; c.lineWidth = 7; c.stroke();
    c.restore();
  }

  // 三个金箍：观音交付给师徒，三枚悬浮金环
  function hoops(c, t, u) {
    c.save();
    for (let i = 0; i < 3; i++) {
      const a = t * 0.7 + i * TAU / 3;
      const px = CX + Math.cos(a) * (150 + 40 * ss(0, 1, u));
      const py = 430 + Math.sin(a) * 96;
      c.beginPath(); c.ellipse(px, py, 40, 13, 0.2 * Math.sin(a), 0, TAU);
      c.strokeStyle = GOLDHI; c.lineWidth = 10; c.stroke();
      c.beginPath(); c.ellipse(px, py, 40, 13, 0.2 * Math.sin(a), 0, TAU);
      c.strokeStyle = GOLDD; c.lineWidth = 2.4; c.stroke();
      dot(c, px, py - 16, 6, RED, INK, 1.4);
    }
    c.restore();
  }

  // 哮天犬：侧后方小犬，暗块 + 金边，不抢主体
  function dog(c, t, x, y) {
    const px = x === undefined ? CX + 268 : x, py = y === undefined ? 908 : y;
    c.save(); c.translate(px, py);
    F(c, ell(0, 0, 66, 34), INK, GOLD, 3);
    F(c, poly([[36, -18], [72, -66], [92, -52], [70, 10]]), INK, GOLD, 3);
    dot(c, 82, -60, 24, INK, GOLD, 2.8);
    F(c, poly([[68, -78], [80, -104], [92, -78]]), REDDK, GOLD, 2);
    dot(c, 90, -62, 4, GOLDHI, null);
    for (const q of [-1, 1]) {
      c.beginPath(); c.moveTo(q * 30, 24); c.lineTo(q * 34, 58);
      c.strokeStyle = GOLD; c.lineWidth = 9; c.stroke();
    }
    c.beginPath(); c.moveTo(-62, -6);
    c.quadraticCurveTo(-104, -46 + 12 * Math.sin(t * 3), -84, -70);
    c.strokeStyle = GOLD; c.lineWidth = 10; c.stroke();
    c.restore();
  }

  // 白马侧影：白龙马片的点题物，只在专属幕出现
  function horse(c, t, u, x, y, s) {
    const px = x === undefined ? CX + 240 : x, py = y === undefined ? 818 : y;
    const sc = s === undefined ? 1 : s;
    c.save(); c.translate(px, py); c.scale(sc, sc);
    c.globalAlpha = 0.86 + 0.14 * ss(0, 1, u);
    F(c, ell(0, 0, 96, 52), PAPER, GOLDD, 3.6);
    F(c, poly([[62, -26], [108, -104], [138, -88], [100, 8]]), PAPER, GOLDD, 3.4);
    F(c, ell(126, -98, 30, 22), PAPER, GOLDD, 2.8);
    F(c, poly([[108, -116], [116, -146], [128, -114]]), GOLDHI, INK, 2);
    dot(c, 138, -100, 4.5, INK, null);
    for (const q of [-1, 1]) for (let i = 0; i < 2; i++) {
      c.beginPath(); c.moveTo(q * 46 + i * 26, 38); c.lineTo(q * 52 + i * 26, 112);
      c.strokeStyle = PAPER; c.lineWidth = 13; c.stroke();
    }
    // 鬃毛与鞍鞯
    c.beginPath(); c.moveTo(56, -40);
    c.quadraticCurveTo(20, -90 + 10 * Math.sin(t * 2), -12, -44);
    c.strokeStyle = BLUE; c.lineWidth = 12; c.stroke();
    F(c, poly([[-52, -46], [30, -46], [36, -8], [-58, -8]]), REDDK, GOLDHI, 2.8);
    F(c, poly([[-40, -40], [18, -40], [22, -16], [-44, -16]]), GOLDHI, INK, 2);
    c.restore();
  }

  // 千山雪：收口片 / 白龙马片收束用，纸白斜线，不画血光
  function snow(c, t, u) {
    c.save();
    F(c, poly([[BOX.x0 + 20, 980], [BOX.x0 + 140, 840], [CX - 190, 872],
               [CX + 40, 780], [CX + 260, 858], [BOX.x1 - 120, 826], [BOX.x1 - 20, 980]]), PAPER, GOLDD, 3.4);
    for (let i = 0; i < 16; i++) {
      const x = BOX.x0 + 30 + pmod(i * 97 + t * (16 + i % 3 * 9), BOX.x1 - BOX.x0 - 60);
      const y = BOX.y0 + 40 + pmod(i * 151 + t * 42, 720);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y + 14);
      c.strokeStyle = PAPER; c.lineWidth = 3.4; c.globalAlpha = 0.7; c.stroke();
    }
    c.restore();
  }

  // 灵山钟：钟体 + 声波弧
  function bell(c, t, u, x, y, s) {
    const px = x === undefined ? CX + 300 : x, py = y === undefined ? 500 : y;
    const sc = s === undefined ? 1 : s;
    c.save(); c.translate(px, py); c.scale(sc, sc);
    F(c, poly([[-58, -96], [58, -96], [72, 62], [86, 96], [-86, 96], [-72, 62]]), GOLDHI, INK, 4);
    F(c, poly([[-46, -80], [46, -80], [58, 56], [-58, 56]]), GOLD, GOLDD, 2.4);
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(-46, -30 + i * 30); c.lineTo(46, -30 + i * 30);
      c.strokeStyle = INK; c.lineWidth = 3; c.globalAlpha = 0.55; c.stroke();
    }
    c.globalAlpha = 1;
    dot(c, 0, 108, 16, REDDK, GOLD, 2.4);
    F(c, poly([[-16, -128], [16, -128], [10, -96], [-10, -96]]), GOLD, INK, 2.4);
    for (let i = 0; i < 3; i++) {
      const ph = pmod(t * 0.7 + i / 3 + u * 0.2, 1);
      c.beginPath(); c.arc(0, 0, 100 + ph * 190, -1.1, 1.1);
      c.strokeStyle = PAPER; c.lineWidth = 5 - ph * 3;
      c.globalAlpha = (1 - ph) * 0.6; c.stroke();
    }
    c.restore();
  }

  // 妖洞火熄：焦墨暗影 + 纸白余烬线，留白暗写（不画血光、不画打斗）
  function fireOut(c, t, u) {
    c.save();
    const q = ss(0, 1, clamp(u));
    F(c, poly([[BOX.x0 + 30, 980], [BOX.x0 + 30, 690], [BOX.x0 + 190, 596],
               [BOX.x0 + 330, 690], [BOX.x0 + 330, 980]]), 'rgba(42,26,20,.86)', GOLDD, 3);
    for (let i = 0; i < 6; i++) {
      const x = BOX.x0 + 66 + i * 44;
      c.beginPath(); c.moveTo(x, 900);
      c.quadraticCurveTo(x + 18 * Math.sin(t * 2 + i), 760 - q * 90, x + 8, 660 - q * 150);
      c.strokeStyle = 'rgba(252,251,246,' + (0.62 - q * 0.42) + ')';
      c.lineWidth = 4.4; c.stroke();
    }
    c.restore();
  }

  // ============================================================ 通用人形骨架
  // 全部新建：头光 / 飘带 / 腿 / 袍 / 图案 / 手臂 / 头 / 冠 / 法器 / 足，
  // 都在同一个 tilt/lift/alpha 变换里，落实红线 04。
  function headLight(c, kind, t) {
    c.save(); c.translate(CX, 330); c.rotate(t * 0.06);
    if (kind === 'lotus') {
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU;
        c.save(); c.translate(Math.cos(a) * 156, Math.sin(a) * 156); c.rotate(a + Math.PI / 2);
        F(c, ell(0, 0, 15, 40, 0), PAPER, GOLDD, 2); c.restore();
      }
    } else if (kind === 'wave') {
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.arc(0, 0, 130 + k * 20, 0, TAU);
        c.strokeStyle = k === 1 ? PAPER : BLUE; c.lineWidth = 6; c.globalAlpha = 0.7; c.stroke();
      }
    } else if (kind === 'cloud') {
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.arc(0, 0, 132 + k * 21, 0, TAU);
        c.strokeStyle = k % 2 ? GOLDHI : REDHI; c.lineWidth = k === 0 ? 12 : 5;
        c.globalAlpha = 0.72; c.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + t * 0.2;
        floret(c, Math.cos(a) * 178, Math.sin(a) * 178, 12, GOLDHI, GOLDD, 6, t + i);
      }
    } else if (kind === 'thunder') {
      c.beginPath(); c.arc(0, 0, 154, 0, TAU);
      c.strokeStyle = GOLD; c.lineWidth = 10; c.stroke();
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + t * 0.14;
        F(c, poly([[Math.cos(a) * 166, Math.sin(a) * 166],
                   [Math.cos(a + 0.12) * 196, Math.sin(a + 0.12) * 196],
                   [Math.cos(a + 0.24) * 166, Math.sin(a + 0.24) * 166]]),
          i % 2 ? REDHI : GOLDHI, GOLDD, 1.8);
      }
    } else {
      c.beginPath(); c.arc(0, 0, 148, 0, TAU);
      c.strokeStyle = GOLDHI; c.lineWidth = 11; c.stroke();
      c.beginPath(); c.arc(0, 0, 132, 0, TAU);
      c.strokeStyle = GOLD; c.lineWidth = 3; c.stroke();
    }
    c.globalAlpha = 1; c.restore();
  }

  function pattern(c, bp, kind, t) {
    c.save(); c.clip(bp);
    if (kind === 'grid') {                     // 田相袈裟
      for (let k = 0; k < 8; k++) {
        const yy = 448 + k * 44;
        c.beginPath(); c.moveTo(CX - 140, yy); c.lineTo(CX + 140, yy);
        c.strokeStyle = GOLDHI; c.lineWidth = 4; c.globalAlpha = 0.62; c.stroke();
      }
      for (let k = -3; k <= 3; k++) {
        c.beginPath(); c.moveTo(CX + k * 40, 436); c.lineTo(CX + k * 40, 792);
        c.strokeStyle = REDDK; c.lineWidth = 4; c.globalAlpha = 0.5; c.stroke();
      }
    } else if (kind === 'scale') {             // 叠压菱鳞
      for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) {
        const px = CX - 100 + k * 33 + (r % 2 ? 16 : 0), py = 452 + r * 26;
        F(c, poly([[px - 15, py], [px, py - 12], [px + 15, py], [px, py + 14]]),
          r % 2 ? GOLD : GOLDHI, GOLDD, 1.2);
      }
    } else if (kind === 'wave') {              // 水纹
      for (let k = 0; k < 10; k++) {
        const yy = 450 + k * 36;
        c.beginPath(); c.moveTo(CX - 140, yy);
        c.quadraticCurveTo(CX, yy + 22, CX + 140, yy - 6);
        c.strokeStyle = k % 2 ? BLUEDK : PAPER; c.lineWidth = 5; c.globalAlpha = 0.66; c.stroke();
      }
    } else if (kind === 'petal') {            // 天衣莲瓣
      for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) {
        const px = CX - 96 + k * 40, py = 470 + r * 62;
        F(c, ell(px, py, 17, 32, 0), r % 2 ? PAPER : GOLDHI, GOLDD, 1.6);
      }
    } else {                                  // armor 甲片
      for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) {
        const px = CX - 96 + k * 48, py = 456 + r * 48;
        F(c, poly([[px - 22, py], [px + 22, py], [px + 22, py + 38], [px - 22, py + 38]]),
          r % 2 ? GOLD : BLUE, GOLDD, 1.8);
      }
    }
    c.restore();
  }

  function figure(c, t, o) {
    const k = window.SERIES_KEY, A = ACTORS[k];
    if (!A) return;
    const tilt = o.tilt || 0, lift = o.lift || 0;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    const pose = o.pose || 'stand';
    c.save();
    c.globalAlpha = alpha;
    c.translate(CX, GY); c.rotate(tilt); c.translate(-CX, -GY - lift);
    headLight(c, A.halo, t);
    // 飘带：每人宽度 / 色 / 摆幅不同，横向摆幅给到 ±340 才不会读成竖杆
    for (const side of [-1, 1])
      ribbon(c, [[CX + side * 92, 470], [CX + side * 240, 540], [CX + side * 330, 700],
                  [CX + side * (250 + A.rib), 880]], 20 + 6 * Math.sin(t * 1.2 + side),
             A.ribCol, GOLDD, 2.4, t * 0.6 + side);
    // 腿 / 下摆
    for (const s of [-1, 1]) {
      F(c, poly([[CX + s * 24, 782], [CX + s * 96, 782], [CX + s * 108, 962], [CX + s * 34, 962]]),
        A.robeDk, INK, 3.6);
      F(c, ell(CX + s * 70, 968, 46, 18), INK, GOLD, 3);
    }
    // 躯干
    const bp = poly([[CX - 108, 436], [CX + 108, 436], [CX + 128, 792], [CX - 128, 792]]);
    F(c, bp, A.robe, INK, 4.4);
    pattern(c, bp, A.pattern, t);
    F(c, poly([[CX - 116, 650], [CX + 116, 650], [CX + 122, 690], [CX - 122, 690]]), A.belt, GOLD, 3.4);
    dot(c, CX, 670, 22, GOLDHI, INK, 2.6);
    // 肩甲 / 璎珞
    for (const s of [-1, 1]) {
      F(c, ell(CX + s * 116, 456, 52, 38), A.belt, INK, 3.4);
      dot(c, CX + s * 128, 448, 9, RED, INK, 2);
      if (A.beads) for (let i = 0; i < 5; i++)
        dot(c, CX + s * (52 + i * 16), 512 + i * 30, 8, i % 2 ? PAPER : GOLDHI, GOLDD, 1.4);
    }
    // 手臂：pose 决定肩肘腕，法器握在腕上
    const poses = {
      stand:  { l: [-208, 560], le: [-190, 480], r: [208, 560], re: [190, 480] },
      // 单手举、另一手垂在身侧：双手同时上举会与两侧竖匾/法器读成「十字架 / 脚手架」
      raise:  { l: [-150, 300], le: [-176, 410], r: [206, 610], re: [190, 510] },
      strike: { l: [-250, 420], le: [-206, 380], r: [300, 330], re: [216, 400] },
      bow:    { l: [-160, 650], le: [-150, 560], r: [160, 650], re: [150, 560] },
      sealed: { l: [-96, 660], le: [-118, 570], r: [96, 660], re: [118, 570] },
    };
    const q = poses[pose] || poses.stand;
    for (const [sh, el, hd] of [
      [{ x: CX - 118, y: 462 }, { x: CX + q.le[0], y: q.le[1] }, { x: CX + q.l[0], y: q.l[1] }],
      [{ x: CX + 118, y: 462 }, { x: CX + q.re[0], y: q.re[1] }, { x: CX + q.r[0], y: q.r[1] }],
    ]) {
      FIG.bar(c, sh.x, sh.y, el.x, el.y, 38, A.robe, INK, 3.4);
      FIG.bar(c, el.x, el.y, hd.x, hd.y, 30, A.belt, INK, 3);
      F(c, ell(hd.x, hd.y, 21, 17), A.skin || SKIN, INK, 3);
    }
    A.head(c, t, pose);
    A.crown(c, t);
    A.weapon(c, t, pose, q);
    A.foot(c, t, pose);
    c.restore();
  }

  // ============================================================ 六套头 / 冠 / 法器 / 足
  function noop() {}

  // ---- 唐僧：光头 + 毗卢帽 + 田相袈裟 + 锡杖
  function headTang(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, ell(0, 0, 84, 96), SKIN, INK, 4);
    for (const s of [-1, 1]) {
      F(c, ell(s * 86, 12, 13, 28), SKIN, INK, 2.6);
      c.beginPath(); c.moveTo(s * 16, -12); c.quadraticCurveTo(s * 36, -24, s * 56, -10);
      c.strokeStyle = INK; c.lineWidth = 4.4; c.stroke();
      F(c, ell(s * 32, 8, 14, 7), PAPER, INK, 2);
      dot(c, s * 32, 8, 4.5, INK, null);
    }
    dot(c, 0, -30, 7, RED, null);
    c.beginPath(); c.moveTo(-18, 52); c.quadraticCurveTo(0, 62, 18, 52);
    c.strokeStyle = REDDK; c.lineWidth = 4; c.stroke();
    F(c, poly([[-16, 68], [16, 68], [0, 86]]), REDDK, INK, 2);
    c.restore();
  }
  function crownTang(c) {
    c.save(); c.translate(CX, 330);
    F(c, poly([[-96, -66], [96, -66], [80, -132], [-80, -132]]), GOLDHI, INK, 4);
    F(c, poly([[-82, -76], [82, -76], [68, -122], [-68, -122]]), REDDK, GOLD, 2.4);
    for (let k = -2; k <= 2; k++) F(c, ell(k * 32, -136, 16, 22), GOLD, INK, 2.2);
    dot(c, 0, -142, 12, RED, GOLD, 2);
    c.restore();
  }
  function weaponTang(c, t, pose) {
    const px = CX + (pose === 'raise' ? 170 : 220);
    c.save();
    c.beginPath(); c.moveTo(px, 300 + (pose === 'raise' ? -60 : 0)); c.lineTo(px, 950);
    c.strokeStyle = GOLDHI; c.lineWidth = 12; c.stroke();
    c.beginPath(); c.arc(px, 286 + (pose === 'raise' ? -60 : 0), 26, 0, TAU);
    c.strokeStyle = GOLD; c.lineWidth = 8; c.stroke();
    c.beginPath(); c.arc(px + 30, 286 + (pose === 'raise' ? -60 : 0), 18, 0, TAU);
    c.strokeStyle = GOLDHI; c.lineWidth = 6; c.stroke();
    for (const yy of [420, 520, 620]) dot(c, px, yy, 9, RED, GOLDD, 2);
    c.restore();
  }

  // ---- 八戒：猪首大耳长吻 + 僧巾 + 九齿钉耙
  function headBajie(c, t) {
    c.save(); c.translate(CX, 330);
    for (const s of [-1, 1])
      F(c, poly([[s * 58, -52], [s * 158, -104], [s * 168, -8], [s * 82, 28]]), '#d98c6c', INK, 4);
    F(c, ell(0, 0, 94, 90), '#e8a884', INK, 4);
    F(c, ell(0, 46, 62, 40), '#f2c0a0', INK, 3.4);
    for (const s of [-1, 1]) {
      dot(c, s * 22, 46, 8, INK, null);
      F(c, ell(s * 38, -18, 17, 12), PAPER, INK, 2.4);
      dot(c, s * 38, -18, 6, INK, null);
      c.beginPath(); c.moveTo(s * 18, -48); c.lineTo(s * 64, -58);
      c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
      F(c, poly([[s * 24, 72], [s * 34, 72], [s * 30, 96]]), PAPER, INK, 2);
    }
    c.beginPath(); c.moveTo(-40, 78); c.quadraticCurveTo(0, 92, 40, 78);
    c.strokeStyle = REDDK; c.lineWidth = 4; c.stroke();
    c.restore();
  }
  function crownBajie(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, poly([[-96, -72], [96, -72], [72, -122], [-72, -122]]), BLUEDK, GOLD, 3.6);
    F(c, poly([[-84, -84], [84, -84], [64, -112], [-64, -112]]), BLUE, GOLDHI, 2);
    for (let k = -1; k <= 1; k++) dot(c, k * 44, -128, 10, RED, INK, 2);
    c.restore();
  }
  function weaponBajie(c, t, pose) {
    const px = CX + (pose === 'strike' ? 300 : 236);
    const py = pose === 'strike' ? 430 : 540;
    rake(c, t, pose === 'strike' ? 1 : 0, px, py, 0.86);
  }

  // ---- 沙僧：虬髯黑面 + 骷髅项链 + 降妖宝杖
  function headSha(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, ell(0, 0, 88, 96), '#a86a42', INK, 4);
    for (const s of [-1, 1]) {
      F(c, ell(s * 88, 10, 13, 26), '#a86a42', INK, 2.6);
      c.beginPath(); c.moveTo(s * 12, -26); c.lineTo(s * 66, -40);
      c.strokeStyle = INK; c.lineWidth = 9; c.stroke();
      F(c, ell(s * 34, -2, 17, 11), PAPER, INK, 2.4);
      dot(c, s * 34, -2, 6, INK, null);
    }
    // 卷虬髯：多段贝塞尔，不画成一把黑三角
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI * 0.9 + k * 0.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * 44, 30 + Math.sin(a) * 28);
      c.quadraticCurveTo(Math.cos(a) * 92, 74 + Math.sin(a) * 54,
                         Math.cos(a + 0.12) * 58, 108 + Math.sin(a) * 34);
      c.strokeStyle = k % 2 ? INK : '#4a2618'; c.lineWidth = 9 - Math.abs(k - 3) * 0.8; c.stroke();
    }
    c.beginPath(); c.moveTo(-22, 46); c.quadraticCurveTo(0, 54, 22, 46);
    c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
    c.restore();
  }
  function crownSha(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, poly([[-92, -74], [92, -74], [86, -104], [-86, -104]]), GOLDD, INK, 3.4);
    F(c, ell(0, -112, 46, 34), INK, GOLD, 3.2);
    dot(c, 0, -142, 13, GOLDHI, INK, 2);
    c.restore();
    // 骷髅项链画在胸前（绝对坐标），不能留在 translate(CX,330) 里否则会双倍偏移
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.86 + i / 8 * Math.PI * 1.72;
      const px = CX + Math.cos(a) * 116, py = 526 + Math.sin(a) * 62;
      dot(c, px, py, 13, PAPER, GOLDD, 2);
      dot(c, px - 4, py - 2, 2.6, INK, null);
      dot(c, px + 4, py - 2, 2.6, INK, null);
    }
  }
  function weaponSha(c, t, pose) {
    const px = CX - 236;
    c.save();
    c.beginPath(); c.moveTo(px, 300); c.lineTo(px, 950);
    c.strokeStyle = GOLDHI; c.lineWidth = 12; c.stroke();
    F(c, poly([[px - 62, 300], [px + 62, 300], [px + 40, 252], [px, 226], [px - 40, 252]]),
      PAPER, GOLDD, 3.2);
    F(c, poly([[px - 40, 296], [px + 40, 296], [px + 26, 264], [px, 246], [px - 26, 264]]),
      BLUE, GOLDHI, 2);
    for (const yy of [420, 540, 660]) dot(c, px, yy, 8, RED, GOLDD, 2);
    c.restore();
  }

  // ---- 白龙马：龙角马鬃 + 白袍 + 缰绳（人形龙太子，点题白马放在专属幕）
  function headDragon(c, t) {
    c.save(); c.translate(CX, 330);
    for (const s of [-1, 1]) {
      F(c, poly([[s * 44, -76], [s * 78, -158], [s * 96, -146], [s * 72, -62]]), GOLDHI, INK, 3.2);
      F(c, poly([[s * 58, -118], [s * 90, -186], [s * 102, -176], [s * 84, -108]]), GOLD, INK, 2.6);
    }
    F(c, ell(0, 0, 84, 94), WHITE, INK, 4);
    // 马鬃：石青 / 纸白交错，从头顶向后披
    for (let k = 0; k < 7; k++) {
      c.beginPath(); c.moveTo(-70 + k * 22, -76);
      c.quadraticCurveTo(-96 + k * 26, -126 - (k % 3) * 12, -52 + k * 26, -156);
      c.strokeStyle = k % 2 ? BLUE : PAPER; c.lineWidth = 11 - (k % 3) * 2; c.stroke();
    }
    for (const s of [-1, 1]) {
      F(c, ell(s * 34, -8, 16, 10), PAPER, INK, 2.4);
      dot(c, s * 34, -8, 6, BLUEDK, null);
      c.beginPath(); c.moveTo(s * 14, -32); c.lineTo(s * 62, -40);
      c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
      // 龙须
      c.beginPath(); c.moveTo(s * 26, 42);
      c.quadraticCurveTo(s * 92, 68 + 12 * Math.sin(t * 1.4 + s), s * 124, 26);
      c.strokeStyle = GOLDHI; c.lineWidth = 4.6; c.stroke();
    }
    F(c, poly([[-20, 52], [20, 52], [0, 70]]), BLUE, INK, 2);
    c.restore();
  }
  function crownDragon(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, poly([[-84, -70], [84, -70], [66, -100], [-66, -100]]), GOLDHI, INK, 3.2);
    dot(c, 0, -104, 15, BLUE, GOLD, 2.4);
    c.restore();
  }
  function weaponDragon(c, t, pose) {
    c.save();
    // 缰绳：从右手垂下的一段金绳，末端接鞍鞯侧影
    const hx = CX + 208, hy = 560;
    c.beginPath(); c.moveTo(hx, hy);
    c.bezierCurveTo(hx + 90, hy + 100, hx + 40, hy + 250, hx + 128, hy + 300);
    c.strokeStyle = GOLDHI; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.moveTo(hx + 128, hy + 300); c.lineTo(hx + 176, hy + 288);
    c.strokeStyle = REDDK; c.lineWidth = 10; c.stroke();
    c.restore();
  }

  // ---- 观音：化佛宝冠 + 天衣璎珞 + 净瓶杨枝 + 莲台
  function headGuanyin(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, ell(0, 0, 80, 94), SKIN, INK, 4);
    for (const s of [-1, 1]) {
      F(c, ell(s * 82, 12, 12, 27), SKIN, INK, 2.6);
      dot(c, s * 82, 40, 8, GOLDHI, INK, 2);
      c.beginPath(); c.moveTo(s * 14, -14); c.quadraticCurveTo(s * 34, -20, s * 54, -10);
      c.strokeStyle = INK; c.lineWidth = 3.6; c.stroke();
      F(c, ell(s * 30, 6, 13, 6), PAPER, INK, 2);
      dot(c, s * 30, 6, 4, INK, null);
    }
    dot(c, 0, -32, 8, RED, GOLDHI, 2);
    c.beginPath(); c.moveTo(-16, 50); c.quadraticCurveTo(0, 58, 16, 50);
    c.strokeStyle = REDDK; c.lineWidth = 3.6; c.stroke();
    c.restore();
  }
  function crownGuanyin(c, t) {
    c.save(); c.translate(CX, 330);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i / 6 * Math.PI;
      F(c, poly([[Math.cos(a) * 52, -66], [Math.cos(a) * 92, -150],
                 [Math.cos(a + 0.16) * 108, -140], [Math.cos(a + 0.16) * 62, -60]]),
        i % 2 ? GOLDHI : PAPER, GOLDD, 2.4);
    }
    F(c, poly([[-86, -66], [86, -66], [70, -112], [-70, -112]]), GOLD, INK, 3.6);
    F(c, ell(0, -122, 30, 26), PAPER, GOLDHI, 2.6);
    dot(c, 0, -122, 9, RED, GOLD, 2);
    c.restore();
  }
  function weaponGuanyin(c, t, pose, q) {
    vase(c, t, pose === 'raise' ? 1 : 0.4, CX + 246, 596, 0.82);
  }

  // ---- 二郎神：额生天眼 + 三山帽 + 三尖两刃刀 + 哮天犬
  function headErlang(c, t) {
    c.save(); c.translate(CX, 330);
    F(c, ell(0, 0, 84, 94), SKIN, INK, 4);
    for (const s of [-1, 1]) {
      F(c, ell(s * 86, 10, 12, 26), SKIN, INK, 2.6);
      c.beginPath(); c.moveTo(s * 12, -18); c.lineTo(s * 64, -34);
      c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
      F(c, ell(s * 34, 4, 15, 9), PAPER, INK, 2.4);
      dot(c, s * 34, 4, 6, INK, null);
    }
    // 第三只眼：竖向金眼，读得出「天眼」而不是额头花纹
    F(c, ell(0, -44, 22, 34, 0), GOLDHI, INK, 3);
    F(c, ell(0, -44, 13, 25, 0), PAPER, GOLDD, 2);
    F(c, ell(0, -44, 6, 15, 0), BLUEDK, null);
    dot(c, 0, -44, 4, GOLDHI, null);
    c.beginPath(); c.moveTo(-20, 52); c.quadraticCurveTo(0, 60, 20, 52);
    c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
    c.restore();
  }
  function crownErlang(c, t) {
    c.save(); c.translate(CX, 330);
    for (let k = -1; k <= 1; k++)
      F(c, poly([[k * 52 - 34, -70], [k * 52, -158 - (k === 0 ? 24 : 0)],
                 [k * 52 + 34, -70]]), k === 0 ? GOLDHI : GOLD, INK, 3.2);
    F(c, poly([[-94, -68], [94, -68], [86, -92], [-86, -92]]), REDDK, GOLD, 3);
    dot(c, 0, -96, 12, BLUE, GOLDHI, 2.2);
    c.restore();
  }
  function weaponErlang(c, t, pose) {
    const a = pose === 'strike' ? -0.62 : -0.16;
    const px = CX + 236, py = 560;
    c.save(); c.translate(px, py); c.rotate(a + 0.06 * Math.sin(t * 1.5));
    FIG.bar(c, 0, 320, 0, -320, 17, GOLDD, INK, 2.6);
    // 三尖：中尖 + 两侧弯刃
    F(c, poly([[-16, -316], [16, -316], [0, -400]]), PAPER, GOLDD, 3);
    for (const s of [-1, 1])
      F(c, poly([[s * 14, -300], [s * 76, -348], [s * 62, -272], [s * 16, -262]]),
        GOLDHI, GOLDD, 2.6);
    F(c, poly([[-30, 300], [30, 300], [30, 330], [-30, 330]]), REDDK, GOLD, 2.6);
    c.restore();
  }

  // 足部：观音莲台 / 二郎哮天犬 / 白龙浪线 / 其余云气
  function footLotus(c, t) { lotus(c, t, 1, CX, 966, 0.92); }
  function footDog(c, t) { dog(c, t, CX + 296, 916); }
  function footWave(c, t) { river(c, t, false); }
  function footCloud(c, t) {
    c.save();
    for (const [x, y, s] of [[CX - 210, 952, 0.9], [CX + 210, 952, 0.9], [CX, 972, 1.1]])
      FIG.cloud(c, x, y, s, t);
    c.restore();
  }

  // ============================================================ 六套配置
  const ACTORS = {
    tangseng_v2: {
      halo: 'sun', robe: ORANGE, robeDk: REDDK, belt: REDDK, rib: 40, ribCol: REDHI,
      pattern: 'grid', skin: SKIN, beads: true,
      head: headTang, crown: crownTang, weapon: weaponTang, foot: footCloud,
      pose: ['stand', 'stand', 'raise', 'raise', 'bow', 'stand', 'stand', 'stand'],
    },
    bajie_v2: {
      halo: 'cloud', robe: BLUE, robeDk: BLUEDK, belt: GOLDD, rib: 90, ribCol: REDHI,
      pattern: 'scale', skin: '#e8a884', beads: false,
      head: headBajie, crown: crownBajie, weapon: weaponBajie, foot: footCloud,
      pose: ['stand', 'stand', 'raise', 'strike', 'bow', 'stand', 'stand', 'sealed'],
    },
    shaseng_v2: {
      halo: 'wave', robe: BLUEDK, robeDk: INK, belt: GOLDD, rib: 20, ribCol: BLUE,
      pattern: 'wave', skin: '#a86a42', beads: false,
      head: headSha, crown: crownSha, weapon: weaponSha, foot: footCloud,
      pose: ['stand', 'stand', 'raise', 'strike', 'bow', 'stand', 'stand', 'sealed'],
    },
    bailongma_v2: {
      halo: 'wave', robe: WHITE, robeDk: BLUE, belt: GOLDHI, rib: 70, ribCol: PAPER,
      pattern: 'scale', skin: WHITE, beads: true,
      head: headDragon, crown: crownDragon, weapon: weaponDragon, foot: footWave,
      pose: ['stand', 'stand', 'raise', 'strike', 'bow', 'stand', 'stand', 'sealed'],
    },
    guanyin_v2: {
      halo: 'lotus', robe: PAPER, robeDk: GREEN, belt: GOLDHI, rib: 120, ribCol: PAPER,
      pattern: 'petal', skin: SKIN, beads: true,
      head: headGuanyin, crown: crownGuanyin, weapon: weaponGuanyin, foot: footLotus,
      pose: ['stand', 'stand', 'raise', 'raise', 'stand', 'stand', 'stand', 'stand'],
    },
    erlang_v2: {
      halo: 'thunder', robe: GOLD, robeDk: REDDK, belt: GOLDD, rib: 56, ribCol: REDHI,
      pattern: 'armor', skin: SKIN, beads: false,
      head: headErlang, crown: crownErlang, weapon: weaponErlang, foot: footDog,
      pose: ['stand', 'stand', 'raise', 'strike', 'bow', 'stand', 'stand', 'sealed'],
    },
  };

  // ============================================================ 每人八幕专属前景
  // 约定：n=1 只画前景不画人；n=2 前景→渐显立像；n=3 前景→立像→竖匾；
  // n=4 前景→立像→动势弧；n=5 立像→前景（压住下半身）；n=6 前景→立像；
  // n=7 半透明立像（判词卡由 act() 画）；n=8 淡出立像→收束前景（收印 / 结句由 act() 画）。
  // 首轮试渲修后：① k1 帘会盖住画框两侧，专属前景一律移到中央可见区（|x-CX|<280）；
  // ② 弃用 gate() 门柱+横匾（与竖法器叠成「脚手架」，横匾还压脸），改用两侧竖匾 S.plaque；
  // ③ 不再调用 S.mountain（五行山是悟空专属，其他片复用会串戏），各片转折用各自母题；
  // ④ k8 不画「收窄的经卷」（会读成一根白柱），改成各自法器 + 云雾。
  const FORES = {
    tangseng_v2: {
      1: (c, t, u) => { pagoda(c, t, BOX.x0 + 300, 952, 0.72); river(c, t, true); scroll(c, t, u * 0.5, 700); },
      2: (c, t, u) => { mist(c, t, PAPER); pagoda(c, t, BOX.x1 - 300, 952, 0.62); },
      3: (c, t, u) => { mist(c, t, GOLDHI); S.plaque(c, '长安', BOX.x1 - 92, 210); },
      4: (c, t, u) => { snow(c, t, u); pagoda(c, t, BOX.x1 - 300, 952, 0.62); },
      5: (c, t, u) => { river(c, t, true); mist(c, t, PAPER); },
      6: (c, t, u) => { mist(c, t, GOLDHI); bell(c, t, u, BOX.x0 + 300, 520, 0.66); },
      8: (c, t, u) => { mist(c, t, PAPER); bell(c, t, u, CX + 300, 470, 0.66); },
    },
    bajie_v2: {
      1: (c, t, u) => { mist(c, t, GOLDHI); S.cloudSteps(c, t); },
      2: (c, t, u) => { mist(c, t, PAPER); S.plaque(c, '高老庄', BOX.x1 - 92, 210); },
      3: (c, t, u) => { rake(c, t, u, CX + 268, 520, 1.05); S.plaque(c, '云栈洞', BOX.x0 + 92, 210); },
      4: (c, t, u) => { sutraBox(c, t, 1); fireOut(c, t, 0); },
      5: (c, t, u) => { fireOut(c, t, 0); mist(c, t, PAPER); },
      6: (c, t, u) => { mist(c, t, GOLDHI); S.pilgrim(c, t, u); },
      8: (c, t, u) => { rake(c, t, 1 - ss(0, 1, u), CX + 236, 540, 0.7); pearl(c, t, u, CX + 260, 400); },
    },
    shaseng_v2: {
      1: (c, t, u) => { river(c, t, true); },
      2: (c, t, u) => { river(c, t, true); mist(c, t, PAPER); },
      3: (c, t, u) => { sutraBox(c, t, 1); S.plaque(c, '流沙河', BOX.x1 - 92, 210); },
      4: (c, t, u) => { snow(c, t, u); sutraBox(c, t, -1); },
      // 经卷横条画在人物腰腿前会像桌子 / 白柱，k5、k6 一律换成浪 + 云雾 + 经箱
      5: (c, t, u) => { river(c, t, true); mist(c, t, PAPER); },
      6: (c, t, u) => { mist(c, t, GOLDHI); sutraBox(c, t, 1); },
      8: (c, t, u) => { river(c, t, false); pearl(c, t, u, CX - 250, 760); snow(c, t, u); },
    },
    bailongma_v2: {
      1: (c, t, u) => { river(c, t, true); },
      2: (c, t, u) => { mist(c, t, PAPER); river(c, t, false); },
      3: (c, t, u) => { horse(c, t, u, CX + 250, 812, 0.86); S.plaque(c, '鹰愁涧', BOX.x0 + 92, 210); },
      4: (c, t, u) => { snow(c, t, u); horse(c, t, u, CX + 270, 806, 0.72); },
      5: (c, t, u) => { fireOut(c, t, u); river(c, t, true); },
      6: (c, t, u) => { mist(c, t, GOLDHI); horse(c, t, 0.4, CX - 262, 826, 0.82); },
      8: (c, t, u) => { river(c, t, false); pearl(c, t, u, CX + 280, 500); snow(c, t, u); },
    },
    guanyin_v2: {
      1: (c, t, u) => { river(c, t, false); lotus(c, t, u, CX, 872, 1.15); },
      2: (c, t, u) => { mist(c, t, PAPER); river(c, t, false); },
      3: (c, t, u) => { hoops(c, t, u); S.plaque(c, '潮音洞', BOX.x1 - 92, 210); },
      4: (c, t, u) => { vase(c, t, 1, CX - 270, 560, 1.0); lotus(c, t, u, CX - 270, 880, 0.56); },
      5: (c, t, u) => { river(c, t, true); fireOut(c, t, 0); },
      6: (c, t, u) => { mist(c, t, GOLDHI); bell(c, t, u, BOX.x0 + 300, 500, 0.66); },
      8: (c, t, u) => { vase(c, t, 1 - ss(0, 1, u), CX + 250, 620, 0.72); river(c, t, false); },
    },
    erlang_v2: {
      1: (c, t, u) => { mist(c, t, GOLDHI); S.plaque(c, '灌江口', BOX.x1 - 92, 210); },
      2: (c, t, u) => { mist(c, t, GOLDHI); S.cloudSteps(c, t); },
      3: (c, t, u) => { S.cloudSteps(c, t); S.plaque(c, '梅山', BOX.x0 + 92, 210); },
      4: (c, t, u) => { S.troops(c, t); S.cloudSteps(c, t); },
      5: (c, t, u) => { pearl(c, t, u, CX + 250, 330); S.cloudSteps(c, t); mist(c, t, PAPER); },
      6: (c, t, u) => { mist(c, t, PAPER); dog(c, t, CX - 288, 920); },
      8: (c, t, u) => { dog(c, t, CX + 280, 916); pearl(c, t, u, CX - 260, 420); },
    },
  };

  // ============================================================ 对外接口
  function has(k) { return !!ACTORS[k]; }

  function draw(c, t, opt) {
    const o = opt || {};
    figure(c, t, o);
  }

  function body(c, lt, t, n) {
    const k = window.SERIES_KEY, A = ACTORS[k], FR = FORES[k];
    if (!A || !FR) return;
    const u = clamp(lt / ACT);
    const hi = (c, fn) => { c.save(); S.clipBox(c); fn(c, t, u); c.restore(); };
    const hero = (o) => S.hero(c, t, o);
    const tiltOf = (n2, amp) => amp * Math.sin(t * (0.7 + n2 * 0.06));

    if (n === 1) {
      hi(c, FR[1]);
      // 幕①不画立像，中央石青背光环容易空成「镜子」：统一给一颗深赭底衬的金珠 +
      // 三道金弧 + 8 朵团花填住，都不横跨头顶。各片其余缘起物仍各不相同。
      c.save(); S.clipBox(c); pearl(c, t, u, CX, 400); arcs(c, t, CX, 400, 1.0);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + t * 0.2;
        floret(c, CX + Math.cos(a) * 152, 400 + Math.sin(a) * 152,
               14, GOLDHI, GOLDD, 6, t + i);
      }
      c.restore();
      S.particles(c, t, 14); return;
    }
    if (n === 2) {
      hi(c, FR[2]);
      hero({ pose: A.pose[1], alpha: 0.28 + 0.72 * ss(0, 1, clamp(lt / 2.2)),
             tilt: tiltOf(2, 0.014) });
      S.particles(c, t, 14); return;
    }
    if (n === 3) {
      hi(c, FR[3]);
      hero({ pose: A.pose[2], tilt: tiltOf(3, -0.026), lift: 6 + 8 * u });
      S.particles(c, t, 16); return;
    }
    if (n === 4) {
      hi(c, FR[4]);
      hero({ pose: A.pose[3], tilt: -0.072 + 0.02 * Math.sin(t * 1.1), lift: 16 });
      c.save(); S.clipBox(c); arcs(c, t, CX + 120, 420, 1); c.restore();
      S.particles(c, t, 18); return;
    }
    if (n === 5) {
      hero({ pose: A.pose[4], alpha: 0.96, tilt: 0.032 });
      hi(c, FR[5]);
      S.particles(c, t, 16); return;
    }
    if (n === 6) {
      hi(c, FR[6]);
      hero({ pose: A.pose[5], alpha: 0.92, tilt: 0.060 + 0.018 * Math.sin(t * 0.8), lift: 4 });
      // 幕⑥通用「心声」光弧：不给所有片统一挂三金箍（那是观音专属母题，会串戏）
      c.save(); S.clipBox(c); arcs(c, t, CX - 170, 520, 0.48); c.restore();
      S.particles(c, t, 18); return;
    }
    if (n === 7) {
      hero({ pose: A.pose[6], alpha: 0.5, tilt: tiltOf(7, 0.012) });
      S.particles(c, t, 12); return;
    }
    // n === 8：从幕⑦的 0.5 连续淡出，不能硬回切到 1.0。
    // 新 rig 的腿部在 alpha≈0.05 时会与米白地仗融成两根「白柱」，所以收紧到幕中段彻底淡尽。
    const fade = 0.5 - 0.5 * ss(0.04, 0.62, clamp(lt / 2.0));
    hero({ pose: A.pose[7], alpha: fade, tilt: tiltOf(8, 0.012) });
    hi(c, FR[8]);
    S.particles(c, t, 14);
  }

  window.XY_ACTORS = { has, draw, body, ACTORS, FORES,
                       props: { arcs, mist, pagoda, river, gate, lotus, scroll, sutraBox,
                                pearl, rake, vase, hoops, dog, horse, snow, bell, fireOut } };
})();
