import React from 'react'
import '../../styles/layout.scss'
import '../../styles/_main.scss'
import { Toolbar } from 'primereact/toolbar'
import { Button } from 'primereact/button'
import UserMenu from './UserMenu'

type Props = {
  title?: string
  onToggleSidebar?: () => void
  // Indica si el sidebar está colapsado/oculto (true) o visible (false)
  sidebarCollapsed?: boolean
  userName?: string
  userLastName?: string
  userEmail?: string
  userAvatar?: string
  allowProfile?: boolean
  onProfile?: () => void
  onLogout?: () => void
}

export default function Header({
  title,
  onToggleSidebar,
  sidebarCollapsed = false,
  userName,
  userLastName,
  userEmail,
  userAvatar,
  allowProfile = true,
  onProfile,
  onLogout
}: Props) {
  const alternarBarraLateral = onToggleSidebar

  const toggleIcon = sidebarCollapsed ? 'pi pi-bars' : 'pi pi-chevron-left'
  const toggleTooltip = sidebarCollapsed ? 'Abrir menú' : 'Ocultar menú'

  const left = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {alternarBarraLateral && (
        <Button icon={toggleIcon} onClick={alternarBarraLateral} className="p-button-text" aria-label={toggleTooltip} />
      )}
      <h1 style={{ margin: 0, fontSize: 16 }}>{title || 'Dashboard'}</h1>
    </div>
  )

  const right = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <UserMenu
        name={userName || userEmail}
        lastName={userLastName}
        email={userEmail}
        avatarUrl={userAvatar}
        showProfile={allowProfile}
        onProfile={onProfile}
        onLogout={onLogout}
      />
    </div>
  )

  return <Toolbar left={left} right={right} style={{ borderBottom: '1px solid #e5e7eb' }} />
}
