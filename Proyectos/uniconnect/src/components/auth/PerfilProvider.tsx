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

type Props = {
  children: ReactNode;
};

type PerfilConsulta = {
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

type RespuestaPerfil = {
  perfil?: PerfilConsulta;
  error?: string;
};

function normalizarPerfil(perfil: PerfilConsulta): PerfilUsuario {
  return {
    id: perfil.id,
    nombres: perfil.nombres,
    apellidos: perfil.apellidos,
    correo: perfil.correo,
    dni: perfil.dni,
    codigo_estudiante: perfil.codigo_estudiante,
    telefono: perfil.telefono,
    rol_id: perfil.rol_id,
    estado: perfil.estado,
    tiene_foto: perfil.tiene_foto,
    foto_version: perfil.foto_version,
  };
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
  const esRutaRecuperacion =
    pathname === "/recuperar-password" ||
    pathname === "/restablecer-password";

  const limpiarPerfil = useCallback(() => {
    perfilCargadoParaUsuario.current = null;
    setPerfil(null);
  }, []);

  const cargarPerfilPorUsuario = useCallback(
    async (user: User, accessToken: string, forzar = false) => {
      if (
        !forzar &&
        perfilCargadoParaUsuario.current === user.id
      ) {
        return;
      }

      setCargandoPerfil(true);
      setErrorPerfil("");

      const respuesta = await fetch("/api/perfil", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const resultado = (await respuesta.json()) as RespuestaPerfil;

      if (!respuesta.ok) {
        limpiarPerfil();
        setErrorPerfil(
          resultado.error ??
            "No se pudo cargar la informacion del usuario."
        );
        if (respuesta.status === 401 || respuesta.status === 403) {
          await supabase.auth.signOut();
        }
        setCargandoPerfil(false);
        return;
      }

      if (!resultado.perfil) {
        limpiarPerfil();
        setErrorPerfil(
          "Tu cuenta autenticada no existe en el registro de usuarios."
        );
        await supabase.auth.signOut();
        setCargandoPerfil(false);
        return;
      }

      const perfilUsuario = normalizarPerfil(resultado.perfil);
      perfilCargadoParaUsuario.current = user.id;
      setPerfil(perfilUsuario);
      setCargandoPerfil(false);
    },
    [limpiarPerfil]
  );

  const recargarPerfil = useCallback(async () => {
    setCargandoPerfil(true);
    setErrorPerfil("");

    const {
      data: { session: sesionActual },
      error,
    } = await supabase.auth.getSession();

    if (error || !sesionActual?.user) {
      setSession(null);
      limpiarPerfil();
      setCargandoPerfil(false);
      return;
    }

    setSession(sesionActual);
    await cargarPerfilPorUsuario(
      sesionActual.user,
      sesionActual.access_token,
      true
    );
  }, [cargarPerfilPorUsuario, limpiarPerfil]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nuevaSession) => {
      setSession(nuevaSession);
      setCargandoSesion(false);

      if (esRutaRecuperacion) {
        limpiarPerfil();
        setErrorPerfil("");
        setCargandoPerfil(false);
        return;
      }

      if (event === "SIGNED_OUT" || !nuevaSession?.user) {
        limpiarPerfil();
        setErrorPerfil("");
        setCargandoPerfil(false);
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        void cargarPerfilPorUsuario(
          nuevaSession.user,
          nuevaSession.access_token
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cargarPerfilPorUsuario, esRutaRecuperacion, limpiarPerfil]);

  const cerrarSesion = useCallback(async () => {
    setCargandoSesion(true);
    setCargandoPerfil(true);
    setErrorPerfil("");
    setSession(null);
    limpiarPerfil();

    await supabase.auth.signOut();

    setCargandoSesion(false);
    setCargandoPerfil(false);
    router.replace("/login");
    router.refresh();
  }, [limpiarPerfil, router]);

  const actualizarPerfilLocal = useCallback(
    (perfilActualizado: PerfilUsuario) => {
      perfilCargadoParaUsuario.current = perfilActualizado.id;
      setPerfil(perfilActualizado);
    },
    []
  );

  const valor = useMemo<PerfilContexto>(
    () => ({
      perfil,
      session,
      cargandoPerfil,
      cargandoSesion,
      errorPerfil,
      recargarPerfil,
      actualizarPerfilLocal,
      cerrarSesion,
    }),
    [
      actualizarPerfilLocal,
      cargandoPerfil,
      cargandoSesion,
      cerrarSesion,
      errorPerfil,
      perfil,
      recargarPerfil,
      session,
    ]
  );

  return (
    <PerfilContext.Provider value={valor}>
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const contexto = useContext(PerfilContext);

  if (!contexto) {
    throw new Error("usePerfil debe usarse dentro de PerfilProvider.");
  }

  return contexto;
}
