import crypto from 'node:crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { authenticateApiKey } from './middleware/auth.js';
import { supabase } from './supabase.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true
}));
app.use(express.json({ limit: '256kb' }));

const createProjectSchema = z.object({
  name: z.string().min(2).max(120)
});

const eventSchema = z.object({
  channel: z.string().min(1).max(60),
  title: z.string().min(1).max(240),
  description: z.string().max(5000).optional(),
  emoji: z.string().max(16).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  eventTime: z.string().datetime().optional()
});

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'events-api' });
});

app.post('/api/projects', async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const rawKey = `evt_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parsed.data.name,
      api_key_hash: apiKeyHash,
      api_key_last4: rawKey.slice(-4)
    })
    .select('id, name, created_at')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Unable to create project', details: error.message });
  }

  return res.status(201).json({
    project: data,
    apiKey: rawKey
  });
});

app.post('/api/events', authenticateApiKey, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const { data, error } = await supabase
    .from('events')
    .insert({
      project_id: req.project.id,
      channel: payload.channel,
      title: payload.title,
      description: payload.description || null,
      emoji: payload.emoji || null,
      tags: payload.tags || [],
      event_time: payload.eventTime || new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to store event', details: error.message });
  }

  res.status(201).json({ event: data });
});

app.get('/api/events/recent', authenticateApiKey, async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('project_id', req.project.id)
    .order('event_time', { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }

  res.json({ events: data });
});

app.delete('/api/events/:id', authenticateApiKey, async (req, res) => {
  const eventId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, project_id')
    .eq('id', eventId)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: 'Failed to lookup event', details: fetchError.message });
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  if (event.project_id !== req.project.id) {
    return res.status(403).json({ error: 'Not authorized to delete this event' });
  }

  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (deleteError) {
    return res.status(500).json({ error: 'Failed to delete event', details: deleteError.message });
  }

  return res.json({ ok: true });
});

app.delete('/api/projects/:id', authenticateApiKey, async (req, res) => {
  const projectId = req.params.id;
  if (projectId !== req.project.id) {
    return res.status(403).json({ error: 'Not authorized to delete this project' });
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    return res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }

  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`events-api listening on :${port}`);
});
