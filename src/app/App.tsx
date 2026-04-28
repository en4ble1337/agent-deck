export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspaces">
        <div className="brand">RunDeck</div>
        <div className="nav-item is-active">Workspaces</div>
        <div className="nav-item">Tasks</div>
        <div className="nav-item">Sessions</div>
        <div className="nav-item">Review</div>
      </aside>
      <section className="workspace-surface" aria-label="Workspace dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local Agent Mission Control</p>
            <h1>RunDeck Agent Mission Control MVP</h1>
          </div>
          <span className="status-pill">Scaffold Ready</span>
        </header>
        <div className="dashboard-grid">
          <section className="panel">
            <h2>Task Board</h2>
            <p>Create Directive 002 before adding production workflow code.</p>
          </section>
          <section className="panel terminal-panel">
            <h2>Terminal Grid</h2>
            <pre>Session backend spike pending</pre>
          </section>
          <section className="panel">
            <h2>Review Gate</h2>
            <p>Changed files, raw diff, validation, and human review actions belong here.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
