// Clean all alert rules from Redis
const redis = require('redis');

async function cleanAlertRules() {
  console.log('=== Cleaning Alert Rules ===\n');

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
    console.log(`Found ${ruleIds.length} rules to clean\n`);

    // Delete each rule
    for (const ruleId of ruleIds) {
      await client.del(`alert:rule:${ruleId}`);
      console.log(`✓ Deleted rule: ${ruleId}`);
    }

    // Clear the rules set
    await client.del('alert:rules');
    console.log('\n✓ Cleared rules set');

    // Clean active events
    const eventIds = await client.sMembers('alert:events:active');
    console.log(`\nFound ${eventIds.length} active events to clean`);

    for (const eventId of eventIds) {
      await client.del(`alert:event:${eventId}`);
      console.log(`✓ Deleted event: ${eventId}`);
    }

    await client.del('alert:events:active');
    await client.del('alert:events:resolved');
    await client.del('alert:events:ignored');
    console.log('✓ Cleared event sets');

    console.log('\n=== Cleanup Completed Successfully ===');
  } catch (error) {
    console.error('\n✗ Cleanup Failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

cleanAlertRules();
