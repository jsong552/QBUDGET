#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker is missing. Install Docker Desktop: https://docs.docker.com/get-started/get-docker/' >&2
  exit 1
fi
if ! docker compose version; then
  echo 'Docker Compose v2 is required. Update Docker Desktop or install the Compose plugin.' >&2
  exit 1
fi
if ! engine_type=$(docker info --format '{{.OSType}}'); then
  echo 'Docker is not ready. Start Docker Desktop (or Docker Engine), then try again.' >&2
  exit 1
fi
if [[ "$engine_type" != linux ]]; then
  echo 'Switch Docker Desktop to Linux containers, then try again.' >&2
  exit 1
fi
echo 'Starting QBUDGET. First run downloads images and dependencies and may take several minutes.'
echo 'When Vite reports ready, open http://localhost:5173. Press Ctrl+C here to stop both services.'
exec docker compose --project-directory "$project_dir" -f "$project_dir/compose.yaml" up --build --abort-on-container-exit
