import createError from 'http-errors';
import express from 'express';
import path from 'path';
import logger from 'morgan';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const IIIFEndpoint = process.env.IIIF_ENDPOINT;

const IIIFApiVersion = process.env.IIIF_API_VERSION;

const ViewerContentDirectory = process.env.VIEWER_CONTENT_DIRECTORY;

const app = express();

app.use(logger('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use('/iiif/2/*', (req, res, next) => {
  const redirectTo = `${IIIFEndpoint}/${IIIFApiVersion}/${req.url}`;
  console.log(`Redirect ${redirectTo}`);
  res.redirect(301, redirectTo);
});

app.use('/:type/:identifier/:sequence/info.json', async (req, res, next) => {

  const { 
    language = 'en'
  } = req.query;

  const {
    identifier,
    sequence,
    type
  } = req.params;

  const source = `${ViewerContentDirectory}/${type}/${identifier}.${language}.json`;

  try {
    const exists = fs.existsSync(`./public/pages/${identifier}-${sequence}.json`);
    if (exists) {
      console.log(`File exists. Using cached file ${identifier}-${sequence}.json`);
      res.json(
        JSON.parse(fs.readFileSync(`./public/pages/${identifier}-${sequence}.json`), 'utf8')
      );
    }
    else {

      const data = JSON.parse(fs.readFileSync(source, 'utf8'));

      const find = require('lodash.find');

      const index = find(data.pages.page, {
        'realPageNumber': parseInt(sequence, 10),
      });

      const url = encodeURIComponent(index.cm.uri.replace('fileserver:/', 'http://dlib.nyu.edu/files'));

      const response = await axios.get(`${IIIFEndpoint}/${IIIFApiVersion}/${url}/info.json`);

      fs.writeFile(`./public/pages/${identifier}-${sequence}.json`, JSON.stringify(response.data), err => {
        if (err) {
          return console.log(err);
        }
        console.log(`File ./public/pages/${identifier}-${sequence}.json saved`);
      });

      res.json(response.data);

    }
  } catch (error) {
    console.log(error);
    next(createError(500));
  }
});

app.use('/:type/:identifier', (req, res) => {

  const { language = 'en' } = req.query;

  const { identifier, type } = req.params;

  const source = `${ViewerContentDirectory}/${type}/${identifier}.${language}.json`;

  const availableLanguages = {};
  
  const knownLanguages = {
    en: {
      label: 'English',
      dir: 'ltr',
      code: 'en',
      default: false,
    },
    ar: {
      label: 'العربية',
      dir: 'rtl',
      code: 'ar',
      default: false,
    }
  };

  Object.keys(knownLanguages).map(language => {
    const languageTest = `${ViewerContentDirectory}/${type}/${identifier}.${language}.json`;
    if (fs.existsSync(languageTest)) {
      availableLanguages[language] = knownLanguages[language];
    }
  });

  try {

    const data = JSON.parse(
      fs.readFileSync(source, 'utf8')
    );
    
    data.isMultivolume = false;

    data.isSeries = false;

    data.volumes = [];

    data.volumes = [];

    if (data.multivolume && Array.isArray(data.multivolume.volume)) {
      let volume = {};
      volume = data.multivolume.volume.pop();
      volume.title = `${data.entity_title} ${volume.volume_number_str}`;
      volume.bid = data.identifier;
      data.isMultivolume = true;
      const low = require('lowdb');
      const FileSync = require('lowdb/adapters/FileSync');
      const adapter = new FileSync(`./public/resources/volumes.json`);
      const db = low(adapter);
      const volumes = db.get('response')
        .filter({ identifier: volume.identifier })
        .value();
      data.volumes = volumes;
    }

    availableLanguages[language].default = true;

    data.availableLanguages = availableLanguages;

    data.language = availableLanguages[language];

    delete data.pages;

    delete data.multivolume;

    delete data.stitched;

    delete data.entity_language;

    res.json(data);

  } catch (error) {
    console.log(error);
    next(createError(404));
  }
});

app.use('/:type', (req, res, next) => {
  const url = require('url');
  const url_parts = url.parse(req.url, true);
  const query = url_parts.query;
  const type = req.params.type;
  try {
    const exists = fs.readFileSync(`./public/resources/${type}.json`);
    const limit = (query.limit) ? parseInt(query.limit, 10) : 15;
    const start = (query.start) ? parseInt(query.start, 10) : 0;
    const data = JSON.parse(exists, 'utf8');
    if (data.response.length) {
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
  res.json(err);
});

export default app;
