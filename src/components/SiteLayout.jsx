import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, Menu, X } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'

const currentYear = new Date().getFullYear()

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      showToast('You have been signed out.')
      navigate('/')
    } catch {
      showToast('You were signed out locally, but the server could not confirm logout.', 'error')
      navigate('/')
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container site-nav">
          <Link className="brand" to="/" aria-label="KaamConnect home" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark"><BriefcaseBusiness size={19} strokeWidth={2.5} /></span>
            <span>kaam<span>connect</span></span>
          </Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
          <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
            <NavLink to="/search" onClick={() => setMenuOpen(false)}>Find a professional</NavLink>
            <NavLink to="/how-it-works" onClick={() => setMenuOpen(false)}>How it works</NavLink>
            <NavLink to="/about" onClick={() => setMenuOpen(false)}>About us</NavLink>
            {user?.is_worker && (
              <NavLink className="nav-dashboard-mobile" to="/worker/dashboard" onClick={() => setMenuOpen(false)}>
                Worker dashboard
              </NavLink>
            )}
            {user?.is_customer && (
              <NavLink className="nav-dashboard-mobile" to={user.is_worker ? '/dashboard' : '/customer/dashboard'} onClick={() => setMenuOpen(false)}>
                Customer dashboard
              </NavLink>
            )}
            {user?.is_admin && (
              <NavLink className="nav-dashboard-mobile" to="/admin/dashboard" onClick={() => setMenuOpen(false)}>
                Admin dashboard
              </NavLink>
            )}
            {!user ? (
              <>
                <Link className="nav-login" to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link className="button button-primary nav-join" to="/register" onClick={() => setMenuOpen(false)}>
                  Get started
                </Link>
              </>
            ) : (
              <button type="button" className="nav-login nav-logout" onClick={handleLogout}>Log out</button>
            )}
          </nav>
          {user && (
            <Link
              className="button button-primary nav-account"
              to={user.is_admin ? '/admin/dashboard' : user.is_worker && !user.is_customer ? '/worker/dashboard' : '/dashboard'}
            >
              {user.is_admin ? 'Admin' : user.is_worker ? 'Dashboard' : 'My account'}
            </Link>
          )}
        </div>
      </header>
      <main className="site-main"><Outlet /></main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Link className="brand footer-brand" to="/">
              <span className="brand-mark"><BriefcaseBusiness size={18} /></span>
              <span>kaam<span>connect</span></span>
            </Link>
            <p>Good work, close to home. Find trusted local professionals across Hyderabad.</p>
          </div>
          <div className="footer-links">
            <span className="footer-heading">Explore</span>
            <Link to="/search">Find a professional</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/faq">FAQs</Link>
          </div>
          <div className="footer-links">
            <span className="footer-heading">For professionals</span>
            <Link to="/become-a-worker">Join KaamConnect</Link>
            <Link to="/about">About us</Link>
          </div>
        </div>
        <div className="container footer-bottom">© {currentYear} KaamConnect. Made for your neighbourhood.</div>
      </footer>
    </>
  )
}
