import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { HeartPulse, MapPin, Calendar, CheckCircle2, History, LogOut, Clock, Link as LinkIcon, Loader2, User as UserIcon, Phone, Droplets } from 'lucide-react';

export function DonorPortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [donor, setDonor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    fetch('/api/v1/auth/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email, tenant: 'donor' })
    })
    .then(r => r.json())
    .then(data => {
       if (data.status === 'success') {
         // Merge API data with session payload
         setDonor({ ...data.data, ...user, hexUserId: user?.hexUserId || data.data.hexUserId });
         setIsAvailable(data.data.role_status === 'TRUE');
       }
       setIsLoading(false);
       
       if (user?.isSignUp) {
         fetch('/api/v1/auth/register-donor', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(user)
         }).catch(console.error);
       }
    })
    .catch(e => {
       console.error(e);
       setIsLoading(false);
    });
  }, [user]);

  if (isLoading) {
     return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <Loader2 className="w-8 h-8 text-[#E11D48] animate-spin" />
       </div>
     );
  }

  if (!donor) {
     return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
         <div className="text-slate-500 font-medium">Authentication Failed. Record not found.</div>
         <button onClick={onLogout} className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-semibold text-slate-800">Return</button>
       </div>
     );
  }

  const nextEligible = new Date(donor.next_eligible_date || new Date().toISOString());
  const isEligibleNow = nextEligible <= new Date();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg">
            <HeartPulse className="w-6 h-6 text-[#E11D48]" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-slate-900 leading-tight">Donor Portal</h1>
            <div className="text-[10px] font-mono tracking-widest text-[#E11D48] uppercase font-semibold">donor.sanguineai.com</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-mono tracking-wide font-semibold text-slate-700">0x{donor.hexUserId}</div>
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">{donor.bloodGroup || donor.blood_group} • {donor.role || 'Bridge Donor'}</div>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Top Banner */}
        <div className="bg-[#E11D48] rounded-2xl p-6 text-white overflow-hidden relative shadow-lg shadow-rose-500/20">
          <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
            <HeartPulse className="w-64 h-64" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 tracking-tight">Your availability is {isAvailable ? 'ACTIVE' : 'PAUSED'}</h2>
              <p className="text-rose-100 text-sm max-w-xl leading-relaxed font-medium">
                You are currently mapped to the active outreach matrix. If an emergency matches your blood group and geographic sector, you will receive priority routing.
              </p>
            </div>
            <div className="shrink-0 bg-white/10 p-1.5 rounded-full border border-white/20 flex items-center shadow-inner cursor-pointer w-32" onClick={() => setIsAvailable(!isAvailable)}>
              <div className={`w-full flex items-center justify-between px-3 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${isAvailable ? 'bg-white text-[#E11D48] shadow-sm' : 'bg-transparent text-white'}`}>
                {isAvailable ? 'Active' : 'Pause'}
              </div>
            </div>
          </div>
        </div>

        {/* My Profile Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 tracking-tight">My Profile Profile</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
             <div>
               <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Full Name</div>
               <div className="font-bold text-slate-800">{donor.fullName || 'Anonymous Registered'}</div>
             </div>
             <div>
               <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Contact Status</div>
               <div className="font-bold text-slate-800 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {donor.contactNumber || 'Verified Active'}</div>
             </div>
             <div>
               <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Age Group</div>
               <div className="font-bold text-slate-800 border bg-slate-50 border-slate-100 px-2.5 py-1 rounded-md inline-block">{donor.age || 'Adult Donor'}</div>
             </div>
             <div>
               <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Blood Archetype</div>
               <div className="font-bold text-[#E11D48] flex items-center gap-1.5"><Droplets className="w-4 h-4" /> {donor.bloodGroup || donor.blood_group}</div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Bridge Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-1 md:col-span-2">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-emerald-500" /> Current Bridge Assignment
            </h3>
            {donor.bridge_status === 'TRUE' && donor.bridge_id ? (
              <div className="flex items-center gap-6 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xl border border-emerald-200 shrink-0">
                  PT
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-bold text-slate-800">Assigned to: {donor.bridge_id}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Active Bridge</span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium max-w-md">
                    You have securely consented to be matched with patient {donor.bridge_id}. They rely on lifelong transfusions.
                  </p>
                </div>
              </div>
            ) : (
               <div className="text-slate-500 text-sm p-4 rounded-xl border border-slate-100 bg-slate-50 font-medium">
                 No active bridge assignments currently locked. You will be pinged for emergencies.
               </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center p-6 lg:p-8">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#E11D48] flex items-center justify-center mb-4">
               <History className="w-6 h-6" />
            </div>
            <div className="text-5xl font-extrabold text-slate-900 tracking-tighter drop-shadow-sm">{donor.donations_till_date || 0}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Lifetime Donations</div>
            <div className="mt-4 pt-4 border-t border-slate-100 w-full text-sm text-slate-500 font-medium">
              Last saved a life: <span className="text-slate-700 font-bold">{donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Safety Bounds */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#E11D48]" /> Medical Safety Bounds
          </h3>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-full md:w-1/3">
              <div className="text-sm text-slate-500 font-medium mb-1">Next Eligible Date</div>
              <div className="text-2xl font-bold text-slate-800">{nextEligible.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div className="flex-1 w-full bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-4">
              <div className={`p-3 rounded-full shrink-0 ${isEligibleNow ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                 {isEligibleNow ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div className="text-sm text-slate-600 font-medium">
                {isEligibleNow 
                  ? "You have passed the required 90 day safety cooling block. You are clear for matching."
                  : "You are within the mandatory medical safe-recovery window. Disabling matches."}
              </div>
            </div>
          </div>
        </div>
        
      </main>
    </div>
  );
}
