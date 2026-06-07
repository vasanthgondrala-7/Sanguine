import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, ShieldAlert, HeartPulse, Zap, BrainCircuit, ShieldCheck, Database, FileKey, Send, Bot, User, RefreshCw, AlertTriangle, Search, LogOut, Download, CheckCircle2 } from 'lucide-react';
import { TelemetryEvent, ChatMessage } from '../types';

const DUMMY_NAMES: Record<string, string> = {
  'D-1144': 'Dev Patel',
  'D-3321': 'Sarah Jenkins',
  'D-9912': 'Arjun Mehta',
  'D-8821': 'Emily Chen',
  'D-4411': 'Michael Chang',
  'D-5522': 'Jessica Robinson',
};

function getDonorName(id: string) {
  return DUMMY_NAMES[id] || `Donor ${id}`;
}

type DispatchLog = { id: string; timestamp: Date; message: string; type: 'info' | 'dispatch' | 'error' };

export function AdminDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const adminRole = user?.adminRole || 'System Admin';
  const isNGO = adminRole === 'NGO Partner';
  const roleBadge = isNGO 
    ? '🤝 Blood Warriors NGO' : adminRole === 'Hospital Coordinator' 
    ? '🏥 Apollo Hospital' : '🛡️ System Admin';

  const canRunMatch = adminRole === 'System Admin' || adminRole === 'Hospital Coordinator';
  const canViewDonors = true;
  const canEditRequests = adminRole === 'System Admin' || adminRole === 'Hospital Coordinator';
  const canRegisterDonor = adminRole === 'System Admin' || adminRole === 'Hospital Coordinator';

  const [ngoForm, setNgoForm] = useState({ fullName: '', contactNumber: '', age: '', bloodGroup: 'O+' });

  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([
    { id: 'init', timestamp: new Date(), message: 'System initialized. Ready for automation dispatch.', type: 'info' }
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const [matchingResults, setMatchingResults] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [hasRunMatch, setHasRunMatch] = useState(false);
  const [eta, setEta] = useState('--');
  
  const [isMatchingActive, setIsMatchingActive] = useState(false);
  const [warningBanner, setWarningBanner] = useState('');
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allDonors, setAllDonors] = useState<any[]>([]);

  useEffect(() => {
    const fetchReqs = () => {
      fetch('/api/v1/requests')
        .then(r => r.json())
        .then(d => {
           if (d.status === 'success') setPendingRequests(d.data);
        }).catch(console.error);
    };
    
    const fetchDonors = () => {
      fetch('/api/v1/donors')
        .then(r => r.json())
        .then(d => {
           if (d.status === 'success') setAllDonors(d.data);
        }).catch(console.error);
    };

    fetchReqs();
    fetchDonors();
    const iv = setInterval(() => {
      fetchReqs();
      fetchDonors();
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
  const urgencies = ['Routine', 'Urgent', 'Critical'];
  const [selectedBg, setSelectedBg] = useState('B+');
  const [selectedUrgency, setSelectedUrgency] = useState('Urgent');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqForm, setReqForm] = useState({ fullName: '', bloodGroup: 'O+', requiredUnits: 1, urgency: 'Urgent' });
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [newDonorForm, setNewDonorForm] = useState({ fullName: '', bloodGroup: 'O+', age: '', contactNumber: '', coords: '' });

  const exportLogToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Message'];
    const rows = dispatchLogs.map(log => [
      log.timestamp.toISOString(),
      log.type.toUpperCase(),
      `"${log.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `compliance_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runLiveMatch = async (overrideBg?: string, overrideUrgency?: string, requestId?: string) => {
     setIsMatching(true);
     setIsMatchingActive(true);
     setMatchingResults([]);
     setHasRunMatch(true);
     setEta('Calculating...');
     
     const matchBg = typeof overrideBg === 'object' ? 'O+' : overrideBg || selectedBg;
     const matchUrgency = typeof overrideUrgency === 'object' ? 'Urgent' : overrideUrgency || selectedUrgency;
     
     setSelectedBg(matchBg);
     setSelectedUrgency(matchUrgency);
     
     const reqText = `Urgency: ${matchUrgency}, Blood Group: ${matchBg}`;
     
     setDispatchLogs(prev => [...prev, {
       id: Math.random().toString(36),
       message: `Running matching engine for ${matchBg} (${matchUrgency})...`,
       type: 'info',
       timestamp: new Date()
     }]);

     try {
       const start = Date.now();
       const res = await fetch('/api/v1/requests/match', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           raw_request_text: reqText,
           blood_group: matchBg,
           urgency: matchUrgency
         })
       });
       const json = await res.json();
       const elapsed = ((Date.now() - start) / 1000).toFixed(1);

       if (json.status === 'success') {
          setMatchingResults(json.data.optimal_donors_ranked);
          setEta(`${elapsed}s`);
          
          const totalDispatches = json.data.optimal_donors_ranked.length;

          if (totalDispatches > 0) {
            setDispatchLogs(prev => [...prev, {
              id: Math.random().toString(36),
              message: `Found ${json.data.optimal_donors_ranked.length} optimal eligible donors for ${matchBg}. Dispatching automated outreach...`,
              type: 'info',
              timestamp: new Date()
            }]);
          } else {
            setDispatchLogs(prev => [...prev, {
              id: Math.random().toString(36),
              message: `Found 0 eligible donors for ${matchBg}. Broadcasting network search message to all active nodes.`,
              type: 'error',
              timestamp: new Date()
            }]);
          }

          let dispatchedMessage = '';
          if (matchUrgency === 'Critical') {
            dispatchedMessage = "[SANGUINE AICC ALERT]: CRITICAL EMERGENCY. A Thalassemia patient nearby urgently requires blood units. Please mobilize immediately.";
          } else if (matchUrgency === 'Urgent') {
            dispatchedMessage = "[SANGUINE AICC ALERT]: URGENT request. A matched patient is scheduled for a transfusion loop. Confirm your availability.";
          } else {
            dispatchedMessage = "[SANGUINE AICC ALERT]: Routine check. You are a safe match for an upcoming scheduled transfusion cycle.";
          }

          json.data.optimal_donors_ranked.forEach((donor: any, i: number) => {
            setTimeout(() => {
              setDispatchLogs(prev => [...prev, {
                id: Math.random().toString(36),
                message: `Sent to ${donor.fullName || getDonorName(donor.user_id)}:\n${dispatchedMessage}`,
                type: 'dispatch',
                timestamp: new Date()
              }]);
              
              setTelemetry(prev => [{
                id: Math.random().toString(36),
                timestamp: new Date(),
                message: `Sent automated payload to ${donor.user_id}`,
                type: 'success'
              }, ...prev].slice(0, 50));
            }, 800 * (i + 1));
          });
          
          setTimeout(() => {
            if (requestId) {
              const newStatus = totalDispatches > 0 ? '✓ Donor Found' : '❌ Donor Not Found & Searching for Donor';
              fetch('/api/v1/requests/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: requestId, status: newStatus })
              }).then(() => {
                setPendingRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
              }).catch(console.error);
            }
            setIsMatchingActive(false);
          }, 800 * (totalDispatches || 1) + 100);
       }
     } catch(e) {
        console.error(e);
     } finally {
       setIsMatching(false);
     }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispatchLogs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl relative">
              <HeartPulse className="w-8 h-8 text-[#E11D48]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-1.0">
                SANGUINE<span className="text-[#E11D48]">.AI</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono tracking-widest text-[#E11D48] font-bold">
                  admin.sanguineai.com
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] tracking-wide text-slate-700 font-bold ml-2">
                  {roleBadge}
                </span>
              </h1>
              <p className="text-slate-500 font-medium text-sm tracking-wide mt-1">Administration Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-emerald-700 text-xs font-semibold tracking-wide uppercase">System Nominal</span>
            </div>
             <button onClick={onLogout} className="p-2 border border-slate-200 bg-white text-slate-400 hover:text-[#E11D48] hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Interface Grid */}
        {!isNGO ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT: Live Donor Matching Engine (Targeted Match to Screenshot) */}
            <div className="lg:col-span-8 flex flex-col gap-6">

            {/* URGENT PATIENT REQUEST DESK */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex border-b border-slate-100 px-6 py-4 items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#E11D48] animate-pulse" />
                  <h2 className="font-semibold text-slate-900 text-[15px]">Urgent Patient Request Desk</h2>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {warningBanner && (
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs bg-rose-100 text-[#E11D48] px-2.5 py-1 rounded-md font-semibold border border-rose-200">
                        {warningBanner}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={() => {
                      if (!canEditRequests) {
                        setWarningBanner("Unauthorized Role");
                        setTimeout(() => setWarningBanner(''), 3000);
                        return;
                      }
                      setShowRequestModal(true);
                    }}
                    className="text-[11px] font-bold tracking-wider text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors uppercase cursor-pointer"
                  >
                    + Create Request
                  </button>
                  <div className="text-[11px] font-mono text-slate-500 font-medium tracking-wide uppercase px-2 py-1 bg-slate-50 border border-slate-100 rounded">Live Dispatch Feed</div>
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#fafafa] border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Patient Name</th>
                      <th className="px-6 py-3 font-semibold">Blood Group</th>
                      <th className="px-6 py-3 font-semibold">Units Needed</th>
                      <th className="px-6 py-3 font-semibold">Urgency Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Action Trigger</th>
                      {canEditRequests && <th className="px-6 py-3 font-semibold text-right">Edit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={canEditRequests ? 6 : 5} className="px-6 py-8 text-center text-slate-400 font-medium bg-slate-50/50">Listening for incoming hospital directives...</td>
                      </tr>
                    ) : pendingRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-slate-900 truncate max-w-[120px]">{req.fullName}</td>
                        <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded font-mono font-bold text-xs">{req.bloodGroup}</span></td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-600">{req.requiredUnits}u</td>
                        <td className="px-6 py-4">
                          {req.status === '✓ Donor Found' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" /> ✓ Donor Found
                            </span>
                          ) : req.status === '❌ Donor Not Found & Searching for Donor' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max animate-pulse">
                               ❌ Donor Not Found & Searching for Donor
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.urgency === 'Critical' ? 'bg-rose-50 text-[#E11D48] border border-rose-200' : req.urgency === 'Urgent' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                              {req.urgency}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                           {!canRunMatch ? (
                             <span className="text-xs text-slate-400 font-medium">Restricted</span>
                           ) : req.status === '✓ Donor Found' || req.status === '❌ Donor Not Found & Searching for Donor' ? (
                             <button disabled className="items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg cursor-not-allowed font-bold text-xs inline-flex focus:outline-none">
                                Run AI Match <Zap className="w-3.5 h-3.5" />
                             </button>
                           ) : (
                             <button disabled={isMatchingActive} onClick={() => runLiveMatch(req.bloodGroup, req.urgency, req.id)} className={`items-center gap-1.5 px-3 py-1.5 border rounded-lg font-bold transition-all shadow-sm text-xs inline-flex focus:outline-none ${isMatchingActive ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white text-[#E11D48] border-rose-200 hover:bg-[#E11D48] hover:text-white cursor-pointer active:scale-95'}`}>
                                Run AI Match <Zap className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </td>
                        {canEditRequests && (
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={async () => {
                                await fetch('/api/v1/requests/delete', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: req.id })
                                });
                                setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <span className="sr-only">Delete</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              {/* Widget Header */}
              <div className="flex border-b border-slate-100 px-6 py-4 items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse ring-4 ring-rose-50"></div>
                  <h2 className="font-semibold text-slate-900 text-[15px]">Live Donor Matching Engine</h2>
                </div>
                <div className="text-xs font-mono text-slate-500 tracking-wide">
                  v1.0 · SageMaker
                </div>
              </div>
              
               {/* Widget Body */}
              <div className="flex flex-col md:flex-row">
                
                {/* Left Controls */}
                <div className="p-6 w-full md:w-[45%] border-r border-slate-100 flex flex-col gap-6 bg-white shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-10 scale-100">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase mb-3">Blood Group Needed</div>
                    <div className="grid grid-cols-4 gap-2.5">
                      {bloodGroups.map(bg => (
                         <button 
                           key={bg}
                           onClick={() => setSelectedBg(bg)}
                           disabled={isMatchingActive}
                           className={`py-2 text-[13px] font-semibold rounded-xl border transition-all ${selectedBg === bg ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/20 scale-[1.02]' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'} ${isMatchingActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                         >
                           {bg}
                         </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase mb-3">Urgency</div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {urgencies.map(u => (
                         <button 
                           key={u}
                           onClick={() => setSelectedUrgency(u)}
                           disabled={isMatchingActive}
                           className={`py-2 text-[13px] font-semibold rounded-xl border transition-all ${selectedUrgency === u ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'} ${isMatchingActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                         >
                           {u}
                         </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 mt-2">
                    <div className="text-sm font-semibold text-slate-900 mb-2">Scoring weights</div>
                    <div className="text-[13px] text-slate-500 leading-relaxed font-medium">
                      Eligibility 30% · History 25% · Frequency 20% · Distance 15% · Response 10%
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <button 
                      onClick={() => runLiveMatch(selectedBg, selectedUrgency)}
                      disabled={isMatchingActive || !canRunMatch}
                      className={`w-full font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] 
                        ${isMatchingActive || !canRunMatch
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                          : 'bg-[#E11D48] hover:bg-rose-700 active:bg-rose-800 text-white hover:shadow-[0_6px_20px_rgba(225,29,72,0.23)] hover:-translate-y-0.5 active:translate-y-0'}`}
                    >
                      {!canRunMatch ? 'Action Restricted' : isMatchingActive ? 'Engine Locked' : 'Run AI match'}
                    </button>
                  </div>
                </div>
                
                {/* Right Results */}
                <div className="p-6 w-full md:w-[55%] bg-[#fafafa]">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <div className="font-semibold text-slate-900 text-[15px]">Ranked donors</div>
                      <div className="text-[13px] text-slate-500 mt-0.5 font-medium">Sorted by AI reliability score</div>
                    </div>
                    {matchingResults.length > 0 && (
                      <div className="text-[11px] font-mono text-slate-500 flex gap-2 tracking-wide">
                        <span>{matchingResults.length} candidates</span>
                        <span>·</span>
                        <span>ETA {eta}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 relative min-h-[340px]">
                    {isMatching ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                          <BrainCircuit className="w-8 h-8 text-rose-500 animate-pulse" />
                          <div className="text-sm font-semibold text-slate-500 animate-pulse">Running Haversine algorithms...</div>
                        </div>
                      </div>
                    ) : matchingResults.length > 0 ? (
                       matchingResults.map((donor, idx) => {
                         const scorePct = Math.min(parseFloat(donor.score) * 100, 100);
                         const lastDaysAgo = Math.floor(donor.metrics.fatigueScore * 90);

                         return (
                           <motion.div 
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: idx * 0.1 }}
                             key={donor.user_id} 
                             className="bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-2xl p-5 flex items-center gap-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden group"
                           >
                             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-inner z-10">
                               {idx + 1}
                             </div>
                             <div className="flex-1 min-w-0 pr-2 z-10">
                               <div className="font-semibold text-slate-900 text-[15px] truncate tracking-tight">{donor.fullName || getDonorName(donor.user_id)}</div>
                               <div className="text-[13px] text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                 <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{selectedBg}</span>
                                 <span className="text-slate-300">·</span>
                                 <span>{donor.distance_km} km</span>
                                 <span className="text-slate-300">·</span>
                                 <span>{Math.floor(donor.metrics.reliabilityScore * 10)} donations</span>
                                 <span className="text-slate-300">·</span>
                                 <span>last {Math.max(lastDaysAgo, 2)} days ago</span>
                               </div>
                               
                               <div className="mt-4 h-1.5 w-[85%] bg-slate-100 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${scorePct}%` }}
                                   transition={{ duration: 1, ease: 'easeOut' }}
                                   className="h-full bg-[#E11D48] rounded-full" 
                                 />
                               </div>
                             </div>
                             
                             <div className="text-right shrink-0 flex flex-col items-center z-10 mr-1">
                               <div className="text-2xl font-bold text-slate-900">{scorePct.toFixed(0)}%</div>
                               <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1">Match</div>
                             </div>
                             
                             {/* Pulsing Status Badge */}
                             <div className="absolute bottom-4 right-4 z-10">
                               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#E11D48] text-[10px] font-semibold animate-pulse shadow-sm">
                                 <Zap className="w-3 h-3" />
                                 Message Dispatched via Automation Layer
                               </div>
                             </div>

                             {/* Subtle hover gradient */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent to-rose-50/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                           </motion.div>
                         )
                       })
                    ) : hasRunMatch ? (
                      <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/50">
                        <div className="text-center">
                          <AlertTriangle className="w-8 h-8 text-[#E11D48] mx-auto mb-3" />
                          <div className="text-sm font-bold text-slate-900">0 eligible donors found</div>
                          <div className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">No matching donors are currently active or medically eligible for {selectedBg}.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-[#fafafa]/50">
                        <div className="text-center">
                          <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                          <div className="text-sm font-medium text-slate-500">Configure parameters on the left</div>
                          <div className="text-xs text-slate-400 mt-1">and click Run AI match to generate list</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: Automated Outreach Status Logger */}
          <div className="lg:col-span-4 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[800px]">
            <div className="flex justify-between items-center border-b border-slate-200 px-5 py-4 bg-slate-50 text-slate-900">
              <div>
                <h2 className="font-bold flex items-center gap-2 mb-0.5 tracking-tight text-[15px]">
                  <Send className="w-5 h-5 text-slate-900" /> Automated Outreach Status
                </h2>
                <div className="text-[11px] text-slate-500 font-medium">Real-time Dispatch Logs</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportLogToCSV}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-300 flex items-center gap-1.5"
                  title="Export Compliance Log"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Export</span>
                </button>
                <div className="h-2.5 w-2.5 rounded-full bg-[#E11D48] animate-pulse"></div>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 styled-scrollbar bg-slate-50/50">
              {dispatchLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <div className={`p-4 rounded-xl text-[13px] shadow-sm leading-relaxed border w-full ${
                    log.type === 'dispatch' 
                      ? 'bg-white border-rose-200 text-slate-800' 
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <div className="whitespace-pre-wrap font-medium">{log.message}</div>
                    <div className="text-[10px] font-mono mt-3 flex items-center gap-1.5 text-slate-400">
                       <Clock className="w-3 h-3" />
                       {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-6">
            <div className="flex border-b border-slate-100 px-6 py-4 items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                 <User className="w-5 h-5 text-emerald-600" />
                 <h2 className="font-semibold text-slate-900 text-[15px]">NGO Donor Enrollment Desk</h2>
               </div>
            </div>
            <div className="p-6">
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 await fetch('/api/v1/auth/register-donor', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({...ngoForm, isSignUp: true, hexUserId: 'DONOR-' + Math.random().toString(36).substring(2, 9).toUpperCase()})
                 });
                 setNgoForm({ fullName: '', contactNumber: '', age: '', bloodGroup: 'O+' });
                 
                 // Immediately re-fetch donors
                 fetch('/api/v1/donors').then(r => r.json()).then(d => {
                   if (d.status === 'success') setAllDonors(d.data);
                 });
               }} className="space-y-4 max-w-2xl">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Full Name</label>
                     <input type="text" required value={ngoForm.fullName} onChange={e => setNgoForm({...ngoForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Contact Number</label>
                     <input type="tel" required value={ngoForm.contactNumber} onChange={e => setNgoForm({...ngoForm, contactNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Age</label>
                     <input type="number" required min="18" max="65" value={ngoForm.age} onChange={e => setNgoForm({...ngoForm, age: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Blood Group</label>
                     <select value={ngoForm.bloodGroup} onChange={e => setNgoForm({...ngoForm, bloodGroup: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans">
                       {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                     </select>
                   </div>
                 </div>
                 <button type="submit" className="mt-4 px-6 py-3 bg-[#E11D48] hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
                     <User className="w-4 h-4" /> + REGISTER NEW DONOR
                 </button>
               </form>
            </div>
          </div>
        )}
        
        {/* ALL REGISTERED DONORS LIST */}
        {canViewDonors && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col mt-6">
            <div className="flex border-b border-slate-100 px-6 py-4 items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-slate-800" />
                <h2 className="font-semibold text-slate-900 text-[15px]">All Registered Donors Registry</h2>
              </div>
              <div className="flex items-center gap-3">
                {canRegisterDonor && (
                  <button 
                    onClick={() => setShowDonorModal(true)}
                    className="text-[11px] font-bold tracking-wider text-white bg-[#E11D48] hover:bg-rose-700 px-3 py-1.5 rounded transition-colors uppercase cursor-pointer"
                  >
                    + Register New Donor
                  </button>
                )}
                <div className="text-[11px] font-mono text-slate-500 font-medium tracking-wide uppercase px-2 py-1 bg-slate-50 border border-slate-100 rounded">Live Global Pool</div>
              </div>
            </div>
            <div className="p-0 overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-[13px] relative">
                <thead className="bg-[#fafafa] border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Donor ID</th>
                    <th className="px-6 py-3 font-semibold">Full Name</th>
                    <th className="px-6 py-3 font-semibold">Blood Group</th>
                    <th className="px-6 py-3 font-semibold">Age</th>
                    <th className="px-6 py-3 font-semibold">Proximity Coordinates</th>
                    <th className="px-6 py-3 font-semibold text-right">Status Badge</th>
                    {adminRole === 'System Admin' && <th className="px-6 py-3 font-semibold text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {allDonors.map((d, index) => {
                    const isActive = d.role_status === true || d.role_status === 'TRUE';
                    return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{d.user_id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{d.fullName || getDonorName(d.user_id)}</td>
                      <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded font-mono font-bold text-xs">{d.blood_group}</span></td>
                      <td className="px-6 py-4 text-slate-500">{d.age || '—'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">[{parseFloat(d.latitude || 0).toFixed(4)}, {parseFloat(d.longitude || 0).toFixed(4)}]</td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                           {isActive ? 'Active' : 'On Cooldown'}
                         </span>
                      </td>
                      {adminRole === 'System Admin' && (
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                              await fetch('/api/v1/donors/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: d.user_id })
                              });
                              setAllDonors(prev => prev.filter(donor => donor.user_id !== d.user_id));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <span className="sr-only">Delete</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#E11D48]" /> Create Patient Request
                </h2>
                <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <form onSubmit={async (e) => {
                 e.preventDefault();
                 const res = await fetch('/api/v1/requests', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(reqForm)
                 });
                 const json = await res.json();
                 if (json.status === 'success') {
                    if (json.data && json.data.duplicate) {
                       setDispatchLogs(prev => [[new Date().toLocaleTimeString(), 'SYSTEM', json.data.message], ...prev]);
                    } else if (json.data && json.data.success) {
                       setPendingRequests(prev => [json.data.data, ...prev]);
                    } else {
                       setPendingRequests(prev => [json.data, ...prev]);
                    }
                 }
                 setShowRequestModal(false);
                 setReqForm({ fullName: '', bloodGroup: 'O+', requiredUnits: 1, urgency: 'Urgent' });
              }} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Patient Name</label>
                   <input type="text" required value={reqForm.fullName} onChange={e => setReqForm({...reqForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Blood Group Needed</label>
                     <select value={reqForm.bloodGroup} onChange={e => setReqForm({...reqForm, bloodGroup: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans">
                       {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Units Needed</label>
                     <input type="number" required min="1" max="20" value={reqForm.requiredUnits} onChange={e => setReqForm({...reqForm, requiredUnits: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Urgency Status</label>
                   <select value={reqForm.urgency} onChange={e => setReqForm({...reqForm, urgency: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans">
                     {urgencies.map(u => <option key={u} value={u}>{u}</option>)}
                   </select>
                 </div>
                 <div className="pt-2">
                   <button type="submit" className="w-full px-6 py-3 bg-[#E11D48] hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm">
                     Save Request
                   </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showDonorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E11D48]" /> Register New Donor
                </h2>
                <button onClick={() => setShowDonorModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <form onSubmit={async (e) => {
                 e.preventDefault();

                 let lat = null, lng = null;
                 if (newDonorForm.coords.includes(',')) {
                   const parts = newDonorForm.coords.split(',');
                   lat = parseFloat(parts[0].trim());
                   lng = parseFloat(parts[1].trim());
                 }

                 await fetch('/api/v1/auth/register-donor', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     ...newDonorForm,
                     latitude: lat,
                     longitude: lng,
                     isSignUp: true, 
                     hexUserId: 'D-' + Math.random().toString(36).substring(2, 6).toUpperCase()
                   })
                 });
                 setShowDonorModal(false);
                 setNewDonorForm({ fullName: '', bloodGroup: 'O+', age: '', contactNumber: '', coords: '' });
                 
                 fetch('/api/v1/donors')
                   .then(r => r.json())
                   .then(d => {
                      if (d.status === 'success') setAllDonors(d.data);
                   }).catch(console.error);
              }} className="p-6 space-y-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Full Name</label>
                   <input type="text" required value={newDonorForm.fullName} onChange={e => setNewDonorForm({...newDonorForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Blood Group</label>
                     <select value={newDonorForm.bloodGroup} onChange={e => setNewDonorForm({...newDonorForm, bloodGroup: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans">
                       {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Age</label>
                     <input type="number" required min="18" max="65" value={newDonorForm.age} onChange={e => setNewDonorForm({...newDonorForm, age: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Contact Number</label>
                   <input type="tel" required value={newDonorForm.contactNumber} onChange={e => setNewDonorForm({...newDonorForm, contactNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 tracking-wide mb-1.5">Coordinates (Lat, Lng) or Location</label>
                   <input type="text" placeholder="e.g. 40.7128, -74.0060" value={newDonorForm.coords} onChange={e => setNewDonorForm({...newDonorForm, coords: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans" />
                 </div>
                 <div className="pt-2">
                   <button type="submit" className="w-full px-6 py-3 bg-[#E11D48] hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm">
                     Save Donor
                   </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
