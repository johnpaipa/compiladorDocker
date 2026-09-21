# Technical Assessment Platform

Plataforma de evaluaciones técnicas. Los administradores y evaluadores crean assessments con preguntas y casos de prueba; los candidatos los resuelven en un editor de código con cronómetro. El código se compila y ejecuta en contenedores Docker aislados y se califica automáticamente.

## Stack

| Parte | Tecnología |
|---|---|
| Backend | Node.js, Express, Prisma, PostgreSQL |
| Frontend | React, Vite, TypeScript, Monaco Editor |
| Ejecución de código | Docker (Java, JavaScript, TypeScript, Python y COBOL) |

## Puesta en marcha

Requisitos: Git, Node.js 22 o superior, Docker en ejecución y los puertos `3000`, `5173` y `5433` libres.

**1. Clonar**

```
git clone https://github.com/johnpaipa/compiladorDocker.git
cd compiladorDocker
```

**2. Base de datos**

```
cp .env.example .env
```

Cambia `CAMBIA_ESTA_CLAVE` por la contraseña que quieras y levanta Postgres:

```
docker compose up -d
```

**3. Backend**

```
cd backend
npm install
cp .env.example .env
```

En `backend/.env` usa la misma contraseña en `DATABASE_URL` y define `JWT_SECRET` (mínimo 32 caracteres):

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```
npx prisma generate
npx prisma migrate deploy
npm run create-user -- --email tu@correo.com --role ADMIN
npm run dev
```

`create-user` pide la contraseña (mínimo 8 caracteres) y crea el primer administrador. Opcionalmente, `npm run seed:demo` carga assessments de ejemplo.

**4. Frontend** (en otra terminal)

```
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` e inicia sesión. Desde **Usuarios** el administrador crea evaluadores; los candidatos se registran en `/register`.

La primera ejecución de código tarda más: Docker descarga las imágenes de `node`, `python` y `eclipse-temurin`, y el backend construye las de TypeScript y COBOL. Para adelantarlo:

```
docker pull node:20-slim python:3.12-slim eclipse-temurin:21-jdk
```

En PowerShell, `cp` se escribe `Copy-Item`.

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `POSTGRES_PASSWORD` | `.env` (raíz) | Contraseña de Postgres para `docker compose` |
| `DATABASE_URL` | `backend/.env` | Cadena de conexión; debe usar la misma contraseña |
| `JWT_SECRET` | `backend/.env` | Firma de las sesiones; obligatorio y de al menos 32 caracteres |
| `PORT` | `backend/.env` | Puerto del API (por defecto `3000`) |
| `EXEC_CONCURRENCY` | `backend/.env` | Contenedores de ejecución simultáneos (por defecto `3`) |
| `EXEC_QUEUE` | `backend/.env` | Ejecuciones en cola antes de responder 503 (por defecto `20`) |
| `VITE_API_URL` | `frontend/.env.local` | URL del API si no es `http://localhost:3000` |

## Roles

| Rol | Puede |
|---|---|
| `ADMIN` | Todo, incluida la gestión de usuarios |
| `EVALUATOR` | Crear y editar assessments y preguntas, ver resultados y el código de los candidatos |
| `CANDIDATE` | Iniciar assessments, ejecutar y enviar código, ver sus propios resultados |

## API

La documentación interactiva está en **`http://localhost:3000/docs`** (Swagger UI) con el backend en marcha. La especificación OpenAPI es [`backend/openapi.yaml`](backend/openapi.yaml). El visor se desactiva con `NODE_ENV=production`.

Para probar desde Swagger UI: ejecuta `POST /auth/login`, copia el `token` de la respuesta, pulsa **Authorize** y pégalo.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Registra un candidato |
| POST | `/auth/login` | Público | Inicia sesión y devuelve el token |
| GET | `/auth/me` | Autenticado | Usuario de la sesión |
| PUT | `/auth/password` | Autenticado | Cambia la contraseña propia |
| GET | `/users` | ADMIN | Lista usuarios |
| POST | `/users` | ADMIN | Crea un usuario con cualquier rol |
| PUT | `/users/{id}` | ADMIN | Edita, cambia el rol o desactiva |
| DELETE | `/users/{id}` | ADMIN | Elimina (solo si no tiene actividad) |
| GET | `/assessments` | Autenticado | Lista assessments |
| POST | `/assessments` | Staff | Crea un assessment |
| GET | `/assessments/{id}` | Autenticado | Assessment con preguntas (al candidato se le ocultan los detalles) |
| PUT | `/assessments/{id}` | Staff | Edita nombre, descripción y tiempo límite |
| DELETE | `/assessments/{id}` | Staff | Elimina con sus preguntas y envíos |
| GET | `/assessments/{id}/attempt` | Autenticado | Estado del intento propio |
| POST | `/assessments/{id}/start` | CANDIDATE | Inicia el cronómetro |
| GET | `/assessments/{id}/candidates` | Staff | Candidatos que lo iniciaron |
| GET | `/assessments/{id}/results/{userId}` | Staff o el propio candidato | Resultados de un candidato |
| GET | `/assessments/{id}/review/{userId}` | Staff | Código enviado por un candidato |
| POST | `/questions` | Staff | Crea una pregunta con sus casos de prueba |
| GET | `/questions/{id}` | Autenticado | Pregunta (al candidato solo el primer caso) |
| PUT | `/questions/{id}` | Staff | Edita y reemplaza los casos de prueba |
| DELETE | `/questions/{id}` | Staff | Elimina con sus envíos |
| POST | `/submissions` | Autenticado | Ejecuta el código (`save: true` además lo envía y guarda) |

Staff son los roles `ADMIN` y `EVALUATOR`.

## Seguridad en la ejecución de código

Cada ejecución corre en un contenedor nuevo que se destruye al terminar:

- **Sin red** (`--network none`) y con el sistema de archivos en solo lectura; el código se escribe en un `tmpfs` con tamaño limitado.
- **Sin privilegios:** el programa del candidato corre como usuario `nobody`, sin capacidades y con `no-new-privileges`.
- **Recursos acotados:** memoria (sin swap), 0.5 CPU, máximo de procesos, tamaño de archivos y tiempo (5 s por caso, con `SIGKILL` si lo ignora).
- **Casos ocultos protegidos:** los inputs viajan por stdin y los resultados quedan en un directorio al que solo accede root; el candidato no puede leerlos ni alterarlos. Los procesos en segundo plano se eliminan entre casos.
- **Sin datos del usuario en comandos:** el código y los inputs se envían codificados por stdin, no se interpolan en ningún comando.
- **Carga controlada:** máximo de ejecuciones simultáneas con cola, y una ejecución en curso por usuario.

## Scripts

| Carpeta | Comando | Descripción |
|---|---|---|
| `backend` | `npm run dev` | Servidor con recarga automática |
| `backend` | `npm run create-user -- --email ... --role ...` | Crea un usuario desde la terminal |
| `backend` | `npm run seed:demo` | Carga assessments de ejemplo |
| `frontend` | `npm run dev` | Servidor de desarrollo |
| `frontend` | `npm run build` | Compila para producción |
