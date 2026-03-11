function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function computeInsights(events) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let todayCount = 0;
  let last24hCount = 0;
  const channels = new Set();

  events.forEach((event) => {
    const eventTimeMs = new Date(event.event_time).getTime();
    if (!Number.isNaN(eventTimeMs)) {
      if (eventTimeMs >= startOfToday.getTime()) {
        todayCount += 1;
      }
      if (eventTimeMs >= now - (24 * 60 * 60 * 1000)) {
        last24hCount += 1;
      }
    }

    if (event.channel) {
      channels.add(event.channel);
    }
  });

  return {
    total: events.length,
    today: todayCount,
    last24h: last24hCount,
    channels: channels.size
  };
}

export default function InsightsPanel({ events }) {
  const insights = computeInsights(events);

  return (
    <section className="panel insights-panel">
      <div className="panel-header">
        <h2>Insights</h2>
      </div>
      <div className="insights-grid">
        <article className="insight-card">
          <span>Total Events</span>
          <strong>{formatNumber(insights.total)}</strong>
        </article>
        <article className="insight-card">
          <span>Events Today</span>
          <strong>{formatNumber(insights.today)}</strong>
        </article>
        <article className="insight-card">
          <span>Last 24 Hours</span>
          <strong>{formatNumber(insights.last24h)}</strong>
        </article>
        <article className="insight-card">
          <span>Active Channels</span>
          <strong>{formatNumber(insights.channels)}</strong>
        </article>
      </div>
    </section>
  );
}
