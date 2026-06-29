/* Tweaks 앱 — 패널 마운트, data-* 속성 적용, localStorage 영속화.
   효과는 전부 CSS 변수(tweaks.css)라 대시보드 React 트리는 건드리지 않는다. */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel';

const MOODS = [
  { key: "forest",  pal: ["#6366F1", "#32D1AF", "#3B82F6"] },
  { key: "ocean",   pal: ["#0058A8", "#00AAE5", "#1AA0AE"] },
  { key: "harvest", pal: ["#7BB93C", "#E0A93B", "#C77A12"] },
];
const ls = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const palOf = (key) => (MOODS.find((m) => m.key === key) || MOODS[0]).pal;

function apply(accent, surface, cardtone) {
  const r = document.documentElement;
  r.dataset.accent = accent;
  r.dataset.surface = surface;
  r.dataset.cardtone = cardtone;
}

const init = {
  accent: ls("apfs.accent", "forest"),
  surface: ls("apfs.surface", "soft"),
  cardtone: ls("apfs.cardtone", "card"),
};

function TweakApp() {
  const [t, setTweak] = useTweaks({
    moodPal: palOf(init.accent), accent: init.accent,
    surface: init.surface, cardtone: init.cardtone,
  });

  React.useEffect(() => {
    apply(t.accent, t.surface, t.cardtone);
    save("apfs.accent", t.accent);
    save("apfs.surface", t.surface);
    save("apfs.cardtone", t.cardtone);
  }, [t.accent, t.surface, t.cardtone]);

  const onMood = (pal) => {
    const m = MOODS.find((x) => JSON.stringify(x.pal) === JSON.stringify(pal)) || MOODS[0];
    setTweak({ moodPal: pal, accent: m.key });
  };

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="브랜드 무드" />
      <TweakColor label="팔레트" value={t.moodPal}
        options={MOODS.map((m) => m.pal)} onChange={onMood} />
      <div style={{ fontSize: 10.5, color: "rgba(41,38,27,.5)", marginTop: -4 }}>
        인디고 · 바다 · 수확 — KPI·차트·도넛 색이 함께 바뀝니다
      </div>
      <TweakSection label="질감 & 캔버스" />
      <TweakRadio label="표면" value={t.surface}
        options={[{ value: "soft", label: "부드럽게" }, { value: "flat", label: "또렷하게" }, { value: "float", label: "입체" }]}
        onChange={(v) => setTweak("surface", v)} />
      <TweakRadio label="캔버스 톤" value={t.cardtone}
        options={[{ value: "card", label: "카드" }, { value: "seamless", label: "심리스" }, { value: "tint", label: "색조" }]}
        onChange={(v) => setTweak("cardtone", v)} />
    </TweaksPanel>
  );
}

apply(init.accent, init.surface, init.cardtone);
const mount = document.createElement("div");
document.body.appendChild(mount);
ReactDOM.createRoot(mount).render(<TweakApp />);
