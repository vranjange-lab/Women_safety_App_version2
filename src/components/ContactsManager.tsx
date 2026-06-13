import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Trash2, Edit2, ShieldAlert, Award, Save, X, PhoneCall } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { EmergencyContact } from '../types';

interface ContactsManagerProps {
  userId: string;
}

export default function ContactsManager({ userId }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isQuickDial, setIsQuickDial] = useState(false);

  const [simulatedCall, setSimulatedCall] = useState<string | null>(null);

  // Load contacts
  useEffect(() => {
    let active = true;
    const fetchContacts = async () => {
      const list = await dbService.getEmergencyContacts(userId);
      if (active) setContacts(list);
    };
    fetchContacts();
    return () => { active = false; };
  }, [userId]);

  const loadContacts = async () => {
    const list = await dbService.getEmergencyContacts(userId);
    setContacts(list);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !relationship.trim()) return;

    const newContactData = {
      name,
      phone,
      relationship,
      isQuickDial,
      order: contacts.length + 1
    };

    await dbService.addEmergencyContact(userId, newContactData);
    await loadContacts();
    resetForm();
    setIsAdding(false);
  };

  const handleStartEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setRelationship(contact.relationship);
    setIsQuickDial(contact.isQuickDial);
  };

  const handleSaveEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !relationship.trim()) return;

    await dbService.updateEmergencyContact(userId, id, {
      name,
      phone,
      relationship,
      isQuickDial
    });
    setEditingId(null);
    await loadContacts();
    resetForm();
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm('Are you sure you want to remove this emergency contact?')) {
      await dbService.deleteEmergencyContact(userId, id);
      await loadContacts();
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setRelationship('');
    setIsQuickDial(false);
  };

  const handleDialSimulated = (contactName: string, phone: string) => {
    setSimulatedCall(contactName);
    // Open standard tel: protocol safely
    window.location.href = `tel:${phone}`;
  };

  return (
    <div id="contacts_manager" className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
            Emergency Contacts
            <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-rose-500/20 text-rose-300 font-black rounded-full">{contacts.length} Registered</span>
          </h3>
          <p className="text-[10px] text-slate-400">Distress alerts message targets and quick-dial directory</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            resetForm();
          }}
          className="p-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition-all transform active:scale-95 cursor-pointer flex items-center justify-center"
        >
          {isAdding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
        </button>
      </div>

      {/* Adding / Editing Form Panel */}
      {(isAdding || editingId !== null) && (
        <form
          onSubmit={(e) => (editingId !== null ? handleSaveEdit(e, editingId) : handleCreateContact(e))}
          className="mb-8 p-4 bg-slate-950 border border-slate-850 rounded-2xl animate-slide-down space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">
              {editingId !== null ? 'Modify Contact Particulars' : 'Register New Guardian'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                resetForm();
              }}
              className="text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sheriff Department / Alice"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Mobile Handset No.</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 911 / +1 (555) 123-4567"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Relationship / Tag</label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Police, Partner, Sister, Neighbor"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700"
                required
              />
            </div>
            <div className="flex items-center gap-3 pt-4 pl-1">
              <input
                type="checkbox"
                id="isQuickDialCheck"
                checked={isQuickDial}
                onChange={(e) => setIsQuickDial(e.target.checked)}
                className="col-span-1 rounded bg-slate-900 border border-slate-800 text-rose-500 text-xs w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isQuickDialCheck" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
                Primary Speed Dial Priority
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {editingId !== null ? 'Save Changes' : 'Add Emergency Guardian'}
            </button>
          </div>
        </form>
      )}

      {/* Directory Cards Table */}
      <div className="space-y-3">
        {contacts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
            <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No emergency contacts registered yet.</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-4 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between transition-all hover:scale-[1.01] ${
                contact.isQuickDial ? 'border-l-4 border-l-rose-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-full flex items-center justify-center shrink-0 ${
                    contact.isQuickDial ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                    {contact.name}
                    {contact.isQuickDial && (
                      <span className="inline-block py-0.5 px-1.5 text-[8px] bg-rose-500/20 text-rose-400 uppercase font-black rounded-full">Speed dial</span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">{contact.relationship}</span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="text-[10px] text-slate-400">{contact.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action utilities */}
              <div className="flex items-center gap-1.5">
                {/* Simulated dial */}
                <button
                  onClick={() => handleDialSimulated(contact.name, contact.phone)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-emerald-400 transition-all cursor-pointer flex items-center justify-center"
                  title="Simulate Call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </button>
                {/* Edit */}
                <button
                  onClick={() => handleStartEdit(contact)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-blue-400 transition-all cursor-pointer flex items-center justify-center"
                  title="Edit Contact"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {/* Delete */}
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-750 text-rose-400 transition-all cursor-pointer flex items-center justify-center"
                  title="Delete Contact"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dial Dialog Overlay */}
      {simulatedCall && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="w-16 h-18 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <PhoneCall className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-100">Dialing Emergency Phone</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Simulating outgoing connection to <span className="font-bold text-slate-200">{simulatedCall}</span>. Live connection trigger active on handset context.
            </p>
            <button
              onClick={() => setSimulatedCall(null)}
              className="mt-5 w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 font-extrabold uppercase transition-all tracking-wide text-xs cursor-pointer"
            >
              Hang Up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
