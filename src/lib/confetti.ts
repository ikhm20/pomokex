/** One-shot confetti burst on a full-screen overlay canvas. */
export function burstConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:150;pointer-events:none;width:100vw;height:100vh";
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const colors = ["#ff6b4a", "#3ecf9a", "#5ba8ff", "#f2eadf", "#ffa184", "#c084fc"];
  const parts = Array.from({ length: 120 }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 320,
    y: window.innerHeight / 3,
    vx: (Math.random() - 0.5) * 10,
    vy: -7 - Math.random() * 8,
    s: 4 + Math.random() * 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.32,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let raf = 0;
  const t0 = performance.now();
  const tick = (t: number) => {
    const el = (t - t0) / 1000;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts.forEach((p) => {
      p.x += p.vx;
      p.vy += 0.32;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - el / 1.7);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    if (el < 1.7) raf = requestAnimationFrame(tick);
    else canvas.remove();
  };
  raf = requestAnimationFrame(tick);
  window.setTimeout(() => {
    cancelAnimationFrame(raf);
    canvas.remove();
  }, 2200);
}
