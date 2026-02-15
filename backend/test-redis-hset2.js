// Test Redis hSet with stringified values
const redis = require('redis');

async function test() {
  const client = redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
  });

  await client.connect();
  console.log('Connected to Redis');

  const testData = {
    node_id: 'test001',
    hostname: 'test-machine',
    ip: '192.168.1.100',
    registered_at: new Date().toISOString()
  };

  console.log('Test data:', testData);

  try {
    // Stringify all values
    const stringifiedData = {};
    for (const [k, v] of Object.entries(testData)) {
      stringifiedData[k] = String(v);
    }
    console.log('\nStringified data:', stringifiedData);
    
    await client.hSet('test:stringified', stringifiedData);
    const result = await client.hGetAll('test:stringified');
    console.log('Result:', result);
    console.log('✅ Success!');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }

  // Cleanup
  await client.del('test:stringified');
  await client.quit();
  console.log('\nTest completed');
}

test().catch(console.error);
