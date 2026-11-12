// 西游记 · 敦煌重彩 —— 神魔人物骨架（window.XY_FIGURE）
// 刻意不复用红楼仕女：桃心猴脸 / 金眼圈 / 凤翅紫金冠 / 锁子黄金甲 / 虎皮裙 / 金箍棒。
// 全部为几何路径 + 铁线描，确定性、无外部素材。坐标：CX=960，脚底 GY=980。
// 首轮审片修复（2026-11-07）：火焰改连续火舌环带（原 18 枚散三角像碎纸屑）、
// 金鳞改叠压菱形（原圆点像波点衬衫）、缩耳并补颊毫（原白耳像耳机）。
(() => {
  const H = window.XY;
  if (!H) { window.__bootErrors = (window.__bootErrors || []).concat(['xy_figure.js: 缺少 xy_common.js 的 window.XY']); return; }
  const { F, poly, ell, dot, ribbon } = H;
  const P = H.PAL.dunhuang;
  const CX = H.CX, GY = H.GY, TAU = Math.PI * 2;
  const GOLD = P.gold, GOLDHI = P.goldHi, GOLDK = P.goldDk;
  const INK = P.ink, PAPER = P.paper, RED = P.robe, REDDK = P.robeDk, REDHI = P.robeHi;
  const BLUE = P.shawl, BLUEDK = P.shawlDk, ORANGE = P.flower;
  const SKIN = '#f2dcc4', FURDK = '#5a2e18';

  // 粗线段画成矩形：金箍棒、手臂都用这个，避免 lineCap 在两端露出圆头
  function bar(c, x1, y1, x2, y2, w, fill, line, lw) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * w / 2, ny = dx / L * w / 2;
    F(c, poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny],
               [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]), fill, line, lw);
  }

  function cloud(c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    for (const [qx, qy, r] of [[-62, 8, 34], [-20, -14, 42], [30, -6, 38], [72, 12, 28]])
      dot(c, qx, qy, r, PAPER, GOLDK, 3);
    c.beginPath(); c.moveTo(-96, 22);
    c.bezierCurveTo(-40, 44, 44, 44, 108, 18);
    c.strokeStyle = GOLDK; c.lineWidth = 3.4; c.stroke();
    c.beginPath(); c.moveTo(84, 6);
    c.bezierCurveTo(124, -2, 140, 18, 156, 6);
    c.strokeStyle = GOLD; c.lineWidth = 3; c.stroke();
    c.restore();
  }

  // 火焰背光：连续火舌环带。evenodd 只填环带，否则整个人物背后会糊成一整块朱红。
  function flame(c, x, y, r, t) {
    c.save(); c.translate(x, y); c.rotate(t * 0.10);
    const N = 48;
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU, tip = i % 2 === 1;
      const rr = tip ? r + 48 + 12 * Math.sin(t * 1.9 + i * 0.8) : r - 6;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    c.moveTo(r - 20, 0); c.arc(0, 0, r - 20, 0, TAU, true); c.closePath();
    c.fillStyle = REDHI; c.fill('evenodd');
    c.strokeStyle = GOLDK; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.arc(0, 0, r - 12, 0, TAU);
    c.strokeStyle = GOLD; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.arc(0, 0, r - 28, 0, TAU);
    c.strokeStyle = GOLDHI; c.lineWidth = 3; c.stroke();
    c.restore();
  }

  // 猴头：倒栽桃红心 + 金眼圈 + 火眼金睛 + 雷公嘴 + 颔下毫毛 + 颊毫
  function head(c, x, y, t) {
    c.save(); c.translate(x, y);
    F(c, ell(0, 4, 100, 104), FURDK, INK, 4);
    for (const s of [-1, 1]) F(c, ell(s * 94, 2, 17, 27), REDHI, INK, 3.2);
    F(c, ell(0, 0, 86, 96), SKIN, INK, 4);
    F(c, poly([[0, -92], [-70, -46], [-60, 30], [0, 92], [60, 30], [70, -46]]), REDHI, INK, 3.4);
    for (const s of [-1, 1]) {
      F(c, ell(s * 34, -16, 31, 25), GOLD, INK, 3.2);
      F(c, ell(s * 34, -16, 22, 17), PAPER, INK, 2.4);
      dot(c, s * 34, -16, 10, ORANGE, INK, 2);
      dot(c, s * 34, -16, 4.5, INK, null);
      c.beginPath(); c.moveTo(s * 12, -40); c.lineTo(s * 64, -52);
      c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round'; c.stroke();
      c.beginPath(); c.moveTo(s * 16, -56); c.lineTo(s * 60, -68);
      c.strokeStyle = REDDK; c.lineWidth = 8; c.stroke();
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(s * 62, 6 + k * 16);
        c.quadraticCurveTo(s * 80, 12 + k * 16, s * 88, 24 + k * 16);
        c.strokeStyle = FURDK; c.lineWidth = 2.8; c.stroke();
      }
    }
    F(c, poly([[-12, 16], [12, 16], [0, 32]]), FURDK, INK, 2);
    c.beginPath(); c.moveTo(-36, 52); c.quadraticCurveTo(0, 42, 36, 52);
    c.strokeStyle = INK; c.lineWidth = 5; c.stroke();
    F(c, poly([[-30, 56], [30, 56], [0, 74]]), REDDK, INK, 2.4);
    for (let k = -2; k <= 2; k++) {
      c.beginPath(); c.moveTo(k * 12, 78); c.lineTo(k * 16, 96 + Math.abs(k) * 3);
      c.strokeStyle = FURDK; c.lineWidth = 3.4; c.stroke();
    }
    c.restore();
  }

  // 凤翅紫金冠：两侧三层羽翅向上外展 + 三颗朱红绒球 + 紧箍
  function crown(c, x, y, t) {
    c.save(); c.translate(x, y);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        F(c, poly([[s * 14, -78 - k * 6], [s * (132 + k * 16), -168 - k * 10],
                   [s * (150 + k * 12), -118 - k * 4], [s * 34, -64]]),
          k % 2 ? GOLDHI : GOLD, INK, 3);
      }
      dot(c, s * 122, -142, 13, RED, INK, 2.4);
    }
    F(c, poly([[-62, -86], [62, -86], [46, -136], [-46, -136]]), GOLD, INK, 4);
    for (let k = -1; k <= 1; k++) dot(c, k * 32, -148, 13, RED, INK, 2.6);
    F(c, ell(0, -86, 90, 16), GOLDHI, INK, 3.2);
    c.restore();
  }

  function torso(c) {
    for (const s of [-1, 1]) {
      F(c, poly([[CX + s * 24, 690], [CX + s * 92, 690], [CX + s * 104, 866], [CX + s * 44, 880]]), BLUEDK, INK, 3.6);
      F(c, poly([[CX + s * 44, 858], [CX + s * 112, 850], [CX + s * 128, 968], [CX + s * 36, 972]]), FURDK, GOLD, 3.6);
      F(c, ell(CX + s * 86, 970, 52, 18), INK, GOLD, 3);
    }
    F(c, poly([[CX - 104, 664], [CX + 104, 664], [CX + 132, 786], [CX - 132, 786]]), ORANGE, INK, 4);
    c.save(); c.clip(poly([[CX - 104, 664], [CX + 104, 664], [CX + 132, 786], [CX - 132, 786]]));
    for (let k = 0; k < 9; k++) {
      const yy = 678 + k * 13;
      c.beginPath(); c.moveTo(CX - 140, yy);
      c.quadraticCurveTo(CX, yy + 16, CX + 140, yy - 4);
      c.strokeStyle = k % 2 ? FURDK : REDDK; c.lineWidth = 5 - (k % 3); c.stroke();
    }
    c.restore();
    const bodyPath = poly([[CX - 118, 436], [CX + 118, 436], [CX + 96, 668], [CX - 96, 668]]);
    F(c, bodyPath, BLUE, INK, 4.4);
    c.save(); c.clip(bodyPath);
    // 叠压菱形鳞片：后画的行盖住前一行的下尖，读成锁子甲而不是波点
    for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) {
      const px = CX - 100 + k * 33 + (r % 2 ? 16 : 0), py = 452 + r * 26;
      F(c, poly([[px - 15, py], [px, py - 12], [px + 15, py], [px, py + 14]]),
        r % 2 ? GOLD : GOLDHI, GOLDK, 1.2);
    }
    c.restore();
    dot(c, CX, 528, 44, GOLDHI, INK, 4);
    dot(c, CX, 528, 27, RED, GOLD, 3);
    F(c, poly([[CX - 100, 650], [CX + 100, 650], [CX + 106, 682], [CX - 106, 682]]), REDDK, GOLD, 3.4);
    dot(c, CX, 666, 18, GOLDHI, INK, 2.6);
    for (const s of [-1, 1]) {
      F(c, ell(CX + s * 120, 452, 56, 40), GOLD, INK, 3.6);
      dot(c, CX + s * 130, 444, 9, RED, INK, 2);
      for (let k = 0; k < 3; k++)
        F(c, poly([[CX + s * (100 + k * 18), 470], [CX + s * (110 + k * 18), 500],
                   [CX + s * (92 + k * 18), 496]]), GOLDHI, INK, 2);
    }
  }

  function arms(c, t, pose) {
    const lh = { x: CX - 208, y: 330 }, le = { x: CX - 214, y: 470 };
    const rh = { x: CX + 208, y: 660 }, re = { x: CX + 196, y: 540 };
    if (pose === 'smash') {
      lh.x = CX - 96; lh.y = 236; le.x = CX - 176; le.y = 350;
      rh.x = CX + 126; rh.y = 232; re.x = CX + 190; re.y = 356;
    } else if (pose === 'sealed') {
      lh.x = CX - 230; lh.y = 560; le.x = CX - 200; le.y = 500;
      rh.x = CX + 224; rh.y = 572; re.x = CX + 190; re.y = 510;
    }
    for (const [sh, el, hd] of [[{ x: CX - 118, y: 462 }, le, lh], [{ x: CX + 118, y: 462 }, re, rh]]) {
      bar(c, sh.x, sh.y, el.x, el.y, 40, BLUE, INK, 3.6);
      bar(c, el.x, el.y, hd.x, hd.y, 32, GOLD, INK, 3.2);
      F(c, ell(hd.x, hd.y, 22, 18), SKIN, INK, 3);
      for (let k = -1; k <= 1; k++) {
        c.beginPath(); c.moveTo(hd.x + k * 9, hd.y + 12); c.lineTo(hd.x + k * 13, hd.y + 28);
        c.strokeStyle = FURDK; c.lineWidth = 3; c.stroke();
      }
    }
  }

  function staff(c, pose) {
    if (pose === 'sealed') return;
    const a = { x: CX + 208, y: 700 }, b = { x: CX + 360, y: 170 };
    if (pose === 'smash') { a.x = CX - 300; a.y = 420; b.x = CX + 370; b.y = 250; }
    bar(c, a.x, a.y, b.x, b.y, 26, INK, null, 0);
    bar(c, a.x, a.y, b.x, b.y, 18, GOLD, GOLDK, 1.6);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    for (const [p, dir] of [[a, 1], [b, -1]])
      bar(c, p.x, p.y, p.x + ux * dir * 26, p.y + uy * dir * 26, 34, GOLDHI, INK, 3);
    for (let k = 1; k <= 4; k++) dot(c, a.x + dx * k / 5, a.y + dy * k / 5, 5, RED, null);
  }

  function drawWukong(c, opt) {
    const o = opt || {}, t = o.t || 0, pose = o.pose || 'stand';
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    c.save();
    c.globalAlpha = alpha;
    c.translate(CX, GY); c.rotate(o.tilt || 0); c.translate(-CX, -GY - (o.lift || 0));
    flame(c, CX, 430, 232, t);
    // 敦煌风格卡踩过的坑：横向摆幅 <200px 会读成竖杆，这里给到 ±390
    ribbon(c, [[CX - 96, 470], [CX - 300, 520], [CX - 390, 700],
               [CX - 300, 860], [CX - 120, 940]], 26 + 6 * Math.sin(t * 1.2),
           RED, GOLDK, 2.6, t * 0.6);
    cloud(c, CX - 20, 946, 1.05, t);
    torso(c);
    arms(c, t, pose);
    staff(c, pose);
    head(c, CX, 330, t);
    crown(c, CX, 330, t);
    ribbon(c, [[CX + 110, 470], [CX + 280, 540], [CX + 330, 720],
               [CX + 230, 880]], 20, REDHI, GOLDK, 2.4, t * 0.5 + 1);
    c.restore();
  }

  window.XY_FIGURE = { drawWukong, cloud, flame, bar, staff };
})();
