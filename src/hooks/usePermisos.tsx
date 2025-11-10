import { useEffect, useState } from 'react'
import PermisosAPI from '../api-endpoints/permisos'
import RolesAPI from '../api-endpoints/roles'
import { useAuth } from '../contexts/AuthContext'

type Permiso = { id?: string | number; pantalla: string; accion: string; permisoSn: string; rolId: number | string }

export default function usePermisos() {
  const { user } = useAuth()
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(false)
  const [rolActivo, setRolActivo] = useState<boolean | null>(null)

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
        setRolActivo(null)
        return
      }
      setLoading(true)
      try {
        // Intentar inferir si el rol está activo desde el user (si trae objeto rol)
        let activo: boolean | null = null
        try {
          const u = user as any
          const posibleRol = u && (u.rol || u.role)
          if (posibleRol && (typeof posibleRol === 'object') && ('activoSn' in posibleRol)) {
            activo = String(posibleRol.activoSn).toUpperCase() === 'S'
          }
        } catch (err) {
          // ignore
        }

        // Si no lo tenemos en user, solicitar al endpoint de roles
        if (activo === null) {
          try {
            const roleData: any = await RolesAPI.getRoleById(rolId)
            if (roleData && typeof roleData === 'object' && 'activoSn' in roleData) {
              activo = String(roleData.activoSn).toUpperCase() === 'S'
            } else {
              // Si no hay campo, asumimos activo por compatibilidad
              activo = true
            }
          } catch (err) {
            console.warn('usePermisos: no se pudo obtener estado del rol, asumiendo activo', err)
            activo = true
          }
        }

        if (!mounted) return
        setRolActivo(activo)

        // Si el rol está inactivo, no cargamos permisos y devolvemos lista vacía
        if (!activo) {
          setPermisos([])
          return
        }

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
  }, [rolId, user])

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
    rolActivo,
    hasPermission,
  }
}
