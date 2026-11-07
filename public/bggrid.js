/* =========================================================
   Второй вариант фона: сетка с искрами (по мотивам ethiack.com, нарисовано заново).
   - тонкие линии и скругленные клетки, на пересечениях мерцают искры-звездочки (как фотовспышка);
   - сетка медленно плывет по диагонали и слегка едет при прокрутке;
   - клетки возле курсора плавно подсвечиваются и "приподнимаются", искры рядом вспыхивают;
   - по клику от курсора расходится волна света.
   Включается адресом ?bg=grid (выбор запоминается), обратно - ?bg=cubes.
   Обычный 2D-холст, без 3D - легче для телефонов.
   ========================================================= */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function initGridBg() {
  const canvas = document.createElement('canvas');
  canvas.className = 'bggrid';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W = 0, H = 0, dpr = 1;
  const CELL = touch ? 84 : 112;  // размер клетки, px
  const PAD = touch ? 5 : 7;      // отступ клетки внутри сетки
  const R = touch ? 14 : 18;      // скругление клетки

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  };
  resize();
  window.addEventListener('resize', resize);

  /* Цвета под тему сайта */
  let C = {};
  const setTheme = (dark) => {
    C = dark ? {
      bg: '#111113', line: 'rgba(255,255,255,0.06)', cell: '255,255,255', cellA: 0.07,
      edge: 'rgba(255,255,255,0.14)', star: '210,220,255', glow: '102,153,255', shadow: 'rgba(0,0,0,0.5)', starK: 1,
    } : {
      bg: '#EEEDE9', line: 'rgba(22,22,22,0.14)', cell: '255,255,255', cellA: 0.95, starK: 1.6,
      edge: 'rgba(22,22,22,0.16)', star: '58,98,230', glow: '80,130,255', shadow: 'rgba(30,30,40,0.16)',
    };
  };
  setTheme(document.documentElement.dataset.theme === 'dark');
  window.addEventListener('fb:theme', (e) => setTheme(e.detail.dark));

  /* Курсор и волны по клику */
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  window.addEventListener('pointermove', (e) => { mouse.tx = e.clientX; mouse.ty = e.clientY; }, { passive: true });
  document.addEventListener('mouseleave', () => { mouse.tx = -9999; mouse.ty = -9999; });
  const ripples = [];
  window.addEventListener('pointerdown', (e) => { ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (ripples.length > 6) ripples.shift(); }, { passive: true });
  // на телефоне волны иногда сами
  if (touch && !reduceMotion) setInterval(() => { if (!document.hidden) ripples.push({ x: Math.random() * W, y: Math.random() * H, t: performance.now() }); }, 3200);

  // состояние "подсветки" каждой клетки (плавно догоняет цель)
  const glow = new Map();
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const star = (x, y, s, a) => {
    // 4-лучевая искра
    ctx.fillStyle = `rgba(${C.star},${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  };

  let last = performance.now();
  let drift = 0;
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden) { if (!reduceMotion) requestAnimationFrame(frame); return; }
    if (!reduceMotion) drift += dt * 14; // медленный дрейф, px/сек
    mouse.x += (mouse.tx - mouse.x) * 0.18;
    mouse.y += (mouse.ty - mouse.y) * 0.18;

    const ox = (drift) % CELL;
    const oy = (drift * 0.6 + window.scrollY * 0.15) % CELL;
    const baseI = Math.floor(drift / CELL), baseJ = Math.floor((drift * 0.6 + window.scrollY * 0.15) / CELL);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const cols = Math.ceil(W / CELL) + 2, rows = Math.ceil(H / CELL) + 2;
    const t = now / 1000;

    // 1) клетки
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * CELL - ox, y = r * CELL - oy;
        const cx = x + CELL / 2, cy = y + CELL / 2;
        const key = (c - baseI) + ',' + (r - baseJ);
        // влияние курсора
        const d = Math.hypot(cx - mouse.x, cy - mouse.y);
        let target = Math.max(0, 1 - d / 260);
        target = target * target * (3 - 2 * target);
        // волны по клику
        for (const rp of ripples) {
          const age = (now - rp.t) / 1000;
          const front = age * 520;
          const dd = Math.abs(Math.hypot(cx - rp.x, cy - rp.y) - front);
          if (dd < 90) target = Math.max(target, (1 - dd / 90) * Math.exp(-age * 1.4));
        }
        const prev = glow.get(key) || 0;
        const v = prev + (target - prev) * (target > prev ? 0.22 : 0.06); // быстро загорается, медленно гаснет
        if (v > 0.002) glow.set(key, v); else glow.delete(key);

        if (v > 0.01) {
          const lift = v * 4;
          ctx.save();
          ctx.shadowColor = C.shadow;
          ctx.shadowBlur = 24 * v;
          ctx.shadowOffsetY = 8 * v;
          roundRect(x + PAD - lift * 0.3, y + PAD - lift, CELL - PAD * 2 + lift * 0.6, CELL - PAD * 2, R);
          ctx.fillStyle = `rgba(${C.cell},${C.cellA * v})`;
          ctx.fill();
          ctx.restore();
          // мягкое голубое свечение внутри клетки
          const g = ctx.createRadialGradient(cx, cy - lift, 0, cx, cy - lift, CELL * 0.7);
          g.addColorStop(0, `rgba(${C.glow},${(C.starK > 1 ? 0.22 : 0.14) * v})`);
          g.addColorStop(1, `rgba(${C.glow},0)`);
          roundRect(x + PAD - lift * 0.3, y + PAD - lift, CELL - PAD * 2 + lift * 0.6, CELL - PAD * 2, R);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = C.edge;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 2) линии сетки
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = -1; c < cols; c++) { const x = Math.round(c * CELL - ox) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let r = -1; r < rows; r++) { const y = Math.round(r * CELL - oy) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // 3) искры на пересечениях
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * CELL - ox, y = r * CELL - oy;
        const h = hash(c - baseI, r - baseJ);
        const tw = 0.5 + 0.5 * Math.sin(t * (0.6 + h * 1.2) + h * 6.28); // свое мерцание у каждой
        const near = Math.max(0, 1 - Math.hypot(x - mouse.x, y - mouse.y) / 220);
        const a = 0.12 + 0.35 * tw * (h > 0.55 ? 1 : 0.35) + 0.6 * near;
        const s = 3 + 3 * tw * (h > 0.55 ? 1 : 0.4) + 7 * near;
        star(x, y, s * (C.starK > 1 ? 1.15 : 1), Math.min(1, a * C.starK));
      }
    }

    // убираем отыгравшие волны
    while (ripples.length && now - ripples[0].t > 3000) ripples.shift();
    if (!reduceMotion) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.documentElement.classList.add('has-grid');
}
