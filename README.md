#node-bitbucket

Simple api wrapper for calling the bitbucket api

Returns promises.

If the token fails with a 401 it will throw a boom error w/ code 511
So that end-clients receiving errors can differentiate between 401s from
your app and 401s from your own api

If you give it a `client_id`, `client_secret`, and `refresh_token` it will
attempt to use those to get a new `token` if the current one is found to
be expired.  If this happens the instance variable `token_refreshed`
will be set to true, so you can test against that to see if the code
that is using this module needs to update its own state.

###examples

```javascript
const BitBucketApi = require('bitbucketapi');

const bitbucket = new BitbucketApi({
  token: 'required oauth token'
  refresh_token: `optional refresh token`,
  client_id: 'optional client_id',
  client_secret: 'optional client secret'
});

return bitbucket.apiCall({ path: '/user' });
```

```javascript
const BitBucketApi = require('bitbucketapi');

const bitbucket = new BitbucketApi({
  token: 'oauth token'
});

return bitbucket.apiCall({ path: `/repositories/cool_user`, query: { role: 'member' } }).then((repos) => {

  if (bitbucket.hasNextPage(repos) {
    return bitbucket.apiCall({ next: repos.next }).then((nextRepos) {

      return repos.values.concat(nextRepos.values);
    }
  }
  //bitbucket.token_refreshed will be true here if a new token was retrieved
  return repos.value;
});
```
