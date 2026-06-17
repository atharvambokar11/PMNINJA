'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth');
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        if (data.free_mocks_left <= 0) {
          router.push('/upgrade');
        } else {
          setProfile(data);
        }
      }
    };
    getSession();
  }, [router]);

  const effectiveStreak = (() => {
    if (!profile?.last_session_date) return 0;
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const yesterdayIST = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return (profile.last_session_date === todayIST || profile.last_session_date === yesterdayIST)
      ? profile.streak
      : 0;
  })();

  const startSession = async () => {
    if (!profile || starting) return;
    setStarting(true);
    try {
      const res = await fetch('/api/start-session', { method: 'POST' });
      if (res.status === 403 || res.status === 409) {
        router.push('/upgrade');
        return;
      }
      if (!res.ok) throw new Error('Failed to start session');
      const { sessionId } = await res.json();
      router.push(`/interview?id=${sessionId}`);
    } catch (e) {
      console.error(e);
      alert('Something went wrong starting the session. Please try again.');
      setStarting(false);
    }
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#fffbf0' }}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#27ae60' }}>
        LOADING...
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fredoka+One&family=Space+Grotesk:wght@400;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .back-btn:hover { color: #e52b2b !important; border-color: #e52b2b !important; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: '#fffbf0', fontFamily: '"Space Grotesk", sans-serif' }}>

        {/* Header — same as home */}
        <div style={{ background: '#fffbf0', borderBottom: '1.5px solid #f0e0c0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '56px', objectFit: 'contain' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Streak */}
            <div style={{ background: '#fff3e0', border: '1.5px solid #f0d080', borderRadius: '10px', padding: '6px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '10px', color: '#c8860a', letterSpacing: '0.05em', marginBottom: '2px' }}>STREAK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px' }}>🔥</span>
                <span style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#e67e22', lineHeight: 1 }}>×{effectiveStreak}</span>
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#f0e0c0' }} />

            {/* Profile chip */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '18px', color: '#2d1b00', lineHeight: 1.1 }}>🥷 PM Ninja</div>
              <div style={{ fontSize: '11px', color: '#b09070', marginTop: '1px' }}>{profile.email}</div>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#f0e0c0' }} />

            {/* Back button */}
            <button
              onClick={() => router.push('/home')}
              className="back-btn"
              style={{ background: 'transparent', border: '1.5px solid #e0cdb0', borderRadius: '8px', padding: '7px 14px', color: '#b09070', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl fade-up" style={{ border: '2px solid #f0e0c0', borderRadius: '16px', background: 'white', padding: '32px', boxShadow: '0 4px 0 #f0e0c0' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏁</div>
              <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '42px', color: '#2d1b00', lineHeight: 1.1, marginBottom: '12px' }}>
                Product Design
              </div>
              <p style={{ fontSize: '15px', color: '#a08060', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
                A random FAANG-style product design question will be assigned. The AI Assessor will guide you through 8 gated checkpoints.
              </p>
            </div>

            {/* Rules Card */}
            <div style={{ background: '#fffbf0', border: '1.5px solid #f0e0c0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#666', marginBottom: '16px', letterSpacing: '0.06em' }}>
                MISSION RULES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { icon: '🎲', text: 'Random question from 74 FAANG-style prompts — Consumer, B2B, Platform, Emerging Tech' },
                  { icon: '🚪', text: 'Checkpoints are gated. You cannot skip ahead. The AI will hold you to structure.' },
                  { icon: '🎙️', text: 'Voice input available. Click the mic to speak your answer.' },
                ].map((rule, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{rule.icon}</span>
                    <span style={{ fontSize: '14px', color: '#5a4a2a', lineHeight: 1.6 }}>{rule.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={startSession}
              disabled={starting}
              style={{
                width: '100%',
                background: starting ? '#ccc' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '20px',
                cursor: starting ? 'not-allowed' : 'pointer',
                boxShadow: starting ? 'none' : '0 5px 0 #1e8449',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseDown={e => { if (!starting) { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 2px 0 #1e8449'; } }}
              onMouseUp={e => { if (!starting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 5px 0 #1e8449'; } }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '24px', marginBottom: '4px' }}>
                  {starting ? 'Deploying mission...' : '▶ Start Interview'}
                </div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: 'rgba(255,255,255,0.7)' }}>
                  Uses 1 of {profile.free_mocks_left} available mock{profile.free_mocks_left !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ fontSize: '32px' }}>
                {starting ? '⏳' : '🥷'}
              </div>
            </button>

          </div>
        </div>
      </div>
    </>
  );
}