// Test Redis hSet usage
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
    // Method 1: Pass object directly
    console.log('\nMethod 1: Pass object directly');
    await client.hSet('test:method1', testData);
    const result1 = await client.hGetAll('test:method1');
    console.log('Result:', result1);
  } catch (error) {
    console.error('Method 1 failed:', error.message);
  }

  try {
    // Method 2: Pass as array
    console.log('\nMethod 2: Pass as flat array');
    const entries = Object.entries(testData).flat();
    console.log('Entries:', entries);
    await client.hSet('test:method2', entries);
    const result2 = await client.hGetAll('test:method2');
    console.log('Result:', result2);
  } catch (error) {
    console.error('Method 2 failed:', error.message);
  }

  try {
    // Method 3: Pass key-value pairs
    console.log('\nMethod 3: Pass as key-value pairs');
    await client.hSet('test:method3', 
      'node_id', testData.node_id,
      'hostname', testData.hostname,
      'ip', testData.ip,
      'registered_at', testData.registered_at
    );
    const result3 = await client.hGetAll('test:method3');
    console.log('Result:', result3);
  } catch (error) {
    console.error('Method 3 failed:', error.message);
  }

  // Cleanup
  await client.del('test:method1', 'test:method2', 'test:method3');
  await client.quit();
  console.log('\nTest completed');
}

test().catch(console.error);
