// 西游记 · 场景版《玄奘·唐僧·紧凑版》段落表：8 幕 × 3.8s = 30.4s。
// 一幕 = 一个具名场景（榜题 + 环境 + 群演 + 事件动作 + 钤印），仿三国 z*_*.js 幕型。
// 与旧紧凑版完全隔离：只注册 SCENES['v1'..'v8']，不加载 xy_tight.js。
window.SERIES_KEY = 'tangseng_scene';
window.SCENE_LIBS = [
  'scenes/xy_common.js',
  'scenes/xy_figure.js',
  'scenes/xy_series.js',
  'scenes/xy_actors.js',
  'scenes/xy_scene_common.js',
  'scenes/xy_scene_films.js'
];
window.ERAS = [
  { id: 'v1', dur: 3.8 },
  { id: 'v2', dur: 3.8, transition: { type: 'organic', dur: 0.26 } },
  { id: 'v3', dur: 3.8, transition: { type: 'crossfade', dur: 0.26 } },
  { id: 'v4', dur: 3.8, transition: { type: 'dotBloom', dur: 0.26 } },
  { id: 'v5', dur: 3.8, transition: { type: 'pageTurn', dur: 0.26 } },
  { id: 'v6', dur: 3.8, transition: { type: 'organic', dur: 0.26 } },
  { id: 'v7', dur: 3.8, transition: { type: 'crossfade', dur: 0.26 } },
  { id: 'v8', dur: 3.8, transition: { type: 'crossfade', dur: 0.26 } }];
