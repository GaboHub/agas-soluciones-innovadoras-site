set -e
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
hash=$(cksum < requirements-dev.txt)
if [ "$(cat .venv/.req-hash 2>/dev/null)" != "$hash" ]; then
  .venv/bin/python -m pip install --quiet -r requirements-dev.txt
  printf '%s' "$hash" > .venv/.req-hash
fi
exec .venv/bin/python -m pytest tests/python "$@"
