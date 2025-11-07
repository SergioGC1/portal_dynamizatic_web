// ServicioChat: gestiona conexión WebSocket y peticiones REST del chat
// Nota: Los nombres de variables y funciones están en español y describen su acción.

export type MensajeChat = {
  id?: string;
  deUsuarioId: string; // emisorId en BD
  paraUsuarioId: string; // receptorId en BD
  texto: string;
  creadoEn?: string; // fechaEnvio en BD (ISO)
  estado?: 'enviando' | 'enviado'; // simplificado: sin gestión de 'leido'
};

// Representa un usuario para el chat. "nombre" contendrá el nombre completo (nombreUsuario + apellidos)
export type UsuarioChat = {
  id: string;
  nombre?: string; // nombre completo ya combinado
  nombreUsuario?: string;
  apellidos?: string;
  email?: string;
  imagen?: string | null; // url de la imagen guardada en BD
  urlAvatar?: string | null; // alias para compatibilidad previa
};

class ImplementacionServicioChat {
  private conexionWebSocket?: WebSocket;
  private listaSuscriptores: ((mensaje: MensajeChat) => void)[] = [];
  private estaConectado = false;
  private temporizadorReintento?: number;
  private urlBase: string;
  private identificadorUsuarioActual?: string;
  private numeroIntentosWs = 0;
  private haMostradoErrorWs = false;
  private wsUrl: string | null = null;

  constructor(urlBase: string) {
    this.urlBase = urlBase;
  }

  // Inicializa el servicio indicando el usuario actual (para filtrar histórico, etc.)
  inicializar(identificadorUsuarioActual: string) {
    this.identificadorUsuarioActual = identificadorUsuarioActual;
    // Determinar URL WS sólo una vez (env o variable global). Si no existe, se desactiva WS silenciosamente.
    if (this.wsUrl === null) {
      const desdeEnv = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_CHAT_WS_URL) ? process.env.REACT_APP_CHAT_WS_URL : undefined;
      const desdeWindow = (typeof window !== 'undefined' && (window as any).__CHAT_WS_URL__) ? (window as any).__CHAT_WS_URL__ : undefined;
      this.wsUrl = (desdeEnv || desdeWindow || '').trim() || null;
    }
    this.asegurarConexionWebSocket();
  }

  // Construye cabeceras de autenticación desde localStorage
  private obtenerCabecerasAutenticacion(): Record<string, string> {
    if (typeof localStorage === 'undefined') return {};
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Crea la conexión WebSocket si no existe
  private asegurarConexionWebSocket() {
    // Si ya hay conexión o no estamos en navegador, salir
    if (this.conexionWebSocket || typeof window === 'undefined') return;
    // Si no hay URL definida (env no configurado) desactivar WS silenciosamente
    if (!this.wsUrl) return;
    // Limitar número de intentos para no spamear
    if (this.numeroIntentosWs >= 5) return;
    this.numeroIntentosWs += 1;
    try {
      this.conexionWebSocket = new WebSocket(this.wsUrl);
      this.conexionWebSocket.onopen = () => {
        this.estaConectado = true;
        this.numeroIntentosWs = 0; // reset tras éxito
      };
      this.conexionWebSocket.onmessage = (evento) => {
        try {
          const datos = JSON.parse(evento.data);
          if (datos && datos.type === 'chat' && datos.message) {
            const m = datos.message as any;
            const mensaje: MensajeChat = {
              id: m.id,
              deUsuarioId: m.from ?? m.deUsuarioId,
              paraUsuarioId: m.to ?? m.paraUsuarioId,
              texto: m.text ?? m.texto,
              creadoEn: m.createdAt ?? m.creadoEn,
              estado: (m.status === 'sending' ? 'enviando' : 'enviado'),
            };
            this.emitir(mensaje);
          }
        } catch {
          // Ignoramos errores de parseo
        }
      };
      this.conexionWebSocket.onclose = () => {
        this.estaConectado = false;
        this.conexionWebSocket = undefined;
        // Backoff exponencial simple
        const espera = Math.min(4000 * this.numeroIntentosWs, 20000);
        if (this.numeroIntentosWs < 5 && typeof window !== 'undefined') {
          this.temporizadorReintento = window.setTimeout(() => this.asegurarConexionWebSocket(), espera);
        }
      };
      this.conexionWebSocket.onerror = () => {
        // Mostrar advertencia una única vez para evitar inundar consola
        if (!this.haMostradoErrorWs) {
          console.warn('[Chat] No se pudo establecer conexión WebSocket con', this.wsUrl, ' — se continuará sin tiempo real.');
          this.haMostradoErrorWs = true;
        }
        if (this.conexionWebSocket) this.conexionWebSocket.close();
      };
    } catch {
      if (!this.haMostradoErrorWs) {
        console.warn('[Chat] Error creando WebSocket, se desactiva temporalmente.');
        this.haMostradoErrorWs = true;
      }
    }
  }

  // Notifica a todos los suscriptores
  private emitir(mensaje: MensajeChat) {
    this.listaSuscriptores.forEach((callback) => callback(mensaje));
  }

  // Permite suscribirse a mensajes entrantes
  suscribirse(callback: (mensaje: MensajeChat) => void) {
    this.listaSuscriptores.push(callback);
    return () => {
      this.listaSuscriptores = this.listaSuscriptores.filter((c) => c !== callback);
    };
  }

  // Envía un mensaje (no optimista): solo emitimos cuando el servidor confirma
  async enviarMensaje(mensaje: Omit<MensajeChat, 'id' | 'creadoEn' | 'estado'>) {
    try {
      // Persistencia REST: adaptamos a columnas reales (emisorId, receptorId, mensaje) y forzamos número
      const payload = { emisorId: Number(mensaje.deUsuarioId), receptorId: Number(mensaje.paraUsuarioId), mensaje: mensaje.texto };
      const respuesta = await fetch(`${this.urlBase}/mensajes-chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.obtenerCabecerasAutenticacion() },
        body: JSON.stringify(payload),
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '');
        throw new Error(`Error creando mensaje ${respuesta.status} ${respuesta.statusText} ${detalle}`);
      }
      const json = await respuesta.json().catch(() => ({}));
      const final: MensajeChat = {
        id: json.id ?? `tmp-${Date.now()}`,
        deUsuarioId: String(json.emisorId ?? mensaje.deUsuarioId),
        paraUsuarioId: String(json.receptorId ?? mensaje.paraUsuarioId),
        texto: json.mensaje ?? mensaje.texto,
        creadoEn: json.fechaEnvio ?? json.createdAt ?? json.creadoEn ?? new Date().toISOString(),
        estado: 'enviado',
      };
      this.emitir(final);
      if (this.conexionWebSocket && this.estaConectado) {
        this.conexionWebSocket.send(
          JSON.stringify({ type: 'chat', message: { id: final.id, emisorId: final.deUsuarioId, receptorId: final.paraUsuarioId, mensaje: final.texto, fechaEnvio: final.creadoEn, status: 'sent' } })
        );
      }
      return final;
    } catch (err) {
      // No emitimos nada en caso de error para evitar duplicados/placeholder
      throw err;
    }
  }

  // Obtiene el histórico de mensajes con un usuario concreto
  async obtenerHistorial(identificadorInterlocutor: string) {
    if (!this.identificadorUsuarioActual) return [] as MensajeChat[];
    const parametros = new URLSearchParams({
      filter: JSON.stringify({
        where: {
          or: [
            { emisorId: Number(this.identificadorUsuarioActual), receptorId: Number(identificadorInterlocutor) },
            { emisorId: Number(identificadorInterlocutor), receptorId: Number(this.identificadorUsuarioActual) },
          ],
        },
        order: 'fechaEnvio DESC',
        limit: 50,
      }),
    });
    const respuesta = await fetch(`${this.urlBase}/mensajes-chats?${parametros.toString()}`, { headers: { ...this.obtenerCabecerasAutenticacion() } });
    if (!respuesta.ok) return [];
    const json = await respuesta.json().catch(() => []);
    const lista = Array.isArray(json) ? json : [];
    const normalizados: MensajeChat[] = lista
      .map((m: any) => ({ id: m.id, deUsuarioId: String(m.emisorId), paraUsuarioId: String(m.receptorId), texto: m.mensaje ?? m.text ?? '', creadoEn: m.fechaEnvio ?? m.createdAt, estado: 'enviado' as const }))
      .reverse();
    return normalizados;
  }

  // Devuelve la lista de usuarios del sistema
  async obtenerUsuarios() {
    const respuesta = await fetch(`${this.urlBase}/usuarios`, { headers: { ...this.obtenerCabecerasAutenticacion() } });
    const json = await respuesta.json();
    const lista = Array.isArray(json) ? json : [];
    // Normalizamos para que "nombre" sea el nombre completo
    const normalizados: UsuarioChat[] = lista.map((u: any) => {
      const id = u.id != null ? String(u.id) : (u.email ?? u.nombreUsuario ?? '');
      const nombreCompleto = [u.nombreUsuario, u.apellidos].filter(Boolean).join(' ').trim();
      return {
        id,
        nombre: nombreCompleto || u.nombreUsuario || u.apellidos || u.email,
        nombreUsuario: u.nombreUsuario,
        apellidos: u.apellidos,
        email: u.email,
        imagen: u.imagen || null,
        urlAvatar: u.imagen || null,
      };
    });
    return normalizados;
  }

  // Devuelve los identificadores de usuarios con los que el usuario actual ya tiene conversación
  async obtenerInterlocutoresConConversacion(): Promise<string[]> {
    if (!this.identificadorUsuarioActual) return [];
    const parametros = new URLSearchParams({
      filter: JSON.stringify({
        where: {
          or: [
            { emisorId: Number(this.identificadorUsuarioActual) },
            { receptorId: Number(this.identificadorUsuarioActual) },
          ],
        },
        order: 'fechaEnvio DESC',
        limit: 500,
      }),
    });
    const respuesta = await fetch(`${this.urlBase}/mensajes-chats?${parametros.toString()}`, { headers: { ...this.obtenerCabecerasAutenticacion() } });
    if (!respuesta.ok) return [];
    const json = await respuesta.json().catch(() => []);
    const mensajes = Array.isArray(json) ? json : [];
    const conjunto = new Set<string>();
    for (const m of mensajes) {
      if (m.emisorId === Number(this.identificadorUsuarioActual) && m.receptorId != null) conjunto.add(String(m.receptorId));
      else if (m.receptorId === Number(this.identificadorUsuarioActual) && m.emisorId != null) conjunto.add(String(m.emisorId));
    }
    return Array.from(conjunto);
  }

  // Indica si hay conexión WS activa (para decidir si usar polling)
  estaConectadoTiempoReal() {
    return this.estaConectado;
  }

  // (Características de leídos desactivadas temporalmente)
}

const URL_BASE = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) || 'http://localhost:3000';
export const ServicioChat = new ImplementacionServicioChat(URL_BASE);
