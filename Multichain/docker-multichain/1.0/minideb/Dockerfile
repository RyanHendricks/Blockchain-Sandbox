FROM bitnami/minideb

ENV MULTICHAIN_VERSION 1.0

ADD https://www.multichain.com/download/multichain-${MULTICHAIN_VERSION}-release.tar.gz /tmp

RUN tar --extract --gzip --file /tmp/multichain-${MULTICHAIN_VERSION}-release.tar.gz --directory /usr/local/bin --exclude=README.txt --strip-components=1 \
    && rm /tmp/multichain-${MULTICHAIN_VERSION}-release.tar.gz

VOLUME /root/.multichain

ENTRYPOINT ["multichaind"]
