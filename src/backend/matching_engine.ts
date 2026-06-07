import { dbManager } from './database';
import fs from 'fs';
import path from 'path';

export interface DonorRecord {
  user_id: string;
  role: string;
  role_status: boolean;
  blood_group: string;
  latitude: number;
  longitude: number;
  donations_till_date: number;
  last_contacted_date: Date;
  next_eligible_date: Date;
  fullName?: string;
  contactNumber?: string;
  age?: string;
}

export interface PatientRequest {
  id: string;
  timestamp: Date;
  fullName: string;
  bloodGroup: string;
  requiredUnits: number;
  urgency: 'Critical' | 'Urgent' | 'Routine';
  status: 'PENDING' | 'MATCHING' | 'DISPATCHED' | 'FOUND' | 'NOT_FOUND';
}

// Memory block for component 2 (The Failure Learning Loop)
export const NetworkStateOverrides: Record<string, { cooling_block_until: Date, penalty: number }> = {};

export async function getPendingRequests(): Promise<PatientRequest[]> {
  const reqs = await dbManager.getRequests();
  return reqs.map((r: any) => ({
    id: r.id,
    timestamp: new Date(r.timestamp),
    fullName: r.fullName,
    bloodGroup: r.bloodGroup,
    requiredUnits: r.requiredUnits,
    urgency: r.urgency,
    status: r.status
  }));
}

export async function addPendingRequest(req: any) {
  const newReq = {
    id: 'REQ-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    fullName: req.fullName || 'Anonymous Patient',
    bloodGroup: req.bloodGroup || 'O+',
    requiredUnits: req.requiredUnits || 1,
    urgency: req.urgency || 'Urgent',
    status: 'PENDING'
  };
  return await dbManager.addRequest(newReq);
}

export async function updateRequestStatus(id: string, newStatus: string) {
  await dbManager.updateRequestStatus(id, newStatus);
}

export async function deletePendingRequest(id: string) {
  await dbManager.deleteRequest(id);
}

export async function deleteDonorRecord(id: string) {
  await dbManager.deleteDonor(id);
}

export async function addDonorRecord(donor: any) {
  const ds = await dbManager.getDonors();
  const newId = donor.hexUserId ? donor.hexUserId : ('DONOR-' + Math.random().toString(36).substring(2, 9).toUpperCase());
  
  const existing = ds.find(d => d.user_id === newId || (donor.fullName && d.fullName === donor.fullName));
  if (existing) return;

  await dbManager.addDonor({
    user_id: newId,
    fullName: donor.fullName,
    bloodGroup: donor.bloodGroup,
    age: donor.age,
    contactNumber: donor.contactNumber,
    latitude: donor.latitude,
    longitude: donor.longitude
  });
}

export async function parseDataset(): Promise<DonorRecord[]> {
  const ds = await dbManager.getDonors();
  return ds.map((d: any) => ({
    user_id: d.user_id,
    role: d.role || 'Bridge Donor',
    role_status: d.role_status === true || d.role_status === 'true' || d.role_status === 'TRUE',
    blood_group: d.bloodGroup || d.blood_group || 'O+',
    latitude: parseFloat(d.latitude) || 40.71,
    longitude: parseFloat(d.longitude) || -74.01,
    donations_till_date: parseInt(d.donations_till_date) || 0,
    last_contacted_date: new Date(d.last_contacted_date || Date.now()),
    next_eligible_date: new Date(d.next_eligible_date || Date.now()),
    fullName: d.fullName,
    contactNumber: d.contactNumber,
    age: d.age
  }));
}

// 1. Geolocation Proximity Algorithm
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function matchDonors(hospitalLat: number, hospitalLon: number, requiredBloodGroup: string) {
  const allDonors = await parseDataset();
  const now = new Date();
  
  // Step 1: Strict Medical & Availability Filtering
  const eligibleDonors = allDonors.filter(d => {
    // Normalize blood group comparisons
    const dBg = (d.blood_group || '').replace(/\s+/g, '').toUpperCase();
    const reqBg = (requiredBloodGroup || '').replace(/\s+/g, '').toUpperCase();
    
    if (dBg !== reqBg && reqBg !== 'ANY') return false;
    
    // Feature: Failure Learning Loop Intervention
    const override = NetworkStateOverrides[d.user_id];
    if (override && override.cooling_block_until > now) {
      return false; // Safely blocked by the system due to recent timeouts
    }
    
    return true;
  });
  
  // Step 2: Optimal Deterministic Scoring (Out of 1.0)
  const scoredDonors = eligibleDonors.map(d => {
    const override = NetworkStateOverrides[d.user_id];
    const systemPenalty = override ? override.penalty : 0.0;
    
    // Proximity component (40%)
    const distanceKm = haversineDistance(hospitalLat, hospitalLon, d.latitude, d.longitude);
    const proximityScore = Math.max(1.0 - (distanceKm / 5000.0), 0.0); // Relaxed max distance (was 50km)
    
    // Reliability component (40%)
    const reliabilityScore = Math.min(d.donations_till_date / 10.0, 1.0); // Max score at 10+ donations
    
    // Fatigue & Burnout Prevention (20%)
    const daysSinceContact = (now.getTime() - d.last_contacted_date.getTime()) / (1000 * 3600 * 24);
    const fatigueScore = Math.min(Math.max(daysSinceContact, 0) / 90.0, 1.0); // Peak readiness if not contacted in 3 months
    
    let totalScore = (0.4 * proximityScore) + (0.4 * reliabilityScore) + (0.2 * fatigueScore);
    totalScore = Math.max(totalScore - systemPenalty, 0); // Enforce Failure Learning penalties
    
    return {
      user_id: d.user_id,
      fullName: d.fullName,
      contactNumber: d.contactNumber,
      distance_km: distanceKm.toFixed(2),
      score: totalScore.toFixed(3),
      metrics: { proximityScore, reliabilityScore, fatigueScore, systemPenalty }
    };
  });
  
  // Step 3: Ranking
  scoredDonors.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  return scoredDonors.slice(0, 5); // Return Top 5 subset
}

