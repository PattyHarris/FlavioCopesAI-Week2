import { useEffect, useMemo, useState } from 'react';
import ActivityChart from './components/ActivityChart.jsx';
import EventFeed from './components/EventFeed.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authInfo, setAuthInfo] = useState('');

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

  const [deletingEventIds, setDeletingEventIds] = useState(() => new Set());
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    async function loadSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
      } else {
        setSession(data.session ?? null);
      }
      setAuthLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
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
  }, [selectedProjectId, session]);

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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`
          },
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

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError('');
    setAuthInfo('');

    if (!authEmail.trim() || !authPassword) {
      setError('Email and password are required.');
      return;
    }

    setAuthBusy(true);
    try {
      if (authMode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword
        });
        if (signUpError) throw signUpError;
        setAuthMode('signin');
        setAuthInfo('Account created. Confirm your email if required, then sign in.');
      }
      setAuthPassword('');
    } catch (authError) {
      setError(authError.message || 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    setError('');
    await supabase.auth.signOut();
    resetToHome();
  }

  function resetToHome() {
    setSelectedProjectId('');
    setChannel('all');
    setSearch('');
    setEvents([]);
  }

  async function handleDeleteEvent(event) {
    if (!selectedProject?.apiKey) {
      setError('Missing API key for this project. Re-add the project with its API key to delete events.');
      return;
    }

    setDeletingEventIds((prev) => {
      const next = new Set(prev);
      next.add(event.id);
      return next;
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${event.id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': selectedProject.apiKey
        }
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to delete event');
      }

      setEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete event.');
    } finally {
      setDeletingEventIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }
  }

  function requestDeleteProject(project) {
    setProjectToDelete(project);
  }

  async function handleConfirmDeleteProject() {
    if (!projectToDelete) return;
    if (!projectToDelete.apiKey) {
      setError('Missing API key for this project. Re-add the project with its API key to delete it.');
      setProjectToDelete(null);
      return;
    }

    setDeletingProject(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': projectToDelete.apiKey
        }
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to delete project');
      }

      setProjects((prev) => prev.filter((project) => project.id !== projectToDelete.id));
      if (selectedProjectId === projectToDelete.id) {
        resetToHome();
      }
      setProjectToDelete(null);
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete project.');
      setProjectToDelete(null);
    } finally {
      setDeletingProject(false);
    }
  }

  const showAuthenticatedApp = hasSupabaseConfig && !authLoading && Boolean(session);

  return (
    <main className="app-shell">
      {!hasSupabaseConfig ? (
        <section className="panel setup-panel">
          <h2>Configuration Required</h2>
          <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `dashboard/.env`.</p>
        </section>
      ) : null}

      {hasSupabaseConfig && authLoading ? (
        <section className="panel setup-panel">
          <h2>Checking session</h2>
          <p>Loading authentication state...</p>
        </section>
      ) : null}

      {hasSupabaseConfig && !authLoading && !session ? (
        <section className="panel auth-card">
          <h2>{authMode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <p>Login to access your dashboard projects.</p>
          {authInfo ? <p className="auth-info">{authInfo}</p> : null}
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Your password"
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </label>
            <div className="auth-actions">
              <button type="submit" disabled={authBusy}>
                {authBusy ? 'Please wait...' : authMode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setAuthInfo('');
                  setError('');
                  setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
                }}
                disabled={authBusy}
              >
                {authMode === 'signin' ? 'Need an account?' : 'Already have an account?'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {hasSupabaseConfig && !authLoading && !session ? (
        error ? <p className="error panel">{error}</p> : null
      ) : null}

      {showAuthenticatedApp ? (
      <>
      <header className="topbar">
        <div className="topbar-actions">
          <button type="button" className="ghost-btn" onClick={resetToHome} disabled={!showDashboard}>
            <HomeIcon />
            Home
          </button>
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
          <button type="button" className="ghost-btn" onClick={handleLogout}>Logout</button>
        </div>
        <h1>Events Dashboard</h1>
      </header>

      {!showDashboard ? (
        <section className="panel welcome-panel">
          <h2>Welcome to Events Dashboard</h2>
          <p>Select an existing project from the dropdown, or click + to create a new one.</p>
          <p>If you already have an API key and project UUID, add both in the create dialog to register that project locally.</p>

          {projects.length ? (
            <div className="project-list">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div>
                    <strong>{project.name}</strong>
                    <div className="muted">{project.id}</div>
                  </div>
                  <div className="project-actions">
                    <button type="button" onClick={() => setSelectedProjectId(project.id)}>Open</button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => requestDeleteProject(project)}
                      aria-label="Delete project"
                      disabled={!project.apiKey}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="title-with-actions">
              <h2>{selectedProject?.name || 'Live Events'}</h2>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => selectedProject && requestDeleteProject(selectedProject)}
                aria-label="Delete project"
                disabled={!selectedProject?.apiKey}
              >
                <TrashIcon />
              </button>
            </div>
            <p>Real-time feed for your project instrumentation.</p>
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

          <section className="widgets-row">
            <ActivityChart events={events} />
            <InsightsPanel events={events} />
          </section>
          <EventFeed events={filteredEvents} onDelete={handleDeleteEvent} deletingIds={deletingEventIds} />
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

      {projectToDelete ? (
        <div className="modal-overlay" onClick={() => setProjectToDelete(null)}>
          <section className="panel modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete project?</h3>
            <p>Are you sure? This action cannot be reversed.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setProjectToDelete(null)}>Cancel</button>
              <button type="button" className="danger" onClick={handleConfirmDeleteProject} disabled={deletingProject}>
                {deletingProject ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      </>
      ) : null}
    </main>
  );
}
