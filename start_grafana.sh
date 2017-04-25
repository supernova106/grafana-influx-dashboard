#!/bin/bash

CONTAINER_NAME="grafana-scripted-2"

docker rm -f ${CONTAINER_NAME}
docker run -d \
	--name=${CONTAINER_NAME} \
	-v ${PWD}/grafana:/var/lib/grafana \
	-p 3002:3000 \
	supernova106/grafana-scripted:dev2
