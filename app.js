const createError = require('http-errors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('morgan');
const env = require('env2')('./.env');
const IIIFEndpoint = process.env.IIIF_ENDPOINT;
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use('/iiif/2/*', (req, res, next) => {
  const redirectTo = `${IIIFEndpoint}/${req.url}`;
  console.log(`Redirect ${redirectTo}`);
  res.redirect(301, redirectTo);
});

app.use('/:type/:identifier/:sequence/info.json', async (req, res, next) => {
  const identifier = req.params.identifier;
  const sequence = parseInt(req.params.sequence, 10);
  const source = `./public/books/books/${identifier}.en.json`;
  try {
    const exists = fs.existsSync(`./public/pages/${identifier}-${sequence}.json`);
    if (exists) {
      console.log(`File exists. Using cached file ${identifier}-${sequence}.json`);
      res.json(
        JSON.parse(fs.readFileSync(`./public/pages/${identifier}-${sequence}.json`), 'utf8')
      );
    } 
    else {
      const axios = require('axios');
      const data = JSON.parse(fs.readFileSync(source, 'utf8'));
      const find = require('lodash.find');
      const page = data.pages.page;
      const index = find(page, { 'realPageNumber': sequence });
      const url = encodeURIComponent(index.cm.uri.replace('fileserver:/', 'http://dlib.nyu.edu/files'));
      const response = await axios.get(`${IIIFEndpoint}/${url}/info.json`);
      fs.writeFile(`./public/pages/${req.params.identifier}-${sequence}.json`, JSON.stringify(response.data), err => {
        if (err) {
          return console.log(err);
        }
        console.log(`File ./public/pages/${req.params.identifier}-${sequence}.json saved`);
      });
      res.json(response.data);
    }
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
});

app.use('/:type/:identifier', (req, res) => {
  const source = `./public/books/books/${req.params.identifier}.en.json`;
  try {
    const data = fs.readFileSync(source, 'utf8');
    const response = JSON.parse(data);
    res.json(response);
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
});

app.use('/:type', async (req, res, next) => {
  const url = require('url');
  const url_parts = url.parse(req.url, true);
  const query = url_parts.query;
  const type = req.params.type;
  try {
    const exists = fs.readFileSync(`./public/resources/${type}.json`);
    const limit = (query.limit) ? parseInt(query.limit, 10) : 15;
    const start = (query.start) ? parseInt(query.start, 10) : 0;
    const data = JSON.parse(exists, 'utf8');

    // const low = require('lowdb');
    // const FileSync = require('lowdb/adapters/FileSync');
    // const adapter = new FileSync(`./public/resources/${type}.json`);
    // const db = low(adapter);
    // const value = db.get('response')
    //   .find({ identifier: 'aub_aco000001' })
    //   .value();
    // console.log(value, 'value');

    if (data.response.length){
      res.json({
        documents: data.response.slice(start, start + limit),
        length: data.response.length,
        start: start,
        limit: limit,
      });  
    } else {
      throw `Error reading datasource ${type}.json`;
    }
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
});

app.use('/', (req, res, next) => {
  res.render('index');
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
