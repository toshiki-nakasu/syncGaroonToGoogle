ARG TAG
FROM debian:${TAG}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    \
    ca-certificates \
    curl \
    git \
    gnupg \
    graphviz \
    procps \
    uuid-runtime \
    xdg-utils \
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

ARG YQ_VERSION=v4.52.5
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL -o /usr/local/bin/yq \
       "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_${ARCH}" \
    && chmod +x /usr/local/bin/yq
