'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { LogOut, Lock, ChevronDown, ChevronUp } from 'lucide-react';

// ── Score trend SVG chart ────────────────────────────────────
function ScoreTrendChart({ sessions }) {
  const data = (sessions || []).slice(-12).filter(s => s.score != null);
  if (data.length < 2) return null;

  const W = 600, H = 175;
  const pad = { t: 26, r: 28, b: 60, l: 28 };
  const inset = 20;
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;

  const pts = data.map((s, i) => ({
    x: pad.l + inset + (i / (data.length - 1)) * (cW - 2 * inset),
    y: pad.t + (1 - s.score / 10) * cH,
    score: s.score,
    date: new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const linePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${pts[0].x},${H - pad.b} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#27ae60" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#27ae60" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[2, 5, 7, 10].map(val => {
        const y = pad.t + (1 - val / 10) * cH;
        return (
          <g key={val}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#f0e0c0" strokeWidth="1" />
            <text x={pad.l - 5} y={y} textAnchor="end" fontSize="9" fill="#c0a080" dominantBaseline="middle">{val}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#trendGrad)" />
      <polyline points={linePoints} fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#27ae60">{p.score}</text>
          <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#27ae60" strokeWidth="2" />
          <text
            fontSize="8"
            fill="#a08060"
            textAnchor="end"
            transform={`translate(${p.x}, ${H - pad.b + 10}) rotate(-45)`}
          >
            {p.date}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Custom date range picker ──────────────────────────────────
function DateRangePicker({ range, onChange, onApply, onClear, minDate }) {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const [view, setView] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() });

  const prevMonth = () => setView(v => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setView(v => {
    const d = new Date(v.year, v.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const atLatestMonth = view.year === todayDate.getFullYear() && view.month === todayDate.getMonth();
  const atEarliestMonth = minDate &&
    view.year === minDate.getFullYear() && view.month === minDate.getMonth();
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const firstDow = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.year, view.month, i + 1))];
  const same = (a, b) => a && b && a.toDateString() === b.toDateString();

  const handleDay = (d) => {
    if (!d || d > todayDate) return;
    if (!range.from || (range.from && range.to)) {
      onChange({ from: d, to: undefined });
    } else {
      onChange(d < range.from ? { from: d, to: range.from } : { from: range.from, to: d });
    }
  };

  return (
    <div style={{ padding: '10px 8px 6px', userSelect: 'none', minWidth: '220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={prevMonth} disabled={atEarliestMonth} style={{ background: 'none', border: 'none', cursor: atEarliestMonth ? 'not-allowed' : 'pointer', color: atEarliestMonth ? '#e0d0c0' : '#b09070', fontSize: '18px', lineHeight: 1, padding: '0 6px' }}>‹</button>
        <span style={{ fontFamily: '"Fredoka One", cursive', fontSize: '14px', color: '#2d1b00' }}>{monthLabel}</span>
        <button onClick={nextMonth} disabled={atLatestMonth} style={{ background: 'none', border: 'none', cursor: atLatestMonth ? 'not-allowed' : 'pointer', color: atLatestMonth ? '#e0d0c0' : '#b09070', fontSize: '18px', lineHeight: 1, padding: '0 6px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: '#c0a080', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const isStart = same(d, range.from);
          const isEnd   = same(d, range.to);
          const inRange = range.from && range.to && d > range.from && d < range.to;
          const isT     = same(d, todayDate);
          const future  = d > todayDate;
          const tooEarly = minDate && d < minDate;
          const disabled = future || tooEarly;
          const sel     = isStart || isEnd;
          return (
            <button key={i} onClick={() => handleDay(d)} disabled={disabled} style={{
              textAlign: 'center', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif',
              padding: '5px 1px', border: 'none', cursor: disabled ? 'default' : 'pointer',
              borderRadius: sel ? '6px' : inRange ? '0' : '4px',
              background: sel ? '#27ae60' : inRange ? '#e8f8f0' : 'transparent',
              color: sel ? 'white' : disabled ? '#ddd' : isT ? '#27ae60' : '#2d1b00',
              fontWeight: sel || isT ? 700 : 400,
            }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        <button onClick={onClear} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1.5px solid #f0e0c0', borderRadius: '6px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', fontWeight: 600, color: '#b09070', cursor: 'pointer' }}>
          Clear
        </button>
        <button onClick={onApply} disabled={!range.from} style={{ flex: 1, padding: '6px', background: range.from ? '#27ae60' : '#e8e8e8', border: 'none', borderRadius: '6px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', fontWeight: 700, color: 'white', cursor: range.from ? 'pointer' : 'not-allowed', boxShadow: range.from ? '0 2px 0 #1e8449' : 'none' }}>
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Session history components ───────────────────────────────
function ScoreBadge({ score }) {
  const color = score >= 7 ? '#27ae60' : score >= 5 ? '#e67e22' : '#e52b2b';
  const bg = score >= 7 ? '#e8f8f0' : score >= 5 ? '#fff3e0' : '#fdecea';
  return (
    <div style={{ background: bg, border: `1.5px solid ${color}`, borderRadius: '50px', padding: '4px 14px', fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color, whiteSpace: 'nowrap' }}>
      {score}/10
    </div>
  );
}

function SessionCard({ session }) {
  const [open, setOpen] = useState(false);
  const fb = session.feedback;
  const date = new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: '#fffbf0', border: '1.5px solid #f0e0c0', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '12px', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#b09070', letterSpacing: '0.04em', marginBottom: '5px' }}>{date}</div>
          <div style={{ fontSize: '14px', color: '#2d1b00', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {session.question_text}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {session.score && <ScoreBadge score={session.score} />}
          {open ? <ChevronUp size={16} color="#b09070" /> : <ChevronDown size={16} color="#b09070" />}
        </div>
      </button>

      {open && fb && (
        <div style={{ borderTop: '1.5px solid #f0e0c0', padding: '20px', background: 'white' }}>
          {/* Overall */}
          <div style={{ background: '#fffbf0', border: '1.5px solid #f0e0c0', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#999', marginBottom: '4px' }}>OVERALL SCORE</div>
              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '32px', color: fb.overallScore >= 7 ? '#27ae60' : fb.overallScore >= 5 ? '#e67e22' : '#e52b2b', lineHeight: 1 }}>
                {fb.overallScore}<span style={{ fontSize: '16px', color: '#ccc' }}>/10</span>
              </div>
            </div>
            {fb.standout && (
              <div style={{ background: '#e8f8f0', border: '1px solid #b0e0c0', borderRadius: '8px', padding: '10px 14px', maxWidth: '320px' }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#27ae60', marginBottom: '4px' }}>STANDOUT</div>
                <div style={{ fontSize: '13px', color: '#3a7a50', lineHeight: 1.5 }}>{fb.standout}</div>
              </div>
            )}
          </div>
          {fb.summary && (
            <div style={{ fontSize: '13px', color: '#7a6050', lineHeight: 1.6, marginBottom: '16px' }}>{fb.summary}</div>
          )}
          {(fb.promptCount != null || fb.durationSeconds != null) && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {fb.promptCount != null && <div style={{ background: '#f5f0e8', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#7a6050' }}>💬 {fb.promptCount} prompts</div>}
              {fb.durationSeconds != null && <div style={{ background: '#f5f0e8', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#7a6050' }}>⏱️ {Math.floor(fb.durationSeconds / 60)}m {fb.durationSeconds % 60}s</div>}
            </div>
          )}
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#aaa', letterSpacing: '0.06em', marginBottom: '12px' }}>CHECKPOINT BREAKDOWN</div>
          {fb.checkpoints?.map((cp, i) => {
            const lc = cp.label === 'Strong' ? '#27ae60' : cp.label === 'Weak' ? '#e52b2b' : '#e67e22';
            const lb = cp.label === 'Strong' ? '#e8f8f0' : cp.label === 'Weak' ? '#fdecea' : '#fff3e0';
            return (
              <div key={i} style={{ borderBottom: i < fb.checkpoints.length - 1 ? '1px solid #f5ede0' : 'none', paddingBottom: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d1b00' }}>
                    <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#aaa', marginRight: '8px' }}>{String(i + 1).padStart(2, '0')}.</span>
                    {cp.name}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ background: lb, border: `1px solid ${lc}`, borderRadius: '4px', padding: '2px 8px', fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: lc }}>{cp.label}</div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#666' }}>{cp.score}/10</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#7a6050', lineHeight: 1.6 }}>{cp.why}</div>
                  <div style={{ background: '#fffbf0', border: '1px solid #f0e0c0', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#7a6050', lineHeight: 1.6 }}>{cp.doingBetter}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('playzone');
  const [showBestTooltip, setShowBestTooltip] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trendFilter, setTrendFilter] = useState('all');
  const [customRange, setCustomRange] = useState({ from: undefined, to: undefined });
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      let { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!data) {
        // Auto-create profile for OAuth users where trigger may not have fired
        await supabase.from('profiles').insert({ id: user.id, email: user.email });
        const { data: created } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        data = created;
      }
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('sessions')
      .select('id, score, question_text, feedback, created_at')
      .eq('user_id', profile.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setSessions(data); });
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffbf0' }}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#27ae60' }}>LOADING PROFILE...</div>
    </div>
  );

  // ── Effective streak — shows 0 if no session today or yesterday (IST) ────
  const effectiveStreak = (() => {
    if (!profile.last_session_date) return 0;
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const yesterdayIST = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return (profile.last_session_date === todayIST || profile.last_session_date === yesterdayIST)
      ? profile.streak
      : 0;
  })();

  // ── Analytics ─────────────────────────────────────────────
  const personalBest = sessions.length > 0
    ? sessions.reduce((best, s) => (s.score ?? 0) > (best?.score ?? 0) ? s : best, null)
    : null;

  const cpMap = {};
  sessions.forEach(s => {
    s.feedback?.checkpoints?.forEach(cp => {
      if (!cpMap[cp.name]) cpMap[cp.name] = { total: 0, count: 0 };
      cpMap[cp.name].total += cp.score;
      cpMap[cp.name].count += 1;
    });
  });
  const cpAvgs = Object.entries(cpMap)
    .map(([name, { total, count }]) => ({ name, avg: parseFloat((total / count).toFixed(1)) }))
    .sort((a, b) => b.avg - a.avg);
  const strongestCP = cpAvgs[0] || null;
  const weakestCP = cpAvgs[cpAvgs.length - 1] || null;

  // Fastest / slowest checkpoint by avg promptsUsed
  const cpPromptsMap = {};
  sessions.forEach(s => {
    s.feedback?.checkpoints?.forEach(cp => {
      if (cp.promptsUsed == null) return;
      if (!cpPromptsMap[cp.name]) cpPromptsMap[cp.name] = { total: 0, count: 0 };
      cpPromptsMap[cp.name].total += cp.promptsUsed;
      cpPromptsMap[cp.name].count += 1;
    });
  });
  const cpPromptsAvgs = Object.entries(cpPromptsMap)
    .map(([name, { total, count }]) => ({ name, avg: parseFloat((total / count).toFixed(1)) }))
    .sort((a, b) => a.avg - b.avg);
  const fastestCP = cpPromptsAvgs[0] || null;
  const slowestCP = cpPromptsAvgs[cpPromptsAvgs.length - 1] || null;
  const hasPromptsData = cpPromptsAvgs.length > 0;

  // ── Tab styles ────────────────────────────────────────────
  const tab = (id) => ({
    padding: '14px 28px',
    border: '2px solid #f0e0c0',
    borderBottom: activeTab === id ? '2px solid white' : '2px solid #f0e0c0',
    borderRadius: '14px 14px 0 0',
    background: activeTab === id ? 'white' : '#faf5ec',
    cursor: activeTab === id ? 'default' : 'pointer',
    marginBottom: activeTab === id ? '-2px' : '0',
    position: 'relative',
    zIndex: activeTab === id ? 2 : 1,
    textAlign: 'left',
    transition: 'background 0.15s',
    outline: 'none',
  });

  const TABS = [
    { id: 'playzone', icon: '🎮', name: 'Playzone', sub: 'Pick a module and start a session' },
    { id: 'stats', icon: '📊', name: 'Battle Stats', sub: 'Your performance at a glance' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fredoka+One&family=Space+Grotesk:wght@400;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
.signout-btn:hover { color: #e52b2b !important; border-color: #e52b2b !important; }
        .inactive-tab:hover { background: #f5ede0 !important; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: '#fffbf0', fontFamily: '"Space Grotesk", sans-serif' }}>

        {/* ── Header ── */}
        <div style={{ background: '#fffbf0', borderBottom: '1.5px solid #f0e0c0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '56px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#fff3e0', border: '1.5px solid #f0d080', borderRadius: '10px', padding: '6px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '10px', color: '#c8860a', letterSpacing: '0.05em', marginBottom: '2px' }}>STREAK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px' }}>🔥</span>
                <span style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#e67e22', lineHeight: 1 }}>×{effectiveStreak}</span>
              </div>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#f0e0c0' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.1 }}>🥷 PM Ninja</div>
              <div style={{ fontSize: '11px', color: '#b09070', marginTop: '1px' }}>{profile.email}</div>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#f0e0c0' }} />
            <button onClick={handleSignOut} className="signout-btn" style={{ background: 'transparent', border: '1.5px solid #e0cdb0', borderRadius: '8px', padding: '7px 14px', color: '#b09070', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 fade-up">

          {/* Chrome tabs */}
          <div style={{ display: 'flex', gap: '4px', position: 'relative', zIndex: 1 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={tab(t.id)}
                className={activeTab !== t.id ? 'inactive-tab' : ''}
              >
                <div style={{ fontSize: '22px', marginBottom: '3px' }}>{t.icon}</div>
                <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '20px', color: activeTab === t.id ? '#2d1b00' : '#b09070', lineHeight: 1.1 }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: activeTab === t.id ? '#b09070' : '#c8b090', marginTop: '2px', fontFamily: '"Space Grotesk", sans-serif' }}>{t.sub}</div>
              </button>
            ))}
          </div>

          {/* Content panel with border */}
          <div style={{ border: '2px solid #f0e0c0', borderRadius: '0 16px 16px 16px', background: 'white', padding: '28px', position: 'relative', zIndex: 0 }}>

            {/* ━━━ PLAYZONE ━━━ */}
            {activeTab === 'playzone' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Product Design — LIVE */}
                <div style={{ background: '#fffbf0', border: '2px solid #f0e0c0', borderRadius: '14px', padding: '22px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 3px 0 #f0e0c0' }} className="card-hover">
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#27ae60', borderRadius: '14px 14px 0 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '26px' }}>🏁</span>
                        <div>
                          <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#2d1b00' }}>Product Design</div>
                        </div>
                        <div style={{ background: '#e8f8f0', border: '1px solid #27ae60', borderRadius: '6px', padding: '3px 10px', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#27ae60' }}>LIVE</div>
                      </div>
                      <p style={{ fontSize: '14px', color: '#a08060', lineHeight: 1.6, maxWidth: '500px' }}>
                        Test your ability to deeply understand user pain points, segment thoughtfully, and build zero-to-one solutions with honest trade-offs.
                      </p>
                    </div>
                    <div>
                      {profile.free_mocks_left > 0 ? (
                        <button
                          onClick={() => router.push('/setup')}
                          style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: '50px', padding: '14px 28px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 0 #1e8449', transition: 'all 0.12s', whiteSpace: 'nowrap' }}
                          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 2px 0 #1e8449'; }}
                          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #1e8449'; }}
                        >▶ Play! </button>
                      ) : (
                        <button onClick={() => router.push('/upgrade')} style={{ background: '#fff7e0', color: '#b8860b', border: '2px solid #ffd700', borderRadius: '50px', padding: '14px 28px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 0 #c8a000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lock size={16} /> Unlock Access
                        </button>
                      )}
                      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#999', textAlign: 'center', marginTop: '8px' }}>
                        {profile.free_mocks_left} mock{profile.free_mocks_left !== 1 ? 's' : ''} remaining
                      </div>
                    </div>
                  </div>
                </div>

                {[
                  { icon: '📊', level: 'LEVEL 02', title: 'Execution / Metrics', desc: 'Analyze metric drops, debug thoroughly, and handle product execution scenarios.' },
                  { icon: '🗺️', level: 'LEVEL 03', title: 'Product Strategy', desc: 'Defend product visions, establish moats, evaluate M&As and platform strategy.' },
                ].map((mod, i) => (
                  <div key={i} style={{ background: '#faf8f5', border: '2px solid #ede8e0', borderRadius: '14px', padding: '22px', opacity: 0.55, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#ddd', borderRadius: '14px 14px 0 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '26px' }}>{mod.icon}</span>
                          <div>
                            <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#bbb' }}>{mod.title}</div>
                          </div>
                          <div style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '6px', padding: '3px 10px', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#999' }}>COMING SOON</div>
                        </div>
                        <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.6, maxWidth: '500px' }}>{mod.desc}</p>
                      </div>
                      <button disabled style={{ background: '#f0f0f0', color: '#ccc', border: '2px solid #e5e5e5', borderRadius: '50px', padding: '14px 28px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800, fontSize: '14px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={16} /> OFFLINE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ━━━ BATTLE STATS ━━━ */}
            {activeTab === 'stats' && (
              <div>

                {/* Row 1: 4 core stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>

                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 3px 0 #e8d8b8', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎮</div>
                    <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#1a7a40', marginBottom: '2px' }}>{profile.total_sessions}</div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '11px', color: '#888' }}>Sessions Done</div>
                  </div>

                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 3px 0 #e8d8b8', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎟️</div>
                    <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#1565a8', marginBottom: '2px' }}>{profile.free_mocks_left}</div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '11px', color: '#888' }}>Mocks Left</div>
                  </div>

                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 3px 0 #e8d8b8', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>⭐</div>
                    <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#b85e0a', marginBottom: '2px' }}>
                      {profile.average_score ? `${profile.average_score}/10` : '—'}
                    </div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '11px', color: '#888' }}>Avg Score</div>
                  </div>

                  {/* Personal Best */}
                  <div
                    style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 3px 0 #e8d8b8', textAlign: 'center', position: 'relative', cursor: personalBest ? 'pointer' : 'default' }}
                    onMouseEnter={() => personalBest && setShowBestTooltip(true)}
                    onMouseLeave={() => setShowBestTooltip(false)}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏆</div>
                    <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#7a5500', marginBottom: '2px' }}>
                      {personalBest ? `${personalBest.score}/10` : '—'}
                    </div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '11px', color: '#888', textDecoration: 'underline dotted', textDecorationColor: '#bba080', textUnderlineOffset: '3px' }}>Personal Best</div>
                    {showBestTooltip && personalBest && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)', background: '#2d1b00', color: 'white', fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 14px', borderRadius: '10px', width: '220px', lineHeight: 1.5, zIndex: 20, textAlign: 'left', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                        "{personalBest.question_text}"
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '6px solid transparent', borderTopColor: '#2d1b00' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Checkpoint insights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>

                  {/* Strongest */}
                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 3px 0 #e8d8b8', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '90px' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>💪</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#27ae60', marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>Strongest Checkpoint</div>
                      {sessions.length === 0
                        ? <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#d0c0a0', letterSpacing: '0.05em', lineHeight: 1.6 }}>COMPLETE 1+ SESSION TO UNLOCK</div>
                        : <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.2 }}>{strongestCP ? strongestCP.name : '—'}</div>
                      }
                    </div>
                  </div>

                  {/* Needs Work */}
                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 3px 0 #e8d8b8', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '90px' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>🎯</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e52b2b', marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>Needs Work</div>
                      {sessions.length === 0
                        ? <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#d0c0a0', letterSpacing: '0.05em', lineHeight: 1.6 }}>COMPLETE 1+ SESSION TO UNLOCK</div>
                        : <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.2 }}>{weakestCP ? weakestCP.name : '—'}</div>
                      }
                    </div>
                  </div>

                  {/* Fastest Checkpoint */}
                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 3px 0 #e8d8b8', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '90px' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>⚡</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#3498db', marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>Fastest Checkpoint</div>
                      {!hasPromptsData
                        ? <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#d0c0a0', letterSpacing: '0.05em', lineHeight: 1.6 }}>COMPLETE 2+ SESSIONS TO UNLOCK</div>
                        : <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.2 }}>{fastestCP ? fastestCP.name : '—'}</div>
                      }
                    </div>
                  </div>

                  {/* Slowest Checkpoint */}
                  <div style={{ background: 'white', border: '2px solid #e8d8b8', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 3px 0 #e8d8b8', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '90px' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>🐢</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e67e22', marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>Slowest Checkpoint</div>
                      {!hasPromptsData
                        ? <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#d0c0a0', letterSpacing: '0.05em', lineHeight: 1.6 }}>COMPLETE 2+ SESSIONS TO UNLOCK</div>
                        : <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.2 }}>{slowestCP ? slowestCP.name : '—'}</div>
                      }
                    </div>
                  </div>
                </div>

                {/* Score Trend */}
                {(() => {
                  const todayISO = new Date().toISOString().split('T')[0];
                  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                  const toIST = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                  const cutoff = (days) => new Date(Date.now() - days * 86400000).toISOString();
                  const trendSessions =
                    trendFilter === '7d'  ? sessions.filter(s => s.created_at >= cutoff(7)) :
                    trendFilter === '30d' ? sessions.filter(s => s.created_at >= cutoff(30)) :
                    trendFilter === 'custom' ? sessions.filter(s => {
                      const d = new Date(s.created_at);
                      if (customRange.from && d < customRange.from) return false;
                      if (customRange.to) {
                        const toEnd = new Date(customRange.to);
                        toEnd.setHours(23, 59, 59, 999);
                        if (d > toEnd) return false;
                      }
                      return true;
                    }) : sessions.filter(s => toIST(s.created_at) === todayIST);

                  const fmt = (d) => d?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  const filterLabel =
                    trendFilter === '7d'  ? 'Last 7 days' :
                    trendFilter === '30d' ? 'Last 30 days' :
                    trendFilter === 'custom' ? (customRange.from || customRange.to ? `${fmt(customRange.from) || '...'} → ${fmt(customRange.to) || '...'}` : 'Custom range') :
                    `Today · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

                  return (
                    <div style={{ background: '#fffbf0', border: '2px solid #f0e0c0', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 3px 0 #f0e0c0', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#666', fontFamily: '"Space Grotesk", sans-serif' }}>Score Trend</div>

                        {/* Single date picker dropdown */}
                        <div ref={pickerRef} style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowPicker(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, color: '#2d1b00', background: 'white', border: '1.5px solid #f0e0c0', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.borderColor = '#27ae60'}
                            onMouseOut={e => e.currentTarget.style.borderColor = showPicker ? '#27ae60' : '#f0e0c0'}
                          >
                            📅 {filterLabel}
                            <span style={{ color: '#b09070', fontSize: '10px' }}>▾</span>
                          </button>

                          {showPicker && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'white', border: '1.5px solid #f0e0c0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '8px', zIndex: 50, minWidth: '200px' }}>
                              {[
                                { key: 'all',  label: `Today · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` },
                                { key: '7d',   label: 'Last 7 days' },
                                { key: '30d',  label: 'Last 30 days' },
                                { key: 'custom', label: 'Custom range' },
                              ].map(opt => (
                                <button
                                  key={opt.key}
                                  onClick={() => {
                                    setTrendFilter(opt.key);
                                    if (opt.key !== 'custom') setShowPicker(false);
                                  }}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', fontWeight: trendFilter === opt.key ? 700 : 500, color: trendFilter === opt.key ? '#27ae60' : '#2d1b00', background: trendFilter === opt.key ? '#f0fff4' : 'transparent', transition: 'background 0.1s' }}
                                  onMouseOver={e => { if (trendFilter !== opt.key) e.currentTarget.style.background = '#fdf8f0'; }}
                                  onMouseOut={e => { if (trendFilter !== opt.key) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {trendFilter === opt.key && '✓ '}{opt.label}
                                </button>
                              ))}

                              {trendFilter === 'custom' && (
                                <div style={{ borderTop: '1px solid #f0e0c0', marginTop: '6px' }}>
                                  <DateRangePicker
                                    range={customRange}
                                    onChange={setCustomRange}
                                    onApply={() => setShowPicker(false)}
                                    onClear={() => {
                                      setCustomRange({ from: undefined, to: undefined });
                                      setTrendFilter('all');
                                      setShowPicker(false);
                                    }}
                                    minDate={sessions.length > 0 ? new Date(sessions[0].created_at) : undefined}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {trendSessions.filter(s => s.score != null).length < 2 ? (
                        <div style={{ textAlign: 'center', padding: '28px 0', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#d0c0a0', letterSpacing: '0.06em', lineHeight: 2 }}>
                          {sessions.length === 0
                            ? 'COMPLETE 2+ SESSIONS TO UNLOCK TREND'
                            : trendSessions.length === 0
                              ? 'NO SESSIONS IN THIS PERIOD'
                              : 'NEED 2+ SESSIONS IN RANGE TO SHOW TREND'}
                        </div>
                      ) : (
                        <ScoreTrendChart sessions={trendSessions} />
                      )}
                    </div>
                  );
                })()}

                {/* Session History inline accordion */}
                <div style={{ border: '2px solid #f0e0c0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 3px 0 #f0e0c0' }}>
                  <button
                    onClick={() => setHistoryOpen(o => !o)}
                    style={{ width: '100%', background: '#fffbf0', border: 'none', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '12px', fontFamily: '"Space Grotesk", sans-serif' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>📋</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#2d1b00' }}>Session History</div>
                        <div style={{ fontSize: '12px', color: '#b09070', marginTop: '1px' }}>
                          {sessions.length} completed session{sessions.length !== 1 ? 's' : ''} — click to review feedback
                        </div>
                      </div>
                    </div>
                    {historyOpen ? <ChevronUp size={18} color="#b09070" /> : <ChevronDown size={18} color="#b09070" />}
                  </button>

                  {historyOpen && (
                    <div style={{ borderTop: '1.5px solid #f0e0c0', padding: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {sessions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#b09070', fontSize: '14px' }}>
                          No sessions yet — complete your first session to see history here.
                        </div>
                      ) : (
                        [...sessions].reverse().map(s => <SessionCard key={s.id} session={s} />)
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#e0d0b0', padding: '20px 0 8px', letterSpacing: '0.08em' }}>
            © PMNINJA · GOOGLE · META · FLIPKART
          </div>
        </div>
      </div>
    </>
  );
}
