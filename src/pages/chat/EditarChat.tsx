import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MensajeChat } from '../../servicios/chat/ServicioChat';
import MensajeEntrante from '../../components/chat/MensajeEntrante';
import MensajeSaliente from '../../components/chat/MensajeSaliente';
import '../../styles/_main.scss';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';

type Props = {
  idUsuarioActual?: string;
  interlocutorNombre?: string;
  interlocutorAvatarUrl?: string | null;
  mensajes: MensajeChat[];
  estaCargandoMensajes: boolean;
  onEnviar: (texto: string) => void;
  onScrollCercaDelFondoChange?: (cerca: boolean) => void;
};

// Componente presentacional: muestra el encabezado, lista de mensajes y textarea de envío.
export default function EditarChat({
  idUsuarioActual,
  interlocutorNombre,
  interlocutorAvatarUrl,
  mensajes,
  estaCargandoMensajes,
  onEnviar,
  onScrollCercaDelFondoChange,
}: Props) {
  const contenedorMensajesRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [textoBorrador, setTextoBorrador] = useState('');

  // Autoscroll cuando llegan nuevos mensajes si el usuario está cerca del fondo
  const previoAlturaRef = useRef<number>(0);
  useEffect(() => {
    const el = contenedorMensajesRef.current;
    if (!el) return;
    const distanciaAlFondoAntes = el.scrollHeight - previoAlturaRef.current - el.clientHeight;
    const estabaCerca = distanciaAlFondoAntes < 120;
    if (autoScroll && estabaCerca) el.scrollTop = el.scrollHeight;
    previoAlturaRef.current = el.scrollHeight;
  }, [mensajes, autoScroll]);

  const manejarScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distancia = el.scrollHeight - el.scrollTop - el.clientHeight;
    const cerca = distancia < 80;
    setAutoScroll(cerca);
    onScrollCercaDelFondoChange?.(cerca);
  }, [onScrollCercaDelFondoChange]);

  const enviar = useCallback(() => {
    const t = textoBorrador.trim();
    if (!t) return;
    onEnviar(t);
    setTextoBorrador('');
  }, [textoBorrador, onEnviar]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 16 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {interlocutorAvatarUrl ? (
              <Avatar image={interlocutorAvatarUrl} size="large" shape="circle" />
            ) : (
              <Avatar label={(interlocutorNombre || 'U').slice(0, 1).toUpperCase()} size="large" shape="circle" />
            )}
            <strong style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{interlocutorNombre || 'Conversación'}</strong>
          </div>
        </div>

        <div
          ref={contenedorMensajesRef}
          onScroll={manejarScroll}
          style={{ flex: 1, overflowY: 'auto', padding: 12, background: 'var(--chat-bg, #fafafa)' }}
        >
          {estaCargandoMensajes && <div style={{ fontSize: 12 }}>Cargando mensajes...</div>}
          {!estaCargandoMensajes && mensajes.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.6 }}>No hay mensajes. Escribe el primero.</div>
          )}
          {mensajes.map((m, idx) => {
            const clave = m.id ? m.id : `sinid-${idx}`;
            const hora = m.creadoEn ? new Date(m.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;
            return m.deUsuarioId === String(idUsuarioActual) ? (
              <MensajeSaliente key={clave} texto={m.texto} horaTexto={hora} estado={m.estado} />
            ) : (
              <MensajeEntrante key={clave} texto={m.texto} horaTexto={hora} />
            );
          })}
        </div>

        <div style={{ padding: 8, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <InputTextarea
              value={textoBorrador}
              onChange={(e: any) => setTextoBorrador(e.target.value)}
              rows={2}
              autoResize
              placeholder="Escribe un mensaje..."
              disabled={!idUsuarioActual}
              style={{ width: '100%' }}
            />
          </div>
          <Button label="Enviar" icon="pi pi-send" onClick={enviar} disabled={!textoBorrador.trim() || !idUsuarioActual} />
        </div>
      </div>
    </div>
  );
}
