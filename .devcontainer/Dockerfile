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
    jq \
    procps \
    uuid-runtime \
    xdg-utils \
    zip \
    unzip \
    \
    && rm -rf /var/lib/apt/lists/*

ARG YQ_VERSION=v4.52.5
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL -o /usr/local/bin/yq \
       "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_${ARCH}" \
    && chmod +x /usr/local/bin/yq
