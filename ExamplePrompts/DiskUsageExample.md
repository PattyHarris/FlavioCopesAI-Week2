# EventStream

A real-time event monitoring dashboard built with Next.js 16, Supabase, and Recharts. Send events from any service via a REST API and watch them appear instantly in a live feed with analytics.

---

## Features

### Real-Time Event Feed
- Events appear instantly via Supabase Realtime (Postgres Changes) with slide-in animations
- Live connection indicator in the header (pulsing green dot)
- Reverse chronological ordering with relative timestamps ("2 minutes ago")
- Custom icons, descriptions, and tag pills per event

### Channel System
- Events are organized into named channels (e.g. `orders`, `signups`, `deploys`, `errors`)
- Color-coded channel badges with deterministic color assignment for custom channels
- Channel filter pills with event counts -- click to filter the feed by channel
- Pre-configured colors for common channels: orders (emerald), signups (blue), deploys (amber), errors (red), payments (violet), alerts (orange)

### Search
- Full-text search across event titles, descriptions, channels, and tags
- 300ms debounce to avoid excessive API calls while typing
- Clear button to reset the search field

### Analytics
- **Stats Cards**: Total events, today's event count, and active channel count
- **Activity Chart**: 14-day area chart showing event volume over time (Recharts)
- Stats and chart sit in an insights row directly below the header

### Pagination
- 50 events per page by default, with options to switch to 100 or "All"
- Page numbers with first/prev/next/last navigation
- Page and per-page settings are reflected in the URL query string (`?page=2&per_page=100`) for bookmarking and sharing

### Multi-Project Support
- Create multiple projects, each with its own isolated API key
- Project selector dropdown in the header (admin only)
- Switching projects reloads events, channels, and stats for that project

### Admin Authentication
- Environment-variable-based admin gating via `ADMIN_SECRET`
- Lock/Unlock icon in the header opens a secret input popover
- Admin-only controls: project selector, add project button, API Key button
- Session stored in an httpOnly cookie (7-day expiry)
- The event feed, stats, chart, and filters are visible to all visitors

### Dark/Light Theme
- Text toggle in the header ("Light" / "Dark") switches between themes
- Powered by `next-themes` with system preference detection
- All components use semantic design tokens for proper theming

### Always-Visible Scrollbar
- Thin scrollbar on the right side of the event feed, always visible
- Styled to match the theme using CSS custom properties

---

## Architecture

### Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | Next.js 16 (App Router)             |
| Database     | Supabase (PostgreSQL)               |
| Realtime     | Supabase Realtime (Postgres Changes)|
| Styling      | Tailwind CSS v4 + shadcn/ui         |
| Charts       | Recharts                            |
| Data Fetching| SWR                                 |
| Theming      | next-themes                         |

### Database Schema

**`projects`**
| Column       | Type      | Description                     |
|--------------|-----------|---------------------------------|
| `id`         | uuid (PK) | Auto-generated project ID       |
| `name`       | text      | Project display name            |
| `api_key`    | text      | Unique API key (`evt_...`)      |
| `created_at` | timestamp | Creation timestamp              |

**`events`**
| Column       | Type      | Description                     |
|--------------|-----------|---------------------------------|
| `id`         | uuid (PK) | Auto-generated event ID         |
| `project_id` | uuid (FK) | References `projects.id`        |
| `channel`    | text      | Event channel name (lowercase)  |
| `title`      | text      | Event title (required)          |
| `description`| text      | Optional event description      |
| `icon`       | text      | Optional emoji/icon             |
| `tags`       | text[]    | Array of tag strings            |
| `created_at` | timestamp | Creation timestamp              |

Realtime is enabled on the `events` table for INSERT operations.

---

## API Reference

### Send an Event

```bash
curl -X POST https://your-domain.com/api/events \
  -H "Authorization: Bearer evt_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "orders",
    "title": "New order placed",
    "description": "Order #1234 - $99.00",
    "icon": "🛒",
    "tags": ["premium", "us-east"]
  }'
```

**Request Body**

| Field         | Type     | Required | Description                  |
|---------------|----------|----------|------------------------------|
| `channel`     | string   | Yes      | Channel name (auto-lowercased)|
| `title`       | string   | Yes      | Event title                  |
| `description` | string   | No       | Event description            |
| `icon`        | string   | No       | Emoji or icon character      |
| `tags`        | string[] | No       | Array of tag strings         |

**Response** (201 Created)

```json
{
  "event": {
    "id": "uuid",
    "project_id": "uuid",
    "channel": "orders",
    "title": "New order placed",
    "description": "Order #1234 - $99.00",
    "icon": "🛒",
    "tags": ["premium", "us-east"],
    "created_at": "2026-03-04T12:00:00.000Z"
  }
}
```

### List Events

```
GET /api/events?project_id=<id>&channel=<name>&search=<query>&limit=50&offset=0
```

Returns `{ events: EventRecord[], total: number }`.

### List Channels

```
GET /api/channels?project_id=<id>
```

Returns `{ channels: [{ channel: string, count: number }] }`.

### Get Stats

```
GET /api/stats?project_id=<id>
```

Returns `{ timeSeries, totalCount, todayCount, channelBreakdown }`.

### Admin Auth

| Method   | Endpoint          | Description                      |
|----------|-------------------|----------------------------------|
| `POST`   | `/api/auth/admin` | Login with `{ secret }` body     |
| `GET`    | `/api/auth/admin` | Check auth status                |
| `DELETE` | `/api/auth/admin` | Logout (clear session cookie)    |

---

## Components

### Page-Level

| Component           | File                              | Description                                                                                          |
|---------------------|-----------------------------------|------------------------------------------------------------------------------------------------------|
| `Dashboard`         | `components/dashboard.tsx`        | Root component. Manages all state (pagination, search, filters, admin, realtime), renders the layout |
| `DashboardHeader`   | `components/dashboard-header.tsx` | Header bar with logo, live indicator, admin controls (project selector, add project, API key), theme toggle, and admin lock/unlock |

### Insights Row

| Component           | File                              | Description                                                                 |
|---------------------|-----------------------------------|-----------------------------------------------------------------------------|
| `StatsCards`        | `components/stats-cards.tsx`      | Three compact stat cards: Total Events, Today, Channels                     |
| `ActivityChart`     | `components/activity-chart.tsx`   | 14-day area chart of event volume using Recharts with gradient fill         |

### Feed

| Component           | File                              | Description                                                                 |
|---------------------|-----------------------------------|-----------------------------------------------------------------------------|
| `EventFeedItem`     | `components/event-feed-item.tsx`  | Single event row with icon, title, channel badge, description, tags, and timestamp. Animates on new events |
| `ChannelFilter`     | `components/channel-filter.tsx`   | Horizontal pill buttons for filtering by channel, with color-coded dots and counts |
| `SearchInput`       | `components/search-input.tsx`     | Search field with icon, clear button, and 300ms debounce                    |
| `FeedPagination`    | `components/feed-pagination.tsx`  | Bottom pagination bar with page numbers, per-page selector (50/100/All), and event range display |

### Utilities

| Module              | File                              | Description                                                                 |
|---------------------|-----------------------------------|-----------------------------------------------------------------------------|
| `ThemeProvider`     | `components/theme-provider.tsx`   | Wraps the app with `next-themes` provider                                   |
| `getChannelColor`   | `lib/channels.ts`                | Deterministic color mapping for channel names (named + hash-based fallback) |
| `types`             | `lib/types.ts`                   | TypeScript interfaces: `Project`, `EventRecord`, `EventPayload`, `ChannelCount`, `TimeSeriesPoint` |
| `createAdminClient` | `lib/supabase/admin.ts`          | Supabase client with service role key for server-side operations            |
| `createClient`      | `lib/supabase/client.ts`         | Supabase browser client for Realtime subscriptions                          |

---

## Environment Variables

| Variable                       | Required | Description                                  |
|--------------------------------|----------|----------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | Yes      | Supabase project URL                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Yes      | Supabase anonymous key (for browser client)  |
| `SUPABASE_SERVICE_ROLE_KEY`    | Yes      | Supabase service role key (for admin client) |
| `ADMIN_SECRET`                 | Yes      | Secret string for admin authentication       |

---

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set environment variables (see above)
4. Run the development server: `pnpm dev`
5. Open `http://localhost:3000`
6. Click the lock icon in the header and enter your `ADMIN_SECRET` to access admin controls
7. Use the API Key button to get your project's API key and start sending events
