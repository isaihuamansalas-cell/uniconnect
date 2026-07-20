"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

export type PerfilUsuario = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  dni: string;
  codigo_estudiante: string | null;
  telefono: string | null;
  rol_id: number;
  estado: boolean;
  tiene_foto: boolean;
  foto_version: string;
};

type PerfilContexto = {
  perfil: PerfilUsuario | null;
  session: Session | null;
  cargandoPerfil: boolean;
  cargandoSesion: boolean;
  errorPerfil: string;
  recargarPerfil: () => Promise<void>;
  actualizarPerfilLocal: (perfilActualizado: PerfilUsuario) => void;
  cerrarSesion: () => Promise<void>;
};

const PerfilContext = createContext<PerfilContexto | null>(null);

type Props = { children: ReactNode };

type PerfilConsulta = PerfilUsuario;

type RespuestaPerfil = {
  perfil?: PerfilConsulta;
  error?: string;
};

function normalizarPerfil(perfil: PerfilConsulta): PerfilUsuario {
  return { ...perfil };
}

export function PerfilProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState("");
  const perfilCargadoParaUsuario = useRef<string | null>(null);
  const solicitudPerfil = useRef<AbortController | null>(null);
  const versionSolicitud = useRef(0);
  const componenteMontado = useRef(true);
  const redireccionandoAlLogin = useRef(false);
  const esRutaRecuperacion =
    pathname === "/recuperar-password" ||
    pathname === "/restablecer-password";

  const cancelarSolicitudPerfil = useCallback(() => {
    versionSolicitud.current += 1;
    solicitudPerfil.current?.abort();
    solicitudPerfil.current = null;
  }, []);

  const limpiarEstadoAutenticado = useCallback(() => {
    cancelarSolicitudPerfil();
    perfilCargadoParaUsuario.current = null;
    setPerfil(null);
    setSession(null);
    setErrorPerfil("");
    setCargandoPerfil(false);
    setCargandoSesion(false);
  }, [cancelarSolicitudPerfil]);

  const redirigirAlLogin = useCallback(() => {
    if (redireccionandoAlLogin.current || esRutaRecuperacion) return;
    redireccionandoAlLogin.current = true;
    router.replace("/login");
    router.refresh();
  }, [esRutaRecuperacion, router]);

  const expulsarUsuario = useCallback(async () => {
    limpiarEstadoAutenticado();
    try {
      await supabase.auth.signOut();
    } catch {
      // La limpieza y redireccion local deben continuar aunque falle la red.
    } finally {
      if (componenteMontado.current) redirigirAlLogin();
    }
  }, [limpiarEstadoAutenticado, redirigirAlLogin]);

  const cargarPerfilPorUsuario = useCallback(
    async (user: User, accessToken: string, forzar = false) => {
      if (!forzar && perfilCargadoParaUsuario.current === user.id) return;

      cancelarSolicitudPerfil();
      const controlador = new AbortController();
      solicitudPerfil.current = controlador;
      const versionActual = versionSolicitud.current;

      setCargandoPerfil(true);
      setErrorPerfil("");

      try {
        const respuesta = await fetch("/api/perfil", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          signal: controlador.signal,
        });

        let resultado: RespuestaPerfil;
        try {
          resultado = (await respuesta.json()) as RespuestaPerfil;
        } catch {
          resultado = {};
        }

        if (
          controlador.signal.aborted ||
          versionActual !== versionSolicitud.current ||
          !componenteMontado.current
        ) {
          return;
        }

        if (!respuesta.ok) {
          perfilCargadoParaUsuario.current = null;
          setPerfil(null);
          setErrorPerfil(
            resultado.error ?? "No se pudo cargar la informacion del usuario."
          );
          if (respuesta.status === 401 || respuesta.status === 403) {
            await expulsarUsuario();
          }
          return;
        }

        if (!resultado.perfil) {
          setErrorPerfil(
            "Tu cuenta autenticada no existe en el registro de usuarios."
          );
          await expulsarUsuario();
          return;
        }

        perfilCargadoParaUsuario.current = user.id;
        setPerfil(normalizarPerfil(resultado.perfil));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (versionActual !== versionSolicitud.current || !componenteMontado.current) return;
        perfilCargadoParaUsuario.current = null;
        setPerfil(null);
        setErrorPerfil("No se pudo cargar la informacion del usuario.");
      } finally {
        if (
          versionActual === versionSolicitud.current &&
          componenteMontado.current
        ) {
          solicitudPerfil.current = null;
          setCargandoPerfil(false);
        }
      }
    },
    [cancelarSolicitudPerfil, expulsarUsuario]
  );

  const recargarPerfil = useCallback(async () => {
    if (esRutaRecuperacion) return;
    setCargandoPerfil(true);
    setErrorPerfil("");

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) {
        limpiarEstadoAutenticado();
        return;
      }

      setSession(data.session);
      setCargandoSesion(false);
      await cargarPerfilPorUsuario(
        data.session.user,
        data.session.access_token,
        true
      );
    } catch {
      if (!componenteMontado.current) return;
      setErrorPerfil("No se pudo validar la sesion.");
    } finally {
      if (componenteMontado.current && !solicitudPerfil.current) {
        setCargandoPerfil(false);
        setCargandoSesion(false);
      }
    }
  }, [cargarPerfilPorUsuario, esRutaRecuperacion, limpiarEstadoAutenticado]);

  useEffect(() => {
    componenteMontado.current = true;
    redireccionandoAlLogin.current = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nuevaSession) => {
        if (!componenteMontado.current) return;

        if (esRutaRecuperacion) {
          cancelarSolicitudPerfil();
          perfilCargadoParaUsuario.current = null;
          setPerfil(null);
          setErrorPerfil("");
          setCargandoPerfil(false);
          setCargandoSesion(false);
          return;
        }

        if (event === "SIGNED_OUT" || !nuevaSession?.user) {
          limpiarEstadoAutenticado();
          return;
        }

        setSession(nuevaSession);
        setCargandoSesion(false);

        if (
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          void cargarPerfilPorUsuario(
            nuevaSession.user,
            nuevaSession.access_token,
            event === "TOKEN_REFRESHED" || event === "USER_UPDATED"
          );
        }
      }
    );

    return () => {
      componenteMontado.current = false;
      cancelarSolicitudPerfil();
      subscription.unsubscribe();
    };
  }, [
    cancelarSolicitudPerfil,
    cargarPerfilPorUsuario,
    esRutaRecuperacion,
    limpiarEstadoAutenticado,
  ]);

  useEffect(() => {
    if (esRutaRecuperacion) return;
    const revalidar = () => void recargarPerfil();
    const intervalo = window.setInterval(revalidar, 30_000);
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") revalidar();
    };
    window.addEventListener("focus", revalidar);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", revalidar);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [esRutaRecuperacion, recargarPerfil]);

  const cerrarSesion = useCallback(async () => {
    if (redireccionandoAlLogin.current) return;
    setCargandoSesion(true);
    setCargandoPerfil(true);
    cancelarSolicitudPerfil();
    perfilCargadoParaUsuario.current = null;
    setSession(null);
    setPerfil(null);
    setErrorPerfil("");

    try {
      await supabase.auth.signOut();
    } catch {
      // La limpieza y redireccion local deben continuar aunque falle la red.
    } finally {
      if (componenteMontado.current) {
        setCargandoSesion(false);
        setCargandoPerfil(false);
        redirigirAlLogin();
      }
    }
  }, [cancelarSolicitudPerfil, redirigirAlLogin]);

  const actualizarPerfilLocal = useCallback((perfilActualizado: PerfilUsuario) => {
    perfilCargadoParaUsuario.current = perfilActualizado.id;
    setPerfil(perfilActualizado);
  }, []);

  const valor = useMemo<PerfilContexto>(() => ({
    perfil,
    session,
    cargandoPerfil,
    cargandoSesion,
    errorPerfil,
    recargarPerfil,
    actualizarPerfilLocal,
    cerrarSesion,
  }), [
    actualizarPerfilLocal,
    cargandoPerfil,
    cargandoSesion,
    cerrarSesion,
    errorPerfil,
    perfil,
    recargarPerfil,
    session,
  ]);

  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>;
}

export function usePerfil() {
  const contexto = useContext(PerfilContext);
  if (!contexto) throw new Error("usePerfil debe usarse dentro de PerfilProvider.");
  return contexto;
}
