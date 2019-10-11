#!/usr/bin/env node

// Usage example:
// $ VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content ./bin/books.js
function action () {
  
  const dotenv = require('dotenv');

  const { 
    sync 
  } = require('glob');

  const { 
    SingleBar
  } = require('cli-progress');

  const {
    stringify
  } = JSON;

  const {
    writeFileSync,
    readFileSync
  } = require('fs');

  const books = {
    response: []
  };

  const b1 = new SingleBar({
    format: 'Creating file ./resources/books.json {bar} | {percentage}% || {value}/{total}',
    hideCursor: true
  });

  dotenv.config();  

  try {

    const files = sync(`${process.env.VIEWER_CONTENT_DIRECTORY}/books/*.en.json`);

    b1.start(files.length, 0, {});

    for (const file of files) {

      const result = JSON.parse(
        readFileSync(file, 'utf8')
      );
      
      const { 
        entity_title, 
        identifier, 
        metadata 
      } = result;

      books.response.push({
        title: entity_title.trim(),
        identifier: identifier,
      });

      b1.increment();

    }

    writeFileSync(`./resources/books.json`, stringify(books));

  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

action();

process.exit(0);