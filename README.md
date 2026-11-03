# QBUDGET

React + TypeScript + Tailwind frontend, with a separate C++ HTTP API.
Firebase authentication and database are not configured yet.

## Team quick start (Windows, macOS, Linux)

**Use Docker for the easiest setup. You do not need to install Node, npm,
CMake, or a C++ compiler on your laptop.** Docker provides those inside isolated
Linux containers. The API is still compiled and run as C++.

### 1. One-time setup

1. Install [Docker Desktop](https://docs.docker.com/get-started/get-docker/)
   for your operating system. On Windows, follow its WSL 2/virtualization setup
   prompts and use **Linux containers**. On macOS, select the download for your
   Mac's chip (Apple Silicon or Intel). Linux users can use Docker Desktop or
   Docker Engine with the Compose v2 plugin.
2. Start Docker Desktop and wait until its engine is running. On Linux with
   Docker Engine, ensure your account can run Docker commands.
3. Clone this repository with Git, or download and extract the full repository.
   Use your own local folder; there are no machine-specific project paths.
4. Open a terminal in the **QBUDGET root**, where `compose.yaml` lives.

You need an internet connection for image/package downloads. No Firebase
account or `.env` file is required for the current hello-world example.

### 2. Start the app

**Windows (PowerShell):**

```powershell
.\start.ps1
```

**macOS / Linux:**

```sh
bash ./start.sh
```

Both launchers check Docker/Compose, build the C++ backend, install frontend
dependencies from `package-lock.json`, and start both services in one terminal.
The first run may take several minutes. Subsequent builds use Docker's cache;
`npm ci` still syncs dependencies each time so updates from teammates are picked up.

If PowerShell blocks scripts, or you prefer a direct command, this works in
any terminal from the repository root without changing execution policies:

```sh
docker compose up --build --abort-on-container-exit
```

### 3. Open and verify

Wait for Vite to report ready, then open **http://localhost:5173** and click
**Test C++ backend**. You should see:

> Hello from the QBUDGET C++ backend!

The API health check is http://localhost:8080/api/health and should return
`{"status":"ok"}`. Both published ports are bound to your laptop's loopback
interface. This is a local development setup, not a production deployment.

### Stop, restart, and edit

- **Stop:** press Ctrl+C in the startup terminal and wait for shutdown.
  You can also run `docker compose down` from the root in a second terminal.
- **Start again:** run the same startup script.
- **React/CSS edits:** save normally; the browser refreshes through Vite.
  Polling is enabled in Docker to support Windows/macOS file sharing.
- **C++ edits:** stop and rerun the startup script to rebuild the backend.
- **After pulling team changes:** stop and rerun the script. The lockfile
  controls the frontend dependency versions.
- **Add a frontend package without local npm:** while the app is running, run
  `docker compose exec frontend npm install PACKAGE_NAME` from the root.
  Commit both `frontend/package.json` and `frontend/package-lock.json`.

The frontend source is shared with its container, but container dependencies
live in a named Docker volume, separate from any local `node_modules` folder.
Do not commit build outputs or `node_modules`.

### Troubleshooting

| Problem | What to do |
| --- | --- |
| `docker` not found | Install Docker Desktop, then reopen your terminal. |
| Cannot connect to Docker daemon | Start Docker Desktop and wait for the engine; on Linux check Docker service/account access. |
| Compose command missing | Update Docker Desktop, or install the Docker Compose v2 plugin on Linux. |
| Windows container/image error | Switch Docker Desktop to Linux containers and complete its WSL 2 setup. |
| Port 5173 or 8080 already in use | Stop any native Vite/C++ servers or other app using those ports, then retry. Do not run native and Docker workflows together. |
| Download or npm install fails | Check internet/proxy access, read the terminal error, then rerun startup. |
| Frontend loads but API fails | Check `docker compose logs backend` and the health URL above. Wait for the backend to start. |
| Docker cannot share the project folder | Allow the folder in Docker Desktop's file-sharing settings, or move the clone to a local folder Docker can access. |

If dependencies appear corrupted, stop the app, run `docker compose down -v`,
then rerun startup. **This deletes this project's dependency/cache volumes**;
it does not delete your source. Revisit this command before adding database
volumes in the future. Docker is required for this recommended workflow; the
scripts do not install system software automatically.

## How the request works

The browser calls `/api/hello`. Vite forwards `/api` requests to the C++ service:
`http://backend:8080` inside Docker, or `http://127.0.0.1:8080` for native startup.
The C++ route in `backend/src/main.cpp` returns JSON;
React displays its message. Node/npm run the frontend tooling; the API itself is C++.

Routes:

- `GET /api/health`: `{"status":"ok"}`
- `GET /api/hello`: a hello message from C++

These are public demonstration endpoints, with no stored data or authentication.
The HTTP library is cpp-httplib, pinned and included in `backend/vendor` with its license.

## Optional: run natively without Docker

Use this only if you want to manage your own development tools. Install
[Node.js 24](https://nodejs.org/en/download) (includes npm) and a C++17 compiler.
For the CMake commands below, also install [CMake](https://cmake.org/download/).
Suitable compilers include GCC, Clang, or MSVC. For example, Windows users can
install Visual Studio Build Tools with **Desktop development with C++**, macOS
users can install Xcode Command Line Tools, and Linux users can install their
distribution's C++ development packages.

In a first terminal, from the root:

```sh
cd frontend
npm ci
npm run dev
```

In a second terminal, compile and run the backend as below. Keep both terminals
running and open http://localhost:5173. Stop them with Ctrl+C. Restart/recompile
after C++ edits. Leave `VITE_API_URL` unset or empty for local development, and
use the default backend port 8080 to match the Vite proxy.

On Windows with **MinGW g++ on PATH**, `cd backend` then `.\dev.ps1` compiles
and runs the backend. That optional script specifically requires g++; for
Visual Studio/MSVC use CMake instead.

With CMake and a C++17 compiler installed, run inside `backend`:

```sh
cmake -S . -B build
cmake --build build --config Release
```

Run `build/qbudget-api` on Linux/macOS, or the generated `.exe` on Windows
(Visual Studio generators place it in `build/Release`).
On Linux/macOS you can also compile directly:

```sh
mkdir -p build
g++ -std=c++17 -O2 -pthread -I vendor src/main.cpp -o build/qbudget-api
./build/qbudget-api
```

## Deploy later: Vercel + Railway

Railway is a hosting service that runs your server. Docker packages the C++
build and executable so Railway can run it on Linux. Vercel hosts the React site.
You keep both folders in the same Git repository; each service uses its own root.

1. In Railway, create a service from your repository and set its root directory
   to `/backend`. Railway detects the Dockerfile. Generate a public domain and
   configure `/api/health` as the health-check path. The API listens on
   `0.0.0.0` and reads Railway's `PORT` automatically.
2. In Vercel, import the same repository with root directory `frontend`,
   framework Vite, build command `npm run build`, and output directory `dist`.
3. Set Vercel's `VITE_API_URL` environment variable to the Railway HTTPS origin,
   e.g. `https://your-api.up.railway.app` (no `/api` suffix). Redeploy the frontend
   after changing it: Vite embeds this value at build time.
4. Set Railway's `FRONTEND_ORIGIN` to your exact Vercel origin,
   e.g. `https://your-app.vercel.app` (no trailing slash), and redeploy the API.
   This allows browser requests from that origin. The default is
   `http://localhost:5173`. Preview deployments have different origins and are
   not automatically allowed. CORS is not authentication.

The Vite proxy is local development configuration; production uses VITE_API_URL.
Nothing has been deployed by this setup. Docker build/deployment requires Docker
or Railway and is separate from the native Windows build.

Optional backend-only Docker check, inside `backend` (stop the team stack first
so port 8080 is free):

```sh
docker build -t qbudget-api .
docker run --rm -p 8080:8080 qbudget-api
```

## Firebase later

A suitable flow is React -> C++ API -> database. React can use the Firebase
browser SDK to sign in, then send its ID token as `Authorization: Bearer ...`.
Before adding protected budget endpoints, implement server-side token verification
and ownership checks in C++. Firebase documents third-party JWT verification for
languages without a Firebase Admin SDK. Do not assume the Firebase C++ client SDK
is a server Admin SDK. Database integration is a separate step (for example,
Firestore's REST API). Never put service-account private keys in the frontend or
in VITE_ environment variables, which are public in the compiled browser bundle.

References:
- https://docs.docker.com/compose/install/
- https://docs.docker.com/reference/cli/docker/compose/up/
- https://vercel.com/docs/functions/runtimes
- https://docs.railway.com/builds/dockerfiles
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
