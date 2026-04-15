const http = require('http');

function createFakeRedisClient() {
  const strings = new Map();
  const hashes = new Map();
  const lists = new Map();
  const zsets = new Map();
  const sets = new Map();

  return {
    async get(key) {
      return strings.has(key) ? strings.get(key) : null;
    },
    async set(key, value) {
      strings.set(key, String(value));
      return 'OK';
    },
    async hSet(key, field, value) {
      if (!hashes.has(key)) {
        hashes.set(key, new Map());
      }

      hashes.get(key).set(field, String(value));
      return 1;
    },
    async hGetAll(key) {
      if (!hashes.has(key)) {
        return {};
      }

      return Object.fromEntries(hashes.get(key).entries());
    },
    async sAdd(key, value) {
      if (!sets.has(key)) {
        sets.set(key, new Set());
      }

      sets.get(key).add(String(value));
      return 1;
    },
    async sMembers(key) {
      return Array.from(sets.get(key) || []);
    },
    async sRem(key, value) {
      if (!sets.has(key)) {
        return 0;
      }

      sets.get(key).delete(String(value));
      return 1;
    },
    async del(key) {
      strings.delete(key);
      hashes.delete(key);
      lists.delete(key);
      zsets.delete(key);
      sets.delete(key);
      return 1;
    },
    async rPush(key, value) {
      if (!lists.has(key)) {
        lists.set(key, []);
      }

      lists.get(key).push(String(value));
      return lists.get(key).length;
    },
    async lRange(key, start, end) {
      const values = lists.get(key) || [];
      const normalizedEnd = end < 0 ? values.length : end + 1;
      return values.slice(start, normalizedEnd);
    },
    async zAdd(key, entry) {
      if (!zsets.has(key)) {
        zsets.set(key, []);
      }

      zsets.get(key).push({
        score: entry.score,
        value: String(entry.value)
      });

      zsets.get(key).sort((left, right) => left.score - right.score);
      return 1;
    },
    async zRange(key, start, end) {
      const values = zsets.get(key) || [];
      const normalizedEnd = end < 0 ? values.length : end + 1;
      return values.slice(start, normalizedEnd).map(entry => entry.value);
    },
    async expire() {
      return 1;
    }
  };
}

async function startServer(app) {
  const server = http.createServer(app);

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

async function jsonRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });

  const body = await response.json();

  return {
    status: response.status,
    body
  };
}

module.exports = {
  createFakeRedisClient,
  jsonRequest,
  startServer
};
