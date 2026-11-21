import { useEffect, useId, useRef, useState } from 'react';
import { Icono } from './Icono';
import { Boton } from './Controles';

const margen = 12;
const separacion = 10;

function ubicarTarjeta(boton: HTMLButtonElement | null, tarjeta: HTMLElement | null, ajustarHorizontal = false) {
  if (!boton || !tarjeta) return;
  const ancla = boton.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  const espacioDebajo = clientHeight - ancla.bottom - separacion - margen;
  const espacioEncima = ancla.top - separacion - margen;
  const colocarEncima = espacioDebajo < 270 && espacioEncima > espacioDebajo;

  const derecha = Math.max(margen, clientWidth - ancla.right);
  tarjeta.style.right = ajustarHorizontal
    ? `clamp(${margen}px, ${derecha}px, calc(100% - var(--ancho-menu-texto) - ${margen}px))`
    : `${derecha}px`;
  tarjeta.style.top = colocarEncima ? 'auto' : `${Math.max(margen, ancla.bottom + separacion)}px`;
  tarjeta.style.bottom = colocarEncima ? `${clientHeight - ancla.top + separacion}px` : 'auto';
  tarjeta.style.maxHeight = `${Math.max(0, colocarEncima ? espacioEncima : espacioDebajo)}px`;
}

export function ProfileMenu({ rol, onLogout }: { rol: string; onLogout: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const tarjeta = useRef<HTMLElement>(null);
  const tarjetaId = useId();
  const nombreId = useId();
  const identidadId = useId();

  useEffect(() => {
    if (!abierto) return;

    function actualizarPosicion() {
      ubicarTarjeta(boton.current, tarjeta.current);
    }

    actualizarPosicion();
    window.addEventListener('resize', actualizarPosicion);
    window.addEventListener('scroll', actualizarPosicion);
    return () => {
      window.removeEventListener('resize', actualizarPosicion);
      window.removeEventListener('scroll', actualizarPosicion);
    };
  }, [abierto]);

  return (
    <div className="profile-menu">
      <button
        ref={boton}
        type="button"
        className="profile-trigger"
        aria-label="Menú de perfil"
        aria-expanded={abierto}
        aria-controls={tarjetaId}
        popoverTarget={tarjetaId}
        aria-describedby={identidadId}
        title="Mi cuenta"
      >
        <span className="profile-trigger-avatar" aria-hidden="true">
          <Icono nombre="profile" />
        </span>
        <span className="profile-identity" id={identidadId}>
          <strong>Mi cuenta</strong>
          <small>{rol}</small>
        </span>
        <Icono nombre="chevron" />
      </button>

      <section
        ref={tarjeta}
        id={tarjetaId}
        className="profile-card"
        aria-labelledby={nombreId}
        popover="auto"
        onBeforeToggle={evento => {
          if (evento.newState === 'open') ubicarTarjeta(boton.current, evento.currentTarget);
        }}
        onToggle={evento => setAbierto(evento.newState === 'open')}
      >
        <div className="profile-avatar" aria-hidden="true">
          <Icono nombre="profile" />
        </div>
        <h2 id={nombreId}>Mi cuenta</h2>
        <p className="profile-role">{rol}</p>
        <div className="profile-actions">
          <Boton variante="secundario" className="submit-button" onClick={() => { tarjeta.current?.hidePopover(); boton.current?.focus(); onLogout(); }}>
            <Icono nombre="logout" />
            Cerrar sesión
          </Boton>
        </div>
      </section>
    </div>
  );
}


export function TextSizeMenu({ nivel, onChange }: { nivel: number; onChange: (nivel: number) => void }) {
  const boton = useRef<HTMLButtonElement>(null);
  const tarjeta = useRef<HTMLElement>(null);
  const tarjetaId = useId();
  const tituloId = useId();

  useEffect(() => {
    function actualizarPosicion() {
      if (tarjeta.current?.matches(':popover-open')) ubicarTarjeta(boton.current, tarjeta.current, true);
    }
    window.addEventListener('resize', actualizarPosicion);
    window.addEventListener('scroll', actualizarPosicion);
    actualizarPosicion();
    return () => {
      window.removeEventListener('resize', actualizarPosicion);
      window.removeEventListener('scroll', actualizarPosicion);
    };
  }, [nivel]);

  return (
    <div>
      <button ref={boton} type="button" className="accessibility-toggle"
        popoverTarget={tarjetaId} aria-controls={tarjetaId} aria-label="Accesibilidad" title="Tamaño del texto">
        <Icono nombre="accessibility" />
      </button>
      <section ref={tarjeta} id={tarjetaId} className="profile-card text-size-card"
        popover="auto" aria-labelledby={tituloId}
        onBeforeToggle={evento => {
          if (evento.newState === 'open') ubicarTarjeta(boton.current, evento.currentTarget, true);
        }}>
        <h2 id={tituloId}>Tamaño del texto</h2>
        <div className="text-size-options">
          <button type="button" onClick={() => onChange(nivel - 10)} disabled={nivel === 100}
            aria-label="Reducir el tamaño del texto">A−</button>
          <output aria-live="polite">{nivel} %</output>
          <button type="button" onClick={() => onChange(nivel + 10)} disabled={nivel === 150}
            aria-label="Aumentar el tamaño del texto">A+</button>
        </div>
        <button type="button" onClick={() => onChange(100)} disabled={nivel === 100}>Restablecer</button>
      </section>
    </div>
  );
}
