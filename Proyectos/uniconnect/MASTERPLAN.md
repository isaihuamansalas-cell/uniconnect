# UniConnect - Master Plan

## Descripción

UniConnect es un sistema web de Seguridad y Comunicación para el Instituto Superior Tecnológico Suiza de Ucayali.

El proyecto debe mantener siempre la misma arquitectura y estilo visual.

---

# Tecnologías

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase
- Lucide React

---

# Base de datos

Supabase

Tablas principales:

- usuarios
- roles
- vehiculos
- salidas
- avisos
- emprendimientos

Storage

- bucket privado:
  vehiculos
- bucket privado:
  usuarios

---

# Arquitectura

Nunca modificar esta estructura.

src/

app/

api/

dashboard/

login/

usuarios/

vehiculos/

components/

layout/

usuarios/

vehiculos/

ui/

lib/

supabase/

types/

---

# Componentes reutilizables

Siempre reutilizar:

MainLayout

Header

Sidebar

Modal

Input

Select

FormField

StatCard

No crear componentes duplicados.

---

# Diseño

Colores oficiales

Primario

Emerald 700

Fondos

Slate 100

Cards

White

Botones

Rounded XL

Sombras suaves

Diseño moderno tipo Dashboard.

---

# Reglas

Nunca eliminar código existente.

Nunca cambiar nombres de carpetas.

Nunca modificar la base de datos sin autorización.

Después de cada cambio ejecutar:

npm run build

Si hay errores:

corregirlos antes de continuar.

---

# Orden de desarrollo

## Completado

✔ Login

✔ Dashboard

✔ CRUD Usuarios

✔ CRUD Vehículos

✔ API Usuarios

✔ API Vehículos

✔ Supabase Storage

Reportes implementado

Reportes Excel CSV implementado

Reportes PDF mediante vista imprimible implementado

Configuracion implementada

API Configuracion implementada

Logo institucional implementado

Menu responsive implementado

Control visual del menu por roles implementado

Flujo de autenticacion en produccion corregido con validacion de sesion, perfil activo y escucha de cambios de Supabase

Recuperacion y restablecimiento de contrasena implementado con Supabase Auth

Perfil de usuario implementado

API Perfil implementada

Foto de perfil privada implementada con bucket usuarios

Cambio de contrasena desde Perfil implementado con validacion de contrasena actual

Notificaciones implementado

API Notificaciones implementada

Centro de notificaciones en Header implementado con polling controlado

Auditoria implementada

API Auditoria implementada

Pagina de auditoria con filtros, detalles y exportacion CSV implementada

---

## Pendiente

Subir foto del vehículo

Editar foto

Mostrar foto

Control de garita

Registro de salidas

Historial

Avisos

Emprendimientos

Reportes PDF

Reportes Excel

Dashboard con estadísticas

Roles y permisos

Aplicación responsive

---

# Convenciones

Siempre usar TypeScript.

No usar JavaScript.

No usar any.

Usar nombres descriptivos.

Componentes pequeños.

Código limpio.

---

# Antes de modificar

Analizar primero el proyecto.

Explicar el plan.

Modificar únicamente lo necesario.

Nunca romper funcionalidades existentes.

---

# Objetivo

Construir un sistema profesional listo para producción manteniendo siempre la arquitectura original del proyecto.
