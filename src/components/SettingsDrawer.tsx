import { DEFAULT_CUSTOM_MODES, type Mode, type Settings } from "../hooks/usePomodoro";
import type { Mixer, SceneId } from "../lib/ambient";
import type { Melody } from "../lib/audio";
import { IconBell, IconDownload, IconMoon, IconSliders, IconSun, IconTrash, IconUpload, IconX } from "./icons";

function Stepper({ label, hint, value, min, max, suffix, onChange }: { label: string; hint?: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const btn =
    "grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sand-400 transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90 disabled:opacity-30 disabled:pointer-events-none";
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-sand-200">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-sand-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button aria-label={`Уменьшить: ${label}`} className={btn} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          className="w-12 rounded-lg border border-white/[0.08] bg-ink-950/70 py-1.5 text-center font-display text-sm font-bold text-sand-100 transition-colors focus:border-[var(--accent)] focus:outline-none"
        />
        <button aria-label={`Увеличить: ${label}`} className={btn} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
          +
        </button>
        {suffix && <span className="w-9 text-xs text-sand-500">{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="group flex w-full items-center justify-between gap-4 py-3.5 text-left">
      <div>
        <p className="text-sm font-semibold text-sand-200">{label}</p>
        <p className="mt-0.5 text-xs text-sand-500">{hint}</p>
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-[var(--accent)]" : "bg-white/[0.09] group-hover:bg-white/[0.14]"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-ink-950 shadow transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
        active ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]" : "border-white/10 text-sand-400 hover:-translate-y-0.5 hover:border-white/25 hover:text-sand-200"
      }`}
    >
      {children}
    </button>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="pt-5 pb-1 text-[11px] font-semibold tracking-[0.18em] text-sand-500 uppercase">{children}</p>
);

const PRESETS: { name: string; d: Record<Mode, number> }[] = [
  { name: "Классика 25·5", d: { focus: 25, short: 5, long: 15 } },
  { name: "Глубокий фокус 50·10", d: { focus: 50, short: 10, long: 20 } },
  { name: "Поток 90·15", d: { focus: 90, short: 15, long: 30 } },
];

const MELODIES: { id: Melody; name: string }[] = [
  { id: "bell", name: "Колокольчик" },
  { id: "soft", name: "Мягкий" },
  { id: "digital", name: "Цифровой" },
];

const SCENES: { id: SceneId; name: string }[] = [
  { id: "rain", name: "Дождь" },
  { id: "cafe", name: "Кафе" },
  { id: "noise", name: "Белый шум" },
  { id: "pink", name: "Розовый шум" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onExport: () => void;
  onExportCSV: () => void;
  onExportICS: () => void;
  onImportFile: (file: File) => void;
  onClearRequest: () => void;
  onToggleNotifications: (v: boolean) => void;
  notifDenied: boolean;
  onMelodyTest: () => void;
  onMixerPreview: () => void;
}

export default function SettingsDrawer({
  open,
  onClose,
  settings,
  onChange,
  onExport,
  onExportCSV,
  onExportICS,
  onImportFile,
  onClearRequest,
  onToggleNotifications,
  notifDenied,
  onMelodyTest,
  onMixerPreview,
}: Props) {
  const setDur = (mode: Mode, v: number) => onChange({ durations: { ...settings.durations, [mode]: v } });
  const matchesPreset = (d: Record<Mode, number>) =>
    settings.durations.focus === d.focus && settings.durations.short === d.short && settings.durations.long === d.long;
  const setScene = (id: SceneId, v: number) => onChange({ mixer: { ...settings.mixer, [id]: v } as Mixer });
  const mixerOn = (Object.values(settings.mixer) as number[]).some((v) => v > 0);

  return (
    <div className={`fixed inset-0 z-[110] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />

      <aside
        role="dialog"
        aria-label="Настройки"
        className={`absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-ink-900 shadow-[-40px_0_90px_-30px_rgba(0,0,0,0.85)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <IconSliders className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="font-display text-xs font-bold tracking-[0.24em] text-sand-200 uppercase">Настройки</h2>
          <button onClick={onClose} aria-label="Закрыть настройки" className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-white/10 text-sand-400 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-90">
            <IconX className="h-4 w-4" />
          </button>
        </header>

        <div className="scroll-slim flex-1 overflow-y-auto px-5 pb-10 sm:px-6">
          <SectionTitle>Пресеты</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((pr) => (
              <Chip key={pr.name} active={matchesPreset(pr.d)} onClick={() => onChange({ durations: { ...pr.d } })}>
                {pr.name}
              </Chip>
            ))}
          </div>

          <div className="mt-2 divide-y divide-white/[0.05]">
            <Stepper label="Длительность фокуса" hint="Один помидор" value={settings.durations.focus} min={1} max={120} suffix="мин" onChange={(v) => setDur("focus", v)} />
            <Stepper label="Короткий перерыв" hint="Между кругами" value={settings.durations.short} min={1} max={45} suffix="мин" onChange={(v) => setDur("short", v)} />
            <Stepper label="Длинный перерыв" hint={`После ${settings.cycles} кругов`} value={settings.durations.long} min={1} max={60} suffix="мин" onChange={(v) => setDur("long", v)} />
            <Stepper label="Кругов в цикле" hint="Раунды фокуса до длинного перерыва" value={settings.cycles} min={2} max={8} onChange={(v) => onChange({ cycles: v })} />
          </div>

          <SectionTitle>Поведение</SectionTitle>
          <div className="divide-y divide-white/[0.05]">
            <Toggle label="Автозапуск перерывов" hint="Сразу переходить к перерыву" on={settings.autoBreak} onChange={(v) => onChange({ autoBreak: v })} />
            <Toggle label="Автозапуск фокуса" hint="Начинать следующий круг после перерыва" on={settings.autoFocus} onChange={(v) => onChange({ autoFocus: v })} />
            <Toggle label="Строгий режим" hint="Запрещает паузу, сброс и пропуск во время фокуса" on={settings.strict} onChange={(v) => onChange({ strict: v })} />
            <Toggle label="Режим «поток»" hint="В конце фокуса предлагает «+10 минут» вместо перерыва, если вы ещё в деле" on={settings.flowMode} onChange={(v) => onChange({ flowMode: v })} />
            <Stepper label="WIP-лимит канбана" hint="Сколько задач может быть «в работе» одновременно" value={settings.wipLimit} min={1} max={8} onChange={(v) => onChange({ wipLimit: v })} />
            <Stepper label="Обещание дня" hint="Сколько помидоров загадываете на день (0 — выключено)" value={settings.promisePerDay} min={0} max={20} suffix="шт" onChange={(v) => onChange({ promisePerDay: v })} />
            <Stepper label="Цель недели" hint="Минуты фокуса за 7 дней (0 — выключено)" value={settings.weeklyGoalMin} min={0} max={3000} suffix="мин" onChange={(v) => onChange({ weeklyGoalMin: v })} />
            <Toggle label="Голосовые уведомления" hint="Озвучивать «помидор завершён» и «перерыв окончен»" on={settings.voice} onChange={(v) => onChange({ voice: v })} />
            <div>
              <Toggle label="Уведомления браузера" hint="Сообщать об окончании сессии, даже если вкладка в фоне" on={settings.notifications} onChange={onToggleNotifications} />
              {notifDenied && <p className="-mt-1 pb-2 text-xs font-medium text-ember-400">Браузер запретил уведомления — разрешите их в настройках сайта.</p>}
            </div>
          </div>

          <SectionTitle>Звук</SectionTitle>
          <div className="divide-y divide-white/[0.05]">
            <Toggle label="Звук завершения" hint="Сигнал в конце каждой сессии" on={settings.sound} onChange={(v) => onChange({ sound: v })} />
            <div className="py-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-sand-200">
                  <IconBell className="h-4 w-4 text-sand-400" />
                  Мелодия
                </p>
                <button onClick={onMelodyTest} className="rounded-full border border-[var(--accent)]/45 px-3.5 py-1.5 text-[11px] font-bold text-[var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent)]/10 active:scale-95">
                  Прослушать
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {MELODIES.map((m) => (
                  <Chip key={m.id} active={settings.melody === m.id} onClick={() => onChange({ melody: m.id })}>
                    {m.name}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="py-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-sand-200">Громкость</p>
                <span className="font-display text-xs font-bold text-sand-400">{settings.volume}%</span>
              </div>
              <input type="range" min={0} max={100} value={settings.volume} aria-label="Громкость" onChange={(e) => onChange({ volume: Number(e.target.value) })} className="mt-2.5 w-full" />
            </div>
            <div className="py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-sand-200">Атмосфера-микшер</p>
                  <p className="mt-0.5 text-xs text-sand-500">Несколько сцен одновременно, каждая со своей громкостью. Играет, пока таймер идёт.</p>
                </div>
                <button onClick={onMixerPreview} className="shrink-0 rounded-full border border-[var(--accent)]/45 px-3.5 py-1.5 text-[11px] font-bold text-[var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent)]/10 active:scale-95">
                  Прослушать микс
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {SCENES.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-semibold text-sand-400">{s.name}</span>
                    <input type="range" min={0} max={100} value={settings.mixer[s.id]} aria-label={`Громкость: ${s.name}`} onChange={(e) => setScene(s.id, Number(e.target.value))} className="flex-1" />
                    <span className="w-9 text-right font-display text-[10px] font-bold text-sand-500 tabular-nums">
                      {settings.mixer[s.id] === 0 ? "—" : `${settings.mixer[s.id]}%`}
                    </span>
                  </div>
                ))}
              </div>
              {mixerOn && (
                <button onClick={() => onChange({ mixer: { rain: 0, cafe: 0, noise: 0, pink: 0 } })} className="mt-2.5 text-[11px] font-semibold text-sand-500 underline decoration-sand-600/50 underline-offset-2 transition-colors hover:text-sand-300">
                  Выключить все сцены
                </button>
              )}
            </div>
          </div>

          <SectionTitle>Свои режимы фокуса</SectionTitle>
          <p className="pt-1 pb-2 text-xs text-sand-500">
            Пресеты с собственной длительностью и цветом. Включённый подставляется вместо обычного фокуса — переключается чипами под таймером.
          </p>
          <div className="space-y-2">
            {settings.customModes.map((cm) => {
              const on = settings.activeCustom === cm.id;
              return (
                <div key={cm.id} className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${on ? "border-[var(--accent)]/50 bg-[var(--accent)]/[0.05]" : "border-white/[0.06] bg-ink-950/50"}`}>
                  <input
                    type="color"
                    value={cm.color}
                    aria-label={`Цвет режима «${cm.name}»`}
                    onChange={(e) => onChange({ customModes: settings.customModes.map((m) => (m.id === cm.id ? { ...m, color: e.target.value } : m)) })}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
                  />
                  <input
                    value={cm.name}
                    aria-label="Название режима"
                    maxLength={24}
                    onChange={(e) => onChange({ customModes: settings.customModes.map((m) => (m.id === cm.id ? { ...m, name: e.target.value } : m)) })}
                    className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-ink-950/70 px-2.5 py-1.5 text-xs font-semibold text-sand-200 focus:border-[var(--accent)] focus:outline-none"
                  />
                  <Stepper label="" value={cm.minutes} min={1} max={120} suffix="мин" onChange={(v) => onChange({ customModes: settings.customModes.map((m) => (m.id === cm.id ? { ...m, minutes: v } : m)) })} />
                  <button
                    onClick={() => onChange({ activeCustom: on ? null : cm.id })}
                    aria-pressed={on}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 ${
                      on ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]" : "border-white/10 text-sand-500 hover:text-sand-300"
                    }`}
                  >
                    {on ? "Включён" : "Включить"}
                  </button>
                  <button
                    onClick={() => onChange({ customModes: settings.customModes.filter((m) => m.id !== cm.id), activeCustom: settings.activeCustom === cm.id ? null : settings.activeCustom })}
                    aria-label={`Удалить режим «${cm.name}»`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sand-600 transition-colors hover:bg-ember-500/10 hover:text-ember-400 active:scale-90"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              onClick={() => onChange({ customModes: [...settings.customModes, { id: Math.random().toString(36).slice(2, 8), name: "Новый режим", minutes: 25, color: "#ff6b4a" }] })}
              disabled={settings.customModes.length >= 6}
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              + Добавить режим
            </button>
            <button onClick={() => onChange({ customModes: DEFAULT_CUSTOM_MODES, activeCustom: null })} className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:text-sand-200 active:scale-95">
              Стандартные: чтение · код · диплом
            </button>
          </div>

          <SectionTitle>Оформление</SectionTitle>
          <div className="divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-sand-200">Тема</p>
                <p className="mt-0.5 text-xs text-sand-500">Тёмная или светлая палитра</p>
              </div>
              <div className="flex rounded-full border border-white/10 p-1">
                {(
                  [
                    { id: "dark", name: "Тёмная", icon: <IconMoon className="h-3.5 w-3.5" /> },
                    { id: "light", name: "Светлая", icon: <IconSun className="h-3.5 w-3.5" /> },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onChange({ theme: t.id })}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
                      settings.theme === t.id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-sand-400 hover:text-sand-200"
                    }`}
                  >
                    {t.icon}
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <Toggle label="Компактный режим" hint="Плотнее интерфейс — для небольших экранов" on={settings.compact} onChange={(v) => onChange({ compact: v })} />
            <Toggle label="Уменьшенное движение" hint="Почти без анимаций и переходов" on={settings.reducedMotion} onChange={(v) => onChange({ reducedMotion: v })} />
          </div>

          <SectionTitle>Данные</SectionTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={onExport} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95">
              <IconDownload className="h-3.5 w-3.5" />
              Экспорт JSON
            </button>
            <button onClick={onExportCSV} title="Все сессии таблицей — открывается в Excel и Google Sheets" className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95">
              <IconDownload className="h-3.5 w-3.5" />
              CSV
            </button>
            <button onClick={onExportICS} title="Фокус-сессии событиями — импортируется в любой календарь" className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95">
              <IconDownload className="h-3.5 w-3.5" />
              ICS
            </button>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95">
              <IconUpload className="h-3.5 w-3.5" />
              Импорт
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button onClick={onClearRequest} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-sand-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-ember-500 hover:text-ember-400 active:scale-95">
              <IconTrash className="h-3.5 w-3.5" />
              Очистить историю
            </button>
          </div>
          <p className="pt-3 text-[11px] leading-relaxed text-sand-600">
            Всё хранится локально в браузере (localStorage). Экспортируйте данные, чтобы перенести их или сделать резервную копию.
          </p>
        </div>
      </aside>
    </div>
  );
}
