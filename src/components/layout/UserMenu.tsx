import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  name?: string
  lastName?: string
  email?: string
  avatarUrl?: string
  showProfile?: boolean
  onProfile?: () => void
  onLogout?: () => void
}

// Obtiene iniciales mayúsculas a partir de nombre o correo
const getInitials = (name?: string, lastName?: string, email?: string) => {
  const safeName = (name || '').trim()
  const safeLast = (lastName || '').trim()
  if (safeName) {
    const parts = safeName.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || ''
    const second = (parts[1]?.[0] || safeLast.charAt(0)) || ''
    const initials = `${first}${second}`.toUpperCase()
    if (initials.trim()) return initials
  }
  if (safeLast) {
    const i1 = safeName.charAt(0) || safeLast.charAt(0)
    const i2 = safeLast.charAt(0)
    const initials = `${i1}${i2}`.toUpperCase()
    if (initials.trim()) return initials
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'US'
}

// Normaliza la URL de avatar (soporta rutas relativas del backend)
const buildAvatarUrl = (url?: string) => {
  if (!url) return ''
  const base = process.env.REACT_APP_UPLOAD_BASE_URL || process.env.REACT_APP_API_URL || ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (!base) return url
  if (url.startsWith('/')) return `${base}${url}`
  return `${base}/${url}`
}

export default function UserMenu({ name, lastName, email, avatarUrl, showProfile = true, onProfile, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [avatarError, setAvatarError] = useState(false)

  // Cerrar el desplegable al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const initials = useMemo(() => getInitials(name, lastName, email), [name, lastName, email])
  const displayName = name || email || 'Usuario'
  const avatarSrc = useMemo(() => buildAvatarUrl(avatarUrl), [avatarUrl])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }} data-email={email}>
      {/* correo oculto para compatibilidad */}
      <span style={{ display: 'none' }}>{email}</span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          background: '#fff',
          cursor: 'pointer',
          minWidth: 160,
          boxShadow: '0 4px 12px rgba(15,23,42,0.06)'
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#0ea5e9',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            overflow: 'hidden',
            border: '2px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,0.12)'
          }}
        >
          {avatarSrc && !avatarError ? (
            <img
              src={avatarSrc}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{displayName}</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{email}</span>
        </div>
        <span className="pi pi-chevron-down" style={{ marginLeft: 'auto', color: '#64748b' }} aria-hidden />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
            minWidth: 180,
            zIndex: 30,
            overflow: 'hidden'
          }}
        >
          {showProfile && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onProfile?.()
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#0f172a'
              }}
            >
              Ir a mi perfil
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLogout?.()
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#dc2626'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
