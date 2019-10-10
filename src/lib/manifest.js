// not in use

function buildManifest(item) {
  // See: https://iiif.io/api/presentation/2.0/#technical-properties
  const isEmpty = require('lodash.isempty');
  delete item.pages;    
  delete item.stitched;
  const identifier = item.identifier;
  const entity_type = item.entity_type;
  let readOrder = 0;

  const viewingDirections = {
    0: 'left-to-right',
    1: 'right-to-left',
    ttb: 'top-to-bottom',
    btt: 'bottom-to-top',
  };

  if (!isEmpty(item.metadata.read_order)) {
    readOrder = parseInt(item.metadata.read_order.value.pop(), 10);
  }  

  // 'representative_image',
  const thumbnail = {
    '@id': 'https://images.sub.uni-goettingen.de/iiif/image/gdz:PPN857449303:00000001/full/96,/0/default.jpg',
    service: {
      '@context':	'http://iiif.io/api/image/2/context.json',
      profile: 'http://iiif.io/api/image/2/level1.json'
    }
  };

  const viewingHints = {
    dlts_book: 'paged',
  };

  // "@language":"en"; per field

  const title = {
    label: item.metadata.title.label ? item.metadata.title.label : '',
    value: item.metadata.title.value ? item.metadata.title.value.pop().trim() : '',
  };

  const manifest = {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@id': `${IIIFEndpoint}/${identifier}/manifest`,
    '@type': 'sc:Manifest',
    viewingHint: viewingHints[entity_type],
    viewingDirection: viewingDirections[readOrder],
    label: title.value,
    thumbnail: thumbnail,
    metadata: [
    ],
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    attribution: 'Provided by New York University',
    logo: `${IIIFEndpoint}/logo.png`,
    sequences: [
    ],
  };

  manifest.metadata.push(title);

  if (item.metadata.subtitle.value.length) {
    manifest.metadata.push({
      label: item.metadata.subtitle.label ? item.metadata.subtitle.label : '',
      value: item.metadata.subtitle.value ? item.metadata.subtitle.value.pop().trim() : '',
    });
  }

  if (!isEmpty(item.metadata.field_description)) {
    manifest.description = item.metadata.field_description.value.pop().trim();
  }

  [
    'publication_date_text',
    'handle',
    'read_order',
    'scan_order',
    'binding_orientation',
    'page_count',
    'sequence_count',
    'call_number',
    'description',
    'language',
    'language_code',
    'pdf_file',
    'rights',
    'subject',
  ].forEach(field => {
    if (!isEmpty(item.metadata[field].value)) {
      manifest.metadata.push({
        label: item.metadata[field].label ? item.metadata[field].label : '',
        value: item.metadata[field].value ? item.metadata[field].value : '',
      });
    }    
  });

  // array
  // Multivol Select 2016
  // https://iiif.io/api/presentation/2.0/#sequence
  // const collection = '';
  // const partner = '';
  // const multivolume = '';
  // const series = '';

  return manifest;

}

app.use('/iiif/:identifier/manifest', (req, res) => {
  
  const { language = 'en' } = req.query;

  const { identifier, type } = req.params;

  // @TODO: https://iiif.io/api/presentation/2.0/#http-response-details
  const source = `./public/books/${type}/${identifier}.${language}.json`;

  try {
    res.json(
      buildManifest(
        JSON.parse(
          fs.readFileSync(source, 'utf8')
        )
      )
    );
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
});