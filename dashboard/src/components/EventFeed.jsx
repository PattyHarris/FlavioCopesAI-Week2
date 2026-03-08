import { formatDistanceToNow, parseISO } from 'date-fns';

export default function EventFeed({ events }) {
  if (!events.length) {
    return (
      <section className="panel feed-panel">
        <div className="empty">No events match this filter.</div>
      </section>
    );
  }

  return (
    <section className="panel feed-panel">
      <ul className="feed-list">
        {events.map((event) => (
          <li key={event.id} className="feed-item">
            <div className="icon">{event.emoji || '•'}</div>
            <div className="content">
              <div className="row top-row">
                <span className="channel">{event.channel}</span>
                <span className="time">{formatDistanceToNow(parseISO(event.event_time), { addSuffix: true })}</span>
              </div>
              <h3>{event.title}</h3>
              {event.description ? <p>{event.description}</p> : null}
              {event.tags?.length ? (
                <div className="tags">
                  {event.tags.map((tag) => (
                    <span key={`${event.id}-${tag}`}>{tag}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
