/* =========================================================
   Фон сайта. По умолчанию - сетка с искрами (bggrid.js, легкая, без 3D).
   Запасной вариант - 3D-кубики с волной (bg3d.js, Three.js): открыть адресом ?bg=cubes,
   вернуть сетку - ?bg=grid. Выбор запоминается в этом браузере.
   Three.js загружается только для кубиков - сетке он не нужен.
   ========================================================= */
let mode = 'grid';
try {
  const q = new URLSearchParams(location.search).get('bg');
  if (q === 'grid' || q === 'cubes') localStorage.setItem('fb-bg-choice', q);
  mode = localStorage.getItem('fb-bg-choice') || 'grid';
} catch (e) { /* без сохранения */ }

if (mode === 'cubes') {
  import('./bg3d.js?v=13').then((m) => m.initCubesBg()).catch((e) => console.warn('Фон с кубиками отключен:', e));
} else {
  import('./bggrid.js?v=3').then((m) => m.initGridBg()).catch((e) => console.warn('Фон-сетка отключен:', e));
}