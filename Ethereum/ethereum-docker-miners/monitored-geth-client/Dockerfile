FROM ubuntu:16.04

RUN apt update
RUN apt install -y software-properties-common
RUN add-apt-repository ppa:longsleep/golang-backports
RUN apt update
# install build dependencies for geth
RUN apt install -y make build-essential golang git-core golang-go

# install local local geth version
RUN git clone https://github.com/lokkit/go-ethereum /opt/go-ethereum
WORKDIR /opt/go-ethereum
RUN git checkout bugfix/shh_subscribe

RUN make geth

CMD /bin/bash
RUN cp build/bin/geth /usr/local/sbin

EXPOSE 8545
EXPOSE 30303

RUN apt-get update &&\
    apt-get install -y curl git-core &&\
    curl -sL https://deb.nodesource.com/setup_4.x | bash - &&\
    apt-get update &&\
    apt-get install -y nodejs

RUN cd /root &&\
    git clone https://github.com/cubedro/eth-net-intelligence-api &&\
    cd eth-net-intelligence-api &&\
    npm install &&\
    npm install -g pm2

ADD start.sh /root/start.sh
ADD app.json /root/eth-net-intelligence-api/app.json
RUN chmod +x /root/start.sh

ENTRYPOINT /root/start.sh
