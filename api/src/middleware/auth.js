import crypto from 'node:crypto';
import { supabase } from '../supabase.js';

function keyFromRequest(req) {
  const headerKey = req.header('x-api-key');
  if (headerKey) return headerKey.trim();

  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }

  return null;
}

export async function authenticateApiKey(req, res, next) {
  const key = keyFromRequest(req);
  if (!key) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const hash = crypto.createHash('sha256').update(key).digest('hex');

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('api_key_hash', hash)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'Authentication query failed' });
  }

  if (!project) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.project = project;
  next();
}
