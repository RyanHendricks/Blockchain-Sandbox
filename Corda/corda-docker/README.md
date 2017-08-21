# corda-docker
Docker configuration and scripts to create a Corda image. This docker image base on [Phusion based image](https://github.com/phusion/baseimage-docker) - Docker optimise Ubuntu 16.04 LTS.


## Usage

* Check Dockerfile (e.g. to adjust version or Expose ports)
* `docker build -t corda:m12 . ` - to create base Corda image (called _corda:m12_)
* `docker create --env CORDA_CITY=Wroclaw --env CORDA_COUNTRY=Poland --env CORDA_LEGAL_NAME="Very important node" --name corda12 -t corda:m12` - to create configured container based on above (_corda:m12_) image and called _corda12_
* `docker start corda12` - to start the _corda12_ container
* `docker exec -t -i corda12 bash` - to login into the container


## Node configuration
Corda image can be 'personalize' with following environment variables as seen in an Usage example above. Table below list all available variables as well it's default value.


### Environment Variables

Docker environment variable | Corda configuration | default value
--- | --- | ---
CORDA_HOST | hostname for Artemis |  localhost
CORDA_PORT_P2P | P2P port |10002
CORDA_PORT_RPC | RPC port |10003
CORDA_LEGAL_NAME | common name for myLegalName| Corda Test Node
CORDA_ORG | organisation  for myLegalName | CordaTest
CORDA_ORG_UNIT | organizational unit for myLegalName | CordaTest
CORDA_COUNTRY | country for myLegalName | GB
CORDA_CITY | City for myLegalName and nearestCity | London
CORDA_EMAIL | emailAddress | admin@corda.test
JAVA_OPTIONS | option for JVM | -Xmx512m
JAVA_CAPSULE | option passed to capsule | '' (empty string)

### Java Options

With docker environment you can not only control Corda node set up but also pass Java specific variables. There are Docker variables controlling Java behaviour. The first one - **JAVA_OPTIONS** passes options for JVM. The default option is to start Corda with 512 MB heap memory (`-Xmx512m`). If you need to pass variable to inside Corda capsule, use **JAVA_CAPSULE**.

For example following incantation create container with JMX enabled, assuming that you called Docker image _corda:m11_.Please note that JMX over RMI was disable in version M12, so following command wont work.

```docker create --env JAVA_CAPSULE="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=9002 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false" -t corda:m11 -n jmx```
