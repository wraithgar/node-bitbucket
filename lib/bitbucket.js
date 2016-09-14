'use strict';

const Boom = require('boom');
const Wreck = require('wreck');
const Hoek = require('hoek');
const Querystring = require('querystring');
const log = require('debug')('bitbucketapi');

const  internals = {};

internals.callDefaults = {
    endpoint: 'https://api.bitbucket.org',
    version: '2.0',
    method: 'GET',
    headers: {
        'User-Agent': 'Node Bitbucket',
        'content-type': 'application/json'
    }
};

class Bitbucket {

    constructor(options) {

        //Must have a token
        this.options = options;
        this.options.token_refreshed = false;
    }

    /* method, path, payload, token are the usual params */
    apiCall(params, isRefresh) {

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
        log('apiCall %s %s', params.method, path);
        const options = { headers: params.headers };

        options.headers.Authorization = `Bearer ${this.options.token}`;
        if (params.payload) {
            options.payload = params.payload;
        }

        return new Promise((resolve, reject) => {

            Wreck.request(params.method, path, options, (err, response) => {

                //Coverage disabled due to difficulty simulating wreck errors
                //$lab:coverage:off$
                if (err) {
                    return reject(err);
                }
                //$lab:coverage:on$

                return resolve(response);
            });
        }).then((response) => {

            return this.read(response).catch((err) => {

                const needRefresh = err.message.indexOf('Access token expired') > -1;
                if (isRefresh ||
                    !needRefresh ||
                    !this.options.refresh_token) {

                    throw err;
                }

                return this.refresh().catch((refreshErr) => {

                    //If we can't refresh we throw the original 401?
                    throw err;
                }).then(() => {

                    return this.apiCall(params, true);
                });
            });
        });
    }

    /* apiCall wrapper for routes that return paginated results
     *
     * This differs than apiCall in that it only returns the array of results, not the
     * usual result object
     */
    getAll(params) {

        log('getAll %s', params.path);
        return this.apiCall(params).then((response) => {

            return this.getMore(response, []);
        });
    }

    getMore(response, results) {

        const newResults = results.concat(response.values);

        if (this.hasNextPage(response)) {
            return this.apiCall({ next: response.next }).then((nextResponse) => {

                return this.getMore(nextResponse, newResults);
            });
        }

        return Promise.resolve(newResults);
    }

    read(response) {

        return new Promise((resolve, reject) => {

            Wreck.read(response, { json: true }, (err, body) => {

                //Coverage disabled due to difficulty simulating wreck errors
                //$lab:coverage:off$
                if (err) {
                    log('read error %o', err);
                    return reject(err);
                }
                //$lab:coverage:on$
                if (response.statusCode >= 400) {
                    if (body instanceof Buffer) {
                        body = body.toString('utf8');
                    }
                    log('read status error %s %o', response.statusCode, body);
                    let reqErr;
                    if (body.error) {
                        reqErr = new Error(body.error.message);
                    }
                    else {
                        reqErr = new Error(body);
                    }

                    if (response.statusCode === 401) {
                        return reject(Boom.wrap(reqErr, 511));
                    }
                    return reject(Boom.wrap(reqErr, response.statusCode));
                }

                return resolve(body);
            });
        });
    }

    hasNextPage(response) {

        if (response.next) {
            return true;
        }
        return false;
    }

    /*
     * Refresh token using refresh_token
     *
     * Assumes you've set client_id, client_secret, and refresh_token in this.options
     */
    refresh() {

        log('refresh');
        const path = 'https://bitbucket.org/site/oauth2/access_token';
        const options = {
            method: 'POST',
            headers: {
                'User-Agent': 'Node Bitbucket',
                'content-type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + (new Buffer(this.options.client_id + ':' + this.options.client_secret, 'utf8')).toString('base64')
            },
            payload: Querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: this.options.refresh_token
            })
        };

        return new Promise((resolve, reject) => {

            Wreck.request('POST', path, options, (err, response) => {

                //Coverage disabled due to difficulty simulating wreck errors
                //$lab:coverage:off$
                if (err) {
                    return reject(err);
                }
                //$lab:coverage:on$

                return resolve(response);
            });
        }).then((response) => {

            return this.read(response);
        }).then((body) => {

            log('refresh success');
            this.token_refreshed = true;
            this.options.token = body.access_token;
            if (this.options.token_refresh_function) {

                log('calling token refresh function');
                return this.options.token_refresh_function(this.options.token);
            }
        });
    }
};

module.exports = Bitbucket;
