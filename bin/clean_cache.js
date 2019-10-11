#!/usr/bin/env node

// Usage example:
// $ ./bin/clean_cache.js
function action () {

  const dotenv = require('dotenv');

  const { 
    sync 
  } = require('glob');

  const {
    stringify
  } = JSON;

  const {
    readFileSync,
    unlinkSync
  } = require('fs');

  dotenv.config();

  try {

    const files = sync('./resources/**/*.json');

    for (const file of files) {
      console.log(`Removing cache file ${file}`);
      unlinkSync(file);
    }

  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

action();

process.exit(0);
