#!/bin/zsh

set -e

cd "${0:A:h}"

PORT=8765
URL="http://127.0.0.1:${PORT}/"

if ! curl --silent --fail "$URL" >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/estudo-mercado-server.log 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

  for attempt in {1..30}; do
    curl --silent --fail "$URL" >/dev/null 2>&1 && break
    sleep 0.1
  done
fi

open "$URL"

echo "A aplicação está disponível em $URL"
echo "Mantém esta janela aberta enquanto utilizas a aplicação."
echo "Prime Control-C para terminar."

wait
