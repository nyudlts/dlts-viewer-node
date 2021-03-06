# See https://nodejs.org/en/docs/guides/nodejs-docker-webapp
# docker build -t dismorfo/dlts-viewer-node .
# docker run -d --env-file ./.env.docker -p 3000:3000 --name viewer -v /Users/ortiz/tools/dlts_viewer_content:/dlts_viewer_content dismorfo/dlts-viewer-node
# If running without Docker:
# $ VIEWER_CONTENT_DIRECTORY=$(pwd)/public/dlts_viewer_content yarn start
# If you want access to bash use node:10 instead of node:10-alpine and then run $ docker exec -i -t viewer /bin/bash
# FROM node:10
FROM node:10-alpine

ARG VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content
ENV VIEWER_CONTENT_DIRECTORY=$VIEWER_CONTENT_DIRECTORY

VOLUME $VIEWER_CONTENT_DIRECTORY

# Create app directory
WORKDIR /usr/src/app

ARG IIIF_ENDPOINT=http://localhost:8182/iiif
ENV IIIF_ENDPOINT=$IIIF_ENDPOINT

ARG IIIF_API_VERSION=2
ENV IIIF_API_VERSION=$IIIF_API_VERSION

ARG FILE_SERVER=http://dlib.nyu.edu/files
ENV FILE_SERVER=$FILE_SERVER

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install --production

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "yarn", "start" ]
