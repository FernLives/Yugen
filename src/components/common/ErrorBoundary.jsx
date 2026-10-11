import { Component } from 'react';
import { TriangleAlert, RotateCw } from 'lucide-react';
import './ErrorBoundary.css';

/** Catches render errors so one broken module never blanks the whole suite. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    // Navigating elsewhere gives the boundary a fresh start.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="eb" role="alert">
        <div className="eb-ico"><TriangleAlert size={26} /></div>
        <h2 className="serif">Something <em>slipped</em> out of orbit</h2>
        <p>This view hit an unexpected error. Your data is safe — try again, or reload the page.</p>
        <div className="eb-actions">
          <button className="btn primary" onClick={() => this.setState({ error: null })}>Try again</button>
          <button className="btn ghost" onClick={() => window.location.reload()}><RotateCw size={15} /> Reload</button>
        </div>
      </div>
    );
  }
}
