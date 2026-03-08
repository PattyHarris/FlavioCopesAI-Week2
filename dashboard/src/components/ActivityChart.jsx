import { format, parseISO, subDays } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function buildDailySeries(events, days = 14) {
  const start = subDays(new Date(), days - 1);
  const map = new Map();

  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    map.set(format(day, 'yyyy-MM-dd'), 0);
  }

  events.forEach((event) => {
    const key = format(parseISO(event.event_time), 'yyyy-MM-dd');
    if (map.has(key)) {
      map.set(key, map.get(key) + 1);
    }
  });

  return Array.from(map.entries()).map(([key, count]) => ({
    date: format(parseISO(`${key}T00:00:00Z`), 'MMM d'),
    events: count
  }));
}

export default function ActivityChart({ events }) {
  const data = buildDailySeries(events);

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <h2>Activity (14 days)</h2>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(90, 125, 128, 0.2)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <Tooltip />
            <Area type="monotone" dataKey="events" stroke="#0f766e" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
