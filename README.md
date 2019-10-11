## DLTS Viewer - Node

DLTS Viewer dummy server for local development. **Not production quality**.

### Download/Clone DLTS Viewer content

```
$ git clone --depth 1 https://github.com/NYULibraries/dlts_viewer_content.git dlts_viewer_content
```

### Install server

``` 
$ git clone https://github.com/nyudlts/dlts-viewer-node.git
$ cd dlts-viewer-node
$ yarn install
```

### Add environment file

``` 
cp .env.example .env
```

You need to set environmental variables:

- IIIF_ENDPOINT
- IIIF_API_VERSION
- FILE_SERVER
- VIEWER_CONTENT_DIRECTORY

View the example file `.env.example`.

### Run the development server
```
$ yarn run dev
```

### Requierments 

Cantaloupe IIIF server - https://github.com/MITLibraries/docker-cantaloupe.git configured to use HttpSource.
