import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebasePlaceholder, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, EmergencyContact, AlertHistory, ChatMessage, JourneyCheckIn, EvidenceVaultItem } from '../types';

// Helper to generate a unique random ID
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export const dbService = {
  // ==========================================
  // USER PROFILE SERVICES
  // ==========================================
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (isFirebasePlaceholder || !userId) {
      const local = localStorage.getItem(`safeher_profile_${userId || 'guest'}`);
      if (local) return JSON.parse(local);
      return {
        name: 'Jane Doe',
        phone: '+1 (555) 019-2834',
        email: 'jane.doe@example.com',
        bloodGroup: 'O+',
        medicalConditions: 'Asthma',
        emergencyNotes: 'Carries inhaler in purse. Sensitive to penicillin.',
        triggerMessage: 'Emergency! I need immediate help. Here is my live location: ',
        contactsShared: false
      };
    }

    const path = `users/${userId}`;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
    if (isFirebasePlaceholder || !userId) {
      localStorage.setItem(`safeher_profile_${userId || 'guest'}`, JSON.stringify(profile));
      return;
    }

    const path = `users/${userId}`;
    try {
      await setDoc(doc(db, 'users', userId), {
        ...profile,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // ==========================================
  // EMERGENCY CONTACTS SERVICES
  // ==========================================
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    if (isFirebasePlaceholder || !userId) {
      const local = localStorage.getItem(`safeher_contacts_${userId || 'guest'}`);
      if (local) return JSON.parse(local);
      const defaultContacts: EmergencyContact[] = [
        { id: '1', name: 'Sheriff Department', phone: '911', relationship: 'Emergency Services', isQuickDial: true, order: 1 },
        { id: '2', name: 'Sarah (Sister)', phone: '+1 (555) 014-9988', relationship: 'Sister', isQuickDial: true, order: 2 },
        { id: '3', name: 'Marcus (Partner)', phone: '+1 (555) 015-7722', relationship: 'Partner', isQuickDial: false, order: 3 }
      ];
      localStorage.setItem(`safeher_contacts_${userId || 'guest'}`, JSON.stringify(defaultContacts));
      return defaultContacts;
    }

    const path = `users/${userId}/contacts`;
    try {
      const contactsSnap = await getDocs(query(collection(db, 'users', userId, 'contacts'), orderBy('order', 'asc')));
      return contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyContact));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addEmergencyContact(userId: string, contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
    const id = generateId();
    const newContact: EmergencyContact = { ...contact, id };

    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEmergencyContacts(userId);
      list.push(newContact);
      localStorage.setItem(`safeher_contacts_${userId || 'guest'}`, JSON.stringify(list));
      return newContact;
    }

    const path = `users/${userId}/contacts/${id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'contacts', id), {
        ...contact,
        createdAt: Timestamp.now()
      });
      return newContact;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return newContact;
    }
  },

  async updateEmergencyContact(userId: string, contactId: string, contact: Partial<EmergencyContact>): Promise<void> {
    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEmergencyContacts(userId);
      const index = list.findIndex(c => c.id === contactId);
      if (index !== -1) {
        list[index] = { ...list[index], ...contact };
        localStorage.setItem(`safeher_contacts_${userId || 'guest'}`, JSON.stringify(list));
      }
      return;
    }

    const path = `users/${userId}/contacts/${contactId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'contacts', contactId), {
        ...contact,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteEmergencyContact(userId: string, contactId: string): Promise<void> {
    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEmergencyContacts(userId);
      const filtered = list.filter(c => c.id !== contactId);
      localStorage.setItem(`safeher_contacts_${userId || 'guest'}`, JSON.stringify(filtered));
      return;
    }

    const path = `users/${userId}/contacts/${contactId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ==========================================
  // EMERGENCY HISTORY (SOS ALERTS) SERVICES
  // ==========================================
  async getEmergencyHistory(userId: string): Promise<AlertHistory[]> {
    if (isFirebasePlaceholder || !userId) {
      const local = localStorage.getItem(`safeher_history_${userId || 'guest'}`);
      if (local) {
        return JSON.parse(local);
      }
      const defaultHistory: AlertHistory[] = [
        {
          id: 'h1',
          timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          locationAddress: 'Pine Street Alley Way (Simulated Close Call)',
          lat: 37.774929,
          lng: -122.419416,
          status: 'resolved',
          notes: 'AI Safety Assistant provided active bypass directions. Contacts Sarah and Sheriff alerted.'
        },
        {
          id: 'h2',
          timestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          locationAddress: 'Transit Underground Level B',
          lat: 37.789172,
          lng: -122.401447,
          status: 'resolved',
          notes: 'Siren triggered. Intruder retreated instantly.'
        }
      ];
      localStorage.setItem(`safeher_history_${userId || 'guest'}`, JSON.stringify(defaultHistory));
      return defaultHistory;
    }

    const path = `users/${userId}/history`;
    try {
      const historySnap = await getDocs(query(collection(db, 'users', userId, 'history'), orderBy('timestamp', 'desc')));
      return historySnap.docs.map(doc => {
        const data = doc.data();
        let timestampStr = '';
        if (data.timestamp instanceof Timestamp) {
          timestampStr = data.timestamp.toDate().toISOString();
        } else if (data.timestamp?.seconds) {
          timestampStr = new Timestamp(data.timestamp.seconds, data.timestamp.nanoseconds).toDate().toISOString();
        } else {
          timestampStr = data.timestamp || new Date().toISOString();
        }
        return {
          id: doc.id,
          ...data,
          timestamp: timestampStr
        } as AlertHistory;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addEmergencyAlert(userId: string, alert: Omit<AlertHistory, 'id'>): Promise<AlertHistory> {
    const id = generateId();
    const newAlert: AlertHistory = { 
      ...alert, 
      id,
      timestamp: typeof alert.timestamp === 'string' ? alert.timestamp : new Date().toISOString()
    };

    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEmergencyHistory(userId);
      list.unshift(newAlert);
      localStorage.setItem(`safeher_history_${userId || 'guest'}`, JSON.stringify(list));
      return newAlert;
    }

    const path = `users/${userId}/history/${id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'history', id), {
        ...alert,
        timestamp: Timestamp.now()
      });
      return newAlert;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return newAlert;
    }
  },

  async updateEmergencyAlert(userId: string, alertId: string, updates: Partial<AlertHistory>): Promise<void> {
    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEmergencyHistory(userId);
      const index = list.findIndex(h => h.id === alertId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        localStorage.setItem(`safeher_history_${userId || 'guest'}`, JSON.stringify(list));
      }
      return;
    }

    const path = `users/${userId}/history/${alertId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'history', alertId), {
        ...updates
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // ==========================================
  // AI CHAT DIRECTORY SERVICES
  // ==========================================
  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    if (isFirebasePlaceholder || !userId) {
      const local = localStorage.getItem(`safeher_chats_${userId || 'guest'}`);
      if (local) return JSON.parse(local);
      const defaultChat: ChatMessage[] = [
        {
          id: 'chat_init',
          role: 'model',
          text: "Hello! I am your AI Safety Assistant. I am here to help keep you safe. You can ask me: \n- 'I feel like I am being followed, what are my immediate options?'\n- 'Analyze my current locations and list nearby safe zones.'\n- 'Roleplay an interactive emergency simulation with me.'\n\nHow can I help you right now?",
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem(`safeher_chats_${userId || 'guest'}`, JSON.stringify(defaultChat));
      return defaultChat;
    }

    const path = `users/${userId}/chat`;
    try {
      const chatSnap = await getDocs(query(collection(db, 'users', userId, 'chat'), orderBy('timestamp', 'asc')));
      return chatSnap.docs.map(doc => {
        const data = doc.data();
        let timestampStr = '';
        if (data.timestamp instanceof Timestamp) {
          timestampStr = data.timestamp.toDate().toISOString();
        } else {
          timestampStr = data.timestamp || new Date().toISOString();
        }
        return {
          id: doc.id,
          role: data.role,
          text: data.text,
          timestamp: timestampStr
        } as ChatMessage;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addChatMessage(userId: string, chatMsg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const id = generateId();
    const newMsg: ChatMessage = {
      ...chatMsg,
      id,
      timestamp: new Date().toISOString()
    };

    if (isFirebasePlaceholder || !userId) {
      const list = await this.getChatHistory(userId);
      list.push(newMsg);
      localStorage.setItem(`safeher_chats_${userId || 'guest'}`, JSON.stringify(list));
      return newMsg;
    }

    const path = `users/${userId}/chat/${id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'chat', id), {
        role: chatMsg.role,
        text: chatMsg.text,
        timestamp: Timestamp.now()
      });
      return newMsg;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return newMsg;
    }
  },

  // ==========================================
  // JOURNEY SAFETY CHECK-INS SERVICES
  // ==========================================
  async getJourneyCheckIns(userId: string): Promise<JourneyCheckIn[]> {
    if (isFirebasePlaceholder || !userId) {
      const local = localStorage.getItem(`safeher_checkins_${userId || 'guest'}`);
      if (local) return JSON.parse(local);
      return [];
    }

    const path = `users/${userId}/checkins`;
    try {
      const snap = await getDocs(query(collection(db, 'users', userId, 'checkins'), orderBy('startedAt', 'desc')));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JourneyCheckIn));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addJourneyCheckIn(userId: string, checkin: Omit<JourneyCheckIn, 'id'>): Promise<JourneyCheckIn> {
    const id = generateId();
    const newCheckin: JourneyCheckIn = { ...checkin, id };

    if (isFirebasePlaceholder || !userId) {
      const list = await this.getJourneyCheckIns(userId);
      list.unshift(newCheckin);
      localStorage.setItem(`safeher_checkins_${userId || 'guest'}`, JSON.stringify(list));
      return newCheckin;
    }

    const path = `users/${userId}/checkins/${id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'checkins', id), {
        ...checkin,
        startedAt: checkin.startedAt || new Date().toISOString(),
        expiresAt: checkin.expiresAt || new Date().toISOString()
      });
      return newCheckin;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return newCheckin;
    }
  },

  async updateJourneyCheckIn(userId: string, checkinId: string, updates: Partial<JourneyCheckIn>): Promise<void> {
    if (isFirebasePlaceholder || !userId) {
      const list = await this.getJourneyCheckIns(userId);
      const index = list.findIndex(c => c.id === checkinId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        localStorage.setItem(`safeher_checkins_${userId || 'guest'}`, JSON.stringify(list));
      }
      return;
    }

    const path = `users/${userId}/checkins/${checkinId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'checkins', checkinId), {
        ...updates
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // ==========================================
  // SECURE EVIDENCE VAULT SERVICES
  // ==========================================
  async getEvidenceItems(userId: string): Promise<EvidenceVaultItem[]> {
    if (isFirebasePlaceholder || !userId) {
      const local = localStorage.getItem(`safeher_evidence_${userId || 'guest'}`);
      if (local) return JSON.parse(local);
      return [
        {
          id: 'e1',
          name: 'Transit Terminal Alley audio recording.wav',
          type: 'audio',
          contentUrl: '#',
          timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          fileSize: '1.2 MB',
          sha256: '9f8ce4e4d7a8e8f81e81ae8a0e882a883a992a77aae8dd92cf99a8ea8d8ce8f4'
        },
        {
          id: 'e2',
          name: 'Suspicious vehicle license plate info.png',
          type: 'photo',
          contentUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
          noteText: 'White sedan trailing at 12:45 AM. License plate: 5Y7F31.',
          timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          fileSize: '345 KB',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        }
      ];
    }

    const path = `users/${userId}/evidence`;
    try {
      const snap = await getDocs(query(collection(db, 'users', userId, 'evidence'), orderBy('timestamp', 'desc')));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvidenceVaultItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addEvidenceItem(userId: string, item: Omit<EvidenceVaultItem, 'id'>): Promise<EvidenceVaultItem> {
    const id = generateId();
    const newItem: EvidenceVaultItem = { ...item, id };

    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEvidenceItems(userId);
      list.unshift(newItem);
      localStorage.setItem(`safeher_evidence_${userId || 'guest'}`, JSON.stringify(list));
      return newItem;
    }

    const path = `users/${userId}/evidence/${id}`;
    try {
      await setDoc(doc(db, 'users', userId, 'evidence', id), {
        ...item,
        timestamp: item.timestamp || new Date().toISOString()
      });
      return newItem;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return newItem;
    }
  },

  async deleteEvidenceItem(userId: string, itemId: string): Promise<void> {
    if (isFirebasePlaceholder || !userId) {
      const list = await this.getEvidenceItems(userId);
      const filtered = list.filter(i => i.id !== itemId);
      localStorage.setItem(`safeher_evidence_${userId || 'guest'}`, JSON.stringify(filtered));
      return;
    }

    const path = `users/${userId}/evidence/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'evidence', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
