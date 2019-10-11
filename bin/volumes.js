#!/usr/bin/env node

// Usage example: 
// $ VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content ./bin/volumes.js
function action () {

  const dotenv = require('dotenv');

  const { 
    SingleBar
  } = require('cli-progress');  

  const {
    parse, stringify
  } = JSON;

  const {
    writeFileSync,
    readFileSync
  } = require('fs');

  const volumes = {
    response: []
  };
  
  dotenv.config();  

  const b1 = new SingleBar({
    format: 'Creating file ./resources/volumes.json {bar} | {percentage}% || {value}/{total}',
    hideCursor: true
  });

  try {

    const books = parse(
      readFileSync('./resources/books.json', 'utf8')
    );
    
    b1.start(books.response.length, 0, {});

    for (let volume of books.response) {

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
          volumes.response.push(volume);
        });        
      }

      b1.increment();

    }

    writeFileSync(`./resources/volumes.json`, stringify(volumes));

  } catch (err) {
    console.log(err);
    process.exit(1);
  }

}

action();

process.exit(0);
