'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, Home, Star } from 'lucide-react';

function FeedbackContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('RETRIEVING TRANSCRIPT...');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) { router.push('/home'); return; }

    const generateFeedback = async () => {
      try {
        setLoadingMsg('RETRIEVING TRANSCRIPT...');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/auth'); return; }

        // Step 0 — return cached feedback if already evaluated, with ownership check
        const { data: existingSession } = await supabase
          .from('sessions')
          .select('feedback, status')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (existingSession?.feedback && existingSession.status === 'completed') {
          setReport(existingSession.feedback);
          setLoading(false);
          return;
        }

        // Step 1 — call feedback API with just sessionId (API fetches transcripts server-side)
        setLoadingMsg('RUNNING EVALUATION ENGINE...');
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Feedback generation failed. Please try again.');
        }

        setLoadingMsg('COMPILING REPORT...');
        const feedback = await res.json();

        if (!feedback.checkpoints || !Array.isArray(feedback.checkpoints)) {
          throw new Error('Something went wrong. Please try again.');
        }

        setReport(feedback);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    generateFeedback();
  }, [sessionId]);

  if (loading) return (
    <div className="min-h-screen bg-darkBG flex flex-col items-center justify-center text-accent font-mono gap-4">
      <div className="w-16 h-16 border-4 border-accent border-r-transparent rounded-full animate-spin" />
      <div className="text-sm tracking-widest animate-pulse">{loadingMsg}</div>
      <div className="text-gray-600 text-xs mt-2">This may take 15–30 seconds</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-darkBG flex flex-col items-center justify-center text-red-400 font-mono gap-4 p-8">
      <AlertTriangle size={40} />
      <div className="text-lg">EVALUATION FAILED</div>
      <div className="text-sm text-gray-500 text-center max-w-md">{error}</div>
      <button
        onClick={() => router.push('/home')}
        className="mt-4 border border-gray-700 text-gray-400 px-6 py-2 text-xs hover:text-white hover:border-white transition-colors"
      >
        RETURN TO DASHBOARD
      </button>
    </div>
  );

  const scoreColor = report.overallScore >= 7
    ? 'text-green-400'
    : report.overallScore >= 5
      ? 'text-accent'
      : 'text-red-400';

  return (
    <div className="min-h-screen bg-darkBG px-4 pt-4 md:px-8 md:pt-8 pb-32 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center border-b border-gray-800 pb-8 pt-4">
          <h1 className="text-5xl md:text-6xl text-white font-bebas mb-2 uppercase tracking-wide">
            INTERVIEW FEEDBACK REPORT
          </h1>
          <p className="font-mono text-gray-600 text-xs tracking-widest">{sessionId}</p>
        </header>

        {/* Overall Score */}
        <section className="bg-gray-900 border border-gray-800 p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-accent" />
          <div className="text-xs text-gray-500 font-mono mb-3 uppercase tracking-widest">OVERALL EVALUATION</div>
          <div className="flex items-end gap-4 mb-6">
            <div className={`text-8xl font-bebas leading-none ${scoreColor}`}>
              {report.overallScore}
              <span className="text-4xl text-gray-600">/10</span>
            </div>
          </div>
          <p className="text-gray-300 font-mono text-sm leading-relaxed border-t border-gray-800 pt-4">
            {report.summary}
          </p>
          {report.standout && (
            <div className="mt-4 flex items-start gap-2 bg-accent/5 border border-accent/20 p-3">
              <Star size={14} className="text-accent mt-0.5 shrink-0" />
              <p className="text-accent/80 font-mono text-xs leading-relaxed">{report.standout}</p>
            </div>
          )}
        </section>

        {/* Checkpoint Analysis */}
        <section>
          <h2 className="text-2xl font-bebas text-white mb-6 tracking-wide">CHECKPOINT ANALYSIS</h2>
          <div className="space-y-4">
            {report.checkpoints.map((cp, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 p-6">
                <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4 gap-4">
                  <h3 className="text-white font-bebas tracking-wide text-xl">
                    {String(idx + 1).padStart(2, '0')}. {cp.name}
                  </h3>
                  <span className={`text-xs font-mono uppercase px-2 py-1 shrink-0 ${cp.label === 'Strong'
                      ? 'bg-green-900/30 text-green-400 border border-green-800'
                      : cp.label === 'Weak'
                        ? 'bg-red-900/30 text-red-400 border border-red-800'
                        : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                    }`}>
                    {cp.label} · {cp.score}/10
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
                  <div>
                    <div className="text-gray-500 text-[10px] mb-2 uppercase tracking-widest">Evaluator Rationale</div>
                    <div className="text-gray-300 leading-relaxed">{cp.why}</div>
                  </div>
                  <div className="bg-darkBG p-4 border border-gray-800">
                    <div className="text-accent text-[10px] mb-2 flex items-center gap-1 uppercase tracking-widest">
                      <AlertTriangle size={10} /> What Top APMs Do
                    </div>
                    <div className="text-gray-400 leading-relaxed">{cp.doingBetter}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 w-full bg-darkBG/95 backdrop-blur border-t border-gray-800 p-4 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="font-mono text-xs hidden md:block" style={{ color: '#fffbf0' }}>
            Calibrated against Google · Meta · Flipkart standard
          </div>
          <button
            onClick={() => router.push('/home')}
            className="bg-accent text-darkBG px-8 py-3 font-bold uppercase tracking-widest font-mono text-sm hover:bg-yellow-400 flex items-center gap-2 transition-colors"
          >
            <Home size={16} /> RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackContent />
    </Suspense>
  );
}