'use strict';

const Boom = require('boom');
const Wreck = require('wreck');
const Hoek = require('hoek');
const Querystring = require('querystring');

const  internals = {};

internals.moduleDefaults = {
};

internals.callDefaults = {
  'user-agent': 'Node Bitbucket',
  endpoint: 'https://api.bitbucket.org',
  version: '2.0',
  method: 'GET',
  headers: {}
};

class Bitbucket {

  constructor (options) {

    //Must have a token
    this.options = options;
  }

  /* method, path, payload, token are the usual params */
  apiCall (params) {

    params = Hoek.applyToDefaults(internals.callDefaults, params);
    let path;
    //Allow for passing in next attribute from response
    if (params.next) {
      path = params.next;
    }
    else {
      path = `${params.endpoint}/${params.version}${params.path}`;

      if (params.query) {

        path = `${path}?${Querystring.stringify(params.query)}`;
      }

    }
    const options = { headers: params.headers };

    options.headers.Authorization = `Bearer ${this.options.token}`;
    if (options.payload) {
      options.payload = params.payload;
    }

    return new Promise((resolve, reject) => {

      Wreck.request(params.method, path, options, (err, response) => {

        if (err) {
          return reject(err);
        }

        return resolve(response);
      });
    }).then(this.read);
  }

  read (response) {

    return new Promise((resolve, reject) => {

      Wreck.read(response, { json: true }, (err, body) => {

        if (err) {
          return reject(err);
        }
        if (response.statusCode >= 400) {
          const reqErr = new Error(body.message || body.error || body);

          if (response.statusCode === 401) {
            return reject(Boom.wrap(reqErr, 511));
          }
          return reject(Boom.wrap(reqErr, response.statusCode));
        }

        return resolve(body);
      });
    });
  }

  hasNextPage (body) {

    if (body.next) {
      return true;
    }
    return false;
  }

};

module.exports = Bitbucket;
