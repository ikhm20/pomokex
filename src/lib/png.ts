import type { SessionRec } from "../hooks/usePomodoro";
import { startOfDay } from "./time";
import { CAT_BY_ID, type CategoryId } from "./categories";

const DAY = 86_400_000;
const W = 1080;
const H = 1080;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} ч ${m} м` : `${m} мин`;
}

/** Renders the current week as a shareable 1080×1080 card and downloads it. */
export function downloadWeeklyCard(history: SessionRec[], pomodoros: number) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  const monday = d0.getTime() - ((d0.getDay() + 6) % 7) * DAY;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = monday + i * DAY;
    const cat: Record<CategoryId, number> = { work: 0, study: 0, personal: 0 };
    let total = 0;
    history
      .filter((s) => s.mode === "focus" && startOfDay(s.endedAt) === date)
      .forEach((s) => {
        total += s.minutes;
        if (s.category) cat[s.category] += s.minutes;
      });
    return { date, total, cat };
  });
  const weekMin = days.reduce((a, d) => a + d.total, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const today = startOfDay(Date.now());

  ctx.fillStyle = "#17120e";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 140, 60, W / 2, 140, 620);
  glow.addColorStop(0, "rgba(255,107,74,0.20)");
  glow.addColorStop(1, "rgba(255,107,74,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(242,234,223,0.08)";
  ctx.lineWidth = 2;
  rr(ctx, 40, 40, W - 80, H - 80, 48);
  ctx.stroke();

  ctx.fillStyle = "#ff6b4a";
  ctx.beginPath();
  ctx.arc(108, 128, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17120e";
  ctx.beginPath();
  ctx.arc(108, 128, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2eadf";
  ctx.font = "700 56px Unbounded, sans-serif";
  ctx.fillText("Помодоро", 156, 146);
  ctx.fillStyle = "rgba(181,166,145,0.9)";
  ctx.font = "600 26px 'Instrument Sans', sans-serif";
  ctx.fillText("НЕДЕЛЯ В ФОКУСЕ", 156, 186);

  ctx.fillStyle = "#f2eadf";
  ctx.font = "800 150px Unbounded, sans-serif";
  ctx.fillText(String(pomodoros), 100, 400);
  ctx.font = "600 30px 'Instrument Sans', sans-serif";
  ctx.fillStyle = "rgba(181,166,145,0.9)";
  ctx.fillText("помидоров", 100 + ctx.measureText(String(pomodoros)).width * 5 + 40, 400);
  ctx.font = "600 34px 'Instrument Sans', sans-serif";
  ctx.fillStyle = "#3ecf9a";
  ctx.fillText(fmtMin(weekMin) + " глубокого фокуса", 100, 462);

  const bx = 100;
  const bw = 100;
  const gap = 36;
  const baseY = 840;
  const maxH = 320;
  const names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  days.forEach((d, i) => {
    const x = bx + i * (bw + gap);
    const h = Math.max(8, (d.total / maxDay) * maxH);
    let y = baseY;
    (["work", "study", "personal"] as CategoryId[]).forEach((c) => {
      const seg = d.total > 0 ? (d.cat[c] / d.total) * h : 0;
      if (seg > 0.5) {
        ctx.fillStyle = CAT_BY_ID[c].hex;
        rr(ctx, x, y - seg, bw, seg, 8);
        ctx.fill();
        y -= seg;
      }
    });
    if (d.total === 0) {
      ctx.fillStyle = "rgba(242,234,223,0.08)";
      rr(ctx, x, baseY - 8, bw, 8, 4);
      ctx.fill();
    }
    if (d.date === today) {
      ctx.fillStyle = "#ff6b4a";
      rr(ctx, x, baseY + 6, bw, 5, 2.5);
      ctx.fill();
    }
    ctx.fillStyle = d.date === today ? "#ff6b4a" : "rgba(181,166,145,0.7)";
    ctx.font = "600 26px 'Instrument Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(names[i], x + bw / 2, baseY + 52);
    if (d.total > 0) {
      ctx.fillStyle = "rgba(242,234,223,0.85)";
      ctx.font = "600 22px 'Instrument Sans', sans-serif";
      ctx.fillText(String(d.total), x + bw / 2, baseY - h - 14);
    }
    ctx.textAlign = "left";
  });

  let lx = 100;
  const ly = 960;
  (["work", "study", "personal"] as CategoryId[]).forEach((c) => {
    ctx.fillStyle = CAT_BY_ID[c].hex;
    rr(ctx, lx, ly - 18, 22, 22, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(181,166,145,0.9)";
    ctx.font = "600 24px 'Instrument Sans', sans-serif";
    const label = c === "work" ? "Работа" : c === "study" ? "Учёба" : "Личное";
    ctx.fillText(label, lx + 32, ly);
    lx += 32 + ctx.measureText(label).width + 48;
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pomodoro-week-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
