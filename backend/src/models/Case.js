import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
}, { _id: false });

const caseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Supabase user UUID
  title: { type: String, required: true, default: 'Untitled case' },
  category: { type: String, default: 'consumer' },
  language: { type: String, default: 'en' },
  messages: { type: [messageSchema], default: [] },
  summary: { type: String, default: null },
  letter: { type: String, default: null },
}, {
  timestamps: true, // adds createdAt and updatedAt automatically
});

// Compound index for fast per-user lookups sorted by recency
caseSchema.index({ userId: 1, updatedAt: -1 });

export const Case = mongoose.model('Case', caseSchema);
