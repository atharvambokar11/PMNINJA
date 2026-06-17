'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);
  const cooldownRef = useRef(null);
  const googleTimeoutRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [resendCooldown > 0]);

  useEffect(() => {
    return () => clearTimeout(googleTimeoutRef.current);
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    // Reset loading if redirect never fires (browser blocks popup etc.)
    googleTimeoutRef.current = setTimeout(() => setGoogleLoading(false), 10000);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      clearTimeout(googleTimeoutRef.current);
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const sendResetEmail = async () => {
    setLoading(true);
    setError(null);
    const trimmedEmail = email.trim();

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.');
      setResendCooldown(60);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setSuccess(null);
    await sendResetEmail();
  };

  const resendConfirmation = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email: unconfirmedEmail });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Confirmation email resent. Check your inbox and spam folder.');
      setUnconfirmedEmail(null);
    }
  };

  const formatError = (message) => {
    if (!message) return message;
    const lower = message.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('too many')) {
      return 'Too many attempts. Please wait a few hours before trying again.';
    }
    return message;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUnconfirmedEmail(null);

    const trimmedEmail = email.trim();

    if (!isLogin && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setUnconfirmedEmail(trimmedEmail);
            setError('Your email isn\'t confirmed yet. Check your inbox or resend the confirmation.');
          } else {
            setError(formatError(error.message));
          }
          return;
        }
        router.push('/home');
      } else {
        const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
        if (error) throw error;
        if (data.session) {
          // Email confirmation is disabled — user is already authenticated
          router.push('/home');
        } else {
          // Email confirmation is enabled — user must confirm before signing in
          setSuccess('Account created! Check your email to confirm your account, then come back to sign in.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError(formatError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 fade-in relative" style={{ background: '#fffbf0' }}>

      {/* Logo */}
      <img src="/pmninja-logo.png" alt="PMNinja" style={{ height: '80px', objectFit: 'contain', marginBottom: '24px' }} />

      <div style={{ fontFamily: '"Fredoka One", cursive', fontSize: '28px', color: '#2d1b00', marginBottom: '4px' }}>
        {forgotMode ? 'Reset Password' : 'Welcome back'}
      </div>
      <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#a08060', marginBottom: '32px' }}>
        {forgotMode ? "Enter your email and we'll send a reset link" : isLogin ? 'Sign in to continue your training' : 'Create your account to start'}
      </p>

      <div className="w-full max-w-sm" style={{ background: 'white', border: '2px solid #f0e0c0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 0 #f0e0c0' }}>

        {error && (
          <div style={{ marginBottom: '16px', color: '#e52b2b', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', padding: '10px 14px', border: '1px solid #ffc0c0', borderRadius: '8px', background: '#fff0f0' }}>
            {error}
            {unconfirmedEmail && (
              <button
                onClick={resendConfirmation}
                disabled={loading}
                style={{ display: 'block', marginTop: '8px', color: '#27ae60', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', padding: 0 }}
              >
                Resend confirmation email
              </button>
            )}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: '16px', color: '#27ae60', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', padding: '10px 14px', border: '1px solid #b0e0c0', borderRadius: '8px', background: '#f0fff4' }}>
            ✓ {success}
          </div>
        )}

        {/* Forgot password view */}
        {forgotMode && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #f0e0c0', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#2d1b00', background: '#fffbf0', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = '#27ae60'}
                onBlur={e => e.currentTarget.style.borderColor = '#f0e0c0'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || resendCooldown > 0}
              style={{ width: '100%', padding: '12px', borderRadius: '50px', background: '#27ae60', color: 'white', border: 'none', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', fontWeight: 800, cursor: (loading || resendCooldown > 0) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 0 #1e8449', marginTop: '4px', transition: 'all 0.12s', opacity: (loading || resendCooldown > 0) ? 0.6 : 1 }}
              onMouseDown={e => { if (!loading && !resendCooldown) { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 2px 0 #1e8449'; } }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #1e8449'; }}
            >
              {loading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : success ? 'Resend Link' : 'Send Reset Link'}
            </button>
            {success && resendCooldown === 0 && (
              <div style={{ textAlign: 'center', fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060' }}>
                Didn't get it?{' '}
                <button
                  type="submit"
                  style={{ color: '#27ae60', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', padding: 0 }}
                >
                  Resend
                </button>
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(null); setSuccess(null); setResendCooldown(0); clearInterval(cooldownRef.current); }}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', color: '#a08060', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* Google button */}
        {!forgotMode && <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '12px',
            borderRadius: '10px',
            border: '2px solid #f0e0c0',
            background: 'white',
            cursor: 'pointer',
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: '#2d1b00',
            marginBottom: '20px',
            transition: 'all 0.15s',
            boxShadow: '0 2px 0 #f0e0c0',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#27ae60'; e.currentTarget.style.boxShadow = '0 2px 0 #27ae60'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#f0e0c0'; e.currentTarget.style.boxShadow = '0 2px 0 #f0e0c0'; }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H1.86v2.07A8 8 0 0 0 8.98 17z" />
            <path fill="#FBBC05" d="M4.51 10.53c-.16-.48-.25-.99-.25-1.53s.09-1.05.25-1.53V5.4H1.86A8 8 0 0 0 .98 9c0 1.29.31 2.51.88 3.6l2.65-2.07z" />
            <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.86 5.4L4.51 7.47c.63-1.89 2.39-3.89 4.47-3.89z" />
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>}

        {/* Divider */}
        {!forgotMode && <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: '#f0e0c0' }} />
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#c0a080' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#f0e0c0' }} />
        </div>}

        {/* Email / Password form */}
        {!forgotMode && <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #f0e0c0', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#2d1b00', background: '#fffbf0', outline: 'none' }}
              onFocus={e => e.currentTarget.style.borderColor = '#27ae60'}
              onBlur={e => e.currentTarget.style.borderColor = '#f0e0c0'}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '12px', color: '#a08060', fontWeight: 600 }}>
                PASSWORD
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(null); setSuccess(null); }}
                  style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '11px', color: '#27ae60', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '8px', border: '2px solid #f0e0c0', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', color: '#2d1b00', background: '#fffbf0', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = '#27ae60'}
                onBlur={e => e.currentTarget.style.borderColor = '#f0e0c0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#a08060', fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif' }}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {!isLogin && password.length > 0 && password.length < 8 && (
              <div style={{ marginTop: '5px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '11px', color: '#e52b2b' }}>
                Password must be at least 8 characters ({8 - password.length} more needed)
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '50px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #1e8449',
              marginTop: '4px',
              transition: 'all 0.12s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 2px 0 #1e8449'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #1e8449'; }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>}

        {!forgotMode && <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); setUnconfirmedEmail(null); setShowPassword(false); }}
            style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', color: '#a08060', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isLogin ? '→ Create new account' : '→ Back to sign in'}
          </button>
        </div>}
      </div>
    </div>
  );
}
