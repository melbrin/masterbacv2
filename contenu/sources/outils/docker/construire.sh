#!/bin/bash
# Construit l'image du convertisseur des fiches : masterbac-libreoffice:24.2 (environ 750 Mo), Docker Desktop ouvert.
set -e
cd "$(dirname "$0")"
for d in /Applications/Docker.app/Contents/Resources/bin "$HOME/.docker/bin"; do
  [ -x "$d/docker" ] && PATH="$PATH:$d"
done
docker build -t masterbac-libreoffice:24.2 .
docker run --rm --entrypoint soffice masterbac-libreoffice:24.2 --version
