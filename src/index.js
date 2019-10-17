import app from './app';
import http from 'http';

const { PORT = 3000 } = process.env;

const debug = require('debug')('dlts-viewer-node:server');

const ssl = !!process.env.SSL;

const protocol = ssl ? 'https://' : 'http://';

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`); // eslint-disable-line no-console
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`); // eslint-disable-line no-console
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const {
    networkInterfaces,
  } = require('os');
  const ifaces = networkInterfaces();
  console.info(`Listening on: `);
  Object.keys(ifaces).forEach(dev => {
    ifaces[dev].forEach(details => {
      if (details.family === 'IPv4') {
        console.info(('   ' + protocol + details.address + ':' + port));
      }
    });
  });
}

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(PORT);

app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);

server.on('error', onError);

server.on('listening', onListening);
