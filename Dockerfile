# See https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
# docker build -t dismorfo/dlts-viewer-node .
# docker run -p 3000:3000 -d dismorfo/dlts-viewer-node
FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN git clone --depth 1 https://github.com/NYULibraries/dlts_viewer_content.git \ 
    /usr/src/app/public/dlts_viewer_content && \
    yarn install

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "yarn", "run", "dev" ]
