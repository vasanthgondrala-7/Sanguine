export interface Donor {
  user_id: string;
  bridge_id: string;
  role: 'Bridge Donor' | 'Emergency Donor' | 'Volunteer';
  role_status: boolean;
  bridge_status: boolean;
  blood_group: string;
  latitude: number;
  longitude: number;
  donations_till_date: number;
  last_contacted_date: string;
  last_donation_date: string;
  next_eligible_date: string;
}

export interface PatientRequest {
  bridge_id: string;
  bridge_gender: string;
  bridge_blood_group: string;
  quantity_required: number;
  last_transfusion_date: string;
  expected_next_transfusion_date: string;
}

export interface TelemetryEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

export interface OutreachState {
  id: string;
  patientId: string;
  donorId: string;
  status: 'Matching' | 'Outreach Sent' | 'Accepted' | 'Declined' | 'TIMEOUT';
  progress: number;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'admin' | 'donor';
  text: string;
  timestamp: Date;
  workflowId?: string;
}

export interface LearningProtocol {
  id: string;
  triggerEvent: string;
  adaptation: string;
  status: 'Learning' | 'Applied' | 'Review Required';
  timestamp: Date;
}
