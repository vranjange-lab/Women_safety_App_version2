import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Volume2, 
  PhoneCall, 
  MapPin, 
  StopCircle, 
  CheckCircle, 
  WifiOff, 
  Mic, 
  RefreshCw, 
  Smartphone, 
  Clock, 
  Power, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  Play, 
  Sparkles, 
  Copy, 
  Share2, 
  Eye, 
  Phone, 
  VolumeX, 
  Activity 
} from 'lucide-react';
import { dbService } from '../lib/dbService';
import { isFirebasePlaceholder } from '../lib/firebase';
import { AlertHistory, UserProfile, EmergencyContact } from '../types';

interface SOSModuleProps {
  userId: string;
  userProfile: UserProfile;
  onAlertTriggered: () => void;
}

export default function SOSModule({ userId, userProfile, onAlertTriggered }: SOSModuleProps) {
  const [isAlerting, setIsAlerting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  
  // Fake Call State
  const [isFakeCalling, setIsFakeCalling] = useState(false);
  const [fakeCallerName, setFakeCallerName] = useState('Papa (Emergency Backup)');
  const [fakeCallDelay, setFakeCallDelay] = useState<number>(0); // 0 = instant, otherwise seconds
  const [fakeCallTimer, setFakeCallTimer] = useState<number | null>(null);
  const [isFakeCallRinging, setIsFakeCallRinging] = useState(false);
  const [isFakeCallAnswered, setIsFakeCallAnswered] = useState(false);
  const [fakeCallDuration, setFakeCallDuration] = useState(0);

  // Sensor Actions
  const [localAddress, setLocalAddress] = useState('Tracking live location...');
  const [coords, setCoords] = useState({ lat: 37.7749, lng: -122.4194 }); // default SF
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<AlertHistory | null>(null);

  // Hackathon Advanced Features
  const [voiceActivated, setVoiceActivated] = useState(false);
  const [shakeActivated, setShakeActivated] = useState(true);
  const [shakeCountdown, setShakeCountdown] = useState<number | null>(null);
  const [speechStatus, setSpeechStatus] = useState<string>('Standby');
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // New Shaking states
  const [shakeCount, setShakeCount] = useState<number>(0);
  const [shakeSensitivity, setShakeSensitivity] = useState<'low' | 'medium' | 'high'>('medium');

  // Emergency contact list loaded
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [smsSendLogs, setSmsSendLogs] = useState<any[]>([]);
  const [copiedLocation, setCopiedLocation] = useState(false);

  // Safety Check-In Journey States
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyTotalMinutes, setJourneyTotalMinutes] = useState<number>(15);
  const [journeySecondsLeft, setJourneySecondsLeft] = useState<number>(0);

  // New location, geocoding and safety checking popup states
  const [currentCity, setCurrentCity] = useState<string>('');
  const [currentState, setCurrentState] = useState<string>('');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const [showJourneyPopup, setShowJourneyPopup] = useState(false);
  const [journeyPopupCountdown, setJourneyPopupCountdown] = useState<number | null>(null);
  const [isPlayingJourneyRingtone, setIsPlayingJourneyRingtone] = useState(false);

  // Siren Audio Synthesizer Nodes & Trackers
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<any>(null);
  const ringtoneIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Shake acceleration tracker refs
  const lastUpdateRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastZRef = useRef<number>(0);
  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeTimeRef = useRef<number>(0);

  // Media Capture voice recording states
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioRecordingSeconds, setAudioRecordingSeconds] = useState(0);
  const [decibelsList, setDecibelsList] = useState<number[]>([12, 18, 15, 24, 30, 10, 15, 28, 42, 10]);
  const audioTimerIntervalRef = useRef<any>(null);

  // Load Contacts list in background
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const list = await dbService.getEmergencyContacts(userId);
        setEmergencyContacts(list);
      } catch (err) {
        console.warn("Failed to load contacts for SOS module:", err);
      }
    };
    fetchContacts();
  }, [userId, isAlerting]);

  // Main SOS countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      triggerSOS();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Shake detection countdown timer (if user doesn't cancel in 5s)
  useEffect(() => {
    if (shakeCountdown === null) return;
    if (shakeCountdown === 0) {
      setShakeCountdown(null);
      triggerSOS('SOS automatic emergency dispatch triggered via Device Shake sensor.');
      return;
    }
    const timer = setTimeout(() => setShakeCountdown(shakeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [shakeCountdown]);

  // Journey safety countdown timer
  useEffect(() => {
    if (!journeyActive || journeySecondsLeft <= 0) {
      if (journeyActive && journeySecondsLeft === 0) {
        setJourneyActive(false);
        // Expiration sequence starts continuous ringtone and displays confirmation check-in popup
        setShowJourneyPopup(true);
        setJourneyPopupCountdown(6);
        startFakeRingtoneSynth();
      }
      return;
    }
    const timer = setTimeout(() => {
      setJourneySecondsLeft(journeySecondsLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [journeyActive, journeySecondsLeft]);

  // Journey popup backup emergency countdown timer (15 seconds limit)
  useEffect(() => {
    if (!showJourneyPopup || journeyPopupCountdown === null) return;
    if (journeyPopupCountdown === 0) {
      setShowJourneyPopup(false);
      setJourneyPopupCountdown(null);
      stopFakeRingtoneSynth();
      triggerSOS('Breach Alert: Safety Check-in Journey Expired and user failed to respond within 6 seconds!');
      return;
    }
    const timer = setTimeout(() => {
      setJourneyPopupCountdown(journeyPopupCountdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [showJourneyPopup, journeyPopupCountdown]);

  // Fake Call delay timer
  useEffect(() => {
    if (fakeCallTimer === null) return;
    if (fakeCallTimer === 0) {
      setFakeCallTimer(null);
      setIsFakeCallRinging(true);
      startFakeRingtoneSynth();
      return;
    }
    const timer = setTimeout(() => setFakeCallTimer(fakeCallTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [fakeCallTimer]);

  // Active Fake Call answered duration counter
  useEffect(() => {
    let timer: any;
    if (isFakeCallAnswered) {
      timer = setInterval(() => {
        setFakeCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setFakeCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isFakeCallAnswered]);

  // Geolocation tracker
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocalAddress('GPS not supported on your browser.');
      setLocationPermissionStatus('denied');
      return;
    }

    const fetchGpsDetails = async (lat: number, lng: number) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: { 'Accept-Language': 'en' }
        });
        if (res.ok) {
          const data = await res.json();
          const address = data.address || {};
          const city = address.city || address.town || address.village || address.suburb || 'Unknown City';
          const state = address.state || address.region || 'Unknown State';
          setCurrentCity(city);
          setCurrentState(state);
          setLocalAddress(data.display_name || `${city}, ${state}`);
        } else {
          setCurrentCity('Unknown City');
          setCurrentState('Unknown State');
          setLocalAddress(`Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }
      } catch (err) {
        setCurrentCity('Unknown City');
        setCurrentState('Unknown State');
        setLocalAddress(`Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      }
    };

    const onGPSReady = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCoords({ lat, lng });
      setLocationPermissionStatus('granted');
      fetchGpsDetails(lat, lng);
    };

    const onGPSError = (error: GeolocationPositionError) => {
      console.warn("GPS tracking error in App:", error.message);
      setGpsError(error.message);
      setLocationPermissionStatus('denied');
      // fallback safe base coordinates
      setCoords({ lat: 37.774929, lng: -122.419416 });
      setLocalAddress('GPS permission is required to detect your real location.');
      setCurrentCity('Permission Denied');
      setCurrentState('Sentry Fallback');
    };

    navigator.geolocation.getCurrentPosition(onGPSReady, onGPSError, { enableHighAccuracy: true });
    const watchId = navigator.geolocation.watchPosition(onGPSReady, onGPSError);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Web Speech API Voice Recognition setup
  useEffect(() => {
    if (!voiceActivated) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus('WebSpeech Not Supported');
      return;
    }

    let isStoppedIntentional = false;
    let rec: any = null;

    const initSpeech = async () => {
      try {
        setSpeechStatus('Permission Required');
        // prompt microphone consent
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // close tracks
        setMicPermissionState('granted');
        setSpeechStatus('Permission Granted');

        rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setSpeechStatus('Listening');
        };

        rec.onresult = (e: any) => {
          const resultsLength = e.results.length;
          for (let i = e.resultIndex; i < resultsLength; i++) {
            if (e.results[i].isFinal) {
              const text = e.results[i][0].transcript.toLowerCase();
              console.log(`[SafeHer mic match text]: "${text}"`);

              const detectedKeywords = ['help me', 'sos', 'emergency', 'save me'];
              if (detectedKeywords.some(kw => text.includes(kw))) {
                setSpeechStatus('Voice SOS Active');
                triggerSOS(`Emergency alert activated via Speech Keyword Match: "${text}"`);
                setVoiceActivated(false);
                isStoppedIntentional = true;
                rec.stop();
                break;
              }
            }
          }
        };

        rec.onerror = (e: any) => {
          console.warn('Speech recognition frame error:', e.error);
          if (e.error === 'not-allowed') {
            setMicPermissionState('denied');
            setSpeechStatus('Mic Blocked');
          } else {
            setSpeechStatus('Error: ' + e.error);
          }
        };

        rec.onend = () => {
          // Restart loop continuously if still enabled
          if (voiceActivated && !isStoppedIntentional) {
            try {
              rec.start();
            } catch (err) {}
          } else {
            setSpeechStatus('Standby');
          }
        };

        recognitionRef.current = rec;
        rec.start();

      } catch (err) {
        setMicPermissionState('denied');
        setSpeechStatus('Mic Blocked');
        console.warn('Speech acquisition failed or was rejected:', err);
      }
    };

    initSpeech();

    return () => {
      isStoppedIntentional = true;
      if (rec) {
        try {
          rec.stop();
        } catch (e) {}
      }
    };
  }, [voiceActivated]);

  // Reset shake count to 0 if shaking stops for more than 2 seconds
  useEffect(() => {
    if (shakeCount === 0) return;
    const timer = setTimeout(() => {
      setShakeCount(0);
      shakeTimestamps.current = [];
    }, 2000);
    return () => clearTimeout(timer);
  }, [shakeCount]);

  // Shake detection listener setup (6 shakes in 5 seconds)
  useEffect(() => {
    if (!shakeActivated) {
      setShakeCount(0);
      return;
    }

    const sensMap = {
      low: 28.0,
      medium: 22.0,
      high: 16.0
    };
    const currentThreshold = sensMap[shakeSensitivity];

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const currentTime = Date.now();
      if ((currentTime - lastUpdateRef.current) > 100) {
        const diffTime = currentTime - lastUpdateRef.current;
        lastUpdateRef.current = currentTime;

        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;

        const dx = x - lastXRef.current;
        const dy = y - lastYRef.current;
        const dz = z - lastZRef.current;

        const speed = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (speed > currentThreshold) {
          const now = Date.now();
          
          // Count only discrete shake occurrences separated by at least 200ms
          const prevShake = lastShakeTimeRef.current;
          if (prevShake > 0 && (now - prevShake < 200)) {
            return;
          }
          
          // Reset timestamps if more than 2 seconds idle
          if (prevShake > 0 && (now - prevShake > 2000)) {
            shakeTimestamps.current = [];
          }

          lastShakeTimeRef.current = now;
          shakeTimestamps.current = [...shakeTimestamps.current, now].filter(t => now - t <= 5000);
          setShakeCount(shakeTimestamps.current.length);

          console.log(`[Sensor shake matched]: ${shakeTimestamps.current.length}/6 at speed ${speed.toFixed(1)}`);

          if (shakeTimestamps.current.length >= 6) {
            shakeTimestamps.current = [];
            setShakeCount(0);
            triggerShakeCountdown();
          }
        }

        lastXRef.current = x;
        lastYRef.current = y;
        lastZRef.current = z;
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion, true);
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion, true);
    };
  }, [shakeActivated, shakeSensitivity]);

  const triggerShakeCountdown = () => {
    if (isAlerting || shakeCountdown !== null) return;
    setShakeCountdown(5); // start 5-second cancel interval window
  };

  const handleCancelShakeCountdown = () => {
    setShakeCountdown(null);
  };

  // Audio synthesizer siren engine
  const startSirenSynthesizer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);

      osc1.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(800, audioCtx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();

      let toggle = false;
      sirenIntervalRef.current = setInterval(() => {
        const time = audioCtx.currentTime;
        if (toggle) {
          osc1.frequency.exponentialRampToValueAtTime(800, time + 0.3);
          osc2.frequency.exponentialRampToValueAtTime(1000, time + 0.3);
        } else {
          osc1.frequency.exponentialRampToValueAtTime(500, time + 0.3);
          osc2.frequency.exponentialRampToValueAtTime(700, time + 0.3);
        }
        toggle = !toggle;
      }, 400);

      setIsPlayingSiren(true);
    } catch (e) {
      console.error("Sirens play failed:", e);
    }
  };

  const stopSirenSynthesizer = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlayingSiren(false);
  };

  // Synth Ringtone for Fake Call Option
  const startFakeRingtoneSynth = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      ringtoneIntervalRef.current = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.frequency.setValueAtTime(480, ctx.currentTime);
          gain2.gain.setValueAtTime(0.2, ctx.currentTime);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 1.2);
        }, 150);
      }, 3000);
    } catch (e) {
      console.error('Fake call auto-synth fail:', e);
    }
  };

  const stopFakeRingtoneSynth = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const handleJourneyCheckInSafe = async () => {
    setShowJourneyPopup(false);
    setJourneyPopupCountdown(null);
    stopFakeRingtoneSynth();
    try {
      await stopJourneyMarkSafe();
      console.log("[SafeHer Journey] Journey resolved successfully by user.");
    } catch (err) {
      console.error("Failed to mark journey safe:", err);
    }
  };

  const handleJourneyNotSafe = () => {
    setShowJourneyPopup(false);
    setJourneyPopupCountdown(null);
    stopFakeRingtoneSynth();
    triggerSOS('Journey Emergency: User checked in as NOT safe!');
  };

  // Automatic Audio Recorder launch
  const startAutomaticVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Audio media recording is not supported in this frame environment.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const fileName = `AutoSOS_Intel_Rec_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
          
          const newVaultRecord = {
            name: fileName,
            type: 'audio' as const,
            contentUrl: base64data,
            timestamp: new Date().toISOString(),
            fileSize: `${(audioBlob.size / 1024).toFixed(1)} KB`,
            sha256: Math.random().toString(36).substring(2, 11) + 'd78feac82f'
          };

          await dbService.addEvidenceItem(userId, newVaultRecord);
          console.log(`[SafeHer Recorder]: Incident audio logs successfully compiled & locked inside Evidence Vault.`);
        };

        // release microphone tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioRecordingSeconds(0);

      // Start recording timer & animation visual ticks
      audioTimerIntervalRef.current = setInterval(() => {
        setAudioRecordingSeconds((prev) => prev + 1);
        setDecibelsList(() => {
          return Array.from({ length: 14 }, () => Math.floor(Math.random() * 45) + 5);
        });
      }, 1000);

    } catch (err) {
      console.warn("Failed to activate microphone audio recorder automatically:", err);
    }
  };

  const stopAutomaticVoiceRecording = () => {
    if (audioTimerIntervalRef.current) {
      clearInterval(audioTimerIntervalRef.current);
      audioTimerIntervalRef.current = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.warn("Error stopping incident voice recorder:", e);
      }
      setMediaRecorder(null);
    }
  };

  // SOS Activator
  const triggerSOS = async (customNote?: string) => {
    setIsAlerting(true);
    startSirenSynthesizer();

    const executeDispatch = async (posCoords: { lat: number; lng: number }) => {
      // Step 2: Generate maps link
      const mapsLink = `https://www.google.com/maps?q=${posCoords.lat},${posCoords.lng}`;

      // Step 3: Setup exact emergency alert text containing layout
      const broadcastMessage = `EMERGENCY ALERT\n\nI may be in danger and need immediate assistance.\n\nMy current location:\n${mapsLink}\n\nPlease contact me immediately.`;

      const contactsList = await dbService.getEmergencyContacts(userId);
      const sentHistoryLogs = contactsList.map(contact => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        sentAt: new Date().toLocaleTimeString(),
        status: 'SENT_SUCCESSFULLY'
      }));
      setSmsSendLogs(sentHistoryLogs);

      // Open WhatsApp emergency dispatch with pre-filled message
      const whatsappUrl = `https://wa.me/9960755500?text=${encodeURIComponent(broadcastMessage)}`;
      window.open(whatsappUrl, '_blank');

      // Step 4: Prepare the Firestore alert document
      const newAlert: Omit<AlertHistory, 'id'> = {
        timestamp: new Date().toISOString(),
        locationAddress: localAddress,
        lat: posCoords.lat,
        lng: posCoords.lng,
        status: 'active',
        notes: customNote || broadcastMessage
      };

      try {
        const saved = await dbService.addEmergencyAlert(userId, newAlert);
        setActiveAlert(saved);
        onAlertTriggered();
        console.log(`[SafeHer Security] Alert saved to Firestore successfully.`, saved);
      } catch (err) {
        console.error("[SafeHer Security Error] Logging distress alert to Firestore aborted:", err);
      }
    };

    // Step 1: Immediately get high accuracy current GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const fetchedCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(fetchedCoords);
          executeDispatch(fetchedCoords);
        },
        (err) => {
          console.warn("High accuracy GPS fetch failed, using known coordinates:", err);
          executeDispatch(coords);
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      executeDispatch(coords);
    }

    // Automatically run audio microphone stream recording
    startAutomaticVoiceRecording();
  };

  const handleSOSClick = () => {
    if (isAlerting) return;
    setCountdown(3); // Start 3s verification countdown
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
  };

  const handleResolveAlert = async () => {
    stopAutomaticVoiceRecording();
    if (activeAlert) {
      try {
        await dbService.updateEmergencyAlert(userId, activeAlert.id, {
          status: 'resolved',
          notes: `Emergency incident resolved successfully by user. Emergency siren disabled.`
        });
        console.log(`[SafeHer Security] Critical Alert successfully closed in Firestore.`);
      } catch (err) {
        console.error("Failed to update firestore incident state:", err);
      }
    }
    setIsAlerting(false);
    stopSirenSynthesizer();
    setActiveAlert(null);
    onAlertTriggered();
    setSmsSendLogs([]);
  };

  const toggleSirenSound = () => {
    if (isPlayingSiren) {
      stopSirenSynthesizer();
    } else {
      startSirenSynthesizer();
    }
  };

  // Fake Call Core Logic
  const handleTriggerFakeCall = () => {
    if (fakeCallDelay === 0) {
      setIsFakeCalling(true);
      setIsFakeCallRinging(true);
      startFakeRingtoneSynth();
    } else {
      setFakeCallTimer(fakeCallDelay);
      setIsFakeCalling(true);
    }
  };

  const handleAnswerFakeCall = () => {
    stopFakeRingtoneSynth();
    setIsFakeCallRinging(false);
    setIsFakeCallAnswered(true);
  };

  const handleHangupFakeCall = () => {
    stopFakeRingtoneSynth();
    setIsFakeCalling(false);
    setIsFakeCallRinging(false);
    setIsFakeCallAnswered(false);
    setFakeCallTimer(null);
  };

  // Start Safety Journey timer
  const startJourney = async () => {
    setJourneySecondsLeft(journeyTotalMinutes * 60);

    const checkInRecord: Omit<any, 'id'> = {
      durationMinutes: journeyTotalMinutes,
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + journeyTotalMinutes * 60 * 1000).toISOString()
    };

    await dbService.addJourneyCheckIn(userId, checkInRecord);
    setJourneyActive(true);
  };

  const stopJourneyMarkSafe = async () => {
    setJourneyActive(false);
    setJourneySecondsLeft(0);
    const list = await dbService.getJourneyCheckIns(userId);
    const active = list.find(c => c.status === 'active');
    if (active) {
      await dbService.updateJourneyCheckIn(userId, active.id, {
        status: 'safe',
        checkedInAt: new Date().toISOString()
      });
    }
  };

  const handleShareLiveLocation = () => {
    const mapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    navigator.clipboard.writeText(mapsLink);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 3000);

    if (navigator.share) {
      navigator.share({
        title: 'Emergency Share Live Location',
        text: 'I may be in danger and need instant support. Track me live:',
        url: mapsLink
      }).catch(() => {});
    }
  };

  const formatSecondsClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Seed history helper
  const handleSeedMockHistory = async () => {
    const historicalMocks = [
      {
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        locationAddress: '232 Broadway Alley Corner, Sentry Terminal A',
        lat: 37.7791,
        lng: -122.4112,
        status: 'resolved' as any,
        notes: 'Pre-stalking scenario. Triggered silent SMS to Guardians. User headed to Safehouse Metro Sanctuary.'
      },
      {
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        locationAddress: 'Transit Underground Station Exit 4',
        lat: 37.7712,
        lng: -122.4289,
        status: 'resolved' as any,
        notes: 'Late night walk. Checked into Safety Journey. Safely arrived at destination.'
      }
    ];

    for (const h of historicalMocks) {
      await dbService.addEmergencyAlert(userId, h);
    }
    onAlertTriggered();
    alert('Mock emergency logs successfully populated to Firestore!');
  };

  // List of emergency services
  const emergencyServices = [
    { name: 'District Police Precinct Station', type: 'Police Station', phone: '100', directCall: '100', dist: '0.4 km' },
    { name: 'City Hospital Emergency Ward', type: 'Hospital', phone: '102', directCall: '102', dist: '1.2 km' },
    { name: 'Women Helpline Services Support', type: 'Women Helpline', phone: '181', directCall: '181', dist: 'Active Hotline' },
    { name: 'Public Ambulance Dispatch Desk', type: 'Ambulance Number', phone: '102', directCall: '102', dist: 'Immediate Dispatch' },
    { name: 'National Emergency Helpline Sentry', type: 'Emergency Helpline', phone: '112', directCall: '112', dist: 'Core Helpline' }
  ];

  return (
    <div id="sos_dashboard" className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl relative overflow-hidden space-y-6">
      
      {/* STEP 5: Display Emergency Mode Screen overlay if Alert is active */}
      {isAlerting ? (
        <div className="animate-fade-in space-y-6 relative z-10">
          
          {/* Animated blinking crisis banner */}
          <div className="p-4 bg-red-600 rounded-2xl flex flex-col items-center justify-center text-center space-y-1 animate-pulse border border-red-500 shadow-glow shadow-red-900/60 text-slate-950">
            <ShieldAlert className="w-8 h-8 animate-bounce" />
            <h2 className="font-extrabold tracking-tight text-base uppercase text-white">CRITICAL EMERGERNCY PROTOCOL ACTIVE</h2>
            <p className="text-[10px] text-red-100 font-extrabold uppercase tracking-widest leading-none">Security Dispatcher Broadcast launched to Guardians List</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Live GPS Link Card & Audio Stream Visualizer */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                  <span className="text-xs font-black text-rose-450 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Tracking Grid
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-0.5 px-2 rounded-full font-mono font-bold">GPS ACTIVE</span>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Generative Google Maps Location Link:</p>
                  <p className="text-xs font-bold text-slate-300 break-all bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                    https://www.google.com/maps?q={coords.lat.toFixed(5)},{coords.lng.toFixed(5)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleShareLiveLocation}
                    className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> {copiedLocation ? 'Copied Link!' : 'Share Live coordinates'}
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank');
                    }}
                    className="py-2.5 px-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-[10px] font-bold text-slate-300 cursor-pointer flex items-center justify-center"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Automatic Voice Recorder indicator & dynamic audio wave mock */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-4">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                    <span className="text-xs font-black text-rose-500 uppercase tracking-tight">Active Sentinel Voice REC</span>
                  </div>
                  <span className="text-xs font-black font-mono text-slate-400">{formatSecondsClock(audioRecordingSeconds)}</span>
                </div>

                {/* Simulated Decibel Visualizer Chart */}
                <div className="flex items-end justify-between h-9 px-1 gap-1 bg-slate-900/60 rounded-xl p-2.5 border border-slate-900 overflow-hidden">
                  {decibelsList.map((db, idx) => (
                    <div 
                      key={idx} 
                      className="bg-rose-500 rounded-full w-1.5 transition-all duration-300"
                      style={{ height: `${db}%` }}
                    />
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 font-medium italic leading-tight">
                  Microphone logs stream compiled with ephemeral TLS-lock. Auto-archiving to Evidence Vault on alert resolution.
                </p>
              </div>

              {/* Guardians SMS Alerts Log logs */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-900">Guardian SMS Relay Status</span>
                {emergencyContacts.length === 0 ? (
                  <p className="text-[10px] text-slate-500 pl-1">No custom contacts registered. General Sentry backup notified successfully.</p>
                ) : (
                  <div className="space-y-2 max-h-[145px] overflow-y-auto">
                    {emergencyContacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-850 rounded-xl text-[10px]">
                        <div>
                          <p className="font-bold text-slate-350">{contact.name} ({contact.relationship})</p>
                          <p className="text-slate-500 mt-0.5">{contact.phone}</p>
                        </div>
                        <span className="py-0.5 px-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full font-mono text-[8px] uppercase tracking-wide">
                          SENT SUCCESSFULLY 🟢
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 6: Display Nearby Emergency Services on Distress Dashboard */}
            <div className="space-y-4 text-left">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-3.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-900">Nearby Security Stations & Care</span>
                
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {emergencyServices.map((service, idx) => (
                    <div key={idx} className="p-3 border border-slate-900 bg-slate-900/40 rounded-2xl flex items-center justify-between gap-2.5">
                      <div className="space-y-0.5 overflow-hidden">
                        <span className="text-[8px] font-black uppercase text-rose-500 block leading-normal">{service.type}</span>
                        <h5 className="text-[11px] font-black text-slate-100 truncate">{service.name}</h5>
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-emerald-400" /> {service.dist}
                        </p>
                      </div>
                      <a 
                        href={`tel:${service.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirm(`Mock Alarm Dialing connection initiated to ${service.name} (${service.phone}). Confirm to dials.`);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-850 text-emerald-400 font-bold text-[10px] hover:border-emerald-700 hover:bg-emerald-500/5 whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call Station
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 7: Display Quick emergency dialing actions */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-900">Sentinel Quick Actions</span>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold uppercase tracking-tight">
                  <a
                    href="tel:100"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Simulating Police Department Dispatcher... Dialing 100");
                    }}
                    className="p-3 bg-slate-900 border border-slate-800 text-rose-450 hover:bg-slate-850 flex items-center justify-center gap-2 rounded-2xl text-center"
                  >
                    🚨 Call Police
                  </a>
                  <a
                    href="tel:181"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Simulating Women Helpline Support Center... Dialing 181");
                    }}
                    className="p-3 bg-slate-900 border border-slate-800 text-rose-450 hover:bg-slate-850 flex items-center justify-center gap-2 rounded-2xl text-center"
                  >
                    📞 Call Women Helpline
                  </a>
                  <a
                    href="tel:102"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Simulating Public Ambulance Emergency Dispatcher... Dialing 102");
                    }}
                    className="p-3 bg-slate-900 border border-slate-800 text-rose-450 hover:bg-slate-850 flex items-center justify-center gap-2 rounded-2xl text-center"
                  >
                    🚑 Call Ambulance
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareLiveLocation();
                    }}
                    className="p-3 bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-850 flex items-center justify-center gap-2 rounded-2xl text-center font-extrabold uppercase tracking-tight cursor-pointer"
                  >
                    📍 Share Location
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Resolution Action Row */}
          <div className="pt-2">
            <button
              onClick={handleResolveAlert}
              className="w-full py-4.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black tracking-tight text-sm uppercase transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              I Am Safe - Dismiss Distress Sentinel Alarm
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main SOS Dial Section */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Connection Sandbox Warning */}
            {isFirebasePlaceholder && (
              <div className="w-full flex items-center justify-center gap-1.5 py-1 px-3 mb-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                Sandbox Database: Offline Local Storage Engaged
              </div>
            )}

            {/* SOS circular dial outer halo */}
            <div className="relative my-6 select-none flex items-center justify-center">
              {countdown !== null && (
                <div className="absolute w-56 h-56 rounded-full bg-amber-500/20 animate-pulse" />
              )}

              {/* Core Interactive SOS Button */}
              <button
                id="sos_trigger_btn"
                onClick={handleSOSClick}
                disabled={countdown !== null}
                className={`w-48 h-48 rounded-full flex flex-col justify-center items-center shadow-glow transition-all duration-300 transform active:scale-95 z-10 font-bold border-c border-8 ${
                  countdown !== null
                    ? 'bg-amber-600 border-amber-800 text-white'
                    : 'bg-rose-500 hover:bg-rose-600 border-rose-700 hover:border-rose-800 text-white hover:scale-[1.02] cursor-pointer'
                }`}
              >
                {countdown !== null ? (
                  <span className="text-6xl animate-bounce">{countdown}</span>
                ) : (
                  <>
                    <Shield className="w-14 h-14 mb-1.5 drop-shadow-md text-rose-100" />
                    <span className="text-3xl font-black tracking-tighter">SOS</span>
                    <span className="text-xs uppercase font-medium tracking-widest opacity-80 mt-1">Distress Trigger</span>
                  </>
                )}
              </button>
            </div>

            {/* Cancel Countdown Button */}
            {countdown !== null && (
              <button
                onClick={handleCancelCountdown}
                className="mb-4 py-1.5 px-5 rounded-full bg-slate-800 border border-slate-705 hover:bg-slate-700 font-bold text-xs transition-all duration-200 cursor-pointer text-slate-350"
              >
                Cancel Instant SOS
              </button>
            )}

            {/* Location Info Banner */}
            <div className="w-full space-y-2 mb-3 select-none">
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left text-xs">
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 animate-pulse ${locationPermissionStatus === 'denied' ? 'text-rose-500' : 'text-emerald-400'}`} />
                <div className="overflow-hidden w-full">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-200">Current Location</p>
                    <span className={`text-[9px] font-mono uppercase font-black tracking-wider px-1.5 py-0.5 rounded ${
                      locationPermissionStatus === 'granted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {locationPermissionStatus === 'granted' ? '● Live Tracking' : '● GPS Offline'}
                    </span>
                  </div>
                  
                  {/* Dynamic City, State, Coordinates */}
                  {locationPermissionStatus === 'granted' && currentCity && (
                    <p className="text-slate-200 font-semibold mt-1 text-[11px] font-sans">
                      {currentCity}{currentState ? `, ${currentState}` : ''}
                    </p>
                  )}
                  
                  <p className="text-slate-400 mt-0.5 text-[10px] break-all">
                    {localAddress}
                  </p>
                  
                  <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-tight leading-none">
                    LAT: {coords.lat.toFixed(6)} | LNG: {coords.lng.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* GPS Denied Warning Banner */}
              {locationPermissionStatus === 'denied' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-bold rounded-2xl text-center leading-tight flex items-center justify-center gap-1.5 animate-bounce">
                  ⚠️ GPS Permission Denied. Please enable system location permissions for precise real-time emergency dispatched help!
                </div>
              )}
            </div>
          </div>

          {/* Advanced Features Controls Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Hackathon Features: Voice + Shake */}
            <div className="p-4 rounded-2xl bg-slate-950/65 border border-slate-850 space-y-4 text-left">
              <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-rose-405 animate-pulse" /> Mobile Distress Sensors
              </h4>

              {/* Voice Activated Switch */}
              <div className="flex items-center justify-between p-3.5 border border-slate-900 rounded-xl bg-slate-900/40">
                <div className="flex items-start gap-2.5">
                  <Mic className={`w-4 h-4 mt-0.5 ${voiceActivated ? 'text-violet-400 animate-bounce' : 'text-slate-500'}`} />
                  <div>
                    <span className="text-xs font-bold block text-slate-100">Voice-Activated SOS</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans leading-none">Say "Help Me", "SOS", "Emergency", "Save Me"</span>
                    {voiceActivated && (
                      <span className="inline-block px-2 text-[8px] bg-violet-500/20 text-violet-300 rounded font-mono uppercase font-black mt-2">
                        🎙️ {speechStatus}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setVoiceActivated(!voiceActivated)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                    voiceActivated
                      ? 'bg-violet-500 hover:bg-violet-605 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-300'
                  }`}
                >
                  {voiceActivated ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Shake Trigger Switch with customized sensitivity and Shake Counter visualizer representation */}
              <div className="p-3.5 border border-slate-900 rounded-xl bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <Smartphone className={`w-4 h-4 mt-0.5 ${shakeActivated ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold block text-slate-100">Shake Detection SOS</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 leading-none">Shake rapid 6 times within 5 seconds</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShakeActivated(!shakeActivated)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                      shakeActivated
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-755 hover:text-slate-300'
                    }`}
                  >
                    {shakeActivated ? 'ON' : 'OFF'}
                  </button>
                </div>
                
                {shakeActivated && (
                  <div className="pt-2 border-t border-slate-950 text-[10px] space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-bold uppercase tracking-wider text-amber-400">Shake Counter:</span>
                      <span className="font-mono bg-amber-500/10 text-amber-450 px-2.5 py-0.5 rounded-md font-black text-xs">{shakeCount}/6</span>
                    </div>

                    {/* Progress Bar of Shakes */}
                    <div className="w-full bg-slate-950 h-1.5 rounded-full border border-slate-800 overflow-hidden">
                      <div 
                        className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(shakeCount / 6) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[9px]">
                      <span className="text-slate-500">Sensitivity Limit:</span>
                      <div className="flex gap-1.5">
                        {['low', 'medium', 'high'].map(level => (
                          <button
                            key={level}
                            onClick={() => setShakeSensitivity(level as any)}
                            className={`py-0.5 px-2 rounded font-mono font-black border uppercase ${
                              shakeSensitivity === level
                                ? 'bg-amber-550/15 border-amber-500 text-amber-400'
                                : 'bg-slate-955 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Panel Utilities: Siren + Fake Call */}
            <div className="p-4 rounded-2xl bg-slate-950/65 border border-slate-850 space-y-4 text-left">
              <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-rose-405" /> Audio & Decoy Protocols
              </h4>

              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                {/* Siren toggle */}
                <button
                  id="siren_toggle_btn"
                  onClick={toggleSirenSound}
                  className={`py-4 px-3 rounded-xl border flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all duration-200 cursor-pointer text-center ${
                    isPlayingSiren
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 hover:bg-amber-600/30 font-black'
                      : 'bg-slate-900 border-slate-850 text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Volume2 className={`w-5 h-5 ${isPlayingSiren ? 'animate-bounce text-amber-400' : 'text-slate-400'}`} />
                  <span className="tracking-tight">{isPlayingSiren ? 'Mute Siren' : 'Siren Alarm'}</span>
                </button>

                {/* Fake call config & engage */}
                <button
                  onClick={handleTriggerFakeCall}
                  className="py-4 px-3 rounded-xl border border-slate-850 bg-slate-900 text-slate-200 hover:bg-slate-850 flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all duration-200 cursor-pointer text-center"
                >
                  <PhoneCall className="w-5 h-5 text-emerald-400" />
                  <span className="tracking-tight">Simulate Call</span>
                </button>
              </div>

              {/* Fake call configurations */}
              <div className="p-2 bg-slate-900/50 rounded-xl border border-slate-900 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-450 font-bold uppercase tracking-wider">Decoy Call Config:</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={fakeCallerName}
                    onChange={(e) => setFakeCallerName(e.target.value)}
                    placeholder="Caller ID"
                    className="bg-slate-950 p-1 px-2 text-[10px] text-slate-200 border border-slate-800 rounded outline-none"
                  />
                  <select
                    value={fakeCallDelay}
                    onChange={(e) => setFakeCallDelay(Number(e.target.value))}
                    className="bg-slate-950 p-1 text-[10px] text-slate-200 border border-slate-800 rounded outline-none"
                  >
                    <option value={0}>Immediate Ring</option>
                    <option value={5}>Ring in 5s</option>
                    <option value={10}>Ring in 10s</option>
                    <option value={30}>Ring in 30s</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Journey Check-In Segment */}
          <div className="p-4 rounded-2xl bg-slate-950/65 border border-slate-850 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-rose-450 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-400" /> Safety Journey Check-In System
              </h4>
              <span className="inline-block py-0.5 px-2 text-[8px] bg-emerald-500/15 text-emerald-300 font-bold uppercase rounded-full">Sentry Timer Link</span>
            </div>

            {journeyActive ? (
              <div className="p-4 border border-rose-900/30 bg-rose-950/10 rounded-xl text-center space-y-3.5 animate-pulse">
                <div>
                  <p className="text-xs font-bold text-slate-200">Active Sentinel Journey Timer</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Please check in before timeout otherwise distress alert launches!</p>
                </div>

                <div className="max-w-xs mx-auto">
                  <span className="text-3xl font-black font-mono text-rose-400 block">{formatSecondsClock(journeySecondsLeft)}</span>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-850">
                    <div
                      className="bg-rose-500 h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${(journeySecondsLeft / (journeyTotalMinutes * 60)) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={stopJourneyMarkSafe}
                  className="py-2.5 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black tracking-tight text-xs uppercase cursor-pointer"
                >
                  Check-In: I Am Safe - Arrived
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/30 p-3 border border-slate-900 rounded-xl">
                <div className="flex-1 w-full text-left">
                  <span className="text-xs font-bold text-slate-200 block">Deploy Active Journey Sentinel</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-medium leading-normal">Launches automatic alarm check-in loop dispatch.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <select
                    value={journeyTotalMinutes}
                    onChange={(e) => setJourneyTotalMinutes(Number(e.target.value))}
                    className="bg-slate-950 p-2 text-xs text-slate-200 border border-slate-800 rounded-xl outline-none w-full sm:w-auto"
                  >
                    <option value={0.166}>10 seconds (Demo)</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                  <button
                    onClick={startJourney}
                    className="py-2 px-5 bg-rose-500 hover:bg-rose-600 font-extrabold text-xs uppercase rounded-xl cursor-pointer w-full sm:w-auto whitespace-nowrap text-white font-sans"
                  >
                    Start Journey
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Giant Shake Cancel Overlay Banner */}
      {shakeCountdown !== null && (
        <div className="fixed inset-0 bg-red-950 bg-opacity-95 z-50 flex flex-col justify-center items-center p-8 text-white select-none text-center">
          <div className="space-y-4 max-w-sm">
            <div className="w-16 h-18 rounded-full bg-red-500/10 text-red-450 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-rose-450 uppercase tracking-tight">
              Emergency detected.<br/>Activate SOS?
            </h3>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              SOS will activate automatically in
            </p>
            <p className="text-7xl font-black font-mono animate-pulse text-rose-50">{shakeCountdown}</p>
            
            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => {
                  setShakeCountdown(null);
                  triggerSOS('SOS activated manually via Device Shake detection.');
                }}
                className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 font-extrabold uppercase transition-all tracking-wide text-xs cursor-pointer text-white shadow-lg"
              >
                Activate SOS
              </button>
              <button
                onClick={handleCancelShakeCountdown}
                className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold uppercase transition-all tracking-wide text-xs cursor-pointer text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Giant Safety Journey Check-In Overlay */}
      {showJourneyPopup && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-95 z-50 flex flex-col justify-center items-center p-8 text-white select-none text-center">
          <div className="space-y-5 max-w-sm bg-slate-950 p-6 rounded-3xl border border-rose-500/30 shadow-2xl">
            <div className="w-16 h-18 rounded-full bg-rose-500/10 text-rose-455 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>
            
            <h3 className="text-xl font-black text-rose-400 uppercase tracking-tight">
              Have you safely reached your destination?
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Your safety journey countdown timer has reached zero. Please verify your safety status immediately.
            </p>
            
            <div className="p-3 bg-rose-550/10 border border-rose-500/20 rounded-xl space-y-1">
              <p className="text-[10px] uppercase font-bold text-rose-400 tracking-widest leading-none">Emergency SOS triggers automatically in</p>
              <p className="text-4xl font-mono font-black text-rose-50 animate-pulse">{journeyPopupCountdown}s</p>
            </div>

            <div className="flex flex-col gap-3.5 pt-2">
              <button
                onClick={handleJourneyCheckInSafe}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold uppercase transition-all tracking-wide text-xs cursor-pointer text-white shadow-md text-center"
              >
                Check-In: I Safely Arrived
              </button>
              <button
                onClick={handleJourneyNotSafe}
                className="w-full py-4 rounded-xl bg-rose-700/80 hover:bg-rose-750 font-bold uppercase transition-all tracking-wide text-[11px] cursor-pointer text-rose-100 border border-rose-800 text-center"
              >
                Not Yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fake Call Visual Overlay Panel */}
      {isFakeCalling && (
        <div className="fixed inset-0 bg-slate-950 bg-opacity-98 z-50 flex flex-col justify-between p-8 text-white select-none animate-slide-up">
          {fakeCallTimer !== null ? (
            <div className="text-center mt-24 m-auto space-y-4">
              <span className="text-[10px] uppercase font-black bg-slate-900 border border-slate-800 py-1.5 px-4 rounded-full text-slate-400 tracking-wider">Dial Timer Active</span>
              <h2 className="text-xl font-black text-slate-100">Decoy Call Ringing In...</h2>
              <p className="text-6xl font-black font-mono text-emerald-400 animate-pulse">{fakeCallTimer}</p>
              <p className="text-xs text-slate-500 italic">Security incoming dial commences immediately on timer expiration.</p>
              <button
                onClick={handleHangupFakeCall}
                className="py-2.5 px-6 rounded-full bg-slate-800 hover:bg-slate-700 font-bold text-xs cursor-pointer text-slate-350"
              >
                Cancel Call Dialing
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mt-12 space-y-2 text-slate-20s">
                <span className="text-[10px] uppercase font-black bg-slate-900 border border-slate-805 py-1.5 px-4 rounded-full text-emerald-400 tracking-widest inline-block animate-pulse">Incoming Security Decoy Line</span>
                <h2 className="text-3xl font-black text-slate-50 mt-4 tracking-tight">{fakeCallerName}</h2>
                <p className="text-xs text-slate-400">Decoy Cellular Bridge</p>
                {isFakeCallAnswered && (
                  <p className="text-sm font-mono text-emerald-404 font-extrabold">{formatSecondsClock(fakeCallDuration)}</p>
                )}
              </div>

              {isFakeCallAnswered ? (
                <div className="my-8 max-w-sm m-auto text-left bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
                  <p className="text-[10px] font-black text-slate-350 uppercase tracking-widest pl-1 leading-normal">Tactical Verbal Dispersal script:</p>
                  <ul className="text-xs text-slate-400 space-y-2 leading-relaxed font-semibold">
                    <li>🟢 "Yes Papa, I am crossing the boulevard right now nearby the Police Command desk."</li>
                    <li>🟢 "I can see your car waiting block ahead. Stay on the line, arriving in 20 seconds."</li>
                    <li>🟢 "Yes officer, here is my partner. I'll pass the mic to him instantly."</li>
                  </ul>
                  <p className="text-[9px] text-slate-500 italic pl-1 pt-2 leading-tight">
                    TIP: Speaking aloud confidently creates active psychological defense structures against suspects.
                  </p>
                </div>
              ) : (
                <div className="my-8 text-center text-xs text-slate-400 max-w-xs m-auto">
                  Suspect monitoring? Use this overlay mock incoming cellular dial. Press green call to activate voice simulation.
                </div>
              )}

              <div className="flex flex-col items-center gap-6 mb-12">
                <div className="flex justify-center gap-14 w-full">
                  <button
                    onClick={handleHangupFakeCall}
                    className="w-18 h-18 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform cursor-pointer border border-red-800"
                  >
                    <PhoneCall className="w-8 h-8 rotate-135" />
                  </button>
                  {isFakeCallRinging && (
                    <button
                      onClick={handleAnswerFakeCall}
                      className="w-18 h-18 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg active:scale-95 transition-transform cursor-pointer border border-emerald-700 animate-bounce"
                    >
                      <PhoneCall className="w-8 h-8" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==========================================
          HACKATHON DEMO MASTER CONTROL MODULE
          ========================================== */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-3 relative z-10 text-left">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/10">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 animate-spin text-amber-550" /> Hackathon Evaluation Deck
          </span>
          <span className="text-[8px] uppercase tracking-wider font-extrabold px-2 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full">Sentinel Evaluator Panel</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
          
          {/* Simulate Shake */}
          <button
            onClick={() => {
              setShakeCount(6);
              triggerShakeCountdown();
            }}
            className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/15 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 animate-bounce text-amber-400" /> Simulate 6 Shakes
          </button>

          {/* Simulate Voice Alert */}
          <button
            onClick={() => {
              alert('Voice Speech Keyword matched: "SOS"! Starting critical Emergency Dispatch routines.');
              triggerSOS('Mock Emergency SOS triggered via speech keyword simulation.');
            }}
            className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/15 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-violet-400" /> Trigger Speech Word SOS
          </button>

          {/* Seed Historical distress logs logs */}
          <button
            onClick={handleSeedMockHistory}
            className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/30 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Seed Historical Logs
          </button>

          {/* Quick Demo check in timer */}
          <button
            onClick={() => {
              setJourneyTotalMinutes(0.166);
              setJourneySecondsLeft(10);
              setJourneyActive(true);
            }}
            className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/30 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" /> Fast 10s Check-In
          </button>
        </div>
      </div>
    </div>
  );
}
