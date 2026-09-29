import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <main className="page home-page">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="brand" to="/">ChatSpace</Link>
        <div className="nav-links">
          <Link to="/login">Log in</Link>
          <Link className="button button-small" to="/register">Create account</Link>
        </div>
      </nav>
      <section className="home-content">
        <p className="eyebrow">A place to connect</p>
        <h1>Welcome to ChatSpace</h1>
        <p className="intro">Your conversations start here. Sign in or create an account to continue.</p>
        <div className="home-actions">
          <Link className="button" to="/register">Get started</Link>
          <Link className="text-link" to="/login">I already have an account</Link>
        </div>
      </section>
    </main>
  )
}

export default Home