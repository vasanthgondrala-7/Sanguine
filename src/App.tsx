/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthGate } from './components/AuthGate';
import { AdminDashboard } from './components/Dashboard';
import { DonorPortal } from './components/DonorPortal';
import { PatientPortal } from './components/PatientPortal';

export default function App() {
  const [tenant, setTenant] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  if (!tenant || !user) {
    return <AuthGate onLogin={(t, u) => { setTenant(t); setUser(u); }} />;
  }

  if (tenant === 'admin') return <AdminDashboard user={user} onLogout={() => { setTenant(null); setUser(null); }} />;
  if (tenant === 'donor') return <DonorPortal user={user} onLogout={() => { setTenant(null); setUser(null); }} />;
  if (tenant === 'patient') return <PatientPortal user={user} onLogout={() => { setTenant(null); setUser(null); }} />;

  return null;
}

