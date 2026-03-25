const redis = require('redis');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const client = redis.createClient({
    url: 'redis://localhost:6379'
  });

  await client.connect();

  try {
    const hashedPassword = await bcrypt.hash('admin', 10);
    const userId = 'user_' + Date.now();

    // 创建用户数据
    const userData = JSON.stringify({
      id: userId,
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      email: 'admin@example.com',
      fullName: 'System Administrator',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    // 存储用户数据
    await client.hSet('user:admin', 'data', userData);
    await client.sAdd('users', 'admin');

    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin');
    console.log('User ID:', userId);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await client.quit();
  }
}

createAdmin();