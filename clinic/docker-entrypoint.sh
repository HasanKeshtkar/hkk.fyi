#!/bin/sh
# Runs the app as the unprivileged "node" user. Started as root (the default), it first gives that
# user the backup folder: a mounted disk usually starts out owned by root.
set -e
if [ "$(id -u)" = "0" ]; then
  if [ -n "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    chown node:node "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
  fi
  exec su-exec node "$@"
fi
exec "$@"
