'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const readyRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // PKCE flow: token_hash + type in query params
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash');
    const type = params.get('type');
    if (token_hash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
        if (error) setError('Reset link is invalid or has expired. Please request a new one.');
        else { readyRef.current = true; setReady(true); }
      });
      return;
    }
    // Implicit flow: PASSWORD_RECOVERY event from URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        readyRef.current = true;
        setReady(true);
      }
    });
    // Only show error if ready never fired — guards against direct navigation or missing token
    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        setError('Reset link is invalid or has expired. Please request a new one.');
      }
    }, 10000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      console.error('Password update error:', error);
      setError('Password update failed. Please try again.');
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/auth'), 2500);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 40px 10px 14px', borderRadius: '8px', border: '2px solid #f0e0c0', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#2d1b00', background: '#fffbf0', outline: 'none', boxSizing: 'border-box' };
  const toggleStyle = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#a08060', fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif' };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8" style={{ background: '#fffbf0' }}>
      <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '80px', objectFit: 'contain', marginBottom: '24px' }} />

      <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '28px', color: '#2d1b00', marginBottom: '4px' }}>
        Set New Password
      </div>
      <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#a08060', marginBottom: '32px' }}>
        Choose a strong password for your account
      </p>

      <div className="w-full max-w-sm" style={{ background: 'white', border: '2px solid #f0e0c0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 0 #f0e0c0' }}>

        {error && (
          <div style={{ marginBottom: '16px', color: '#e52b2b', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', padding: '10px 14px', border: '1px solid #ffc0c0', borderRadius: '8px', background: '#fff0f0' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#27ae60', fontWeight: 700 }}>
              Password updated!
            </div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060', marginTop: '6px' }}>
              Redirecting to sign in...
            </div>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', color: '#a08060' }}>
            {error ? (
              <button
                onClick={() => router.push('/auth')}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', color: '#27ae60', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Back to sign in
              </button>
            ) : 'Verifying reset link...'}
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                NEW PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = '#27ae60'}
                  onBlur={e => e.currentTarget.style.borderColor = '#f0e0c0'}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={toggleStyle} tabIndex={-1}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <div style={{ marginTop: '5px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '11px', color: '#e52b2b' }}>
                  {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                </div>
              )}
            </div>
            <div>
              <label style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                CONFIRM PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = '#27ae60'}
                  onBlur={e => e.currentTarget.style.borderColor = '#f0e0c0'}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} style={toggleStyle} tabIndex={-1}>
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {confirm.length > 0 && confirm !== password && (
                <div style={{ marginTop: '5px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '11px', color: '#e52b2b' }}>
                  Passwords don't match
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: '50px', background: '#27ae60', color: 'white', border: 'none', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 0 #1e8449', marginTop: '4px', transition: 'all 0.12s', opacity: loading ? 0.6 : 1 }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 2px 0 #1e8449'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #1e8449'; }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
