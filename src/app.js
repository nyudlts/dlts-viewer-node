import express from 'express';
import path from 'path';
import winston from 'winston';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';
import find from 'lodash.find';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

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

app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'ignore',
  etag: false,
  maxAge: '1d',
  redirect: false,
  setHeaders: res => {
    res.set('x-timestamp', Date.now());
  },
}));

app.get('*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use('/iiif/2/*', (req, res) => {
  const redirectTo = `${IIIFEndpoint}/${IIIFApiVersion}/${req.originalUrl.replace('/iiif/2/', '')}`;
  logger.info(`Redirect to ${redirectTo}`);
  res.redirect(301, redirectTo);
});

app.get('/:type/:identifier/:sequence/info.json', (req, res) => {
  
  const {
    language = 'en'
  } = req.query;

  const {
    identifier,
    type
  } = req.params;

  let {
    sequence
  } = req.params;

  if (/^\d+$/.test(sequence)) {
    sequence = parseInt(sequence, 10);
  } else {
    return res.json({ error: 'Sequence must be a natural number' });
  }

  try {
    fs.readFile(`./public/pages/${identifier}-${sequence}.json`, 'utf8', (error, data) => {
      if (error) {
        // If ENOEN; try to find the source file inside the repository and create cache
        if (error.code === 'ENOENT') {
          fs.readFile(`${ViewerContentDirectory}/${type}/${identifier}.${language}.json`, 'utf8', (error, source) => {
            // file can not be read
            if (error) {
              logger.error(error);
              res.json({ error: error });
            }
            else {
              const data = JSON.parse(source, 'utf8');
              const sequenceCount = parseInt(data.metadata.sequence_count.value.pop(), 10);
              if (sequence === 0 || sequence > sequenceCount) {
                res.json({
                  error: `Page ${sequence} does not exists in requested resource (${identifier}).`
                });
              } else {
                let out = false;
                const index = find(data.pages.page, {
                  'realPageNumber': sequence,
                });
                axios.get(`${IIIFEndpoint}/${IIIFApiVersion}/${encodeURIComponent(index.cm.uri.replace('fileserver:/', FileServer))}/info.json`)
                  .then(response => {
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
                    }
                    logger.error(`${error.code} - ${error.message}`);
                    res.json(error);
                  })
                  .finally(() => {
                    if (out) {
                      fs.writeFile(`./public/pages/${identifier}-${sequence.toString()}.json`, JSON.stringify(out), error => {
                        if (error) {
                          logger.error(error);
                          logger.error(`Unable to write file ./public/pages/${identifier}-${sequence.toString()}.json`);
                        }
                        else {
                          logger.info(`File ./public/pages/${identifier}-${sequence.toString()}.json saved`);
                        }
                      });
                    }
                  });     
              }
            }
          });
        } else {
          logger.error(error.code);
          res.json({ error: error });
        }
      }
      // file exists
      else {
        logger.info(`File exists. Using cached file ${identifier}-${sequence.toString()}.json`);
        res.json(JSON.parse(data, 'utf8'));
      }
    });
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
  const sourceCache = `./public/resources/${type}/${identifier}.${language}.json`;  

  if (!fs.existsSync(sourceCache)) { // anti-pattern race-condition; fine for now

    try {

      const availableLanguages = {};

      const knownLanguages = {
        en: {
          label: 'English',
          dir: 'ltr',
          code: 'en',
          default: false,
          spellAs: [
            'english', 'en',
          ],
        },
        ar: {
          label: 'العربية',
          dir: 'rtl',
          code: 'ar',
          default: false,
          spellAs: [
            'arabic', 
            'ar', 
            'ara',
            'العربية',
          ],
        }
      };      

      const data = JSON.parse(
        fs.readFileSync(source, 'utf8')
      );

      const langSearchTerm = data.metadata.language.value.pop().toLowerCase();
    
      Object.keys(knownLanguages).map(language => {
        const languageTest = `${ViewerContentDirectory}/${type}/${identifier}.${language}.json`;
        const result = knownLanguages[language].spellAs.includes(langSearchTerm);
        if (result) {
          data.worldDirection = knownLanguages[language].dir;
        }
        if (fs.existsSync(languageTest)) {
          availableLanguages[language] = knownLanguages[language];
        }
      });

      data.title = data.entity_title.trim();

      data.isMultivolume = false;
 
      data.isSeries = false;

      data.status = parseInt(data.entity_status, 10);

      data.volumes = [];

      data.volumes = [];


      if (data.metadata.pdf_file && Array.isArray(data.metadata.pdf_file.value)) {
        data.metadata.pdf_file.value.forEach((value, index) => {
          data.metadata.pdf_file.value[index] = {
            kind: '',
            url: data.metadata.pdf_file.value[index].replace('fileserver:/', FileServer),
          };
        });
      }

      if (
        data.metadata.representative_image && 
        data.metadata.representative_image.cm &&
        data.metadata.representative_image.cm.uri) {
          const ri = data.metadata.representative_image.cm.uri.replace('fileserver:/', FileServer);
          data.representativeImage = ri;
          data.thumbnail = `${req.protocol}://${req.get('host')}/iiif/2/${encodeURIComponent(ri)}/full/150,/0/default.jpg`;          
      }

      if (data.multivolume && Array.isArray(data.multivolume.volume)) {
        let volume = {};
        volume = data.multivolume.volume.pop();
        volume.title = `${data.entity_title} ${volume.volume_number_str}`;
        volume.bid = data.identifier;
        data.isMultivolume = true;
        const adapterVolumes = new FileSync(`./public/resources/volumes.json`);
        const db = low(adapterVolumes);
        const volumes = db.get('response')
          .filter({ identifier: volume.identifier })
          .value();
        data.volumes = volumes;
      }

      availableLanguages[language].default = true;

      data.availableLanguages = availableLanguages;

      data.language = availableLanguages[language];

      delete data.pages;

      delete data.entity_type;

      delete data.entity_status;

      delete data.multivolume;

      delete data.stitched;

      delete data.entity_language;

      delete data.entity_title;

      delete data.dlts_book;

      delete data.metadata.representative_image;

      res.json(data);

      fs.writeFile(`./public/resources/${type}/${identifier}.${language}.json`, JSON.stringify(data), error => {
        if (error) {
          logger.error(error);
          logger.error(`./public/resources/${type}/${identifier}.${language}.json`);
        }
        else {
          logger.info(`File ./public/resources/${type}/${identifier}.${language}.json saved`);
        }
      });

    } catch (error) {
      logger.error(error);
      res.json({
        error: error,
      });
    }
  }
  else {
    logger.info(`File exists. Using cached file ${sourceCache}`);
    res.json(JSON.parse(
      fs.readFileSync(sourceCache, 'utf8')
    ));
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
