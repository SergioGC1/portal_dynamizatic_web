import { useEffect, useState } from 'react'
import PermisosAPI from '../api-endpoints/permisos'
import { useAuth } from '../contexts/AuthContext'

type Permiso = { id?: string | number; pantalla: string; accion: string; permisoSn: string; rolId: number | string }

export default function usePermisos() {
  const { user } = useAuth()
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(false)

  // Intentar inferir rolId desde el user guardado (localStorage o contexto)
  const rolId: number | string | null = (() => {
    try {
      const u = user as any
      if (u && (u.rolId || u.roleId || u.rol || u.role)) return u.rolId || u.roleId || u.rol || u.role
      const stored = localStorage.getItem('user')
      if (!stored) return null
      const parsed = JSON.parse(stored)
      return parsed?.rolId || parsed?.roleId || parsed?.rol || parsed?.role || null
    } catch (e) {
      return null
    }
  })()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!rolId) {
        setPermisos([])
        return
      }
      setLoading(true)
      try {
        const data = await PermisosAPI.findPermisos({ 'filter[where][rolId]': rolId })
        if (!mounted) return
        setPermisos(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('usePermisos load error', e)
        if (mounted) setPermisos([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [rolId])

  const hasPermission = (pantalla: string, accion: string) => {
    try {
      const p = permisos.find((x) => String(x.pantalla) === String(pantalla) && String(x.accion) === String(accion))
      return Boolean(p && String(p.permisoSn).toUpperCase() === 'S')
    } catch (e) { return false }
  }

  return {
    permisos,
    loading,
    rolId,
    hasPermission,
  }
}
