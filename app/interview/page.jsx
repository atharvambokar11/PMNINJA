'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Mic, Square, Send, Sun, Moon } from 'lucide-react';

function renderContent(text) {
  return text.split('\n').map((line, lineIdx, lines) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={lineIdx}>
        {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
        {lineIdx < lines.length - 1 && '\n'}
      </span>
    );
  });
}

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');
  const router = useRouter();

  const [sessionData, setSessionData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showCharTooltip, setShowCharTooltip] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const voiceDetectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (!sessionId) { router.push('/home'); return; }
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data } = await supabase
        .from('sessions')
        .select('*, profiles(email)')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();
      if (!data) { router.push('/home'); return; }
      if (data.status === 'completed') { router.push(`/feedback?id=${sessionId}`); return; }

      setSessionData(data);

      const { data: existing } = await supabase
        .from('transcripts')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (existing && existing.length > 0) {
        setMessages(existing.map(t => ({ role: t.role, content: t.content })));
      } else {
        const initialMsg = {
          role: 'assistant',
          content: `Hey, great to meet you! I'm your assessor for today's round.\n\nWe've got about 30–40 minutes together. I'll give you a product design question, and I'd love for you to think out loud as you go — I'm more interested in how you think than a perfect answer. I'll jump in with follow-ups along the way.\n\nReady? Here's your question:\n\n**${data.question_text}**\n\nTake a moment, then walk me through your approach.`
        };
        setMessages([initialMsg]);
        await supabase.from('transcripts').insert({
          session_id: sessionId,
          role: 'assistant',
          content: initialMsg.content
        });
      }
    };
    loadData();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const sanitized = input.trim().replace('[INTERVIEW_COMPLETE]', '').trim();
    if (!sanitized || isPaused || loading) return;
    const userText = sanitized;

    const userTurnCount = messages.filter(m => m.role === 'user').length;
    if (userTurnCount >= 50) {
      const limitMsg = "Real PM interviews wrap up in far fewer exchanges than this. The conversation ran longer than a typical round — we're wrapping up here and generating your feedback now.";
      setInput('');
      setLoading(true);
      setMessages(prev => [...prev,
        { role: 'user', content: userText },
        { role: 'assistant', content: limitMsg }
      ]);
      await supabase.from('transcripts').insert({ session_id: sessionId, role: 'user', content: userText });
      await supabase.from('transcripts').insert({ session_id: sessionId, role: 'assistant', content: limitMsg });
      setTimeout(() => router.push(`/feedback?id=${sessionId}`), 3000);
      return;
    }

    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    await supabase.from('transcripts').insert({
      session_id: sessionId,
      role: 'user',
      content: userText
    });

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let navigating = false;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId })
      });

      if (!res.ok) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText.replace('[INTERVIEW_COMPLETE]', '').trimEnd() };
          return updated;
        });
      }

      const isComplete = fullText.includes('[INTERVIEW_COMPLETE]');
      const displayText = fullText.replace('[INTERVIEW_COMPLETE]', '').trimEnd();

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: displayText };
        return updated;
      });

      await supabase.from('transcripts').insert({
        session_id: sessionId,
        role: 'assistant',
        content: displayText
      });

      if (isComplete) {
        navigating = true;
        setTimeout(() => router.push(`/feedback?id=${sessionId}`), 2000);
        return;
      }

    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.'
        };
        return updated;
      });
    } finally {
      if (!navigating) setLoading(false);
    }
  };

  const handleEnd = async () => {
    router.push(`/feedback?id=${sessionId}`);
  };

  // Initialize voice activity detection
  const initializeVoiceDetection = async (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const detectVoice = () => {
        // Check if analyser still exists before accessing it
        if (!analyserRef.current || !voiceDetectionRef.current) {
          return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average frequency to detect voice
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const threshold = 30; // Adjust sensitivity here
        
        setIsVoiceDetected(average > threshold);
        
        if (voiceDetectionRef.current) {
          requestAnimationFrame(detectVoice);
        }
      };
      
      voiceDetectionRef.current = true;
      detectVoice();
    } catch (e) {
      console.error('Voice detection initialization failed:', e);
    }
  };

  const stopVoiceDetection = () => {
    voiceDetectionRef.current = false;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsVoiceDetected(false);
  };

  const transcribeAudioChunk = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');
      
      const data = await response.json();
      return data.transcription || '';
    } catch (error) {
      console.error('Transcription error:', error);
      return '';
    }
  };

  const startRecognition = (stream) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimText = '';
      // Only process NEW results from where we left off, not all results from the start
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }
      setInput((finalTranscriptRef.current + interimText).trim().slice(0, 3000));
    };

    recognition.onend = () => {
      // Auto-restart if user hasn't manually stopped — handles silent drops
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Recognition already started or stream ended — stop cleanly
          isRecordingRef.current = false;
          setIsRecording(false);
          stopVoiceDetection();
        }
      } else {
        stopVoiceDetection();
      }
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are non-fatal — let onend handle restart
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isRecordingRef.current = false;
        setIsRecording(false);
        stopVoiceDetection();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isRecording) {
      // Stop Web Speech API
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
      stopVoiceDetection();
      // Stop MediaRecorder — onstop will fire and send to Groq
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      finalTranscriptRef.current = '';
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await initializeVoiceDetection(stream);

      // MediaRecorder captures raw audio for Groq Whisper
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.transcription) setInput(data.transcription.trim().slice(0, 3000));
        } catch (e) {
          console.error('Groq transcription failed, keeping Web Speech result:', e);
        } finally {
          setIsTranscribing(false);
        }
        // Stop all mic tracks to release the microphone
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Web Speech API runs in parallel for real-time preview
      isRecordingRef.current = true;
      setIsRecording(true);
      startRecognition(stream);
    } catch (e) {
      console.error('Microphone access denied or error:', e);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  if (!sessionData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffbf0', fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#27ae60' }}>
      ASSEMBLING SCENARIO...
    </div>
  );

  const t = isDark ? {
    pageBg: '#28303a',
    headerBg: '#202830',
    border: 'rgba(255,255,255,0.07)',
    messagesBg: '#28303a',
    aiBubbleBg: '#323c46',
    aiBubbleText: 'rgba(255,255,255,0.87)',
    inputBg: '#323c46',
    inputBorder: 'rgba(255,255,255,0.1)',
    inputText: 'rgba(255,255,255,0.7)',
    dimText: 'rgba(255,255,255,0.25)',
    mutedText: 'rgba(255,255,255,0.35)',
    exitColor: '#ff6b6b',
    exitBg: 'rgba(255,80,80,0.15)',
    exitBorder: 'rgba(255,99,99,0.4)',
  } : {
    pageBg: '#fffbf0',
    headerBg: 'white',
    border: '#f0e0c0',
    messagesBg: '#fffbf0',
    aiBubbleBg: 'white',
    aiBubbleText: '#2d1b00',
    inputBg: '#fffbf0',
    inputBorder: '#f0e0c0',
    inputText: '#2d1b00',
    dimText: '#a08060',
    mutedText: '#a08060',
    exitColor: '#e05050',
    exitBg: 'rgba(255,80,80,0.08)',
    exitBorder: 'rgba(255,99,99,0.3)',
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(39,174,96,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(39,174,96,0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', position: 'relative', overflow: 'hidden', background: t.pageBg, fontFamily: '"Space Grotesk", sans-serif' }}>

      {/* Exit Confirmation Overlay */}
      {showExitConfirm && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28,36,44,0.97)', backdropFilter: 'blur(4px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥷</div>
            <h2 style={{ fontFamily: '"Fredoka One", cursive', fontSize: '36px', color: 'rgba(255,255,255,0.9)', marginBottom: '12px', lineHeight: 1.2 }}>Not yet.<br />You're closer than you think.</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '8px', lineHeight: 1.7, fontSize: '14px' }}>
              The best PMs push through the uncomfortable parts. Pause if you need to — but don't quit.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '32px', lineHeight: 1.7, fontSize: '13px' }}>
              Not ready to quit? Hit pause, collect your thoughts, come back swinging.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => { setShowExitConfirm(false); setIsPaused(true); }}
                style={{ width: '100%', maxWidth: '280px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '50px', padding: '13px 32px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 0 #1e8449' }}
              >
                ⏸ Actually, let me pause
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); handleEnd(); }}
                style={{ width: '100%', maxWidth: '280px', background: 'transparent', color: 'rgba(255,100,100,0.7)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '50px', padding: '11px 32px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                I'm done, exit anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28,36,44,0.97)', backdropFilter: 'blur(4px)' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: '"Fredoka One", cursive', fontSize: '42px', color: 'rgba(255,255,255,0.87)', marginBottom: '12px' }}>SIMULATION PAUSED</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '32px', maxWidth: '380px', lineHeight: 1.6, margin: '0 auto 32px' }}>
              Catch your breath. Review your notes. When you are ready, resume.
            </p>
            <button
              onClick={() => setIsPaused(false)}
              style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: '50px', padding: '12px 40px', fontFamily: '"Space Grotesk", sans-serif', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 0 #1e8449' }}
            >
              RESUME
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{ background: t.headerBg, borderBottom: `1px solid ${t.border}`, padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#27ae60', background: isDark ? '#1c242c' : '#f0fff4', border: '1px solid rgba(39,174,96,0.4)', padding: '4px 10px', borderRadius: '4px' }}>
              LIVE SCENARIO
            </span>
            {/* Dark / Light toggle */}
            <button
              onClick={() => setIsDark(v => !v)}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f0e0c0', border: 'none', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: isDark ? 'rgba(255,255,255,0.6)' : '#2d1b00', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}
            >
              {isDark ? <Sun size={12} /> : <Moon size={12} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: t.mutedText, fontFamily: '"Space Grotesk", sans-serif' }}>{sessionData.profiles?.email}</span>
            <button
              onClick={() => setIsPaused(true)}
              style={{ color: '#27ae60', border: '1px solid rgba(39,174,96,0.5)', background: 'transparent', borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Square size={11} fill="currentColor" /> PAUSE
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              style={{ color: t.exitColor, border: `1px solid ${t.exitBorder}`, background: t.exitBg, borderRadius: '6px', padding: '6px 14px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, cursor: 'pointer' }}
            >
              EXIT
            </button>
          </div>
        </header>

        {/* Messages */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: t.messagesBg }}>
          {messages.map((m, i) => (
            <div key={i} style={{ maxWidth: '85%', marginLeft: m.role === 'assistant' ? 0 : 'auto', marginRight: m.role === 'assistant' ? 'auto' : 0 }}>
              <div style={{ fontSize: '11px', marginBottom: '4px', color: t.dimText, textAlign: m.role === 'assistant' ? 'left' : 'right' }}>
                {m.role === 'assistant' ? 'AI ASSESSOR' : 'YOU'}
              </div>
              <div style={m.role === 'assistant'
                ? { background: t.aiBubbleBg, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '16px', fontSize: '14px', lineHeight: 1.7, color: t.aiBubbleText, whiteSpace: 'pre-wrap' }
                : { background: '#27ae60', borderRadius: '12px', padding: '16px', fontSize: '14px', lineHeight: 1.7, color: 'white', whiteSpace: 'pre-wrap' }
              }>
                {renderContent(m.content)}
                {m.role === 'assistant' && i === messages.length - 1 && loading && (
                  <span style={{ display: 'inline-block', width: '8px', height: '16px', background: '#27ae60', marginLeft: '4px', verticalAlign: 'middle' }} />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>

        {/* Footer */}
        <footer style={{ padding: '16px 24px', background: t.headerBg, borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '960px', margin: '0 auto', width: '100%' }}>

            {/* Textarea wrapper — mic top-right, send bottom-right inside */}
            <div style={{ position: 'relative', width: '100%' }}>
              <textarea
                disabled={isPaused || loading || isTranscribing}
                maxLength={3000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isRecording && !isTranscribing) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Formulate your response… (Enter to send, Shift+Enter for new line)"
                style={{
                  width: '100%',
                  background: t.inputBg,
                  border: `1.5px solid ${t.inputBorder}`,
                  borderRadius: '12px',
                  outline: 'none',
                  resize: 'none',
                  padding: '12px 48px 12px 16px',
                  fontSize: '14px',
                  color: t.inputText,
                  fontFamily: '"Space Grotesk", sans-serif',
                  height: '100px',
                  caretColor: '#27ae60',
                  overflowY: 'auto',
                  lineHeight: '1.5',
                  boxSizing: 'border-box',
                }}
                rows={4}
              />

              {/* Transcribing overlay */}
              {isTranscribing && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: isDark ? 'rgba(50,60,70,0.92)' : 'rgba(255,251,240,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backdropFilter: 'blur(2px)' }}>
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '13px', fontWeight: 600, color: '#27ae60' }}>Transcribing</span>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#27ae60', display: 'inline-block', animation: `dotBounce 0.9s ease-in-out infinite`, animationDelay: `${delay}s` }} />
                  ))}
                </div>
              )}

              {/* Mic — top right inside textarea */}
              <button
                onClick={toggleRecording}
                disabled={isTranscribing}
                title={isRecording ? 'Stop recording' : 'Start recording'}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '10px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: isTranscribing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isRecording ? '#27ae60' : 'transparent',
                  color: isRecording ? 'white' : t.dimText,
                  opacity: isTranscribing ? 0.4 : 1,
                  transition: 'all 0.2s',
                  animation: isVoiceDetected && isRecording ? 'micPulse 1s infinite' : 'none',
                }}
              >
                <Mic size={15} style={{ animation: isVoiceDetected && isRecording ? 'pulse 0.5s infinite' : 'none' }} />
              </button>

              {/* Send — bottom right inside textarea */}
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || isRecording || isTranscribing}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '10px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: (loading || !input.trim() || isRecording || isTranscribing) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#27ae60',
                  color: 'white',
                  opacity: (loading || !input.trim() || isRecording || isTranscribing) ? 0.3 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <Send size={14} />
              </button>
            </div>

          </div>
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setShowCharTooltip(true)}
              onMouseLeave={() => setShowCharTooltip(false)}
            >
              <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', color: t.dimText, cursor: 'default' }}>
                {input.length} / 3000
              </span>
              {showCharTooltip && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: isDark ? '#2d3a46' : '#2d1b00', color: 'rgba(255,255,255,0.9)', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontStyle: 'italic', padding: '5px 10px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  Sadly, stories aren't appreciated here.
                  <div style={{ position: 'absolute', top: '100%', right: '8px', border: '5px solid transparent', borderTopColor: isDark ? '#2d3a46' : '#2d1b00' }} />
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>

    </div>
    </>
  );
}
