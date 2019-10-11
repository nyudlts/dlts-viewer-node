## DLTS Viewer - Node

DLTS Viewer dummy server for local development. **Not production quality**.

### Get DLTS Viewer content

```
$ git clone --depth 1 https://github.com/NYULibraries/dlts_viewer_content.git dlts_viewer_content
```

### Install development server

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

- IIIF_ENDPOINT - Cantaloupe IIIF server base path
- IIIF_API_VERSION - IIIF version
- FILE_SERVER - Server that serve the image
- VIEWER_CONTENT_DIRECTORY - The realpath containing DLTS Viewer content repository

View the example file `.env.example`.

### First run

Before you run the server for the first time you have to create the files `./resources/books.json` and `./resources/volumes.json`.

To do so you can run `$ yarn run first-run` inside the root of the project directory.

```
$ yarn run first-run
```

### Run the development server

```
$ yarn run dev
```

### Broswe the development server content

Resources request http://localhost:3000/:resource

Show all the books. Use query arguments `start` specifies an offset (by default, 0) into the responses and `limit` to controls how many rows of responses are displayed at a time (default value: 15)

e.g., http://localhost:3000/books

Resource request:

http://localhost:3000/:resource/:identifier

TODO: Write documentation

e.g., http://localhost:3000/books/aub_aco000011

http://localhost:3000/:resource/:identifier/:sequence/info.json

TODO: Write documentation

e.g., http://localhost:3000/books/aub_aco000011/1/info.json

### Cache

The server works using cache files create on first request. To clean the cache use the provided script
`$ yarn run clean-cache` inside the root of the project directory.

```
$ yarn run clean-cache
```

### Requierments 

Cantaloupe IIIF server - https://github.com/MITLibraries/docker-cantaloupe.git configured to use HttpSource.

DLTS Viewer content - https://github.com/NYULibraries/dlts_viewer_content

Yarn - https://yarnpkg.com/lang/en/

NodeJS (at least 10.16.3 LTS) - https://nodejs.org/en/

A little bit of JavaScript knowledge won't hurt - https://developer.mozilla.org/en-US/docs/Web/JavaScript/A_re-introduction_to_JavaScript