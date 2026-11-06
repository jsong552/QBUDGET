import {
  BarChart3,
  CalendarDays,
  Bell,
  Camera,
  LockKeyhole,
  LogOut,
  Megaphone,
  Monitor,
  Moon,
  Sun,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { IconCircle } from '../components/IconCircle'
import { PageHeader } from '../components/PageHeader'
import { Select, type SelectOption } from '../components/Select'
import { TextField } from '../components/TextField'
import { Toggle } from '../components/Toggle'
import type { Tone } from '../components/tones'
import { useAuth, useCurrentUser } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import type {
  CurrencyCode,
  DateFormatPreference,
  DisplayPreferences,
  NotificationKey,
  NotificationPreference,
  ProfileInput,
  ThemePreference,
  User,
  WeekStart,
} from '../types'

const themeOptions: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const currencyOptions: SelectOption<CurrencyCode>[] = [
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'USD', label: 'US Dollar (USD)' },
]

const weekStartOptions: SelectOption<WeekStart>[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
]

const dateFormatOptions: SelectOption<DateFormatPreference>[] = [
  { value: 'MMM_DD_YYYY', label: 'Sep 10, 2024 (MMM DD, YYYY)' },
  { value: 'DD_MM_YYYY', label: '10/09/2024 (DD/MM/YYYY)' },
  { value: 'YYYY_MM_DD', label: '2024-09-10 (YYYY-MM-DD)' },
]

interface NotificationStyle {
  icon: LucideIcon
  tone: Tone
}

const notificationStyles: Partial<Record<NotificationKey, NotificationStyle>> = {
  payment_reminders: { icon: CalendarDays, tone: 'danger' },
  forecast_updates: { icon: BarChart3, tone: 'primary' },
  goal_updates: { icon: Tag, tone: 'accent' },
  product_announcements: { icon: Megaphone, tone: 'quiet' },
}

/** Neutral style for notification keys the UI has no entry for. */
const fallbackNotificationStyle: NotificationStyle = { icon: Bell, tone: 'quiet' }

function FieldRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-4">
      <span className="text-[15px] leading-snug font-medium text-ink">{label}</span>
      {children}
    </div>
  )
}

interface AccountCardProps {
  profile: User
  onSaveProfile: (input: ProfileInput) => Promise<boolean>
  onChangeAvatar: () => Promise<boolean>
}

function AccountCard({ profile, onSaveProfile, onChangeAvatar }: AccountCardProps) {
  const [fullName, setFullName] = useState(profile.fullName)
  const [studentId, setStudentId] = useState(profile.studentId ?? '')

  function onSaveClick() {
    return onSaveProfile({ fullName, studentId: studentId || null })
  }

  return (
    <Card className="px-5 pt-5 pb-5">
      <CardHeader title="Account information" subtitle="Update your personal details and account information." />
      <div className="mt-5 flex gap-7">
        <div className="relative size-24 shrink-0">
          <div className="grid size-24 place-items-center rounded-full bg-accent-soft text-[28px] font-bold text-ink">{profile.initials}</div>
          <button
            type="button"
            aria-label="Change profile photo"
            onClick={onChangeAvatar}
            className="absolute -right-1 bottom-0 grid size-8 place-items-center rounded-full border-2 border-surface bg-primary text-on-primary"
          >
            <Camera className="size-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 space-y-3.5">
          <FieldRow label="Full name">
            <TextField ariaLabel="Full name" value={fullName} onValueChange={setFullName} size="md" />
          </FieldRow>
          <FieldRow label="Email address">
            <TextField ariaLabel="Email address" type="email" defaultValue={profile.email} disabled size="md" />
          </FieldRow>
          <FieldRow
            label={
              <>
                Student ID
                <br />
                (optional)
              </>
            }
          >
            <TextField ariaLabel="Student ID" value={studentId} onValueChange={setStudentId} size="md" />
          </FieldRow>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={onSaveClick} className="px-5">
          Save changes
        </Button>
      </div>
    </Card>
  )
}

interface DisplayCardProps {
  display: DisplayPreferences
  onDisplayChange: (changes: Partial<DisplayPreferences>) => void
}

function ThemeButton({ option, selected, onSelect }: { option: (typeof themeOptions)[number]; selected: boolean; onSelect: (theme: ThemePreference) => void }) {
  const Icon = option.icon

  function onThemeClick() {
    onSelect(option.value)
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onThemeClick}
      className={`flex h-10 items-center justify-center gap-2.5 rounded-lg text-[15px] font-medium transition-colors ${
        selected ? 'bg-primary text-on-primary shadow-sm' : 'border border-line-strong bg-surface text-ink hover:bg-surface-muted'
      }`}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
      {option.label}
    </button>
  )
}

function DisplayCard({ display, onDisplayChange }: DisplayCardProps) {
  function onThemeChange(theme: ThemePreference) {
    onDisplayChange({ theme })
  }

  function onCurrencyChange(currency: CurrencyCode) {
    onDisplayChange({ currency })
  }

  function onWeekStartChange(weekStart: WeekStart) {
    onDisplayChange({ weekStart })
  }

  function onDateFormatChange(dateFormat: DateFormatPreference) {
    onDisplayChange({ dateFormat })
  }

  return (
    <Card className="px-5 pt-5 pb-5">
      <CardHeader title="Display preferences" subtitle="Customize how the application looks and feels." />
      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-[180px_1fr] items-center">
          <span className="text-[15px] text-ink">Theme</span>
          <div className="grid grid-cols-3 gap-3.5">
            {themeOptions.map((option) => (
              <ThemeButton key={option.value} option={option} selected={display.theme === option.value} onSelect={onThemeChange} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[180px_1fr] items-center">
          <span className="text-[15px] text-ink">Currency format</span>
          <Select label="Currency format" value={display.currency} options={currencyOptions} onChange={onCurrencyChange} />
        </div>
        <div className="grid grid-cols-[180px_1fr] items-center">
          <span className="text-[15px] text-ink">Start week on</span>
          <Select label="Start week on" value={display.weekStart} options={weekStartOptions} onChange={onWeekStartChange} />
        </div>
        <div className="grid grid-cols-[180px_1fr] items-center">
          <span className="text-[15px] text-ink">Date format</span>
          <Select label="Date format" value={display.dateFormat} options={dateFormatOptions} onChange={onDateFormatChange} />
        </div>
      </div>
    </Card>
  )
}

function NotificationRow({ preference, onToggle }: { preference: NotificationPreference; onToggle: (key: NotificationKey, enabled: boolean) => void }) {
  const { icon, tone } = notificationStyles[preference.key] ?? fallbackNotificationStyle

  function onToggleChange(enabled: boolean) {
    onToggle(preference.key, enabled)
  }

  return (
    <li className="flex items-center gap-4">
      <IconCircle icon={icon} tone={tone} size="sm" />
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-ink">{preference.title}</p>
        <p className="text-[13px] text-muted">{preference.description}</p>
      </div>
      <Toggle checked={preference.enabled} label={preference.title} onChange={onToggleChange} />
    </li>
  )
}

interface ManagementRowProps {
  icon: LucideIcon
  tone: Tone
  title: string
  description: string
  action: ReactNode
}

function ManagementRow({ icon, tone, title, description, action }: ManagementRowProps) {
  return (
    <li className="flex items-center gap-4 px-3 py-2.5">
      <IconCircle icon={icon} tone={tone} size="sm" />
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      {action}
    </li>
  )
}

export function SettingsPage() {
  const { signOut } = useAuth()
  const profile = useCurrentUser()
  const { display, notifications, saveProfile, changeAvatar, changeDisplay, toggleNotification, changePassword, removeAccount } = useSettings()

  function onDisplayChange(changes: Partial<DisplayPreferences>) {
    return changeDisplay(changes)
  }

  function onNotificationToggle(key: NotificationKey, enabled: boolean) {
    return toggleNotification(key, enabled)
  }

  function onChangePassword() {
    return changePassword()
  }

  function onDeleteAccount() {
    return removeAccount()
  }

  function onSignOut() {
    return signOut()
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, preferences, and notifications." />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <AccountCard profile={profile} onSaveProfile={saveProfile} onChangeAvatar={changeAvatar} />
        {display ? <DisplayCard display={display} onDisplayChange={onDisplayChange} /> : <div />}

        <Card className="px-5 pt-5 pb-5">
          <CardHeader title="Notification preferences" subtitle="Choose what notifications you want to receive." />
          <ul className="mt-4 space-y-3 pr-6">
            {notifications?.map((preference) => (
              <NotificationRow key={preference.key} preference={preference} onToggle={onNotificationToggle} />
            ))}
          </ul>
        </Card>

        <Card className="px-5 pt-5 pb-5">
          <CardHeader title="Account management" subtitle="Manage your account and session." />
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            <ManagementRow
              icon={LockKeyhole}
              tone="quiet"
              title="Change password"
              description="Update your password for better security."
              action={
                <Button variant="outline" onClick={onChangePassword}>
                  Change password
                </Button>
              }
            />
            <ManagementRow
              icon={Trash2}
              tone="danger"
              title="Delete account"
              description="Permanently delete your account and all data."
              action={
                <Button variant="danger" onClick={onDeleteAccount}>
                  Delete account
                </Button>
              }
            />
            <ManagementRow
              icon={LogOut}
              tone="danger"
              title="Sign out"
              description="End your current session and return to the sign in page."
              action={
                <Button variant="outline" onClick={onSignOut} className="w-[130px]">
                  Sign out
                </Button>
              }
            />
          </ul>
        </Card>
      </div>
    </div>
  )
}
