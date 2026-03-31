ARG TAG
FROM debian:${TAG}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    \
    ca-certificates \
    curl \
    gnupg \
    graphviz \
    procps \
    uuid-runtime \
    \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libnss3 \
    libxss1 \
    \
    && rm -rf /var/lib/apt/lists/*
