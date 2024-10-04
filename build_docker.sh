#!/bin/bash
IMAGE=rtlmqttwu
REPO="home.shotton.us:5443"
echo "Building $IMAGE images. Run this script from project root folder!"
# cp ../build/docker/kilroy/Dockerfile .
docker rmi $REPO/$IMAGE
#docker buildx build --push --tag $REPO/$IMAGE --platform=linux/amd64,linux/arm/v7 .
docker buildx build --push --tag $REPO/$IMAGE --platform=linux/amd64 .
#docker build --tag $REPO/$IMAGE --platform=linux/amd64 .
echo "Pushing new $IMAGE image to repo..."
docker push $REPO/$IMAGE
# rm Dockerfile
echo "docker $IMAGE build done."