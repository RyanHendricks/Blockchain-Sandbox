# Docker Images for MultiChain

The [`tilkal/multichain`] images come in three flavors:
* [`latest`], [`1.0`], [`1.0-beta-2`] based on [`bitnami/minideb`].
* [`latest-distroless`], [`1.0-distroless`], [`1.0-beta-2-distroless`] based on [`gcr.io/distroless/base`] (experimental).
* [`latest-nanoserver`], [`1.0-nanoserver`], [`1.0-beta-2-nanoserver`] based on [`microsoft/nanoserver`].


# Volume

* `/root/.multichain` for the minideb-based image.
* `/home/.multichain` for the distroless-based image.
* `C:/Users/ContainerAdministrator/AppData/Roaming/MultiChain` for the Nano Server-based image.


# Usage

*Note:* For the distroless-based image, path of executables must start from the root (e.g. `/multichain-util`).

**Creating a blockchain named `testchain`**

`docker run --rm -v node1-data:<volume> --entrypoint multichain-util tilkal/multichain create testchain`

**Starting a node of a blockchain named `testchain`**

`docker run -v node1-data:<volume> tilkal/multichain testchain`

**Adding a node to an existing blockchain named `testchain`**

`docker run --rm -v node2-data:<volume> tilkal/multichain testchain@<node1-host>:<node1-port>`

**Granting access to a node added to a blockchain named `testchain` from a running node**

`docker exec <node1-container> multichain-cli testchain grant <node2-address> connect,send,receive`


# License

**`Dockerfile` license information:**

Copyright (c) 2017 Tilkal SAS [`MIT License`]

**MultiChain license information:**

Copyright (c) 2014-2017 Coin Sciences Ltd [`GPLv3`](https://github.com/MultiChain/multichain/blob/master/COPYING)

Portions copyright (c) 2009-2016 The Bitcoin Core developers

Portions copyright many others - see individual files


[`bitnami/minideb`]: https://store.docker.com/community/images/bitnami/minideb
[`gcr.io/distroless/base`]: https://github.com/GoogleCloudPlatform/distroless/blob/master/base/README.md
[`microsoft/nanoserver`]: https://store.docker.com/images/nanoserver
[`tilkal/multichain`]: https://store.docker.com/community/images/tilkal/multichain

[`latest`]: https://github.com/Tilkal/docker-multichain/blob/master/1.0/minideb/Dockerfile
[`1.0`]: https://github.com/Tilkal/docker-multichain/blob/c0bb7a216225f11c0631a507709c9d2ba4e34017/1.0/minideb/Dockerfile
[`1.0-beta-2`]: https://github.com/Tilkal/docker-multichain/blob/c83c276e6f7241e019df755cda93f8efaabf6059/1.0/minideb/Dockerfile

[`latest-distroless`]: https://github.com/Tilkal/docker-multichain/blob/master/1.0/distroless/Dockerfile
[`1.0-distroless`]: https://github.com/Tilkal/docker-multichain/blob/c0bb7a216225f11c0631a507709c9d2ba4e34017/1.0/distroless/Dockerfile
[`1.0-beta-2-distroless`]: https://github.com/Tilkal/docker-multichain/blob/c83c276e6f7241e019df755cda93f8efaabf6059/1.0/distroless/Dockerfile

[`latest-nanoserver`]: https://github.com/Tilkal/docker-multichain/blob/master/1.0/nanoserver/Dockerfile
[`1.0-nanoserver`]: https://github.com/Tilkal/docker-multichain/blob/c0bb7a216225f11c0631a507709c9d2ba4e34017/1.0/nanoserver/Dockerfile
[`1.0-beta-2-nanoserver`]: https://github.com/Tilkal/docker-multichain/blob/c83c276e6f7241e019df755cda93f8efaabf6059/1.0/nanoserver/Dockerfile

[`MIT License`]: https://github.com/Tilkal/docker-multichain/blob/master/LICENSE
[`GPLv3`]: https://github.com/MultiChain/multichain/blob/master/COPYING
