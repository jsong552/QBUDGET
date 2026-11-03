# QBUDGET

React + TypeScript + Tailwind frontend, with a separate C++ HTTP API.
Firebase authentication and database are not configured yet.

## Run locally (Windows)

Open two terminals in the QBUDGET folder.

Terminal 1:

```powershell
cd backend
.\dev.ps1
```

This compiles with g++ (already installed on this computer) and starts the API
on port 8080. If PowerShell blocks the script, you can run the commands directly:

```powershell
mkdir build -Force
g++ -std=c++17 -O2 -pthread -I vendor src/main.cpp -o build/qbudget-api.exe -lws2_32
.\build\qbudget-api.exe
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **Test C++ backend**.
You should see `Hello from the QBUDGET C++ backend!`.
Stop each server with Ctrl+C. Restart the backend after changing C++ source.
No Firebase account, Docker, or CMake is needed for this Windows example.

## How the request works

The browser calls `/api/hello`. Locally, Vite forwards `/api` requests to
`http://127.0.0.1:8080`. The C++ route in `backend/src/main.cpp` returns JSON;
React displays its message. Node/npm run the frontend tooling; the API itself is C++.

Routes:

- `GET /api/health`: `{"status":"ok"}`
- `GET /api/hello`: a hello message from C++

These are public demonstration endpoints, with no stored data or authentication.
The HTTP library is cpp-httplib, pinned and included in `backend/vendor` with its license.

## Other machines

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

Optional local Docker check, inside `backend`:

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
- https://vercel.com/docs/functions/runtimes
- https://docs.railway.com/builds/dockerfiles
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
