import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 bg-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold text-emerald-400">
        UniConnect
      </h1>

      <nav className="mt-10 flex flex-col gap-4">
        <Link href="/dashboard">🏠 Inicio</Link>
        <Link href="/usuarios">👥 Usuarios</Link>
        <Link href="/vehiculos">🚗 Vehículos</Link>
        <Link href="/avisos">📢 Avisos</Link>
        <Link href="/emprendimientos">🛍 Emprendimientos</Link>
        <Link href="/reportes">📄 Reportes</Link>
        <Link href="/configuracion">⚙ Configuración</Link>
        <Link href="/garita">Garita</Link>
        <Link href="/historial">Historial</Link>
      </nav>
    </aside>
  );
}
