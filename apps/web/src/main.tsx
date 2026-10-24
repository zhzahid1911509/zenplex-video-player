import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="card">
        <h1>ZenPlex needs to restart.</h1>
        <p>An unexpected interface error occurred. Your original media has not been changed.</p>
        <button onClick={() => location.reload()}>Reload ZenPlex</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
