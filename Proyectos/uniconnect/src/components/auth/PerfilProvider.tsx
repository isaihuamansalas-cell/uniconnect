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
import { limpiarCacheFotosPrivadas } from "@/lib/imagenes/cacheFotosPrivadas";

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
  cargaInicial: boolean;
  revalidandoPerfil: boolean;
  cerrandoSesion: boolean;
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
  const [cargaInicial, setCargaInicial] = useState(true);
  const [revalidandoPerfil, setRevalidandoPerfil] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState("");
  const perfilCargadoParaUsuario = useRef<string | null>(null);
  const solicitudPerfil = useRef<AbortController | null>(null);
  const versionSolicitud = useRef(0);
  const componenteMontado = useRef(true);
  const redireccionandoAlLogin = useRef(false);
  const cierreSesionEnCurso = useRef(false);
  const esRutaRecuperacion =
    pathname === "/recuperar-password" ||
    pathname === "/restablecer-password";

  const cancelarSolicitudPerfil = useCallback(() => {
    versionSolicitud.current += 1;
    solicitudPerfil.current?.abort();
    solicitudPerfil.current = null;
  }, []);

  const limpiarEstadoAutenticado = useCallback(() => {
    limpiarCacheFotosPrivadas();
    cancelarSolicitudPerfil();
    perfilCargadoParaUsuario.current = null;
    setPerfil(null);
    setSession(null);
    setErrorPerfil("");
    setCargaInicial(false);
    setRevalidandoPerfil(false);
    setCargandoSesion(false);
  }, [cancelarSolicitudPerfil]);

  const redirigirAlLogin = useCallback(() => {
    if (redireccionandoAlLogin.current || esRutaRecuperacion) return;
    redireccionandoAlLogin.current = true;
    router.replace("/login");
    router.refresh();
  }, [esRutaRecuperacion, router]);

  const expulsarUsuario = useCallback(async () => {
    if (cierreSesionEnCurso.current) return;
    cierreSesionEnCurso.current = true;
    setCerrandoSesion(true);
    limpiarEstadoAutenticado();
    try {
      const cierreRemoto = supabase.auth.signOut();
      redirigirAlLogin();
      const { error } = await cierreRemoto;
      if (error) console.error("No se pudo completar el cierre remoto de sesion.");
    } catch {
      console.error("No se pudo completar el cierre remoto de sesion.");
    } finally {
      if (componenteMontado.current) redirigirAlLogin();
    }
  }, [limpiarEstadoAutenticado, redirigirAlLogin]);

  const cargarPerfilPorUsuario = useCallback(
    async (
      user: User,
      accessToken: string,
      modo: "inicial" | "revalidacion",
      forzar = false
    ) => {
      if (!forzar && perfilCargadoParaUsuario.current === user.id) return;

      cancelarSolicitudPerfil();
      const controlador = new AbortController();
      solicitudPerfil.current = controlador;
      const versionActual = versionSolicitud.current;

      if (modo === "inicial") setCargaInicial(true);
      else setRevalidandoPerfil(true);
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
        setErrorPerfil("");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (versionActual !== versionSolicitud.current || !componenteMontado.current) return;
        setErrorPerfil("No se pudo cargar la informacion del usuario.");
      } finally {
        if (
          versionActual === versionSolicitud.current &&
          componenteMontado.current
        ) {
          solicitudPerfil.current = null;
          if (modo === "inicial") setCargaInicial(false);
          else setRevalidandoPerfil(false);
        }
      }
    },
    [cancelarSolicitudPerfil, expulsarUsuario]
  );

  const recargarPerfil = useCallback(async () => {
    if (esRutaRecuperacion || cierreSesionEnCurso.current) return;
    if (solicitudPerfil.current) return;
    setRevalidandoPerfil(true);
    setErrorPerfil("");

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (componenteMontado.current) {
          setErrorPerfil("No se pudo validar la sesion.");
        }
        return;
      }
      if (!data.session?.user) {
        await expulsarUsuario();
        return;
      }

      setSession(data.session);
      setCargandoSesion(false);
      await cargarPerfilPorUsuario(
        data.session.user,
        data.session.access_token,
        "revalidacion",
        true
      );
    } catch {
      if (!componenteMontado.current) return;
      setErrorPerfil("No se pudo validar la sesion.");
    } finally {
      if (componenteMontado.current) {
        setRevalidandoPerfil(false);
        setCargandoSesion(false);
      }
    }
  }, [cargarPerfilPorUsuario, esRutaRecuperacion, expulsarUsuario]);

  useEffect(() => {
    componenteMontado.current = true;
    redireccionandoAlLogin.current = false;
    cierreSesionEnCurso.current = false;
    setCerrandoSesion(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nuevaSession) => {
        if (!componenteMontado.current) return;

        if (esRutaRecuperacion) {
          cancelarSolicitudPerfil();
          perfilCargadoParaUsuario.current = null;
          setPerfil(null);
          setErrorPerfil("");
          setCargaInicial(false);
          setRevalidandoPerfil(false);
          setCargandoSesion(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          cierreSesionEnCurso.current = true;
          setCerrandoSesion(true);
          limpiarEstadoAutenticado();
          redirigirAlLogin();
          return;
        }

        if (!nuevaSession?.user) {
          limpiarEstadoAutenticado();
          return;
        }

        if (cierreSesionEnCurso.current) return;

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
              ? "revalidacion"
              : perfilCargadoParaUsuario.current
                ? "revalidacion"
                : "inicial",
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
    redirigirAlLogin,
  ]);

  useEffect(() => {
    if (esRutaRecuperacion || cerrandoSesion || !session) return;
    const revalidar = () => {
      if (!cierreSesionEnCurso.current) void recargarPerfil();
    };
    const intervalo = window.setInterval(revalidar, 5 * 60 * 1000);
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
  }, [cerrandoSesion, esRutaRecuperacion, recargarPerfil, session]);

  const cerrarSesion = useCallback(async () => {
    if (cierreSesionEnCurso.current) return;
    cierreSesionEnCurso.current = true;
    setCerrandoSesion(true);
    setCargandoSesion(true);
    cancelarSolicitudPerfil();
    limpiarCacheFotosPrivadas();
    perfilCargadoParaUsuario.current = null;
    setSession(null);
    setPerfil(null);
    setErrorPerfil("");
    setCargaInicial(false);
    setRevalidandoPerfil(false);

    try {
      const cierreRemoto = supabase.auth.signOut();
      redirigirAlLogin();
      const { error } = await cierreRemoto;
      if (error) console.error("No se pudo completar el cierre remoto de sesion.");
    } catch {
      console.error("No se pudo completar el cierre remoto de sesion.");
    } finally {
      if (componenteMontado.current) {
        setCargandoSesion(false);
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
    cargaInicial,
    revalidandoPerfil,
    cerrandoSesion,
    cargandoPerfil: cargaInicial,
    cargandoSesion,
    errorPerfil,
    recargarPerfil,
    actualizarPerfilLocal,
    cerrarSesion,
  }), [
    actualizarPerfilLocal,
    cargaInicial,
    cerrandoSesion,
    cargandoSesion,
    cerrarSesion,
    errorPerfil,
    perfil,
    revalidandoPerfil,
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
