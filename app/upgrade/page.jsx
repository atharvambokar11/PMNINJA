'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Smartphone } from 'lucide-react';

export default function UpgradePage() {
  const [profile, setProfile] = useState(null);
  const [paymentSent, setPaymentSent] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('5_sessions');
  const [paying, setPaying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth');
      else setProfile(data.user);
    });
  }, [router]);

  const handlePaid = async () => {
    if (!profile || paying) return;
    setPaying(true);
    const amount = selectedPlan === '5_sessions' ? 100 : 180;
    const { error } = await supabase.from('payments').insert({
      user_id: profile.id,
      plan: selectedPlan,
      amount: amount,
      status: 'pending'
    });
    if (!error) {
      setPaymentSent(true);
    } else {
      setPaying(false);
    }
  };

  if(!profile) return null;

  if (paymentSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-darkBG fade-in text-center font-mono">
        <div className="max-w-md border border-accent p-8 bg-accent/5 shadow-[0_0_30px_rgba(240,224,64,0.1)]">
          <h2 className="text-accent text-2xl mb-4 uppercase tracking-widest">TRANSACTION LOGGED</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            We'll verify your payment and unlock your sessions within a few hours. Check your email for confirmation.
          </p>
          <button onClick={() => router.push('/home')} className="border border-gray-700 px-6 py-2 text-xs hover:border-white transition-colors text-white">
            RETURN TO BASE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-darkBG fade-in relative font-mono">
      <div className="max-w-2xl w-full border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <h1 className="text-4xl font-bebas text-white mb-2 text-center tracking-wide">SYSTEM RECHARGE</h1>
        <p className="text-center text-gray-500 text-sm mb-12">Select your credit injection</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div 
            onClick={() => setSelectedPlan('5_sessions')}
            className={`border p-6 cursor-pointer transition-colors ${selectedPlan === '5_sessions' ? 'border-accent bg-accent/10' : 'border-gray-700 bg-gray-800/50'}`}
          >
            <h3 className="text-gray-300 text-sm mb-2">STANDARD BATCH</h3>
            <div className="text-3xl font-bebas text-white mb-1">5 SESSIONS</div>
            <div className="text-accent text-xl">₹100</div>
          </div>
          <div 
            onClick={() => setSelectedPlan('10_sessions')}
            className={`border p-6 cursor-pointer transition-colors ${selectedPlan === '10_sessions' ? 'border-accent bg-accent/10' : 'border-gray-700 bg-gray-800/50'}`}
          >
            <h3 className="text-gray-300 text-sm mb-2" >ELITE BATCH</h3>
            <div className="text-3xl font-bebas text-white mb-1">10 SESSIONS</div>
            <div className="text-accent text-xl">₹180</div>
          </div>
        </div>

        <div className="border border-gray-800 bg-black p-6 mb-8 text-center flex flex-col items-center">
          <Smartphone size={32} className="text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2 text-xs uppercase">Scan or transfer to UPI ID:</p>
          <p className="text-2xl text-white tracking-widest mb-2 font-sans select-all">atharv.ambokar1@gmail.com</p>
        </div>

        <button
          onClick={handlePaid}
          disabled={paying}
          className="w-full bg-accent text-darkBG py-4 font-bold text-lg uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? 'LOGGING PAYMENT...' : 'I HAVE PAID'}
        </button>
      </div>
    </div>
  );
}
