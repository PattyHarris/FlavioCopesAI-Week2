# Week 2

The instructions for this week are confusing, but what it boils down to is a front end and a remote back end. The front end should require a "new project" where the user gives an ID and a name. The back end should be attached to live data - more on that later.

## Restarting This Project

NOTE: cron job on Render is currently suspended.

To re-activate jobs in the terminal:
-- dashboard/npm run dev
-- events-api/npm run dev (for local testing)
For remote testing, on Render
-- Reactivate the cron job in render
-- You may need to redploy FlavioCopesAIWeek2-LiveData
Supabase: Flavio Copes AI Bootcamp Week 2 may need to be reactivated. They are automatically paused after 1 week. On the free tier you are allowed only 2 active projects.

1. See this URL (that may be closed off later) for an introduction to Vercel's V0 platform - it's an unlocked class from one of Flavio's prior courses:

   ```URL
       [v0-315aaea99f25801d85dcd070d5220cce](https://flaviocopes.notion.site/v0-315aaea99f25801d85dcd070d5220cce)
   ```

2. To use a discount code:
   I have managed to get everyone $30 in v0 credits, giving some free allowance for those waiting on the OpenAI credits (hopefully those will be unlocked soon!!)

   use code FLAVIO-V0

   Also if you sign up with my referral link you get $5 free, so it's $35 in credits total. Basically almost 2 months of the v0 Pro plan.

   credits will expire in 3 months, and can be redeemed once per v0 account.

3. This week's class also includes a video on setting up the project using v0 as well as Codex.
4. Set up a free Supabase account using Github.
5. The Project is Flavio Copes AI Bootcamp Week 2 with a password using the alternate bar with 2 ending non-alphabetic characters.
6. This is what the Codex generated:

   ```text
   Implemented a complete two-part app scaffold in your workspace:

   Remote-ready Node/Express API with API key auth and Supabase storage.
   Local React dashboard with realtime feed, channel filter, search, and activity chart.
   Key files:

   API server: api/src/index.js
   API auth middleware: api/src/middleware/auth.js
   Supabase SQL schema: supabase/schema.sql
   Dashboard app: dashboard/src/App.jsx
   Chart component: dashboard/src/components/ActivityChart.jsx
   Feed component: dashboard/src/components/EventFeed.jsx
   Dashboard styling: dashboard/src/styles.css
   Setup/run instructions: README.md
   What’s included:

   POST /api/projects generates project + API key.
   POST /api/events ingests events with x-api-key (or Bearer token).
   Events stored in Supabase events table.
   Dashboard:
   reverse-chronological feed
   filter by channel
   search title/description/tags
   14-day activity chart
   realtime updates via Supabase postgres_changes
   Validation:

   API JS files pass node --check.
   JSX validation/build was not run because dependencies are not installed yet.
   Next steps:

   Run the SQL in Supabase: supabase/schema.sql
   Configure envs from .env.example in api and dashboard.
   Install and run:
        cd api && npm install && npm run dev
        cd dashboard && npm install && npm run dev
        Deploy api to an always-on host (Render/Railway/Fly/ VPS), keep dashboard local.

    To run step 1:

    Do exactly this:

    Open your Supabase project in browser.
    Left sidebar -> SQL Editor.
    Click New query.
    Open supabase/schema.sql, copy all SQL, paste into the query.
    Click Run.
    After it runs, verify:

    Table Editor shows public.projects and public.events.
    In Database -> Replication (or Publications), events is in supabase_realtime.
    No red SQL errors in the query result panel.
    If you get an error, paste it here and I’ll give you the exact fix.

    To run step 2:

    In api:

    Copy api/.env.example to api/.env
    Fill values:
    SUPABASE_URL: from Supabase Settings -> API -> Project URL
    SUPABASE_SERVICE_ROLE_KEY: from same page (service_role key, secret)
    PORT=8080
    CORS_ORIGINS=http://localhost:5173
    In dashboard:

    Copy dashboard/.env.example to dashboard/.env
    Fill values:
    VITE_SUPABASE_URL: same Project URL
    VITE_SUPABASE_ANON_KEY: anon public key
    VITE_PROJECT_ID: will come from calling POST /api/projects once API is running
    Important:

    Never expose SUPABASE_SERVICE_ROLE_KEY in frontend code.
    api/.env and dashboard/.env stay local and should not be committed.

   ```

   I had ChatGPT run step 2 and then additionally clarify the keys:
   api/.env -> your Supabase secret key
   dashboard/.env -> your Supabase publishable key

   And then since the dashboard is local:
   Then run:

   cd api && npm install && npm run dev
   cd dashboard && npm install && npm run dev

7. Since I was confused about what this project was supposed to do, I initially had an error and need to run this (as instructed by AI) to fix an error:

   ```bash

       curl -X POST http://localhost:8080/api/projects \

       -H 'content-type: application/json' \
       -d '{"name":"My Monitoring Project"}'
       {"project":{"id":"d9e6a038-7991-4a13-820b-20a01c5a3e8b","name":"My Monitoring Project","created*at":"2026-03-07T01:04:35.293425+00:00"},"apiKey":"evt*<PROJECT_API_KEY_1>"}

   ```

8. I asked the AI to fix this and it added this as per my instructions:

   ```text
   Implemented. The dashboard now has the project onboarding flow you described.

   What changed:

   Added top bar with page title Events Dashboard, project dropdown, and + button.
   Added welcome state:
       Welcome to Events Dashboard
   instruction to select or create a project
   Added + modal:
   fields for Project Name, optional Project ID, optional API Key
   if ID+API key are provided, it saves an existing project locally
   if left blank, it calls POST /api/projects and creates one via API
   After selecting/creating a project, it transitions to the live dashboard UI.
   New project API key is shown once so you can save it.
   Saved projects persist in browser local storage.

   I also updated your local env to include API base URL and cleaned project ID formatting:

       dashboard/.env
   ```

9. I didn't see the main dashboard page so I needed to essentially a new project setup - e.g. clear any project data that was there. ChatGPT indicated that I did NOT need to refresh the database, but instead:

Current behavior is expected because the dashboard remembers project selection and auto-enters the dashboard view on reload.

Why this happens:

It loads saved projects from browser localStorage (events-dashboard-projects-v1)
It also uses VITE_PROJECT_ID from dashboard/.env as an initial selection
If you want to see the main entry page again:

Remove VITE_PROJECT_ID from dashboard/.env
Restart npm run dev

Clear saved projects in browser local storage:
DevTools -> Application -> Local Storage -> delete key events-dashboard-projects-v1
or run in console:
localStorage.removeItem('events-dashboard-projects-v1')
Only refresh DB data if you want to delete events/projects, not for entry-page behavior.

10. Flavio added some test data which I asked AI to help import: Added and ready.

New script:

scripts/import-events.sh
It does:

reads .events[] from your JSON
maps icon -> emoji
converts tag objects to string arrays
converts minutes_ago -> eventTime
POSTs each event to /api/events
prints success/failure totals
Run it like this:

cd /Users/pattyharris/Documents/FlavioCopesBootcamp/AIBootcamp/Week2
./scripts/import-events.sh evt_your_real_key_here TestData/saas-demo.json

If your API is remote:

./scripts/import-events.sh evt_your_real_key_here TestData/saas-demo.json https://your-api-host.com

I also documented this in README.md.

To get the API key, add a project, create the name, and save the API key shown. Then select the project in the dropdown.

AI made a UI change such that the API key is shown to the user once the project is created and from that modal dialog, the user can copy the API key for later usage (e.g. script to upload data).

Using this API key:
evt\_<PROJECT_API_KEY_2>

./scripts/import-events.sh evt\_<PROJECT_API_KEY_2> TestData/saas-demo.json

11. To deploy to Render:

    Push code to GitHub
    Make sure api/ and your latest changes are committed and pushed.
    Create a new Render Web Service
    Render dashboard -> New -> Web Service
    Connect your GitHub repo

    Configure:
    Branch: main (or your deploy branch)
    Root Directory: api
    Runtime: Node
    Build Command: npm ci
    Start Command: npm start
    Instance Type: Free (or paid)

    Add environment variables in Render
    SUPABASE_URL = your Supabase project URL
    SUPABASE_SECRET_KEY = your Supabase secret key
    CORS_ORIGINS = http://localhost:5173,http://127.0.0.1:5173

    Do not put these in GitHub; set them in Render service settings.

    Health check
    In Render service settings, set health check path to:
    /health

    Deploy
    Click Create Web Service
    Wait for deploy logs to finish
    Test:
    curl https://<your-service>.onrender.com/health
    Point your local dashboard to remote API
    In dashboard/.env:
    VITE_API_BASE_URL=https://<your-service>.onrender.com
    Restart dashboard dev server.

    Important note:

    On Render Free, services spin down after idle time (cold starts). For truly always-on behavior, use a paid instance.
    Sources:

    https://render.com/docs/your-first-deploy
    https://render.com/docs/monorepo-support
    https://render.com/docs/deploys
    https://render.com/docs/health-checks
    https://render.com/free

12. Git repository:
    1.  First, make the repo on Git! It is automatically set to "public".
    2.  Then init the vscode repo
    3.  Use these commands (given by git) to associate the vscode repo with the online repo - in the Week2 folder:
        1.  remote add origin https://github.com/PattyHarris/FlavioCopesAI-Week2.git
        2.  branch -M master
        3.  This last one didn't work: push -u origin master
    4.  Then, when you start using git to send changes, it works with the online repo.

13. Test - NOTE: I changed the project name in Render to "Flavio Copes AI Bootcamp" so the deploy may not be the same. You can only have 1 project in the free tier.

    ```bash
    curl https://flaviocopesai-week2.onrender.com/health
    ```

14. To add a new event to a given project:

    ```bash
    curl -X POST https://flaviocopesai-week2.onrender.com/api/events \
    -H 'content-type: application/json' \
    -H 'x-api-key: evt\_<PROJECT_API_KEY_2>' \
    -d '{"channel":"deploys","title":"Manual test event","description":"Sent via curl to Render API","emoji":"🧪","tags":["manual","render-test"]}'
    ```

15. To test the script used for pinging weather - see change to deployment URL above - changed the project name in Render....
    OPENWEATHER*API_KEY=<OPENWEATHER_API_KEY> \
    WEATHER_LAT=37.7749 \
    WEATHER_LON=-122.4194 \
    WEATHER_LABEL="San Francisco" \
    EVENTS_API_BASE_URL=https://flaviocopesai-week2.onrender.com \
    EVENTS_API_KEY=evt*<PROJECT_API_KEY_2> \
    node scripts/push-weather-event.mjs

    Snapshot of all IDs:

    SUPABASE*URL -> which Supabase project/database
    SUPABASE_SECRET_KEY -> backend access to that database
    project.id (UUID) -> which dashboard project to view
    evt*... API key -> permission to send events into that project
    OpenWeather API key -> permission to read weather data from OpenWeather

16. New weather project:
    Key: evt\_<WEATHER_PROJECT_API_KEY>

17. For the Chron job:
    Test once locally

    OPENWEATHER*API_KEY=... \
    WEATHER_LAT=37.7749 \
    WEATHER_LON=-122.4194 \
    WEATHER_LABEL="San Francisco" \
    EVENTS_API_BASE_URL=https://flaviocopesai-week2.onrender.com \
    EVENTS_API_KEY=evt*<WEATHER_PROJECT_API_KEY> \
    node scripts/push-weather-event.mjs
    1. Create a Render Cron Job

       New -> Cron Job
       Repo: same repo
       Branch: main
       Root directory: project root
       Build command: npm ci --prefix api (or just echo "no build" if not needed)
       Command: node scripts/push-weather-event.mjs
       Schedule: _/10 _ \* \* \* (every 10 min, UTC)

    2. Add Cron Job env vars

       OPENWEATHER_API_KEY
       WEATHER_LAT
       WEATHER_LON
       WEATHER_LABEL
       EVENTS_API_BASE_URL=https://flaviocopesai-week2.onrender.com
       EVENTS_API_KEY (from your project in your events system)
       optional WEATHER_UNITS=metric

       That gives you continuous weather events flowing into the same realtime dashboard.

    Sources:

    OpenWeather API overview: https://openweathermap.org/api
    OpenWeather current weather endpoint: https://old.openweathermap.org/current
    Render Cron Jobs: https://render.com/docs/cronjobs

Apparently I cannot store the evt_keys on git:

Security follow-up:

Rotate your OpenWeather key.
Rotate any evt\_... project API keys that were written in notes/terminal history.

NOTE: cron job is currently suspended....

For retesting:

Quick retest sequence:

POST /api/projects (expect project.id + apiKey)
POST /api/events with that apiKey (expect 201)
Confirm event appears in dashboard feed

18. Before moving to Week3 I want to added authentication to this project as a test to next week's project:

    RLS = Row Level Security.
    It is Supabase/Postgres policy logic that decides which rows each logged-in user is allowed to read/write. Without strong RLS, people can still query data if they have the frontend key.

    I implemented the hardening for you.

    What I changed:

    Enforced auth + ownership in DB policies
    Updated schema.sql:
    projects.owner_user_id column added
    projects readable only when owner_user_id = auth.uid()
    events readable only if event’s project belongs to auth.uid()
    old anon-read policy removed
    Bound project creation to logged-in Supabase user
    Updated index.js:
    POST /api/projects now requires Authorization: Bearer <supabase access token>
    backend validates token via Supabase Auth and stores owner_user_id
    Dashboard sends Supabase access token when creating projects
    Updated App.jsx:
    create-project request now includes Authorization bearer token
    Added login/logout UI gate (from prior step)
    App.jsx
    styles.css
    Docs updated
    README.md
    Validation:

    node --check api/src/index.js passed
    npm --prefix dashboard run build passed
    What you need to do next:

    Run updated schema.sql in Supabase SQL Editor.

    If you had old projects, backfill owner_user_id once (README includes SQL).

    Redeploy backend on Render (so new auth requirement for POST /api/projects is live).

    Restart local dashboard.
    If you want, I can give you the exact SQL to backfill ownership for the user currently logged in (using their auth UUID).

## Issue with resuming the project

I had resumed the cron job which is "San Francisco Weather", but not the backend service which is "FlavioCopesAI-Week2".

Response from the Agent:

This one is clear from the log: the cron job itself is running, but the URL in EVENTS_API_BASE_URL is returning Render’s Service Suspended page.

The important line is:

Error: Events API failed: 503 ... <title>Service Suspended</title>
So the failure is not in push-weather-event.mjs. It means the cron job successfully called your weather API, then tried to post to your Events API, but that Render service is currently suspended.

What to check:

In Render, open the web service used for your API.
Make sure it is active, not suspended.
If it was on the free tier, Render may have suspended it.
Verify EVENTS_API_BASE_URL in the cron job.
It should point to the currently active API service URL.
If you renamed or recreated the Render service, the cron job may still be using the old URL.
Test the API URL directly in a browser or terminal:
curl https://your-api-service.onrender.com/health
If that returns the suspended HTML or a 503, the cron job is correct and the API service is the issue.
If /health works, then the cron job env var is probably pointing at the wrong service URL.
Most likely fix:

Update EVENTS_API_BASE_URL in the Render cron job to the active API service URL.
Or unsuspend/redeploy the API service if it’s the right URL but currently suspended.
If you want, paste the current EVENTS_API_BASE_URL value and the current Render API service URL, and I’ll compare them with you.

So the problem was that I had only resumed the cron job, NOT the service.

## Problem with 2 Browsers

We didn’t need a table change after all. The project metadata was already in Supabase; the real issue was that the dashboard was using browser localStorage as the project source. I changed that so the dashboard now loads the project list from Supabase and only keeps per-browser secrets like apiKey in local storage.

That means Safari should now see the same projects as Chrome as soon as you log into the same account, because the list comes from the projects table. I also added a migration path for your old Chrome storage: the app reads the legacy events-dashboard-projects-v1, extracts any saved API keys, and stores them in a new per-browser secret cache. So your Chrome setup should keep working, and Safari should at least see the projects even if it doesn’t yet have the local API keys for delete actions.

I updated App.jsx and verified it with a dashboard build. One important limitation remains: full API keys still cannot be synced from Chrome to Supabase, because the database intentionally stores only hashed keys. So cross-browser project visibility now works, but actions that require the raw evt\_... key, like project deletion or event deletion, will still need that key entered once in each browser if it isn’t already cached there.

Next step is simple: restart the dashboard dev server in Chrome and Safari, log into the same account in both, and Safari should now load the project list from Supabase. If you want, I can take one more pass and add a small “Connect API key” button next to projects that are visible but missing a local key.

### Important

With new button for "Connect API Key":

One important follow-up: because I added GET /api/projects/:id/verify, you’ll want to redeploy the backend so Safari can use the new verification step.

## Rotation of Keys

A Rotate API Key feature would let you keep the same project and same event history, but replace the old evt\_... key with a new one.

How it would work:

1. You click Rotate API Key for a project.
2. The app calls a backend endpoint like:
   POST /api/projects/:id/rotate-key
3. The backend verifies you’re authorized for that project.
4. It generates a new raw evt\_... key.
5. It stores only the new hash in projects.api_key_hash and updates api_key_last4.
6. It returns the new raw key one time to the UI.
7. Old key immediately stops working.
8. New key is used going forward for:
   - import-events.sh
   - cron jobs
   - any external app posting events

Why it’s better than deleting/recreating:

- same project.id
- same event history
- no need to migrate or lose data
- safer operationally

Tradeoff:

every external sender using the old key must be updated

If you want, I can implement this next with:

- backend rotate endpoint
- UI button + confirmation modal
- one-time “new API key” display just like project creation

### Implementation

Implemented. You can now rotate a project API key without deleting the project or losing its event history.

The backend now has POST /api/projects/:id/rotate-key, authenticated with the current project key, and the dashboard has Rotate API Key actions on both the main project list and the project header. When you rotate, the old key is invalidated immediately and the new one-time key is shown in the same modal used for project creation, with updated messaging so it’s clear that scripts, cron jobs, and external senders need to be updated. I also documented the new flow in README.md.

The main code changes are in api/src/index.js and dashboard/src/App.jsx. I verified the API with node --check and the dashboard with a full production build.

To use it, redeploy the backend first so the new rotate endpoint is live. After that, click Rotate API Key for the affected project, then update anything still using the old key, like import-events.sh, Render cron job env vars, or other event senders.
