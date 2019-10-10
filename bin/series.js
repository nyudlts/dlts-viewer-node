#!/usr/bin/env node

// Usage example: 
// $ VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content ./bin/series.js
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

    const books = parse(
      readFileSync('./resources/books.json', 'utf8')
    );

    for (let book of books.response) {

      const {
        identifier,
        entity_title,
        series
      } = parse(
        readFileSync(`${process.env.VIEWER_CONTENT_DIRECTORY}/books/${book.identifier}.en.json`, 'utf8')
      );

      if (series.length) {
        for (let item of series) {
          console.log(item);  
        }
      }

    }

  } catch (err) {
    console.log(err);
    process.exit(1);
  }

}

action();
