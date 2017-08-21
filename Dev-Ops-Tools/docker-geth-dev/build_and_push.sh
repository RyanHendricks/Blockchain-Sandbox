#!/bin/bash
REPO=https://hub.docker.com/r/ryanhendricks/catalyst-net

function build() {
    TAG=$1
    echo "Building for tag ${TAG}"
    docker build -t geth:$TAG -f Dockerfile.staging --build-arg TESTNET=$2 .
    docker tag geth:$TAG $REPO:$TAG
    docker push $REPO:$TAG
};
build testnet 1
build public
