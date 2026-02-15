// Diagnose Redis rule storage
const redis = require('redis');

async function diagnoseRedisRule() {
  console.log('=== Diagnosing Redis Rule Storage ===\n');

  const client = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to Redis\n');

    // Get all rule IDs
    const ruleIds = await client.sMembers('alert:rules');
    console.log(`Found ${ruleIds.length} rules\n`);

    // Check each rule
    for (const ruleId of ruleIds) {
      console.log(`\n--- Rule: ${ruleId} ---`);
      
      // Get all fields
      const ruleData = await client.hGetAll(`alert:rule:${ruleId}`);
      console.log('Raw data from Redis:');
      console.log(JSON.stringify(ruleData, null, 2));
      
      // Check specific fields
      console.log('\nField values:');
      console.log('- threshold:', ruleData.threshold, '(type:', typeof ruleData.threshold, ')');
      console.log('- duration:', ruleData.duration, '(type:', typeof ruleData.duration, ')');
      console.log('- enabled:', ruleData.enabled, '(type:', typeof ruleData.enabled, ')');
      console.log('- notifyChannels:', ruleData.notifyChannels, '(type:', typeof ruleData.notifyChannels, ')');
      
      // Try parsing
      console.log('\nParsed values:');
      console.log('- threshold:', ruleData.threshold ? parseFloat(ruleData.threshold) : null);
      console.log('- duration:', ruleData.duration ? parseInt(ruleData.duration) : null);
      console.log('- enabled:', ruleData.enabled === 'true');
      try {
        console.log('- notifyChannels:', ruleData.notifyChannels ? JSON.parse(ruleData.notifyChannels) : []);
      } catch (e) {
        console.log('- notifyChannels: ERROR -', e.message);
      }
    }

    // Test creating a new rule
    console.log('\n\n=== Testing Rule Creation ===\n');
    
    const testRuleId = 'rule_test_' + Date.now();
    console.log('Creating test rule:', testRuleId);
    
    // Method 1: Individual hSet calls
    console.log('\nMethod 1: Individual hSet calls');
    await client.hSet(`alert:rule:${testRuleId}`, 'id', testRuleId);
    await client.hSet(`alert:rule:${testRuleId}`, 'name', 'Test Rule');
    await client.hSet(`alert:rule:${testRuleId}`, 'threshold', '80');
    await client.hSet(`alert:rule:${testRuleId}`, 'duration', '60');
    await client.hSet(`alert:rule:${testRuleId}`, 'enabled', 'true');
    await client.hSet(`alert:rule:${testRuleId}`, 'notifyChannels', JSON.stringify(['websocket']));
    
    const testData1 = await client.hGetAll(`alert:rule:${testRuleId}`);
    console.log('Result:', JSON.stringify(testData1, null, 2));
    
    // Clean up
    await client.del(`alert:rule:${testRuleId}`);
    
    // Method 2: Multiple fields at once (current method)
    console.log('\nMethod 2: Multiple fields at once');
    await client.hSet(
      `alert:rule:${testRuleId}`,
      'id', testRuleId,
      'name', 'Test Rule',
      'threshold', '80',
      'duration', '60',
      'enabled', 'true',
      'notifyChannels', JSON.stringify(['websocket'])
    );
    
    const testData2 = await client.hGetAll(`alert:rule:${testRuleId}`);
    console.log('Result:', JSON.stringify(testData2, null, 2));
    
    // Clean up
    await client.del(`alert:rule:${testRuleId}`);

    console.log('\n=== Diagnosis Completed ===');
  } catch (error) {
    console.error('\n✗ Diagnosis Failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

diagnoseRedisRule();
