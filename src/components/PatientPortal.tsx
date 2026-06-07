import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { HeartPulse, Activity, AlertTriangle, Clock, CalendarClock, Droplets, ArrowRight, Loader2, Send, User as UserIcon, Phone, LogOut } from 'lucide-react';

export function PatientPortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [requestSent, setRequestSent] = useState(false);
  const [countdown, setCountdown] = useState('');
  
  const [reqBloodGroup, setReqBloodGroup] = useState('O-');
  const [reqQuantity, setReqQuantity] = useState(2);

  useEffect(() => {
    fetch('/api/v1/auth/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email, tenant: 'patient' })
    })
    .then(r => r.json())
    .then(data => {
       if (data.status === 'success') {
         // Merge API data with session payload
         const merged = { ...data.data, ...user, hexUserId: user?.hexUserId || data.data.hexUserId };
         setPatient(merged);
         setReqBloodGroup(merged.bloodGroup || merged.bridge_blood_group);
         setReqQuantity(parseInt(merged.requiredUnits) || parseInt(merged.quantity_required) || 2);
       }
       setIsLoading(false);
       
       if (user?.isSignUp) {
         fetch('/api/v1/requests', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             fullName: user.fullName || 'Anonymous Registered Patient',
             bloodGroup: user.bloodGroup || 'O+',
             requiredUnits: user.requiredUnits || 1,
             urgency: 'Routine'
           })
         }).catch(console.error);
       }
    })
    .catch(e => {
       console.error(e);
       setIsLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!patient) return;

    const target = new Date(patient.expected_next_transfusion_date || new Date().toISOString()).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setCountdown('OVERDUE');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown(`${days}d ${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [patient]);

  const handleEmergencyRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSent(true);
    
    fetch('/api/v1/requests', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         fullName: patient.fullName || patient.bridge_id || 'Patient',
         bloodGroup: reqBloodGroup,
         requiredUnits: reqQuantity,
         urgency: 'Critical' // Forced Critical from this panel
       })
    }).then(res => res.json()).then((json) => {
       setRequestSent(false);
       if (json.data && json.data.duplicate) {
         alert(`Duplicate request detected: ${json.data.message}`);
       } else {
         alert(`Request for ${reqQuantity} units of ${reqBloodGroup} submitted successfully.\nSanguine AI Command Center has initiated the live match engine.`);
       }
    }).catch(e => {
       console.error(e);
       setRequestSent(false);
    });
  };

  if (isLoading) {
     return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <Loader2 className="w-8 h-8 text-[#E11D48] animate-spin" />
       </div>
     );
  }

  if (!patient) {
     return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
         <div className="text-slate-500 font-medium">Authentication Failed. Record not found.</div>
         <button onClick={onLogout} className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-semibold text-slate-800">Return</button>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-slate-900 leading-tight">Patient Console</h1>
            <div className="text-[10px] font-mono tracking-widest text-[#E11D48] uppercase font-semibold">patient.sanguineai.com</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
            <div className="text-sm font-mono tracking-wide font-semibold text-slate-700">0x{patient.hexUserId}</div>
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Care Anchor: {patient.bridge_id || 'Pending'}</div>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
         {/* My Profile Profile Card */}
         <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
           <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
             <UserIcon className="w-5 h-5 text-slate-700" />
             <h3 className="font-bold text-slate-900 tracking-tight">Patient Profile Card</h3>
           </div>
           <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Full Name</div>
                <div className="font-bold text-slate-800">{patient.fullName || 'Anonymous Registered'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Contact Status</div>
                <div className="font-bold text-slate-800 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {patient.contactNumber || 'Verified Active'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Age Group</div>
                <div className="font-bold text-slate-800 border bg-slate-50 border-slate-100 px-2.5 py-1 rounded-md inline-block">{patient.age || 'Adult'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Requirement Matrix</div>
                <div className="font-bold text-[#E11D48] flex items-center gap-1.5"><Droplets className="w-4 h-4" /> {patient.bloodGroup || patient.bridge_blood_group} ({patient.requiredUnits || patient.quantity_required}<span className="text-xs ml-0.5">units</span>)</div>
              </div>
           </div>
         </div>

         {/* Live Countdown */}
         <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
               <CalendarClock className="w-96 h-96 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
               <div>
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/30">
                    <Clock className="w-3.5 h-3.5" /> Transfusion Countdown
                 </div>
                 <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Time until {patient.expected_next_transfusion_date ? new Date(patient.expected_next_transfusion_date).toLocaleDateString() : 'N/A'}</div>
                 <div className="text-5xl md:text-7xl font-bold font-mono text-white tracking-tighter drop-shadow-md">
                    {countdown || "00d 00h 00m"}
                 </div>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 w-full md:w-auto shrink-0 shadow-xl">
                  <div className="text-slate-300 font-medium text-sm mb-4">Required Parameters</div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-[#E11D48] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-inner border border-rose-400 shadow-rose-900/50">{patient.bloodGroup || patient.bridge_blood_group}</div>
                      <div className="text-xs font-mono text-slate-400 mt-2 uppercase tracking-wide">Type</div>
                    </div>
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-inner border border-slate-700">
                        {patient.requiredUnits || patient.quantity_required}<span className="text-sm ml-0.5">u</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-2 uppercase tracking-wide">Units</div>
                    </div>
                  </div>
               </div>
            </div>
         </div>

         {/* New Request Input Form */}
         <div className="bg-white border border-[#E11D48]/30 rounded-2xl p-8 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/50">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight flex items-center gap-2"><AlertTriangle className="text-[#E11D48] w-6 h-6" /> Submit Urgency Request</h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-lg font-medium">
                Submit a specific request to the AI matching engine to dispatch localized bridge donors.
              </p>
            </div>
            
            <form onSubmit={handleEmergencyRequest} className="flex flex-col md:flex-row items-end gap-6">
              <div className="w-full md:w-auto flex-1 space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 tracking-wide">Blood Group</label>
                <div className="relative">
                  <select
                    value={reqBloodGroup}
                    onChange={(e) => setReqBloodGroup(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans font-semibold cursor-pointer"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-32 space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 tracking-wide">Units</label>
                <input
                  type="number"
                  min="1" max="10"
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans font-semibold text-center"
                />
              </div>
              
              <button 
                 type="submit"
                 disabled={requestSent}
                 className={`w-full md:w-auto h-[50px] px-8 rounded-xl font-bold text-white transition-all shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.23)] text-sm flex items-center justify-center gap-2 active:scale-95 ${requestSent ? 'bg-slate-800 shadow-none' : 'bg-[#E11D48] hover:bg-rose-700'}`}
              >
                 {requestSent ? (
                   <span className="flex items-center gap-2 animate-pulse"><ArrowRight className="animate-spin w-4 h-4" /> Routing...</span>
                 ) : (
                   <>Submit Match Request <Send className="w-4 h-4" /></>
                 )}
              </button>
            </form>
         </div>

         {/* History */}
         <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
           <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
             <Droplets className="w-4 h-4 text-blue-500" /> Historical Intervals
           </h3>
           <div className="mt-4 flex flex-col gap-3">
             <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:border-slate-300 transition-colors">
                <div className="font-semibold text-slate-700">Last Transfusion: {patient.last_transfusion_date ? new Date(patient.last_transfusion_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</div>
                <div className="text-xs font-mono font-semibold text-slate-400 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">Most Recent</div>
             </div>
             <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:border-slate-300 transition-colors">
                <div className="font-semibold text-slate-700">Projected Needed: {patient.expected_next_transfusion_date ? new Date(patient.expected_next_transfusion_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</div>
                <div className="text-xs font-mono font-semibold text-slate-400 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">Upcoming Target</div>
             </div>
           </div>
         </div>
      </main>
    </div>
  );
}
