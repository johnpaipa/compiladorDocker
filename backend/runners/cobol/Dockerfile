# Imagen del runner de COBOL: compilador GnuCOBOL (cobc) + gcc
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y gnucobol gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*
