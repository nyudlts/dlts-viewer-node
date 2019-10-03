# DLTS Viewer - Node

DLTS Viewer dummy server for local development. Not production quality. Do not use for any other reason.

## Install 

``` 
$ git clone https://github.com/nyudlts/dlts-viewer-node.git
$ cd dlts-viewer-node
$ yarn install
```

## Add content inside the public directory

``` 
$ cd public
$ git clone https://github.com/NYULibraries/dlts_viewer_content.git books
```

## Add the environment file

``` 
cp .env.example .env
```

Here you have to add Cantaloupe IIIF server endpoint. See .env.example

## Run the development server
```
$ yarn run dev
```

### Requierments 

Cantaloupe IIIF server - https://github.com/MITLibraries/docker-cantaloupe.git configured to use HttpSource.
