"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
  cargandoPerfil: boolean;
  errorPerfil: string;
  recargarPerfil: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const PerfilContext = createContext<PerfilContexto | null>(null);

type Props = {
  children: ReactNode;
};

export function PerfilProvider({ children }: Props) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState("");

  const recargarPerfil = useCallback(async () => {
    setCargandoPerfil(true);
    setErrorPerfil("");

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
      setPerfil(null);
      setCargandoPerfil(false);
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombres, apellidos, correo, rol_id, estado")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error al cargar el perfil:", error);
      setErrorPerfil("No se pudo cargar la informacion del usuario.");
      setPerfil(null);
      setCargandoPerfil(false);
      return;
    }

    setPerfil(data as PerfilUsuario);
    setCargandoPerfil(false);
  }, []);

  useEffect(() => {
    recargarPerfil();
  }, [recargarPerfil]);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const valor = useMemo<PerfilContexto>(
    () => ({
      perfil,
      cargandoPerfil,
      errorPerfil,
      recargarPerfil,
      cerrarSesion,
    }),
    [
      cargandoPerfil,
      cerrarSesion,
      errorPerfil,
      perfil,
      recargarPerfil,
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
