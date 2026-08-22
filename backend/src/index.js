import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Case } from './models/Case.js';
import { LETTER_TEMPLATE, SUMMARY_TEMPLATE, SYSTEM_TEMPLATE, TITLE_TEMPLATE } from './templates/prompt.js';
import init from './bootstrap.js';

dotenv.config();

const app = express();

const { model, supabase } = await init(app);

function serializeCase(caseDoc) {
  if (!caseDoc) return null;
  const plain = typeof caseDoc.toObject === 'function' ? caseDoc.toObject() : caseDoc;
  return {
    ...plain,
    id: plain._id?.toString(),
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
}

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
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    history,
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
app.post('/api/chat', optionalAuth, async (req, res) => {
  const { messages, category, language } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages required' });
  }

  const validMessages = messages.every(m =>
    m
    && ['user', 'assistant'].includes(m.role)
    && typeof m.content === 'string'
    && m.content.trim()
  );
  if (!validMessages) {
    return res.status(400).json({ error: 'messages must include role and content' });
  }

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
    res.json({ cases: cases.map(serializeCase) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    const c = await Case.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!c) return res.status(404).json({ error: 'Case not found' });
    res.json({ case: serializeCase(c) });
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
    res.json({ case: serializeCase(newCase) });
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
    res.json({ case: serializeCase(updated) });
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
