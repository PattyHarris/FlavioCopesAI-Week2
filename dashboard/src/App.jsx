import { useEffect, useMemo, useState } from 'react';
import ActivityChart from './components/ActivityChart.jsx';
import EventFeed from './components/EventFeed.jsx';
import { apiBaseUrl, hasSupabaseConfig, initialProjectId, supabase } from './supabase.js';

const STORAGE_KEY = 'events-dashboard-projects-v1';

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

function matchesSearch(event, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [event.title || '', event.description || '', ...(event.tags || [])].join(' ').toLowerCase();
  return haystack.includes(q);
}

function loadStoredProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((project) => isUuid(project.id) && project.name);
  } catch {
    return [];
  }
}

function saveStoredProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [projects, setProjects] = useState(() => loadStoredProjects());
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const stored = loadStoredProjects();
    if (isUuid(initialProjectId)) return initialProjectId;
    return stored[0]?.id || '';
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectIdInput, setProjectIdInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (!hasSupabaseConfig || !selectedProjectId || !isUuid(selectedProjectId)) {
      setEvents([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError('');

    async function loadEvents() {
      const { data, error: queryError } = await supabase
        .from('events')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('event_time', { ascending: false })
        .limit(500);

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }

    loadEvents();

    const channelSub = supabase
      .channel(`events:${selectedProjectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `project_id=eq.${selectedProjectId}`
      }, (payload) => {
        setEvents((prev) => [payload.new, ...prev].slice(0, 500));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channelSub);
    };
  }, [selectedProjectId]);

  const channels = useMemo(() => ['all', ...new Set(events.map((event) => event.channel))], [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const channelOk = channel === 'all' || event.channel === channel;
      return channelOk && matchesSearch(event, search);
    });
  }, [events, channel, search]);

  async function handleCreateProject(event) {
    event.preventDefault();
    setError('');

    if (!projectNameInput.trim()) {
      setError('Project name is required.');
      return;
    }

    setCreating(true);

    try {
      if (isUuid(projectIdInput.trim()) && apiKeyInput.trim()) {
        const existing = {
          id: projectIdInput.trim(),
          name: projectNameInput.trim(),
          apiKey: apiKeyInput.trim()
        };

        const deduped = [existing, ...projects.filter((project) => project.id !== existing.id)];
        setProjects(deduped);
        setSelectedProjectId(existing.id);
        setCreatedApiKey('');
      } else {
        const response = await fetch(`${apiBaseUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectNameInput.trim() })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to create project');
        }

        const created = {
          id: payload.project.id,
          name: payload.project.name,
          apiKey: payload.apiKey
        };

        const deduped = [created, ...projects.filter((project) => project.id !== created.id)];
        setProjects(deduped);
        setSelectedProjectId(created.id);
        setCreatedApiKey(created.apiKey || '');
        setShowApiKeyModal(Boolean(created.apiKey));
        setCopiedApiKey(false);
      }

      setProjectNameInput('');
      setProjectIdInput('');
      setApiKeyInput('');
      setShowCreateModal(false);
    } catch (createError) {
      setError(createError.message || 'Project creation failed.');
    } finally {
      setCreating(false);
    }
  }

  const showDashboard = hasSupabaseConfig && isUuid(selectedProjectId);

  async function handleCopyApiKey() {
    if (!createdApiKey) return;
    try {
      await navigator.clipboard.writeText(createdApiKey);
      setCopiedApiKey(true);
    } catch {
      setCopiedApiKey(false);
      setError('Could not copy API key automatically. Please copy it manually.');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Events Dashboard</h1>
        <div className="topbar-actions">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            aria-label="Select project"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button type="button" className="add-btn" onClick={() => setShowCreateModal(true)}>+</button>
        </div>
      </header>

      {!hasSupabaseConfig ? (
        <section className="panel setup-panel">
          <h2>Configuration Required</h2>
          <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `dashboard/.env`.</p>
        </section>
      ) : null}

      {!showDashboard ? (
        <section className="panel welcome-panel">
          <h2>Welcome to Events Dashboard</h2>
          <p>Select an existing project from the dropdown, or click + to create a new one.</p>
          <p>If you already have an API key and project UUID, add both in the create dialog to register that project locally.</p>
        </section>
      ) : (
        <>
          <section className="hero">
            <h2>{selectedProject?.name || 'Live Events'}</h2>
            <p>Real-time feed for your project instrumentation.</p>
          </section>

          <section className="stats-grid">
            <article className="panel stat">
              <span>Total Events</span>
              <strong>{events.length}</strong>
            </article>
            <article className="panel stat">
              <span>Visible</span>
              <strong>{filteredEvents.length}</strong>
            </article>
            <article className="panel stat">
              <span>Channels</span>
              <strong>{channels.length - 1}</strong>
            </article>
          </section>

          <section className="panel controls">
            <label>
              Channel
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {channels.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Search
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="title, description, tag"
              />
            </label>
          </section>

          {loading ? <p className="loading">Loading events…</p> : null}

          <section className="grid">
            <ActivityChart events={events} />
            <EventFeed events={filteredEvents} />
          </section>
        </>
      )}

      {error ? <p className="error panel">{error}</p> : null}

      {showCreateModal ? (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <section className="panel modal" onClick={(event) => event.stopPropagation()}>
            <h3>Create or Add Project</h3>
            <form onSubmit={handleCreateProject}>
              <label>
                Project Name
                <input
                  value={projectNameInput}
                  onChange={(event) => setProjectNameInput(event.target.value)}
                  placeholder="My Monitoring Project"
                  required
                />
              </label>

              <label>
                Project ID (optional)
                <input
                  value={projectIdInput}
                  onChange={(event) => setProjectIdInput(event.target.value)}
                  placeholder="UUID for existing project"
                />
              </label>

              <label>
                API Key (optional)
                <input
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder="evt_..."
                />
              </label>

              <p className="hint">Leave Project ID/API key blank to create a new project via API.</p>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={creating}>{creating ? 'Saving...' : 'Create'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showApiKeyModal ? (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <section className="panel modal key-modal" onClick={(event) => event.stopPropagation()}>
            <h3>API Key Created</h3>
            <p>Save this key now. You will not be able to view it again.</p>
            <code>{createdApiKey}</code>
            <div className="modal-actions">
              <button type="button" onClick={handleCopyApiKey}>
                {copiedApiKey ? 'Copied' : 'Copy Key'}
              </button>
              <button type="button" onClick={() => setShowApiKeyModal(false)}>Done</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
