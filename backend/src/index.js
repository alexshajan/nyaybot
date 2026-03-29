import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { Case } from './models/Case.js';

dotenv.config();

const app = express();

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-06-17' });

// Supabase — auth only (JWT verification)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// ─── Auth middleware ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user || null;
  }
  next();
}

// ─── Gemini helper ────────────────────────────────────────────────────────────
// Converts our {role, content} message history to Gemini's format
// and calls the API with a system instruction
async function callGemini(systemPrompt, messages, maxTokens = 1024) {
  // Gemini uses 'user' and 'model' roles (not 'assistant')
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1].content;

  const chat = model.startChat({
    systemInstruction: systemPrompt,
    history,
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}

// ─── AI prompts ───────────────────────────────────────────────────────────────
const SYSTEM_TEMPLATE = `You are NyayBot, a warm and knowledgeable AI legal assistant for everyday Indians. You explain legal rights and next steps clearly — like a trusted friend who knows Indian law.

Current legal category: {CAT}
Current language: {LANG}

If the language is Hindi (hi), respond entirely in Hindi (Devanagari script).
If the language is Malayalam (ml), respond entirely in Malayalam script.
Otherwise respond in clear English.

Structure EVERY response using these four HTML-formatted sections:
<span class="sl sl-s">Your Situation</span> — briefly reflect what you understood (1-2 sentences)<br>
<span class="sl sl-r">Your Rights</span> — relevant Indian law(s) in plain language (2-3 sentences)<br>
<span class="sl sl-o">Your Options</span> — 2-3 concrete options the person has<br>
<span class="sl sl-n">Your Next Step</span> — ONE clear immediate action to take<br>

Use <b>bold</b> for law names and important terms. Use <br> for line breaks.
Keep each section to 2-4 sentences. Be warm, direct, and actionable.
Never say "I cannot provide legal advice" — say "This is general legal information" and be genuinely helpful.
If truly complex, suggest a lawyer while still giving basic info.`;

const LETTER_TEMPLATE = `Based on this conversation, draft a formal legal complaint letter in {LANG}.
Include: Date, From: [YOUR NAME] / [YOUR ADDRESS], To: [appropriate authority], Subject, body with facts, reliefs sought (numbered), closing.
Reference specific Indian laws from the conversation.
End: Yours faithfully, / [YOUR NAME] / [DATE]
Return ONLY the letter text, nothing else.

Conversation:
{SUMMARY}`;

const SUMMARY_TEMPLATE = `Summarise this legal conversation into a concise case summary in plain English.

Format exactly as:
SITUATION: [1 sentence]
LEGAL BASIS: [relevant Indian law(s)]
KEY RIGHTS:
• [Right 1]
• [Right 2]
• [Right 3]
RECOMMENDED ACTION: [1 clear next step]
DISCLAIMER: This is general legal information, not legal advice.

Conversation:
{SUMMARY}`;

const TITLE_TEMPLATE = `Generate a short 4-8 word title for this legal case based on the user's first message.
Be specific. Example: "Amazon refund denied for defective phone"
Return ONLY the title, nothing else.
User message: {MSG}`;

// ─── Chat ─────────────────────────────────────────────────────────────────────
app.post('/api/chat', optionalAuth, async (req, res) => {
  const { messages, category, language } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const system = SYSTEM_TEMPLATE
    .replace('{CAT}', category || 'consumer')
    .replace('{LANG}', language || 'en');

  try {
    const reply = await callGemini(system, messages, 1024);
    res.json({ content: reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// ─── Letter generator ─────────────────────────────────────────────────────────
app.post('/api/generate-letter', optionalAuth, async (req, res) => {
  const { messages, language } = req.body;
  const langLabel = language === 'hi' ? 'Hindi (Devanagari)'
    : language === 'ml' ? 'Malayalam script' : 'formal English';
  const summary = messages.map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`).join('\n');
  const prompt = LETTER_TEMPLATE.replace('{LANG}', langLabel).replace('{SUMMARY}', summary);

  try {
    const result = await model.generateContent(prompt);
    res.json({ letter: result.response.text() });
  } catch (err) {
    console.error('Letter error:', err);
    res.status(500).json({ error: 'Letter generation failed' });
  }
});

// ─── Summary generator ────────────────────────────────────────────────────────
app.post('/api/summarise', optionalAuth, async (req, res) => {
  const { messages } = req.body;
  const summary = messages.map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`).join('\n');
  const prompt = SUMMARY_TEMPLATE.replace('{SUMMARY}', summary);

  try {
    const result = await model.generateContent(prompt);
    res.json({ summary: result.response.text() });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Summary failed' });
  }
});

// ─── Cases CRUD (MongoDB) ─────────────────────────────────────────────────────
app.get('/api/cases', requireAuth, async (req, res) => {
  try {
    const cases = await Case.find({ userId: req.user.id })
      .select('_id title category language createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    const c = await Case.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!c) return res.status(404).json({ error: 'Case not found' });
    res.json({ case: c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cases', requireAuth, async (req, res) => {
  const { messages, category, language, summary, letter } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  // Auto-generate title
  let title = 'Untitled case';
  try {
    const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
    const prompt = TITLE_TEMPLATE.replace('{MSG}', firstUserMsg.slice(0, 200));
    const result = await model.generateContent(prompt);
    title = result.response.text().trim().replace(/^["']|["']$/g, '');
  } catch {}

  try {
    const newCase = await Case.create({
      userId: req.user.id, title, category, language, messages,
      summary: summary || null, letter: letter || null,
    });
    res.json({ case: newCase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/cases/:id', requireAuth, async (req, res) => {
  const { messages, summary, letter } = req.body;
  const updates = {};
  if (messages) updates.messages = messages;
  if (summary) updates.summary = summary;
  if (letter) updates.letter = letter;

  try {
    const updated = await Case.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Case not found' });
    res.json({ case: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    await Case.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  ai: 'gemini-2.5-flash-lite',
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`NyayBot backend running on port ${PORT}`));
