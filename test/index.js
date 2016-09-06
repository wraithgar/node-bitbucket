'use strict';

const Code = require('code');
const lab = exports.lab = require('lab').script();
const expect = Code.expect;
const fail = Code.fail;

const beforeEach = lab.beforeEach;
const describe = lab.describe;
const it = lab.it;

const Nock = require('nock');
const uuid = require('node-uuid').v4;

const BitbucketApi = require('..');

const internals = {};

internals.token = uuid();
internals.bitbucket_user = { uuid: uuid(), username: 'testUser' };
internals.bitbucket_repos = [{ uuid: uuid(), name: 'testRepo' }, { uuid: uuid(), name: 'otherRepo' }];
internals.issue = { type: 'issue', content: 'would be an object but eh, testing' };
internals.error = { error: 'oops' };
internals.invalid_token = { error: 'invalid token' };

describe('bitbucketapi', () => {

    beforeEach((done) => {

        Nock.cleanAll();
        done();
    });

    describe('apiCall', () => {

        const bitbucket = new BitbucketApi({ token: internals.token });

        it('calls bitbucket', () => {

            const nockScope = Nock('https://api.bitbucket.org')
                .get('/2.0/user')
                .matchHeader('authorization', `Bearer ${internals.token}`)
                .reply(200, internals.bitbucket_user);

            return bitbucket.apiCall({ path: '/user' }).then((response) => {

                nockScope.done();
                expect(response).to.equal(internals.bitbucket_user);
            });
        });

        it('accepts a payload', () => {

            const nockScope = Nock('https://api.bitbucket.org')
                .post(`/2.0/repositories/${internals.bitbucket_user.username}/testRepo/issues`, internals.issue)
                .matchHeader('authorization', `Bearer ${internals.token}`)
                .reply(201, internals.issue);

            return bitbucket.apiCall({ method: 'post', path: `/repositories/${internals.bitbucket_user.username}/testRepo/issues`, payload: internals.issue }).then((response) => {

                nockScope.done();
                expect(response).to.equal(internals.issue);
            });
        });

        it('handles error from bitbucket', () => {

            const nockScope = Nock('https://api.bitbucket.org')
                .get('/2.0/user')
                .matchHeader('authorization', `Bearer ${internals.token}`)
                .reply(500, internals.error);

            return bitbucket.apiCall({ path: '/user' }).then((response) => {

                fail('Should not resolve');
            }).catch((err) => {

                nockScope.done();
                expect(err.output.statusCode).to.equal(500);
                expect(err.message).to.equal(internals.error.error);
            });
        });

        it('handles 401 from bitbucket', () => {

            const nockScope = Nock('https://api.bitbucket.org')
                .get('/2.0/user')
                .matchHeader('authorization', `Bearer ${internals.token}`)
                .reply(401, internals.invalid_token);

            return bitbucket.apiCall({ path: '/user' }).then((response) => {

                fail('Should not resolve');
            }).catch((err) => {

                nockScope.done();
                expect(err.output.statusCode).to.equal(511);
                expect(err.message).to.equal(internals.invalid_token.error);
            });
        });
    });

    describe('getAll', () => {

        const bitbucket = new BitbucketApi({ token: internals.token });

        it('gets all pages', () => {

            const nockScope = Nock('https://api.bitbucket.org')
                .get(`/2.0/repositories/${internals.bitbucket_user.username}`)
                .query({ role: 'member' })
                .matchHeader('authorization', `Bearer ${internals.token}`)
                .reply(200, { values: [internals.bitbucket_repos[0]], next: `https://api.bitbucket.org/2.0/repositories/${internals.bitbucket_user.username}?role=member&page=2` })

                .get(`/2.0/repositories/${internals.bitbucket_user.username}`)
                .query({ page: 2, role: 'member' })
                .matchHeader('authorization', `Bearer ${internals.token}`)
                .reply(200, { values: [internals.bitbucket_repos[1]] });

            return bitbucket.getAll({ path: `/repositories/${internals.bitbucket_user.username}`, query: { role: 'member' } }).then((response) => {

                nockScope.done();
                expect(response).to.include(internals.bitbucket_repos[0]);
                expect(response).to.include(internals.bitbucket_repos[1]);
            });
        });
    });
});
