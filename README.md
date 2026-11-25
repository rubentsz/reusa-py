# ReUsa PY — Clasificados de Productos Usados en Paraguay

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frubentsz%2Freusa-py&env=DATABASE_URL,AUTH_SECRET&envDescription=Cadena%20PostgreSQL%20(Neon%20o%20Supabase)%20y%20clave%20secreta%20de%20sesi%C3%B3n&project-name=reusa-py&repository-name=reusa-py)

Plataforma web full-stack de clasificados entre particulares en **Paraguay** (`PYG` y `USD`), pensada para vender desde un par de medias hasta un auto o una casa, con comparativa automática de **% de ahorro vs. producto nuevo** e interfaz dual:

- **Computadora (`>= 1024px`)**: Escritorio estilo **Windows 11 (Fluent Design)** con ventanas reales arrastrables, minimizables, maximizables y acoplables lado a lado para comparar publicaciones, barra de tareas inferior y Menú Inicio.
- **Celular (`< 1024px`)**: **App móvil instalable (PWA)** con barra de navegación inferior de 5 pestañas, filtros en hoja deslizable y mapa interactivo.

## Despliegue en Vercel (3 pasos)

1. Hacé clic en **Deploy with Vercel** arriba (o importá `rubentsz/reusa-py` desde [vercel.com/new](https://vercel.com/new)).
2. En **Storage** del proyecto en Vercel, conectá:
   - Una base de datos **PostgreSQL** gratuita (**Neon**, **Supabase** o **Prisma Postgres**) → inyecta `DATABASE_URL` automáticamente.
   - *(Opcional, recomendado)* **Vercel Blob** → inyecta `BLOB_READ_WRITE_TOKEN` automáticamente para guardar las fotos subidas en CDN (si todavía no lo activás, la app usa respaldo WebP compacto automáticamente).
3. Agregá la variable de entorno `AUTH_SECRET` (cualquier texto aleatorio largo) y hacé **Deploy** / **Redeploy**.
   - El script `vercel-build` ejecuta automáticamente `prisma db push` y carga los datos iniciales de Paraguay (18 departamentos, ciudades, barrios, categorías, cuentas demo y 15 avisos reales) de forma idempotente.

## Cuentas de prueba incluidas

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| Usuario / Vendedora | `camila@reusa.py` | `reusa123` |
| Administrador / Moderación | `admin@reusa.py` | `admin123` |

## Desarrollo local

```bash
cp .env.example .env
# Configurá DATABASE_URL hacia tu PostgreSQL local o Neon
npm install
npm run db:push
npm run db:seed
npm run dev
```
