FROM mhart/alpine-node:6.11

RUN apk add --no-cache make gcc g++ python git bash
COPY package.json /src/package.json
WORKDIR /src
RUN npm install

ADD . .

EXPOSE 8545

RUN cd /root &&\
    git clone https://github.com/cubedro/eth-net-intelligence-api &&\
    cd eth-net-intelligence-api &&\
    npm install &&\
    npm install -g pm2

ADD start.sh /root/start.sh
ADD app.json /root/eth-net-intelligence-api/app.json
RUN chmod +x /root/start.sh

ENTRYPOINT /root/start.sh
