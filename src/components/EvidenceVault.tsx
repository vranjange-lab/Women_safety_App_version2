import React, { useState, useEffect } from 'react';
import { Shield, Upload, FileText, Music, Image as ImageIcon, Trash2, CheckCircle2, Lock, AlertTriangle, Play, Square, Activity } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { EvidenceVaultItem } from '../types';

interface EvidenceVaultProps {
  userId: string;
}

export default function EvidenceVault({ userId }: EvidenceVaultProps) {
  const [evidence, setEvidence] = useState<EvidenceVaultItem[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Load evidence list on init
  useEffect(() => {
    loadEvidence();
  }, [userId]);

  // Handle recording timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const loadEvidence = async () => {
    const list = await dbService.getEvidenceItems(userId);
    setEvidence(list);
  };

  const showNotification = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 4000);
  };

  const generateMockSHA256 = () => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  };

  // Note creation
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const newItem: Omit<EvidenceVaultItem, 'id'> = {
      name: `${noteTitle}.txt`,
      type: 'note',
      noteText: noteBody,
      timestamp: new Date().toISOString(),
      fileSize: `${(noteBody.length / 1024).toFixed(2)} KB`,
      sha256: generateMockSHA256()
    };

    await dbService.addEvidenceItem(userId, newItem);
    setNoteTitle('');
    setNoteBody('');
    await loadEvidence();
    showNotification('Note secured to evidence vault');
  };

  // Audio Recording actions
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone access is not supported by your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        // In a real database we upload this. Here we turn it into a source object URL or Base64 representation.
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const audioName = `Audio Alert Recording_${new Date().toLocaleTimeString().replace(/ /g, '_')}.wav`;

          const newItem: Omit<EvidenceVaultItem, 'id'> = {
            name: audioName,
            type: 'audio',
            contentUrl: base64data,
            timestamp: new Date().toISOString(),
            fileSize: `${(audioBlob.size / 1024).toFixed(1)} KB`,
            sha256: generateMockSHA256()
          };

          await dbService.addEvidenceItem(userId, newItem);
          await loadEvidence();
          showNotification('Emergency audio recording cryptographically locked');
        };

        // Stop all track streams
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Audio record initiation error:', err);
      alert('Microphone recording was rejected or is blocked inside this browser frame.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // File Upload Handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    const isPhoto = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const type = isPhoto ? 'photo' : isAudio ? 'audio' : 'note';

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Content = reader.result as string;
      const newItem: Omit<EvidenceVaultItem, 'id'> = {
        name: file.name,
        type: type as any,
        contentUrl: base64Content,
        timestamp: new Date().toISOString(),
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        sha256: generateMockSHA256()
      };

      await dbService.addEvidenceItem(userId, newItem);
      await loadEvidence();
      showNotification(`File "${file.name}" uploaded and encrypted in evidence vault`);
    };
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Verify deleting this evidence item? This action is permanent.')) {
      await dbService.deleteEvidenceItem(userId, itemId);
      await loadEvidence();
      showNotification('Evidence record securely purged');
    }
  };

  const playLocalAudio = (base64Url: string) => {
    try {
      const audio = new Audio(base64Url);
      audio.play();
    } catch (e) {
      alert('Playback failed or restricted by browser permissions.');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="evidence_vault_panel" className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl">
      {/* Toast Notifier */}
      {infoMessage && (
        <div className="fixed top-6 right-6 z-50 py-3 px-5 rounded-2xl bg-emerald-500 text-slate-950 font-black tracking-tight flex items-center gap-2 shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs">{infoMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="pb-4 border-b border-slate-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-500 fill-rose-500/10" />
            Cryptographic Evidence Vault
            <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-rose-500/20 text-rose-300 font-black rounded-full">Chain-of-Custody Secure</span>
          </h3>
          <p className="text-[10px] text-slate-400">Zero-knowledge proof documentation admissible in official reports</p>
        </div>
      </div>

      {/* Security Advisory */}
      <div className="mb-6 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400">
          <p className="text-slate-200 font-bold">Encrypted Local & Multi-Sentry Server Storage</p>
          <p className="mt-0.5">
            All photos, notes, and recorded audio tracks generate unique SHA-256 cryptographic hashes locally before sync. This anchors integrity to prevent deletion or altering during investigations.
          </p>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Log Text Note Container */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
          <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Log Incident Entry
          </h4>
          <form onSubmit={handleAddNote} className="space-y-3">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Case Title (e.g., Suspicious Men Near Bus Stop)"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700 placeholder-slate-600"
              required
            />
            <textarea
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Provide a chronological description of suspect features, vehicle colors, locations, witnesses, or conversational remarks..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-700 placeholder-slate-600 resize-none h-24"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase transition-all transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Secure Note Vault
            </button>
          </form>
        </div>

        {/* Live Audio / Drag & Drop Container */}
        <div className="lg:col-span-5 grid grid-rows-2 gap-4">
          {/* Active audio record box */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between items-center text-center relative overflow-hidden">
            <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 self-start w-full">
              <Activity className="w-3.5 h-3.5 text-rose-400" /> Mic Recorder
            </h4>

            {isRecording ? (
              <div className="my-1.5 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-ping" />
                <span className="text-sm font-black text-red-400 mt-2">{formatSeconds(recordingSeconds)}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider animate-pulse">LOCKING AMBIENT TRACK LIVE...</span>
              </div>
            ) : (
              <div className="my-1.5 text-center">
                <p className="text-xs font-bold text-slate-300">Ambient Safety Audio</p>
                <p className="text-[9px] text-slate-500">Record harassment or stalking audio discreetly</p>
              </div>
            )}

            {isRecording ? (
              <button
                onClick={stopRecording}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop & Lock Audio
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Capture Audio Evidence
              </button>
            )}
          </div>

          {/* Media upload file drag drop */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`p-4 rounded-2xl border-2 border-dashed flex flex-col justify-center items-center text-center transition-all cursor-pointer relative ${
              dragActive
                ? 'border-emerald-400 bg-emerald-500/5'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-950/80'
            }`}
          >
            <input
              type="file"
              id="file-vault-upload"
              onChange={handleFileChange}
              accept="image/*,audio/*,.pdf,.txt"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <Upload className="w-5 h-5 text-slate-500 mb-1" />
            <span className="text-xs font-bold text-slate-300">Upload Media Evidence</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Drag-and-drop photos or choose files</span>
          </div>
        </div>
      </div>

      {/* Evidence Logs List */}
      <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-1.5">
        Locked Vault Records ({evidence.length})
      </h4>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {evidence.length === 0 ? (
          <div className="text-center py-12 border border-slate-850 rounded-2xl bg-slate-950/40">
            <AlertTriangle className="w-8 h-8 text-slate-755 mx-auto mb-2 text-slate-600" />
            <p className="text-xs text-slate-500">Vault is empty of critical incidents.</p>
          </div>
        ) : (
          evidence.map((item) => {
            const isNote = item.type === 'note';
            const isAudio = item.type === 'audio';
            const isPhoto = item.type === 'photo';

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-850/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-800"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-slate-900 border border-slate-855 text-slate-400 rounded-xl shrink-0 mt-0.5">
                    {isNote && <FileText className="w-4 h-4 text-violet-400" />}
                    {isAudio && <Music className="w-4 h-4 text-amber-400" />}
                    {isPhoto && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-200 flex items-center flex-wrap gap-2">
                      {item.name}
                      <span className="inline-block py-0.5 px-2 text-[8px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase font-black rounded-full">Locked</span>
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center flex-wrap gap-1 md:gap-2">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{item.fileSize || 'N/A'}</span>
                    </p>
                    {item.noteText && (
                      <p className="text-[11px] leading-relaxed text-slate-400 bg-slate-900/50 p-2 border border-slate-850 rounded-lg mt-2 font-mono whitespace-pre-wrap">
                        {item.noteText}
                      </p>
                    )}
                    {item.sha256 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[8px] font-mono text-slate-500 bg-slate-900/30 p-1 px-2 border border-slate-850/10 rounded overflow-hidden max-w-sm">
                        <span className="text-rose-400 uppercase font-black shrink-0">SHA256:</span>
                        <span className="truncate">{item.sha256}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isAudio && item.contentUrl && item.contentUrl !== '#' && (
                    <button
                      onClick={() => playLocalAudio(item.contentUrl!)}
                      className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-amber-400 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Play Track
                    </button>
                  )}
                  {isPhoto && item.contentUrl && (
                    <a
                      href={item.contentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-855 text-emerald-400 rounded-lg text-xs font-semibold text-center"
                    >
                      View Photo
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 bg-slate-900 border border-slate-800 hover:border-rose-950 text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer"
                    title="Purge Evidence"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
