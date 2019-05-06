#!/bin/sh

DOCKER_IMAGE='amazonlinux:nodejs8.10'

# build nodejs docker image if not yet exists
if [[ "$(docker images -q ${DOCKER_IMAGE} 2> /dev/null)" == "" ]]; then
  cd docker && docker build -t ${DOCKER_IMAGE} . && cd ..
fi

# build view-request function
docker run --rm --volume ${PWD}/viewer-request:/build ${DOCKER_IMAGE} /bin/bash -c "source ~/.bashrc; npm install --only=prod"
mkdir -p dist && cd viewer-request && zip -FS -q -x \*.iml -r ../dist/viewer-request-function.zip * && cd ..

# build origin-response function
docker run --rm --volume ${PWD}/origin-response:/build ${DOCKER_IMAGE} /bin/bash -c "source ~/.bashrc; npm install --only=prod"
mkdir -p dist && cd origin-response && zip -FS -q -x \*.iml -r ../dist/origin-response-function.zip * && cd ..
