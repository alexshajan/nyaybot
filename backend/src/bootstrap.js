import cors from 'cors';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';

export default async function init(app) {
  const requiredEnv = [
    'GEMINI_API_KEY',
    'MONGODB_URI',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missingEnv = requiredEnv.filter(name => !process.env[name]);
  if (missingEnv.length) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  }

  // Gemini client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

  // Supabase — auth only (JWT verification)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.error('Check that MONGODB_URI uses the exact Atlas connection string and includes /nyaybot before query params.');
    process.exit(1);
  }

  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
  app.use(express.json());

  return { model, supabase };
}
