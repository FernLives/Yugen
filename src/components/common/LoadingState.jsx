import './LoadingState.css';

export default function LoadingState({ message = "Establishing Data Uplink" }) {
  return (
    <div className="loading-container fade-in">
      <div className="uplink-animation">
        <div className="uplink-bar" />
      </div>
      <div className="uplink-status">
        <span className="status-text">{message}</span>
        <div className="scanning-indicator">
          <div className="scan-dot" />
          <div className="scan-dot" />
          <div className="scan-dot" />
        </div>
      </div>
    </div>
  );
}
