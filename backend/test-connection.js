// 测试数据库连接脚本
require('dotenv').config();
const redisClient = require('./config/redis');
const influxClient = require('./config/influxdb');

async function testConnections() {
  console.log('🔍 Testing database connections...\n');

  // 测试 Redis
  console.log('1. Testing Redis connection...');
  try {
    await redisClient.connect();
    console.log('✅ Redis connection successful!');
    
    // 测试写入
    await redisClient.client.set('test_key', 'test_value');
    const value = await redisClient.client.get('test_key');
    console.log(`   Test write/read: ${value === 'test_value' ? '✅ OK' : '❌ Failed'}`);
    
    await redisClient.disconnect();
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    console.log('   Please make sure Redis is running: redis-server');
  }

  console.log('');

  // 测试 InfluxDB
  console.log('2. Testing InfluxDB connection...');
  try {
    influxClient.connect();
    if (influxClient.isConnected) {
      console.log('✅ InfluxDB connection successful!');
      console.log(`   URL: ${process.env.INFLUX_URL}`);
      console.log(`   Org: ${process.env.INFLUX_ORG}`);
      console.log(`   Bucket: ${process.env.INFLUX_BUCKET}`);
    } else {
      console.log('⚠️  InfluxDB not configured (optional)');
      console.log('   Set INFLUX_TOKEN in .env to enable InfluxDB');
    }
    await influxClient.disconnect();
  } catch (error) {
    console.log('❌ InfluxDB connection failed:', error.message);
    console.log('   InfluxDB is optional for development');
  }

  console.log('\n✨ Connection test completed!');
  process.exit(0);
}

testConnections();
