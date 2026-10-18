export const InlineError = ({ error, onRetry }) => (
  <section aria-live="assertive" className="inline-error" role="alert">
    <h2>We could not load this content</h2>
    <p>{error?.message || 'Please check your connection and try again.'}</p>
    {onRetry ? <button className="button" onClick={onRetry} type="button">Retry</button> : null}
  </section>
);

export const EmptyState = ({ title = 'Nothing here yet', children }) => (
  <section className="empty-state">
    <h2>{title}</h2>
    {children}
  </section>
);

export const LoadingSkeleton = ({ label = 'Loading content', rows = 3 }) => (
  <section aria-busy="true" aria-live="polite" className="loading-skeleton">
    <span className="sr-only">{label}</span>
    {Array.from({ length: rows }, (_, index) => <i aria-hidden="true" key={index} />)}
  </section>
);

export const StatusBadge = ({ status }) => (
  <span className="badge">{String(status || 'unknown').replaceAll('_', ' ')}</span>
);
