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

Dashboard con estadisticas reales y graficos nativos implementado

API Dashboard implementada

Buscador Global implementado en Header con API server-side, permisos por rol, debounce y soporte responsive

Modo oscuro global implementado con preferencia persistida, respeto de prefers-color-scheme y toggle en Login/Header

Contraste del Login corregido para etiquetas, texto de inputs, placeholders, bordes, foco emerald y mensajes de error

Colores institucionales dinamicos implementados con variables CSS desde ConfiguracionProvider, aplicados a botones, Sidebar, focos, enlaces activos, iconos y graficos

Eliminacion definitiva segura de Usuarios y Vehiculos implementada con bloqueo por relaciones, confirmacion estricta, auditoria y limpieza controlada de Storage/Auth

Control de Garita mejorado con busqueda por DNI, codigo institucional y placa

Visualizacion de estudiantes y vehiculos activos e inactivos implementada en Garita

Fotos privadas de estudiantes protegidas para Administrador y Garita

Confirmacion accesible de salidas mediante modal implementada

Proteccion server-side contra salidas repetidas del mismo vehiculo dentro de 2 minutos implementada

Historial operativo con las ultimas 5 salidas del dia implementado en Garita

Control de Garita optimizado para celular, tablet, modo claro y modo oscuro

Historial completo de salidas con paginacion y filtros server-side implementado

Historial responsive con tabla de escritorio y tarjetas para celular y tablet implementado

Exportacion CSV completa del historial filtrado mediante lotes server-side implementada

Fotos privadas de estudiantes y vehiculos habilitadas para los roles autorizados del Historial

Fase 1 de auditoria de seguridad completada: lecturas de Usuarios y Vehiculos migradas a APIs server-side con Bearer token, usuario activo, rol, campos explicitos y limites

Lectura directa del perfil en Configuracion eliminada; se reutiliza el PerfilProvider validado

MainLayout bloqueado con loader institucional hasta resolver sesion, perfil activo y permisos de ruta

PerfilProvider endurecido para revalidar en TOKEN_REFRESHED, USER_UPDATED, foco, visibilidad y cada 30 segundos; usuarios inactivos son expulsados y su estado local se limpia

Proteccion central de rutas aplicada a Dashboard, Usuarios, Vehiculos, Configuracion, Garita, Historial, Auditoria, Reportes y Perfil

Fase 2A de auditoria tecnica completada: recuperacion de contrasena restringida al flujo PASSWORD_RECOVERY, PerfilProvider protegido contra fallos de red y respuestas obsoletas, errores internos de Supabase saneados en APIs y login con mensajes controlados

Fase 2B de auditoria tecnica completada: Avisos y Emprendimientos paginados con filtros server-side, propietarios con busqueda limitada, Reportes reutilizando Historial y exportacion completa por lotes, fotos privadas con carga por viewport y cache temporal, Header movil compacto y polling de notificaciones controlado por visibilidad

Correccion global de modales completada: foco inicial ejecutado solo al abrir, restauracion al cerrar, bloqueo de scroll, Escape estable y formularios con contraste consistente en modo claro y oscuro

PerfilProvider corregido para separar la carga inicial de las revalidaciones silenciosas: intervalo de 5 minutos, conservacion de la interfaz y formularios ante foco, visibilidad, cambios de token/usuario y fallos temporales de red

Cierre de sesion inmediato e idempotente implementado: limpieza local y redireccion sin esperar la respuesta remota de Supabase, revalidaciones suspendidas y controles protegidos contra doble clic

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
