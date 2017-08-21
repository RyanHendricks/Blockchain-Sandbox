FROM bitnami/minideb as minideb

ENV MULTICHAIN_VERSION 1.0

ADD https://www.multichain.com/download/multichain-${MULTICHAIN_VERSION}-release.tar.gz /tmp

RUN tar --extract --gzip --file /tmp/multichain-${MULTICHAIN_VERSION}-release.tar.gz --directory /usr/local/bin --exclude=README.txt --strip-components=1 \
    && rm /tmp/multichain-${MULTICHAIN_VERSION}-release.tar.gz

FROM gcr.io/distroless/base

COPY --from=minideb /usr/local/bin/multichain* /
COPY --from=minideb /usr/lib/x86_64-linux-gnu/libstdc++.so.6 /usr/lib/x86_64-linux-gnu/libstdc++.so.6
COPY --from=minideb /lib/x86_64-linux-gnu/libgcc_s.so.1 /lib/x86_64-linux-gnu/libgcc_s.so.1

VOLUME /home/.multichain

ENTRYPOINT ["/multichaind"]
