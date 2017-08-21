# Base image from (http://phusion.github.io/baseimage-docker)
FROM phusion/baseimage:0.9.20

# Set up Version
ENV version=0.13.0


# Set image labels
LABEL net.corda.version=${version}
LABEL vendor="R3"
MAINTAINER Wawrzyniec 'Wawrzek' Niewodniczanski <wawrzek@r3.com>



# Install OpenJDK from zulu.org and update system
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0x219BD9C9 \
 && (echo "deb http://repos.azulsystems.com/ubuntu stable main" >> /etc/apt/sources.list.d/zulu.list)
RUN apt-get -qq update \
 && apt-get -y upgrade
RUN apt-get -qqy install zulu-8 ntp

# Cleanup
RUN apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create /opt/corda directory
RUN mkdir -p /opt/corda/plugins && mkdir -p /opt/corda/logs

# Copy corda jar
ADD https://dl.bintray.com/r3/corda/net/corda/corda/$version/corda-$version.jar /opt/corda/corda.jar
# (for now use local dir rather then remote location)
#COPY corda-$version.jar /opt/corda/corda.jar

### Init script for corda
RUN mkdir /etc/service/corda
COPY corda-$version.sh /etc/service/corda/run
RUN chmod +x /etc/service/corda/run

# Expose port for corda (default is 10002)
EXPOSE 10002

# Working directory for Corda
WORKDIR /opt/corda
ENV HOME=/opt/corda

# Start runit
CMD ["/sbin/my_init"]

