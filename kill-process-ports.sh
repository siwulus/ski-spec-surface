#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") PORT|START-END [PORT|START-END ...]

Examples:
  $(basename "$0") 4000
  $(basename "$0") 4000-4010
  $(basename "$0") 3000 4000-4010 5000

You can also set PORTS env var with comma/space separated values:
  PORTS="3000,4000-4005 5000" $(basename "$0")
EOF
}

is_port_number() {
  local v="$1"
  [[ "$v" =~ ^[0-9]+$ ]] && (( v >= 1 && v <= 65535 ))
}

expand_input_to_ports() {
  local token="$1"
  if [[ "$token" =~ ^([0-9]+)-([0-9]+)$ ]]; then
    local start="${BASH_REMATCH[1]}" end="${BASH_REMATCH[2]}"
    if ! is_port_number "$start" || ! is_port_number "$end" || (( start > end )); then
      echo "Invalid range: $token" >&2
      exit 1
    fi
    seq "$start" "$end"
  elif is_port_number "$token"; then
    echo "$token"
  else
    echo "Invalid port or range: $token" >&2
    exit 1
  fi
}

kill_port() {
  local port="$1"
  echo "=============================="
  echo "Port: $port"
  echo "Before:"
  lsof -nP -iTCP:"$port" || true

  local pids
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)
  if [ -n "${pids}" ]; then
    echo "Killing (SIGTERM): ${pids}"
    kill -15 ${pids} || true
    sleep 1
    local still
    still=$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)
    if [ -n "${still}" ]; then
      echo "Force killing (SIGKILL): ${still}"
      kill -9 ${still} || true
    fi
  else
    echo "No listeners found on port ${port}"
  fi

  echo "After:"
  lsof -nP -iTCP:"$port" || true
}

main() {
  if [ $# -eq 0 ] && [ -z "${PORTS:-}" ]; then
    usage
    exit 1
  fi

  # Collect inputs from args and optional PORTS env var
  local inputs=()
  if [ $# -gt 0 ]; then
    inputs+=("$@")
  fi
  if [ -n "${PORTS:-}" ]; then
    # Split on commas and spaces
    # shellcheck disable=SC2206
    extra_inputs=(${PORTS//,/ })
    inputs+=("${extra_inputs[@]}")
  fi

  # Process each input, expanding ranges
  local ports=()
  for token in "${inputs[@]}"; do
    [ -z "$token" ] && continue
    while IFS= read -r p; do
      ports+=("$p")
    done < <(expand_input_to_ports "$token")
  done

  # Remove duplicates while preserving order (POSIX-ish)
  local seen=" " dedup=()
  for p in "${ports[@]}"; do
    case " $seen " in
      *" $p "*) ;;
      *) dedup+=("$p"); seen+="$p ";;
    esac
  done

  for p in "${dedup[@]}"; do
    kill_port "$p"
  done
}

main "$@"


