# Le convertisseur Word -> PDF des fiches : LibreOffice 24.2 sous Linux, la version qui a fabriqué les PDF d'origine,
# avec une seule Carlito (celle de Linux, 1.104) et les polices DejaVu pour les signes que Carlito n'a pas (⇄, °).
# Sur le Mac de travail, LibreOffice 26 voit deux Carlito et en prend une au hasard : voir outils/police_pdf.py.
# Construire : outils/docker/construire.sh ; servir : CONVERTISSEUR=docker outils/fabrique.sh <fiche>.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui libreoffice-math-nogui \
      fonts-crosextra-carlito fonts-dejavu-core fonts-dejavu-extra fonts-liberation fontconfig \
 && rm -rf /var/lib/apt/lists/* \
 && fc-cache -f
WORKDIR /travail
ENTRYPOINT ["soffice", "-env:UserInstallation=file:///tmp/profil", "--headless", "--norestore", "--nologo", "--nodefault", "--nolockcheck"]
