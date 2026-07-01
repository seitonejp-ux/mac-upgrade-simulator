import { useState, useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'framer-motion';
import macbooks from '../data/macbooks.json';

const MAX_CPU = 40000;
const MAX_GPU = 160000;
const SPRING = { stiffness: 260, damping: 28 };
const CATEGORY_ORDER = ['MacBook', 'MacBook Air', 'MacBook Pro', 'iMac', 'Mac mini', 'Mac Pro', 'Mac Studio'];

type Macbook = typeof macbooks[number];

const displayRank = (d: string) =>
  d.includes('XDR') ? 4 : d.includes('Liquid') ? 3 : d.includes('5K') || d.includes('4.5K') ? 2 : d.includes('Retina') || d.includes('4K') ? 1 : 0;

function isUpgrade(field: keyof Macbook, a: Macbook, b: Macbook): boolean {
  if (field === 'weight')  return parseFloat(b.weight)   < parseFloat(a.weight);
  if (field === 'display') return displayRank(b.display) > displayRank(a.display);
  return false;
}

function isChanged<K extends keyof Macbook>(field: K, a: Macbook, b: Macbook): boolean {
  return String(a[field]) !== String(b[field]);
}

// ── Animated mesh background ──────────────────────────────────────────────────

function MeshBackground() {
  return (
    <>
      <style>{`
        @keyframes blobDrift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(5%,8%) scale(1.05); }
          66%      { transform: translate(-3%,3%) scale(0.97); }
        }
        @keyframes blobDrift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-7%,-5%) scale(1.07); }
          75%      { transform: translate(4%,-8%) scale(0.96); }
        }
        @keyframes blobDrift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(6%,-4%) scale(1.05); }
        }
      `}</style>
      <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: '#F2F2F7' }}>
        {/* Blue blob — top-left */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '75vw', height: '75vw', borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(0,113,227,0.13) 0%, transparent 65%)',
          filter: 'blur(72px)',
          animation: 'blobDrift1 24s ease-in-out infinite',
        }} />
        {/* Purple blob — bottom-right */}
        <div style={{
          position: 'absolute', bottom: '5%', right: '-15%',
          width: '65vw', height: '65vw', borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(191,90,242,0.10) 0%, transparent 65%)',
          filter: 'blur(80px)',
          animation: 'blobDrift2 30s ease-in-out infinite',
        }} />
        {/* Mint blob — center */}
        <div style={{
          position: 'absolute', top: '38%', left: '25%',
          width: '55vw', height: '55vw', borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(80,210,180,0.07) 0%, transparent 65%)',
          filter: 'blur(90px)',
          animation: 'blobDrift3 20s ease-in-out infinite',
        }} />
      </div>
    </>
  );
}

// ── Tilt hook ─────────────────────────────────────────────────────────────────

function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [6, -6]), SPRING);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-6, 6]), SPRING);

  // Shadow moves opposite to tilt — simulates fixed light source above-left
  const shX = useTransform(rotateY, [-6, 6], [14, -14]);
  const shY = useTransform(rotateX, [-6, 6], [-14, 14]);
  const textShadow = useMotionTemplate`${shX}px ${shY}px 32px rgba(0,0,0,0.13), ${shX}px ${shY}px 64px rgba(0,0,0,0.06)`;

  // Subtle inner-highlight gradient shifts with tilt to sell the glass feel
  const hlX = useTransform(rotateY, [-6, 6], [55, 45]);
  const hlY = useTransform(rotateX, [-6, 6], [45, 55]);
  const highlight = useMotionTemplate`radial-gradient(ellipse at ${hlX}% ${hlY}%, rgba(255,255,255,0.55) 0%, transparent 60%)`;

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onMouseLeave = () => { rawX.set(0); rawY.set(0); };

  return { ref, rotateX, rotateY, textShadow, highlight, onMouseMove, onMouseLeave };
}

// ── BarRow ────────────────────────────────────────────────────────────────────

interface BarRowProps {
  label: string; score: number; pct: number; barClass: string; isNew?: boolean;
}
function BarRow({ label, score, pct, barClass, isNew }: BarRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline gap-2">
        <span className={`text-sm ${isNew ? 'font-semibold text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>{label}</span>
        <span className={`text-sm tabular-nums ${isNew ? 'font-semibold text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>
          {score.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-black/[0.06] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width: `${pct}%`,
            transition: 'width 700ms cubic-bezier(0.25,0.46,0.45,0.94)',
            willChange: 'width',
          }}
        />
      </div>
    </div>
  );
}

// ── PerformanceCard (tilting 3D card) ─────────────────────────────────────────

interface PerfCardProps {
  accentColor: string; title: string; ratio: string; faster: boolean;
  barClass: string; chipA: string; chipB: string;
  scoreA: number; scoreB: number; pctA: number; pctB: number;
}
function PerformanceCard(p: PerfCardProps) {
  const tilt = useTilt();
  return (
    <div style={{ perspective: '1100px' }}>
      <motion.div
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        style={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          background: tilt.highlight,
        }}
        className="relative rounded-3xl cursor-default"
      >
        {/* Glass layer */}
        <div className="absolute inset-0 rounded-3xl bg-white/68 backdrop-blur-2xl border border-white/55 shadow-[0_8px_48px_rgba(0,0,0,0.09)]" />

        {/* Content */}
        <div className="relative px-8 py-12 md:px-14 md:py-16">
          <p className="text-[10.5px] font-semibold tracking-[0.22em] uppercase text-center mb-4"
             style={{ color: p.accentColor }}>
            {p.title}
          </p>

          {/* Floating number with tilt-reactive shadow */}
          <div className="text-center leading-none mb-1">
            <motion.span
              className="font-bold tracking-tighter text-[#1D1D1F] text-7xl md:text-8xl"
              style={{ textShadow: tilt.textShadow, display: 'inline-block' }}
            >
              {p.ratio}
            </motion.span>
            <motion.span
              className="text-3xl font-semibold text-[#1D1D1F] ml-0.5 align-baseline"
              style={{ textShadow: tilt.textShadow }}
            >
              x
            </motion.span>
          </div>

          <p className="text-center text-[#6E6E73] text-base mb-12">
            {p.faster ? '高速' : '低速'}
          </p>
          <div className="space-y-6">
            <BarRow label={p.chipA} score={p.scoreA} pct={p.pctA} barClass="bg-[#C7C7CC]" />
            <BarRow label={p.chipB} score={p.scoreB} pct={p.pctB} barClass={p.barClass} isNew />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── SpecRow ───────────────────────────────────────────────────────────────────

interface SpecRowProps {
  label: string; valueA: string; valueB: string; changed: boolean; upgraded: boolean;
}
function SpecRow({ label, valueA, valueB, changed, upgraded }: SpecRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-[160px_1fr_1fr] px-6 md:px-12 py-5 gap-x-4 gap-y-1.5 border-b border-black/[0.04] last:border-0">
      <span className="col-span-2 md:col-span-1 text-[10.5px] font-semibold tracking-[0.14em] text-[#AEAEB2] uppercase md:flex md:items-center">
        {label}
      </span>
      <span className="text-sm text-[#6E6E73] md:flex md:items-center">{valueA}</span>
      <span className={`text-sm flex items-start gap-1 md:items-center ${changed ? 'font-semibold text-[#1D1D1F]' : 'text-[#1D1D1F]'}`}>
        {upgraded && <span className="flex-shrink-0 text-[#34C759] text-[11px] font-bold mt-0.5 md:mt-0">↑</span>}
        {valueB}
      </span>
    </div>
  );
}

// ── YearFilter ────────────────────────────────────────────────────────────────

const YEAR_FILTERS = [
  { label: 'すべて', min: 0,    max: 9999 },
  { label: '〜2015', min: 0,    max: 2015 },
  { label: '2016〜2020', min: 2016, max: 2020 },
  { label: '2021〜',    min: 2021, max: 9999 },
];

// ── ShareButton ───────────────────────────────────────────────────────────────

function ShareButton({ idA, idB }: { idA: string; idB: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('a', idA);
    url.searchParams.set('b', idB);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold tracking-[0.08em] transition-all"
      style={{
        background: copied ? 'rgba(52,199,89,0.12)' : 'rgba(0,113,227,0.08)',
        color: copied ? '#34C759' : '#0071E3',
      }}
    >
      {copied ? (
        <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>コピーしました</>
      ) : (
        <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1H12V4.5M12 1L7 6M5.5 2.5H2C1.45 2.5 1 2.95 1 3.5V11C1 11.55 1.45 12 2 12H9.5C10.05 12 10.5 11.55 10.5 11V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>この比較をシェア</>
      )}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function getInitialModel(param: string | null, fallback: Macbook): Macbook {
  if (!param) return fallback;
  return macbooks.find(m => m.id === param) ?? fallback;
}

export default function ComparisonApp() {
  const params = new URLSearchParams(window.location.search);
  const [modelA, setModelA] = useState<Macbook>(() => getInitialModel(params.get('a'), macbooks[0]));
  const [modelB, setModelB] = useState<Macbook>(() => getInitialModel(params.get('b'), macbooks[macbooks.length - 1]));
  const [bars, setBars] = useState({ cpuA: 0, cpuB: 0, gpuA: 0, gpuB: 0 });
  const [filterA, setFilterA] = useState(0);
  const [filterB, setFilterB] = useState(0);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('a', modelA.id);
    url.searchParams.set('b', modelB.id);
    window.history.replaceState(null, '', url.toString());
  }, [modelA.id, modelB.id]);

  useEffect(() => {
    setBars({ cpuA: 0, cpuB: 0, gpuA: 0, gpuB: 0 });
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setBars({
          cpuA: (modelA.cpuScore / MAX_CPU) * 100,
          cpuB: (modelB.cpuScore / MAX_CPU) * 100,
          gpuA: (modelA.gpuScore / MAX_GPU) * 100,
          gpuB: (modelB.gpuScore / MAX_GPU) * 100,
        })
      )
    );
    return () => cancelAnimationFrame(id);
  }, [modelA, modelB]);

  const cpuDelta = modelB.cpuScore / modelA.cpuScore;
  const gpuDelta = modelB.gpuScore / modelA.gpuScore;
  const cpuRatio = (cpuDelta >= 1 ? cpuDelta : 1 / cpuDelta).toFixed(1);
  const gpuRatio = (gpuDelta >= 1 ? gpuDelta : 1 / gpuDelta).toFixed(1);

  const filteredFor = (fi: number) => {
    const { min, max } = YEAR_FILTERS[fi];
    return macbooks.filter(m => m.year >= min && m.year <= max);
  };

  const renderOptions = (fi: number) =>
    CATEGORY_ORDER.flatMap(cat => {
      const models = filteredFor(fi).filter(m => m.category === cat);
      if (!models.length) return [];
      return [<optgroup key={cat} label={cat}>{models.map(m => <option key={m.id} value={m.id}>{m.year} {m.name} — {m.chip}</option>)}</optgroup>];
    });

  const filterChips = (active: number, setActive: (i: number) => void, onFilter: (i: number) => void) => (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {YEAR_FILTERS.map((f, i) => (
        <button
          key={f.label}
          onClick={() => { setActive(i); onFilter(i); }}
          className="px-3 py-1 rounded-lg text-[10.5px] font-semibold transition-all"
          style={{
            background: active === i ? '#0071E3' : 'rgba(0,0,0,0.05)',
            color: active === i ? '#fff' : '#6E6E73',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <MeshBackground />
      <div className="min-h-screen font-sans text-[#1D1D1F] antialiased">

        {/* Hero */}
        <section className="text-center px-6 pt-24 pb-20">
          <p className="text-[10.5px] font-semibold tracking-[0.22em] text-[#6E6E73] uppercase mb-5">Performance</p>
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.06] text-[#1D1D1F] mb-5">
            Mac Upgrade Simulator
          </h1>
          <p className="text-lg md:text-xl text-[#6E6E73] max-w-lg mx-auto leading-relaxed">
            Select two chips. See the leap.
          </p>
        </section>

        <div className="max-w-3xl mx-auto px-5 md:px-8 space-y-4 pb-28">

          {/* Selector */}
          <div className="bg-white/68 backdrop-blur-2xl rounded-2xl border border-white/55 shadow-[0_4px_28px_rgba(0,0,0,0.07)] px-6 py-7 md:px-10 md:py-9">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-[10.5px] font-semibold tracking-[0.16em] text-[#AEAEB2] uppercase mb-2">現在のモデル</label>
                {filterChips(filterA, setFilterA, () => {})}
                <select
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.04] text-[#1D1D1F] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] appearance-none cursor-pointer"
                  value={modelA.id}
                  onChange={e => setModelA(macbooks.find(m => m.id === e.target.value)!)}
                >
                  {renderOptions(filterA)}
                </select>
              </div>
              <div className="flex items-center justify-center sm:pb-3 sm:px-1">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#C7C7CC]">VS</span>
              </div>
              <div className="flex-1">
                <label className="block text-[10.5px] font-semibold tracking-[0.16em] text-[#AEAEB2] uppercase mb-2">比較するモデル</label>
                {filterChips(filterB, setFilterB, () => {})}
                <select
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.04] text-[#1D1D1F] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] appearance-none cursor-pointer"
                  value={modelB.id}
                  onChange={e => setModelB(macbooks.find(m => m.id === e.target.value)!)}
                >
                  {renderOptions(filterB)}
                </select>
              </div>
            </div>

            {/* Share */}
            <div className="flex justify-end mt-5">
              <ShareButton idA={modelA.id} idB={modelB.id} />
            </div>
          </div>

          {/* CPU */}
          <PerformanceCard
            accentColor="#0071E3" title="CPU Performance"
            ratio={cpuRatio} faster={cpuDelta >= 1} barClass="bg-[#0071E3]"
            chipA={modelA.chip} chipB={modelB.chip}
            scoreA={modelA.cpuScore} scoreB={modelB.cpuScore}
            pctA={bars.cpuA} pctB={bars.cpuB}
          />

          {/* GPU */}
          <PerformanceCard
            accentColor="#BF5AF2" title="GPU Performance"
            ratio={gpuRatio} faster={gpuDelta >= 1} barClass="bg-[#BF5AF2]"
            chipA={modelA.chip} chipB={modelB.chip}
            scoreA={modelA.gpuScore} scoreB={modelB.gpuScore}
            pctA={bars.gpuA} pctB={bars.gpuB}
          />

          {/* Specs */}
          <div className="bg-white/68 backdrop-blur-2xl rounded-3xl border border-white/55 shadow-[0_8px_48px_rgba(0,0,0,0.09)] overflow-hidden">
            <div className="px-6 md:px-12 pt-10 pb-6">
              <h2 className="text-xl font-bold text-[#1D1D1F] tracking-tight mb-5">スペック比較</h2>
              <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-[160px_1fr_1fr] gap-x-4 text-xs">
                <span className="hidden md:block" />
                <span className="font-semibold text-[#6E6E73]">
                  {modelA.name}<br /><span className="font-normal">{modelA.year} · {modelA.chip}</span>
                </span>
                <span className="font-semibold text-[#0071E3]">
                  {modelB.name}<br /><span className="font-normal text-[#6E6E73]">{modelB.year} · {modelB.chip}</span>
                </span>
              </div>
            </div>
            <div className="border-t border-black/[0.04]">
              <SpecRow label="ディスプレイ" valueA={modelA.display} valueB={modelB.display}
                changed={isChanged('display', modelA, modelB)} upgraded={isUpgrade('display', modelA, modelB)} />
              <SpecRow label="ポート" valueA={modelA.ports} valueB={modelB.ports}
                changed={isChanged('ports', modelA, modelB)} upgraded={false} />
              <SpecRow label="充電" valueA={modelA.watts} valueB={modelB.watts}
                changed={isChanged('watts', modelA, modelB)} upgraded={false} />
              <SpecRow label="重量" valueA={modelA.weight} valueB={modelB.weight}
                changed={isChanged('weight', modelA, modelB)} upgraded={isUpgrade('weight', modelA, modelB)} />
            </div>
            <div className="h-8" />
          </div>

        </div>
      </div>
    </>
  );
}
