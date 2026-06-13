export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  bloodGroup: string;
  medicalConditions: string;
  emergencyNotes: string;
  homeAddress?: string;
  triggerMessage: string;
  contactsShared: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isQuickDial: boolean;
  order: number;
}

export interface AlertHistory {
  id: string;
  timestamp: any; // Firestore Timestamp or stringISO
  locationAddress: string;
  lat: number;
  lng: number;
  status: 'active' | 'resolved' | 'cancelled';
  notes?: string;
  audioRecordingUrl?: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'pharmacy' | 'safe_house';
  address: string;
  phone?: string;
  distance: string; // e.g. "0.4 km"
  lat: number;
  lng: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface JourneyCheckIn {
  id: string;
  durationMinutes: number;
  status: 'active' | 'safe' | 'expired_triggered';
  startedAt: string;
  expiresAt: string;
  checkedInAt?: string;
}

export interface EvidenceVaultItem {
  id: string;
  name: string;
  type: 'photo' | 'audio' | 'note';
  contentUrl?: string; // URL or base64 data
  noteText?: string;
  timestamp: string;
  fileSize?: string;
  sha256?: string;
}
