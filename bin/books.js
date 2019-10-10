#!/usr/bin/env node

// Usage example:
// $ VIEWER_CONTENT_DIRECTORY=/dlts_viewer_content ./bin/books.js
function action () {

  const { sync } = require('glob');

  const dotenv = require('dotenv');

  dotenv.config();

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

  try {

    const files = sync(`${process.env.VIEWER_CONTENT_DIRECTORY}/books/*.en.json`);

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

    }

    writeFileSync(`./resources/books.json`, stringify(books));

  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

action();
