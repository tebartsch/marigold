#!/bin/sh

python run.py \
    --port "${PORT:-8080}" \
    --directory "${DIRECTORY:-content}" \
    --webpage-title "${WEBPAGE_TITLE:-Marigold}" \
    --sidebar-headline "${SIDEBAR_HEADLINE:-Marigold}"

exec "$@"