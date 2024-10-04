#
# Create an image to run rtlmqttwu
# Build: docker build -t rtlmqttwu 

FROM node:18-alpine

# common parts
ENV HOME /home
WORKDIR /project

COPY index.js /project
COPY package.json  /project
COPY .env /project
RUN cd /project && npm install --yes --loglevel verbose
CMD npm start
