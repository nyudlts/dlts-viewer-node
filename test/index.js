import http from 'http';
import assert from 'assert';

import server from '../lib/index.js';

describe('Test Server Status', () => {
  it('should return 200', done => {
    http.get('http://127.0.0.1:3000', res => {
      assert.equal(200, res.statusCode);
      server.close();
      done();
    });
  });
});