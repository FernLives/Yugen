import './LoadingState.css';

/** Elegant skeleton + caption. `variant` shapes the placeholder. */
export default function LoadingState({ message = 'Establishing data uplink', variant = 'grid' }) {
  return (
    <div className="ls" role="status" aria-live="polite">
      <div className="ls-head">
        <div className="skeleton ls-eyebrow" />
        <div className="skeleton ls-title" />
        <div className="skeleton ls-sub" />
      </div>
      {variant === 'grid' && (
        <div className="ls-grid">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton ls-cell" style={{ animationDelay: `${i * 90}ms` }} />)}
        </div>
      )}
      {variant === 'split' && (
        <div className="ls-split"><div className="skeleton ls-side" /><div className="skeleton ls-main" /></div>
      )}
      <div className="ls-caption"><span className="live" /> {message}</div>
    </div>
  );
}
