#!/usr/bin/env node

// Usage example: 
// $ VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content ./bin/volume.js
function action () {

  const dotenv = require('dotenv');

  dotenv.config();

  const {
    parse, stringify
  } = JSON;

  const {
    writeFileSync,
    readFileSync
  } = require('fs');

  const source = {
    response: []
  };

  try {

    const volumes = parse(
      readFileSync('./resources/books.json', 'utf8')
    );

    for (let volume of volumes.response) {

      const {
        identifier,
        entity_title,
        multivolume
      } = parse(
        readFileSync(`${process.env.VIEWER_CONTENT_DIRECTORY}/books/${volume.identifier}.en.json`, 'utf8')
      );

      if (multivolume && Array.isArray(multivolume.volume)) {
        multivolume.volume.map(volume => {
          volume.collection = volume.collection.code;
          volume.title = `${entity_title.trim()} ${volume.volume_number_str}`;
          volume.bid = identifier;
          delete volume.collection;
          delete volume.isPartOf;
          delete volume.volume_number_str;
          source.response.push(volume);
        });        
      }

    }

    writeFileSync(`./resources/volumes.json`, stringify(source));

  } catch (err) {
    console.log(err);
    process.exit(1);
  }

}

action();
