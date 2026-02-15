const alertService = require('./services/alertService');
const redisClient = require('./config/redis');

async function testNotificationLog() {
  console.log('=== Testing Notification Log ===\n');

  try {
    // 1. 测试保存通知日志
    console.log('1. Testing saveNotificationLog...');
    const testLog = {
      eventId: 'event_test_' + Date.now(),
      ruleName: 'Test Rule',
      nodeId: 'node001',
      nodeName: 'Test Node',
      timestamp: new Date().toISOString(),
      channels: [
        {
          type: 'websocket',
          status: 'success',
          sentAt: new Date().toISOString()
        },
        {
          type: 'email',
          status: 'failed',
          error: 'Test error',
          sentAt: new Date().toISOString()
        }
      ]
    };

    const saveResult = await alertService.saveNotificationLog(testLog);
    console.log('Save result:', saveResult);

    if (saveResult.success) {
      console.log('✓ Notification log saved successfully');
      console.log('  Log ID:', saveResult.data.id);
    } else {
      console.log('✗ Failed to save notification log:', saveResult.error);
      return;
    }

    // 2. 测试获取通知日志
    console.log('\n2. Testing getNotificationLogs...');
    const logs = await alertService.getNotificationLogs({ limit: 10 });
    console.log('✓ Retrieved', logs.length, 'logs');
    
    if (logs.length > 0) {
      console.log('\nFirst log:');
      console.log('  ID:', logs[0].id);
      console.log('  Event ID:', logs[0].eventId);
      console.log('  Rule Name:', logs[0].ruleName);
      console.log('  Node:', logs[0].nodeName);
      console.log('  Timestamp:', logs[0].timestamp);
      console.log('  Channels:', logs[0].channels.length);
      
      logs[0].channels.forEach((channel, index) => {
        console.log(`    Channel ${index + 1}:`, channel.type, '-', channel.status);
      });
    }

    // 3. 测试获取统计数据
    console.log('\n3. Testing getNotificationStats...');
    const stats = await alertService.getNotificationStats();
    if (stats) {
      console.log('✓ Statistics retrieved');
      console.log('  Total:', stats.total);
      console.log('  Success:', stats.byStatus.success);
      console.log('  Failed:', stats.byStatus.failed);
      console.log('  WebSocket:', stats.byChannel.websocket);
      console.log('  Email:', stats.byChannel.email);
      console.log('  DingTalk:', stats.byChannel.dingtalk);
    }

    // 4. 检查Redis数据
    console.log('\n4. Checking Redis data...');
    const notifKeys = await redisClient.client.keys('alert:notification:*');
    console.log('✓ Found', notifKeys.length, 'notification keys in Redis');

    const zsetSize = await redisClient.client.zCard('alert:notifications');
    console.log('✓ Sorted set size:', zsetSize);

    // 5. 获取最新的几条日志ID
    console.log('\n5. Testing direct Redis access...');
    const latestIds = await redisClient.client.sendCommand([
      'ZREVRANGE',
      'alert:notifications',
      '0',
      '2'
    ]);
    console.log('✓ Latest 3 log IDs:', latestIds);

    if (latestIds.length > 0) {
      console.log('\nChecking first log data:');
      const firstLogData = await redisClient.client.hGetAll(`alert:notification:${latestIds[0]}`);
      console.log('Raw data:', firstLogData);
      console.log('Keys:', Object.keys(firstLogData));
    }

    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('\n✗ Test Failed!');
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// 初始化并运行测试
async function init() {
  try {
    await redisClient.connect();
    await alertService.initialize();
    await testNotificationLog();
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

init();
