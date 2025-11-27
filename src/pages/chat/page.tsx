import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import EditarChat from './EditarChat';
import { Button } from 'primereact/button';
import ConversacionesSidebar from './ConversacionesSidebar';
import Editar from './editar';
import { ServicioChat, MensajeChat, UsuarioChat } from '../../servicios/chat/ServicioChat';

const normalizar = (valor?: string | null) => (valor ? valor.trim().toLowerCase() : '');

const extraerIdDeAuthUser = (authUser: any): string | undefined => {
  if (!authUser) return undefined;
  const candidatos = [
    authUser.id,
    authUser.userId,
    authUser.usuarioId,
    authUser.user?.id,
    authUser.user?.userId,
    authUser.user?.usuarioId,
  ];
  const encontrado = candidatos.find((valor) => valor !== undefined && valor !== null && valor !== '');
  return encontrado !== undefined ? String(encontrado) : undefined;
};

const resolverUsuarioActual = (lista: UsuarioChat[], authUser: any) => {
  if (!authUser) return { id: undefined as string | undefined, usuario: undefined as UsuarioChat | undefined };
  const emailAuth = normalizar(authUser.email || authUser.user?.email);
  const idAuth = extraerIdDeAuthUser(authUser);

  const porEmail = emailAuth ? lista.find((u) => normalizar(u.email) === emailAuth) : undefined;
  const porId = porEmail ? undefined : (idAuth ? lista.find((u) => String(u.id) === String(idAuth)) : undefined);
  const porNombre =
    porEmail || porId
      ? undefined
      : (authUser.nombreUsuario ? lista.find((u) => u.nombreUsuario === authUser.nombreUsuario) : undefined);

  const coincidencia = porEmail || porId || porNombre;
  const idResuelto = coincidencia?.id !== undefined ? String(coincidencia.id) : idAuth;
  return { id: idResuelto, usuario: coincidencia };
};

// Página principal: gestiona datos (usuarios, conversaciones, mensajes) y delega UI específica.
export default function PaginaChat() {
  const { user } = useAuth();
  const [idUsuarioActual, setIdUsuarioActual] = useState<string | undefined>(undefined);
  const [usuarios, setUsuarios] = useState<UsuarioChat[]>([]);
  const [interlocutoresConConversacion, setInterlocutoresConConversacion] = useState<string[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [cargandoConversaciones, setCargandoConversaciones] = useState(true);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [cercaDelFondo, setCercaDelFondo] = useState(true); // ayuda a decidir autorefresco cuando no hay WS

  // Carga inicial orquestada: usuarios -> inicializar servicio -> cargar interlocutores
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setCargandoConversaciones(true);
        const lista = await ServicioChat.obtenerUsuarios();
        if (cancelado) return;
        setUsuarios(lista);
        let { id: idResuelto } = resolverUsuarioActual(lista, user);
        if (!idResuelto && typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('user');
            if (stored) {
              const parsed = JSON.parse(stored);
              const alternativa = resolverUsuarioActual(lista, parsed);
              if (alternativa.id) idResuelto = alternativa.id;
            }
            if (!idResuelto) {
              const token = localStorage.getItem('accessToken');
              if (token) {
                const parts = String(token).split('.');
                if (parts.length >= 2) {
                  try {
                    const payload = JSON.parse(atob(parts[1]));
                    const fallbackUser = {
                      email: payload.email || payload.preferred_username || payload.username,
                      id: payload.sub || payload.userId || payload.id,
                    };
                    const alternativaToken = resolverUsuarioActual(lista, fallbackUser);
                    if (alternativaToken.id) idResuelto = alternativaToken.id;
                  } catch {
                    // Ignorar errores de decodificaci��n
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[Chat] Error determinando el usuario autenticado desde almacenamiento local.', error);
          }
        }
        if (idResuelto) {
          setIdUsuarioActual(idResuelto);
          ServicioChat.inicializar(idResuelto);
        } else {
          console.warn('[Chat] No se pudo determinar el usuario autenticado para el chat.');
        }
        const interlocutores = idResuelto
          ? (await ServicioChat.obtenerInterlocutoresConConversacion()).map((i: any) => String(i))
          : [];

        if (cancelado) return;
        setInterlocutoresConConversacion(interlocutores);
        if (!seleccionado && interlocutores.length > 0) setSeleccionado(interlocutores[0]);
      } catch (e) {
        // En caso de error, dejamos lista vacía pero evitamos estado de "no hay nada" engañoso
        console.error('Error cargando conversaciones', e);
      } finally {
        if (!cancelado) setCargandoConversaciones(false);
      }
    })();
    return () => { cancelado = true; };
  }, [user, seleccionado]);

  // Suscripción tiempo real
  useEffect(() => {
    const off = ServicioChat.suscribirse(msg => {
      if (!idUsuarioActual) return;
      const msgDe = String(msg.deUsuarioId);
      const msgPara = String(msg.paraUsuarioId);
      const pertenece = Boolean(
        seleccionado && (
          (msgDe === seleccionado && msgPara === idUsuarioActual) ||
          (msgDe === idUsuarioActual && msgPara === seleccionado)
        )
      );
      if (pertenece) {
        setMensajes(prev => {
          const existe = msg.id ? prev.find(m => m.id === msg.id) : undefined;
          if (existe) return prev.map(m => (m.id === msg.id ? msg : m));
          return [...prev, msg];
        });
      } else if (msgPara === idUsuarioActual) {
        const remitente = msgDe;
        setInterlocutoresConConversacion(prev => prev.includes(remitente) ? prev : [...prev, remitente]);
      }
    });
    return () => off();
  }, [seleccionado, idUsuarioActual]);

  const cargarHistorial = useCallback(async (id: string) => {
    setCargandoMensajes(true);
    const hist = await ServicioChat.obtenerHistorial(id);
    setMensajes(hist);
    setCargandoMensajes(false);
  }, []);

  // Cargar historial al cambiar seleccionado si ya existe conversación
  useEffect(() => {
    if (seleccionado && interlocutoresConConversacion.includes(seleccionado)) {
      cargarHistorial(seleccionado);
    } else if (seleccionado && !interlocutoresConConversacion.includes(seleccionado)) {
      // Nueva conversación: mensajes vacíos
      setMensajes([]);
    }
  }, [seleccionado, interlocutoresConConversacion, cargarHistorial]);

  // Polling cuando WS no está activo
  useEffect(() => {
    if (ServicioChat.estaConectadoTiempoReal()) return;
    const int = window.setInterval(async () => {
      // Evitar refresco si usuario está leyendo arriba
      if (!cercaDelFondo) return;
      try {
        const interlocutores = (await ServicioChat.obtenerInterlocutoresConConversacion()).map((i: any) => String(i));
        setInterlocutoresConConversacion(prev => {
          const nuevos = interlocutores.filter(i => !prev.includes(i));
          return nuevos.length ? [...prev, ...nuevos] : prev;
        });
        if (seleccionado) {
          const nuevoHistorial = await ServicioChat.obtenerHistorial(seleccionado);
          setMensajes(prev => {
            const idsPrev = new Set(prev.map(m => m.id));
            const hayNuevo = nuevoHistorial.some(m => !m.id || !idsPrev.has(m.id));
            if (!hayNuevo) return prev;
            const combinados = [...prev];
            for (const m of nuevoHistorial) {
              if (!m.id || !idsPrev.has(m.id)) combinados.push(m);
            }
            return combinados;
          });
        }
      } catch {/* ignorar */}
    }, 5000);
    return () => window.clearInterval(int);
  }, [seleccionado, cercaDelFondo]);

  const enviarMensaje = useCallback(async (texto: string) => {
    if (!seleccionado || !idUsuarioActual) return;
    try {
      await ServicioChat.enviarMensaje({ deUsuarioId: String(idUsuarioActual), paraUsuarioId: seleccionado, texto });
      // Asegurar lista de interlocutores
      setInterlocutoresConConversacion(prev => prev.includes(seleccionado) ? prev : [...prev, seleccionado]);
    } catch (e) {
      console.error('Error enviando mensaje', e);
    }
  }, [seleccionado, idUsuarioActual]);

  const construirSrc = useCallback((p?: string | null) => {
    if (!p) return null;
    const s = String(p);
    const apiBase = process.env.REACT_APP_API_BASE_URL;
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('/')) return `${apiBase}${s}`;
    return `${apiBase}/${s}`;
  }, []);

  const interlocutor = usuarios.find(u => String(u.id) === String(seleccionado));
  const avatarUrl = construirSrc(interlocutor?.imagen || (interlocutor as any)?.urlAvatar || undefined);

  // Vista selector inicial si no hay conversaciones aún
  if (mostrarSelector) {
    return (
      <Editar
        usuarios={usuarios}
        idUsuarioActual={idUsuarioActual}
        interlocutoresConConversacion={interlocutoresConConversacion}
        onSeleccionar={(id) => {
          setSeleccionado(id);
          setMostrarSelector(false);
          if (!interlocutoresConConversacion.includes(id)) {
            setInterlocutoresConConversacion(prev => prev.includes(id) ? prev : [...prev, id]);
          }
        }}
        onCerrar={() => setMostrarSelector(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 16 }}>
      {/* Lista de conversaciones */}
      {!cargandoConversaciones && interlocutoresConConversacion.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ConversacionesSidebar
            usuarios={usuarios}
            interlocutores={interlocutoresConConversacion}
            seleccionado={seleccionado}
            onSeleccionar={setSeleccionado}
          />
          <div style={{ padding: 8 }}>
            <Button label="Iniciar conversación" icon="pi pi-plus" onClick={() => setMostrarSelector(true)} style={{ width: 244 }} />
          </div>
        </div>
      )}

      {/* Área principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {cargandoConversaciones && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.7 }}>Cargando conversaciones...</span>
          </div>
        )}
        {!cargandoConversaciones && !seleccionado && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <h3 style={{ margin: 0 }}>Aún no tienes conversaciones</h3>
            <Button label="Iniciar conversación" icon="pi pi-plus" onClick={() => setMostrarSelector(true)} />
          </div>
        )}
        {!cargandoConversaciones && seleccionado && (
          <EditarChat
            idUsuarioActual={idUsuarioActual}
            interlocutorNombre={interlocutor?.nombre || seleccionado}
            interlocutorAvatarUrl={avatarUrl}
            mensajes={mensajes}
            estaCargandoMensajes={cargandoMensajes}
            onEnviar={enviarMensaje}
            onScrollCercaDelFondoChange={setCercaDelFondo}
          />
        )}
      </div>
    </div>
  );
}
