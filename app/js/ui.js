// Small DOM / formatting helpers + toast + confetti + bottom sheet.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

export function fmtMoney(n, currency = '€') {
  const neg = n < 0;
  const v = Math.abs(n);
  const s = v >= 100 ? Math.round(v).toLocaleString('en-IE') : v.toFixed(2);
  return `${neg ? '−' : ''}${currency}${s}`;
}

export function fmtNum(n, dp = 0) {
  return Number(n.toFixed(dp)).toLocaleString('en-IE');
}

export function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function toast(msg, cls = '') {
  const root = document.getElementById('toast-root');
  const t = el('div', { class: `toast ${cls}` }, msg);
  root.append(t);
  setTimeout(() => t.remove(), 3800);
}

/** Bottom sheet modal. Returns {close}. */
export function sheet(contentNode) {
  const backdrop = el('div', { class: 'sheet-backdrop' });
  const panel = el('div', { class: 'sheet' }, contentNode);
  backdrop.append(panel);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.body.append(backdrop);
  function close() { backdrop.remove(); }
  return { close };
}

/* ----- Confetti (hand-rolled, no deps) ----- */
let confettiRunning = false;
export function confetti(durationMs = 2200) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas || confettiRunning) return;
  confettiRunning = true;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#2f6f5e', '#e2795b', '#d9a441', '#8ec9b4', '#f2b8a2'];
  const parts = Array.from({ length: 120 }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.4,
    r: 4 + Math.random() * 5,
    c: colors[(Math.random() * colors.length) | 0],
    vy: 2 + Math.random() * 3,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    }
    if (t - t0 < durationMs) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); confettiRunning = false; }
  })(t0);
}
