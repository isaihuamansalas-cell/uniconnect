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

Notificaciones

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
