import React, { useState } from 'react';
import { HeartPulse, User, ShieldCheck, Activity } from 'lucide-react';

export function AuthGate({ onLogin }: { onLogin: (tenant: string, payload: any) => void }) {
  const [tenant, setTenant] = useState<'donor' | 'patient' | 'admin'>('admin');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [requiredUnits, setRequiredUnits] = useState('1');
  const [adminRole, setAdminRole] = useState('System Admin');

  const adminRoles = ['System Admin', 'Hospital Coordinator', 'NGO Partner'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    // Create session payload
    const sessionPayload = {
      email,
      isSignUp,
      adminRole: tenant === 'admin' ? adminRole : undefined,
      fullName: isSignUp && tenant !== 'admin' ? fullName : '',
      contactNumber: isSignUp && tenant !== 'admin' ? contactNumber : '',
      age: isSignUp && tenant !== 'admin' ? age : '',
      bloodGroup: isSignUp && tenant !== 'admin' ? bloodGroup : '',
      requiredUnits: isSignUp && tenant !== 'admin' ? parseInt(requiredUnits) || 1 : 1,
      // Create a deterministic hex ID for display
      hexUserId: Array.from(email).map((c: string) => c.charCodeAt(0).toString(16)).join('').toUpperCase().substring(0, 12).padEnd(12, '0')
    };

    onLogin(tenant, sessionPayload);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-rose-500/30 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="bg-white px-6 py-8 text-center relative overflow-hidden border-b border-slate-100">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <HeartPulse className="w-32 h-32 text-rose-500" />
          </div>
          <HeartPulse className="w-12 h-12 text-[#E11D48] mx-auto mb-4 relative z-10" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 relative z-10">
            SANGUINE<span className="text-[#E11D48]">.AI</span>
          </h1>
          <p className="text-slate-500 font-mono text-[10px] tracking-widest uppercase mt-2 relative z-10">Platform Authentication</p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 tracking-wide">Select Portal Identity</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTenant('donor')}
                className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                  tenant === 'donor' 
                    ? 'bg-rose-50 border-rose-200 text-[#E11D48] shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <User className={`w-5 h-5 ${tenant === 'donor' ? 'text-[#E11D48]' : 'text-slate-400'}`} />
                Donor
              </button>
              <button
                type="button"
                onClick={() => setTenant('patient')}
                className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                  tenant === 'patient' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Activity className={`w-5 h-5 ${tenant === 'patient' ? 'text-blue-500' : 'text-slate-400'}`} />
                Patient
              </button>
              <button
                type="button"
                onClick={() => setTenant('admin')}
                className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                  tenant === 'admin' 
                    ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className={`w-5 h-5 ${tenant === 'admin' ? 'text-slate-900' : 'text-slate-400'}`} />
                Admin
              </button>
            </div>
          </div>

          {tenant !== 'admin' && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          <div className="space-y-4 max-h-[40vh] overflow-y-auto styled-scrollbar px-1 -mx-1">
            {isSignUp && tenant !== 'admin' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 tracking-wide">Full Name</label>
                  <input
                    type="text" required
                    value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 tracking-wide">Contact Number</label>
                    <input
                      type="text" required
                      value={contactNumber} onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 tracking-wide">Age</label>
                    <input
                      type="number" required min="18" max="100"
                      value={age} onChange={(e) => setAge(e.target.value)}
                      placeholder="25"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
                    />
                  </div>
                </div>
                <div className={`grid ${tenant === 'patient' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 tracking-wide">
                      {tenant === 'donor' ? 'Blood Group' : 'Blood Group Needed'}
                    </label>
                    <select
                      value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
                    >
                      {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  {tenant === 'patient' && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-slate-700 tracking-wide">Required Units</label>
                      <input
                        type="number" required min="1" max="10"
                        value={requiredUnits} onChange={(e) => setRequiredUnits(e.target.value)}
                        placeholder="1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {tenant === 'admin' && (
              <div className="space-y-1.5 mb-4">
                <label className="block text-sm font-semibold text-slate-700 tracking-wide">Administrator Role</label>
                <select
                  value={adminRole} onChange={(e) => setAdminRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
                >
                  {adminRoles.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 tracking-wide">Email Address</label>
              <input
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${tenant}.sanguineai.com`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 tracking-wide">Password</label>
              <input
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#E11D48] hover:bg-rose-700 active:bg-rose-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.23)] flex items-center justify-center gap-2"
          >
            {isSignUp && tenant !== 'admin' ? `Register ${tenant.charAt(0).toUpperCase() + tenant.slice(1)} Profile` : `${tenant.charAt(0).toUpperCase() + tenant.slice(1)} Log In`}
          </button>
        </form>
      </div>
    </div>
  );
}
