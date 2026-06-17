'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { LogOut, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

function ScoreBadge({ score }) {
  const color = score >= 7 ? '#27ae60' : score >= 5 ? '#e67e22' : '#e52b2b';
  const bg = score >= 7 ? '#e8f8f0' : score >= 5 ? '#fff3e0' : '#fdecea';
  const border = score >= 7 ? '#27ae60' : score >= 5 ? '#e67e22' : '#e52b2b';
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: '50px', padding: '4px 14px', fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color, whiteSpace: 'nowrap' }}>
      {score}/10
    </div>
  );
}

function CheckpointRow({ cp, idx }) {
  const labelColor = cp.label === 'Strong' ? '#27ae60' : cp.label === 'Weak' ? '#e52b2b' : '#e67e22';
  const labelBg = cp.label === 'Strong' ? '#e8f8f0' : cp.label === 'Weak' ? '#fdecea' : '#fff3e0';
  return (
    <div style={{ borderBottom: '1px solid #f5ede0', paddingBottom: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '17px', color: '#2d1b00' }}>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#999', marginRight: '8px' }}>{String(idx + 1).padStart(2, '0')}.</span>
          {cp.name}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ background: labelBg, border: `1px solid ${labelColor}`, borderRadius: '4px', padding: '2px 10px', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: labelColor }}>
            {cp.label}
          </div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#666' }}>{cp.score}/10</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#aaa', letterSpacing: '0.06em', marginBottom: '6px' }}>EVALUATOR RATIONALE</div>
          <div style={{ fontSize: '13px', color: '#7a6050', lineHeight: 1.6 }}>{cp.why}</div>
        </div>
        <div style={{ background: '#fffbf0', border: '1px solid #f0e0c0', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#e67e22', letterSpacing: '0.06em', marginBottom: '6px' }}>WHAT TOP APMs DO</div>
          <div style={{ fontSize: '13px', color: '#7a6050', lineHeight: 1.6 }}>{cp.doingBetter}</div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session }) {
  const [open, setOpen] = useState(false);
  const fb = session.feedback;
  const date = new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: 'white', border: '2px solid #f0e0c0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 3px 0 #f0e0c0', transition: 'box-shadow 0.2s' }}>
      {/* Card header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: '16px', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#b09070', fontFamily: '"Press Start 2P", monospace', letterSpacing: '0.04em', marginBottom: '6px' }}>{date}</div>
          <div style={{ fontSize: '14px', color: '#2d1b00', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {session.question_text}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {session.score && <ScoreBadge score={session.score} />}
          {open ? <ChevronUp size={18} color="#b09070" /> : <ChevronDown size={18} color="#b09070" />}
        </div>
      </button>

      {/* Expanded feedback */}
      {open && fb && (
        <div style={{ borderTop: '1.5px solid #f0e0c0', padding: '24px' }}>

          {/* Overall */}
          <div style={{ background: '#fffbf0', border: '1.5px solid #f0e0c0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: fb.summary ? '12px' : '0' }}>
              <div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#999', letterSpacing: '0.06em', marginBottom: '4px' }}>OVERALL SCORE</div>
                <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '36px', color: fb.overallScore >= 7 ? '#27ae60' : fb.overallScore >= 5 ? '#e67e22' : '#e52b2b', lineHeight: 1 }}>
                  {fb.overallScore}<span style={{ fontSize: '18px', color: '#ccc' }}>/10</span>
                </div>
              </div>
              {fb.standout && (
                <div style={{ background: '#e8f8f0', border: '1px solid #b0e0c0', borderRadius: '8px', padding: '10px 14px', maxWidth: '340px' }}>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#27ae60', marginBottom: '4px' }}>STANDOUT</div>
                  <div style={{ fontSize: '13px', color: '#3a7a50', lineHeight: 1.5 }}>{fb.standout}</div>
                </div>
              )}
            </div>
            {fb.summary && (
              <div style={{ fontSize: '13px', color: '#7a6050', lineHeight: 1.6, borderTop: '1px solid #f0e0c0', paddingTop: '12px' }}>
                {fb.summary}
              </div>
            )}
          </div>

          {/* Session meta */}
          {(fb.promptCount != null || fb.durationSeconds != null) && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {fb.promptCount != null && (
                <div style={{ background: '#f5f0e8', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: '#7a6050' }}>
                  💬 {fb.promptCount} prompts
                </div>
              )}
              {fb.durationSeconds != null && (
                <div style={{ background: '#f5f0e8', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: '#7a6050' }}>
                  ⏱️ {Math.floor(fb.durationSeconds / 60)}m {fb.durationSeconds % 60}s
                </div>
              )}
            </div>
          )}

          {/* Checkpoints */}
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#888', letterSpacing: '0.06em', marginBottom: '16px' }}>CHECKPOINT BREAKDOWN</div>
          {fb.checkpoints?.map((cp, i) => (
            <CheckpointRow key={i} cp={cp} idx={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionsPage() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data: prof } = await supabase.from('profiles').select('id, email, streak, last_session_date').eq('id', user.id).single();
      if (!prof) { router.push('/auth'); return; }
      setProfile(prof);

      const { data: sess } = await supabase
        .from('sessions')
        .select('id, score, question_text, feedback, created_at')
        .eq('user_id', prof.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      setSessions(sess || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffbf0' }}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#27ae60' }}>LOADING SESSIONS...</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fredoka+One&family=Space+Grotesk:wght@400;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .signout-btn:hover { color: #e52b2b !important; border-color: #e52b2b !important; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: '#fffbf0', fontFamily: '"Space Grotesk", sans-serif' }}>

        {/* Header */}
        <div style={{ background: '#fffbf0', borderBottom: '1.5px solid #f0e0c0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '56px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#fff3e0', border: '1.5px solid #f0d080', borderRadius: '50px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🔥</span>
              <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#e67e22' }}>{(() => {
                  if (!profile?.last_session_date) return 0;
                  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                  const yesterdayIST = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                  return (profile.last_session_date === todayIST || profile.last_session_date === yesterdayIST) ? profile.streak : 0;
                })()}</span>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#f0e0c0' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.1 }}>🥷 PM Ninja</div>
              <div style={{ fontSize: '11px', color: '#b09070', marginTop: '1px' }}>{profile?.email}</div>
            </div>
            <div style={{ width: '1px', height: '32px', background: '#f0e0c0' }} />
            <button onClick={handleSignOut} className="signout-btn" style={{ background: 'transparent', border: '1.5px solid #e0cdb0', borderRadius: '8px', padding: '7px 14px', color: '#b09070', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 fade-up">

          {/* Back + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button onClick={() => router.push('/home')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#b09070', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', fontWeight: 600, padding: 0, transition: 'color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.color = '#2d1b00'}
              onMouseOut={e => e.currentTarget.style.color = '#b09070'}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
          <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '30px', color: '#2d1b00', marginBottom: '4px' }}>📋 Session History</div>
          <div style={{ fontSize: '13px', color: '#b09070', marginBottom: '24px' }}>
            {sessions.length} completed session{sessions.length !== 1 ? 's' : ''} — click any to review feedback
          </div>

          {sessions.length === 0 ? (
            <div style={{ background: 'white', border: '2px solid #f0e0c0', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 3px 0 #f0e0c0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎮</div>
              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '22px', color: '#2d1b00', marginBottom: '8px' }}>No sessions yet</div>
              <div style={{ fontSize: '14px', color: '#b09070', marginBottom: '20px' }}>Complete your first session to see feedback here</div>
              <button onClick={() => router.push('/setup')} style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: '50px', padding: '12px 28px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 0 #1e8449' }}>
                ▶ Start First Session
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}

          <div style={{ textAlign: 'center', fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#e0d0b0', padding: '24px 0 8px', letterSpacing: '0.08em' }}>
            © PMNINJA · GOOGLE · META · FLIPKART
          </div>
        </div>
      </div>
    </>
  );
}
