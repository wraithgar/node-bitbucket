#node-bitbucket

Simple api wrapper for calling the bitbucket api

Returns promises.

If the token fails with a 401 it will throw a boom error w/ code 511
So that end-clients receiving errors can differentiate between 401s from
your app and 401s from your own api


###examples

```javascript
const BitBucketApi = require('bitbucketapi');

const bitbucket = new BitbucketApi({
  token: 'oauth token'
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
  return repos.value;
});
```
