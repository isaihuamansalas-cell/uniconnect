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
  rol_id: number;
  estado: boolean;
};

type PerfilContexto = {
  perfil: PerfilUsuario | null;
  session: Session | null;
  cargandoPerfil: boolean;
  cargandoSesion: boolean;
  errorPerfil: string;
  recargarPerfil: () => Promise<void>;
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
  rol_id: number;
  estado: boolean;
};

function normalizarPerfil(perfil: PerfilConsulta): PerfilUsuario {
  return {
    id: perfil.id,
    nombres: perfil.nombres,
    apellidos: perfil.apellidos,
    correo: perfil.correo,
    rol_id: perfil.rol_id,
    estado: perfil.estado,
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
    async (user: User, forzar = false) => {
      if (
        !forzar &&
        perfilCargadoParaUsuario.current === user.id
      ) {
        return;
      }

      setCargandoPerfil(true);
      setErrorPerfil("");

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombres, apellidos, correo, rol_id, estado")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error al cargar el perfil:", error);
        limpiarPerfil();
        setErrorPerfil("No se pudo cargar la informacion del usuario.");
        setCargandoPerfil(false);
        return;
      }

      if (!data) {
        limpiarPerfil();
        setErrorPerfil(
          "Tu cuenta autenticada no existe en el registro de usuarios."
        );
        await supabase.auth.signOut();
        setCargandoPerfil(false);
        return;
      }

      const perfilUsuario = normalizarPerfil(data as PerfilConsulta);

      if (!perfilUsuario.estado) {
        limpiarPerfil();
        setErrorPerfil(
          "Tu usuario esta inactivo. Contacta al administrador."
        );
        await supabase.auth.signOut();
        setCargandoPerfil(false);
        return;
      }

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
    await cargarPerfilPorUsuario(sesionActual.user, true);
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
        void cargarPerfilPorUsuario(nuevaSession.user);
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

  const valor = useMemo<PerfilContexto>(
    () => ({
      perfil,
      session,
      cargandoPerfil,
      cargandoSesion,
      errorPerfil,
      recargarPerfil,
      cerrarSesion,
    }),
    [
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
