// Test different Redis hSet approaches
const redis = require('redis');

async function test() {
  const client = redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
  });

  await client.connect();
  console.log('Connected to Redis\n');

  const testData = {
    node_id: 'test001',
    hostname: 'test-machine',
    ip: '192.168.1.100',
    registered_at: new Date().toISOString()
  };

  // Method 1: Use individual field sets
  try {
    console.log('Method 1: Individual hSet calls');
    for (const [key, value] of Object.entries(testData)) {
      await client.hSet('test:individual', key, String(value));
    }
    const result1 = await client.hGetAll('test:individual');
    console.log('✅ Success:', result1);
    await client.del('test:individual');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  // Method 2: Use array format
  try {
    console.log('\nMethod 2: Array format [key1, val1, key2, val2, ...]');
    const arr = [];
    for (const [key, value] of Object.entries(testData)) {
      arr.push(key, String(value));
    }
    console.log('Array:', arr);
    await client.hSet('test:array', arr);
    const result2 = await client.hGetAll('test:array');
    console.log('✅ Success:', result2);
    await client.del('test:array');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  await client.quit();
  console.log('\nTest completed');
}

test().catch(console.error);
