import express from 'express';
import path from 'path';
import winston from 'winston';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const IIIFEndpoint = process.env.IIIF_ENDPOINT;

const IIIFApiVersion = process.env.IIIF_API_VERSION;

const ViewerContentDirectory = process.env.VIEWER_CONTENT_DIRECTORY;

const FileServer = process.env.FILE_SERVER;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { 
    service: 'dlts-viewer',
  },
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use('/iiif/2/*', (req, res) => {
  const redirectTo = `${IIIFEndpoint}/${IIIFApiVersion}/${req.url}`;
  logger.info(`Redirect to ${redirectTo}`);
  res.redirect(301, redirectTo);
});

app.use('/:type/:identifier/:sequence/info.json', (req, res) => {
  
  const {
    language = 'en'
  } = req.query;

  const {
    identifier,
    sequence,
    type
  } = req.params;

  try {

    const entitySourcePath = `${ViewerContentDirectory}/${type}/${identifier}.${language}.json`;

    const dataSourcePagePath = `./public/pages/${identifier}-${sequence}.json`;    
    
    const exists = fs.existsSync(dataSourcePagePath);
    
    if (exists) {
      logger.info(`File exists. Using cached file ${identifier}-${sequence}.json`);
      res.json(
        JSON.parse(fs.readFileSync(dataSourcePagePath), 'utf8')
      );
    } else {
      
      const requestSequence = parseInt(sequence, 10);

      const data = JSON.parse(fs.readFileSync(entitySourcePath, 'utf8'));

      const sequenceCount = parseInt(data.metadata.sequence_count.value.pop(), 10);

      if (requestSequence === 0 || requestSequence > sequenceCount) {
        res.json({
          error: `Page ${requestSequence} does not exists in requested resource (${identifier}).`
        });
      } else {

        let out = false;
       
        const find = require('lodash.find');
      
        const index = find(data.pages.page, {
          'realPageNumber': parseInt(sequence, 10),
        });

        const url = encodeURIComponent(index.cm.uri.replace('fileserver:/', FileServer));

        logger.info(`Make request: ${IIIFEndpoint}/${IIIFApiVersion}/${url}/info.json`);

        axios.get(`${IIIFEndpoint}/${IIIFApiVersion}/${url}/info.json`)
          .then(response => {
            // logger.info(response.status);
            // logger.info(response.headers);
            // logger.info(response.config);
            out = response.data;
            res.json(response.data);            
          })
          .catch(error => {
            if (error.response) {
              logger.error(error.response.data);
              logger.error(error.response.status);
              logger.error(error.response.headers);
            } else if (error.request) {
              logger.error(error.request);
            } else {
              logger.error(error.message);
            }
            logger.error(error.config);
            res.json(error);
          })
          .finally(() => {
            if (out) {
              fs.writeFile(`./public/pages/${identifier}-${sequence}.json`, JSON.stringify(out), error => {        
                if (error) {
                  logger.error(error);
                  logger.error(`Unable to write file ./public/pages/${identifier}-${sequence}.json`);
                }
                else {
                  logger.info(`File ./public/pages/${identifier}-${sequence}.json saved`);
                }
              });
            }
          });     
      }
    }
  } catch (error) {
    logger.error(error);
    res.json({
      error: error,
    });
  }
});

app.use('/:type/:identifier', (req, res) => {

  const {
    language = 'en'
  } = req.query;

  const {
    identifier,
    type
  } = req.params;

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

    data.title = data.entity_title.trim();

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

    delete data.entity_title;

    delete data.dlts_book;    

    res.json(data);

  } catch (error) {
    logger.error(error);
    res.json({
      error: error,
    });
  }
});

app.use('/:type', (req, res) => {
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
    logger.error(error);
    res.json({
      error: error,
    });
  }
});

// catch 404 and forward to error handler
app.use((req, res) => {
  res.json({
    error: '404 Not found.'
  });
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

export default app;
