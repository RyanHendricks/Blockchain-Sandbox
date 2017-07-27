FROM node:6.11

RUN apt-get update && apt-get install -y software-properties-common git
RUN npm install -g truffle
RUN npm install -g ethereumjs-testrpc

RUN mkdir /root/app
WORKDIR /root/app

EXPOSE 3000 3001