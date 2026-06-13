import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', firebaseSandbox: !process.env.FIREBASE_CONFIG });
  });

  // Gemini AI Safety Assistant endpoint
  app.post('/api/gemini/assist', async (req, res) => {
    const { messages, userProfile, currentLocation } = req.body;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in the Settings > Secrets panel.'
      });
    }

    try {
      // Build systemic prompt instructions
      const systemInstruction = `You are GuardianX AI Safety Coordinator, an empathetic, clear, and highly practical crisis response and situational safety assistant.
Your priority is keeping women safe in stressful, unfamiliar, or dangerous settings.

CRITICAL INSTRUCTIONS:
1. Under distress or crisis, write **vivid, concise, step-by-step guidance** with bold actions (e.g., **ENTER A PUBLIC WELL-LIT BUILDING**, **TRIGGER THE SOS SIREN**).
2. Avoid long theoretical text when the user indicates danger. Direct, crisp, bulleted commands save lives.
3. Suggest practical safety maneuvers: pretending to be on a call, holding keys between knuckles, heading towards open late-night commercial shops/hotels/police stations.
4. If location background is provided (lat ${currentLocation?.lat || 'unknown'}, lng ${currentLocation?.lng || 'unknown'}, address: ${currentLocation?.address || 'unknown'}), use this information to direct the user mathematically or logically to safe zones or safety protocols.
5. If medical conditions (${userProfile?.medicalConditions || 'none'}) are shared, keep them in mind for advice.
6. Urge them to click the **Red SOS Trigger** in the app immediately if they are in imminent physical danger so their emergency contacts (${userProfile?.phone ? 'and ' + userProfile.phone : 'and sirens'}) can be activated.
7. Be ultra-supportive, reassuring, calm, and direct. Use short, crisp sentences. Do not use corporate gibberish.`;

      // Format messages in the expected @google/genai SDK chats model
      // In Gemini, history must start with role: 'user'. Any leading 'model' messages should be skipped.
      const firstUserIndex = messages.findIndex((m: any) => m.role === 'user');
      const conversationalMessages = firstUserIndex !== -1 ? messages.slice(firstUserIndex) : messages;

      // Format as { role: 'user' | 'model', parts: [{ text: '...' }] }
      const formattedContents = conversationalMessages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      // Call Gemini API using the correct method
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "I am here for you. Please head toward a safe, well-lit public space, or press the SOS button to alert your trusted contacts.";
      res.json({ text: replyText });
    } catch (err: any) {
      console.error('Error invoking Gemini:', err);
      res.status(500).json({
        error: 'Error calling AI assistant: ' + (err.message || String(err))
      });
    }
  });

  // Vite middleware for dev / static files for prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GuardianX Server] Fullstack engine online at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GuardianX Server] Failed to initiate:', err);
});
