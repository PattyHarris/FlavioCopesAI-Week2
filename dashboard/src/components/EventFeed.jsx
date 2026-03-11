import { formatDistanceToNow, parseISO } from 'date-fns';

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
    </svg>
  );
}

export default function EventFeed({ events, onDelete, deletingIds }) {
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
                <div className="row actions">
                  <span className="time">{formatDistanceToNow(parseISO(event.event_time), { addSuffix: true })}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onDelete(event)}
                    aria-label="Delete event"
                    disabled={deletingIds?.has(event.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
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
