import { BarChart3, CalendarDays, CreditCard, House, Settings, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/expenses', label: 'Expenses', icon: CreditCard },
  { to: '/forecast', label: 'Forecast', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
]

const settingsNav: NavItem = { to: '/settings', label: 'Settings', icon: Settings }

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base = 'flex items-center gap-3.5 rounded-xl border-l-[3px] px-4 py-3 text-[15px] font-medium transition-colors'
  return isActive
    ? `${base} border-accent bg-sidebar-active text-on-sidebar`
    : `${base} border-transparent text-on-sidebar hover:bg-sidebar-raised/50`
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.to === '/'} className={navLinkClass}>
      <Icon className="size-5" strokeWidth={1.75} />
      {item.label}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-sidebar px-4 pt-7 pb-6">
      <div className="px-3">
        <Logo />
      </div>
      <nav className="mt-12 flex flex-col gap-2">
        {mainNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>
      <div className="mt-auto">
        <SidebarLink item={settingsNav} />
      </div>
    </aside>
  )
}
