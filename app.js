const createError = require('http-errors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('morgan');
const IIIFEndpoint = 'http://localhost:8182/iiif/2';
// const IIIFEndpoint = 'http://3.215.124.212:8182/iiif/2';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function deliverResources(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const url = require('url');
  const url_parts = url.parse(req.url, true);
  const query = url_parts.query;
  const type = req.params.type;
  
  try {
    const exists = fs.existsSync(`./public/resources/${type}.json`);
    if (exists) {
      const limit = (query.limit ) ? parseInt(query.limit, 10) : 15;
      const start = (query.start) ? parseInt(query.start, 10) : 0;
      console.log(`File exists. Using cached file ./public/resources/${type}.json`);
      const data = JSON.parse(fs.readFileSync(`./public/resources/${type}.json`), 'utf8');
      if (type === 'listBooks') {
        res.json({
          documents: data.response.slice(start, start + limit),
          length: data.response.length,
          start: start,
          limit: limit,
        });
      }
      else {
        res.json(data.files.slice(start, limit));     
      }

    } else {
      if (type === 'listBooks') {
      }
      if (type === 'books') {
        const glob = require('glob');
        const source = `./public/books/books/*.en.json`;            
        glob(source, (error, files) => {
          if (error) {
            throw error;
          }
          else {
            fs.writeFile(`./public/resources/${type}.json`, JSON.stringify({ files: files }), err => {
              if (err) {
                return console.log(err);
              }
              console.log(`File ./public/resources/${type}.json saved`);
              res.json({ files: files }); 
            });
          }
        });
      } else {
        throw new Error('Resources type not available.');
      }
    }
  } catch (error) {
  }
}

async function deliverResourceSequence(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const identifier = req.params.identifier;
  const sequence = parseInt(req.params.sequence, 10);
  const source = `./public/books/books/${identifier}.en.json`;
  try {
    const exists = fs.existsSync(`./public/pages/${identifier}-${sequence}`);
    if (exists) {
      console.log(`File exists. Using cached file ${identifier}-${sequence}`);
      res.json(
        JSON.parse(fs.readFileSync(`./public/pages/${identifier}-${sequence}`), 'utf8')
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
      fs.writeFile(`./public/pages/${req.params.identifier}-${sequence}`, JSON.stringify(response.data), err => {
        if (err) {
          return console.log(err);
        }
        console.log(`File ./public/pages/${req.params.identifier}-${sequence} saved`);
      });
      res.json(response.data);
    }
  } catch (error) {
      console.log(error);
      throw error;
  }
}

app.use('/resource/:type/:identifier/:sequence/info.json', deliverResourceSequence);

app.use('/resource/:type/:identifier', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const source = `./public/books/books/${req.params.identifier}.en.json`;
  try {
    res.json(JSON.parse(fs.readFileSync(source, 'utf8')));
  } catch (error) {
    console.log(error);
    throw error;
  }
});

app.use('/resource/:type', deliverResources);

app.use('/iiif/2/:id', (req, res, next) => {
  const redirectTo = `http://3.215.124.212:8182/iiif/2/${req.url}`;
  console.log(`Redirect ${redirectTo}`);
  res.redirect(301, redirectTo);
});

app.use('/', (req, res, next) => {
  const glob = require('glob');
  glob('./public/books/books/*.en.json', (error, files) => {
    res.render('index', { files: files });
  });
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
