import { Link } from 'react-router-dom'

export default function WorkspaceSwitcher({ active }) {
  return (
    <nav className="workspace-switcher" aria-label="Account workspace">
      <Link
        className={`button button-small ${active === 'customer' ? 'button-primary' : 'button-outline'}`}
        to="/customer/dashboard"
        aria-current={active === 'customer' ? 'page' : undefined}
      >
        Customer workspace
      </Link>
      <Link
        className={`button button-small ${active === 'worker' ? 'button-primary' : 'button-outline'}`}
        to="/worker/dashboard"
        aria-current={active === 'worker' ? 'page' : undefined}
      >
        Worker workspace
      </Link>
    </nav>
  )
}
