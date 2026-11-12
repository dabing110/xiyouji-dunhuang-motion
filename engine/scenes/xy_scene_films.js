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
      { t: '水帘洞·称王', s: '第一回 石猴拜洞', env: 'cave+cloud', ev: 'curtain' },
      { t: '东海·龙宫', s: '第三回 定海神针', env: 'river+pagoda', ev: 'dragonPalace' },
      { t: '大闹·天宫', s: '第七回 齐天大圣', env: 'hall+cloud+banners', ev: 'battle' },
      { t: '八卦·丹炉', s: '第七回 火眼金睛', env: 'fire+cloud', ev: 'furnace' },
      { t: '五行·山下', s: '第七回 压帖五百年', env: 'mount+tree', ev: 'mountainFall' },
      { t: '揭帖·拜师', s: '第十四回 心猿归正', env: 'mount+gate', ev: 'unseal' },
      { t: '取经·西行', s: '第十四回 一路向西', env: 'mount+cloud+tree', ev: 'journey' },
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
    bajie_scene: [
      { t: '天河·天蓬', s: '第八十五回 前身', env: 'cloud+hall', ev: 'chant' },
      { t: '贬下·凡尘', s: '第十九回 错投猪胎', env: 'mount+tree', ev: 'dust' },
      { t: '高老·招赘', s: '第十八回 云栈洞', env: 'gate+tree', ev: 'rake' },
      { t: '云栈·洞府', s: '第十九回 皈依', env: 'cave+mount', ev: 'rake' },
      { t: '四圣·试禅', s: '第二十三回 试心', env: 'hall+lotus', ev: 'temple' },
      { t: '盘丝·濯垢', s: '第七十二回 濯垢泉', env: 'river+tree', ev: 'riverCross' },
      { t: '挑担·西行', s: '第一百回 一路挑担', env: 'mount+cloud', ev: 'journey' },
      { t: '净坛·使者', s: '第一百回 受职', env: 'pagoda+cloud+lotus', ev: 'sutra' },
    ],
    shaseng_scene: [
      { t: '流沙·河畔', s: '第二十二回 卷帘', env: 'river+mount', ev: 'riverCross' },
      { t: '琉璃·盏碎', s: '前身 失手', env: 'hall+fire', ev: 'chant' },
      { t: '观音·点化', s: '第八回 寻取经人', env: 'lotus+cloud', ev: 'lotus' },
      { t: '骷髅·项链', s: '第二十二回 九骷', env: 'river+tree', ev: 'dust' },
      { t: '拜师·皈依', s: '第二十二回 沙僧', env: 'gate+mount', ev: 'temple' },
      { t: '挑担·渡河', s: '第四十三回 黑水', env: 'river+bridge', ev: 'journey' },
      { t: '通天·河畔', s: '第四十七回 灵感', env: 'river+banners', ev: 'riverCross' },
      { t: '金身·罗汉', s: '第一百回 受职', env: 'pagoda+cloud+lotus', ev: 'sutra' },
    ],
    bailongma_scene: [
      { t: '西海·龙宫', s: '第十五回 龙子', env: 'river+pagoda', ev: 'dragonPalace' },
      { t: '纵火·获罪', s: '第十五回 悬吊', env: 'fire+cloud', ev: 'furnace' },
      { t: '鹰愁·涧底', s: '第十五回 待罪', env: 'river+mount', ev: 'horse' },
      { t: '化马·驮经', s: '第十五回 意马', env: 'mount+gate', ev: 'unseal' },
      { t: '山道·负重', s: '第二十回 西行', env: 'mount+tree', ev: 'journey' },
      { t: '宝象·救主', s: '第三十回 化人', env: 'hall+banners', ev: 'duel' },
      { t: '化龙·归位', s: '第一百回 复形', env: 'cloud+river', ev: 'horse' },
      { t: '功德·天龙', s: '第一百回 受职', env: 'pagoda+cloud+lotus', ev: 'sutra' },
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

    if (n === 7) S.verdict(c, t, lt, cfg.v1 || '心猿归正', cfg.v2 || '意马收缰');
    if (n === 8) S.ending(c, t, lt, cfg.ending || '功成行满', cfg.caption || '西游记 · 人物场景版');
  }

  ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'].forEach((id, i) => {
    SCENES[id] = { draw(c, lt, t) { act(c, lt, t, i + 1); } };
  });

  window.XY_SCENE_FILMS = { SPECS, act, silhouette, wukong, drawEnv, drawEvent };
})();
