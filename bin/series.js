#!/usr/bin/env node

// Usage example: 
// $ VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content ./bin/series.js
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

  const source = {
    response: []
  };

  const b1 = new SingleBar({
    format: 'Progress {identifier} {bar} | {percentage}% || {value}/{total}',
    hideCursor: true
  });

  dotenv.config();

  try {

    const books = parse(
      readFileSync('./resources/books.json', 'utf8')
    );

    b1.start(books.response.length, 0, {});

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
          // console.log(item);
        }
      }

      b1.increment();

    }

    b1.stop();

  } catch (err) {
    console.log(err);
    process.exit(1);
  }

}

action();

process.exit(1);
