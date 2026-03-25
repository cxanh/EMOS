/**
 * 用户管理系统测试脚本
 * 
 * 测试用户管理的各项功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:50001/api';
let adminToken = '';
let testUserId = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. 管理员登录
async function testAdminLogin() {
  log('\n=== 测试1: 管理员登录 ===', 'blue');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });

    if (response.data.success) {
      adminToken = response.data.data.token;
      log('✓ 管理员登录成功', 'green');
      log(`Token: ${adminToken.substring(0, 20)}...`, 'yellow');
      log(`用户信息: ${JSON.stringify(response.data.data.user)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 管理员登录失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 2. 创建测试用户
async function testCreateUser() {
  log('\n=== 测试2: 创建用户 ===', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/users`,
      {
        username: 'testuser',
        password: 'test123456',
        fullName: '测试用户',
        email: 'test@example.com',
        role: 'operator'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      testUserId = response.data.data.id;
      log('✓ 用户创建成功', 'green');
      log(`用户ID: ${testUserId}`, 'yellow');
      log(`用户信息: ${JSON.stringify(response.data.data)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 用户创建失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 3. 获取所有用户
async function testGetAllUsers() {
  log('\n=== 测试3: 获取所有用户 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取用户列表成功', 'green');
      log(`用户数量: ${response.data.data.length}`, 'yellow');
      response.data.data.forEach(user => {
        log(`  - ${user.username} (${user.role}) - ${user.email}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取用户列表失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 4. 获取指定用户
async function testGetUser() {
  log('\n=== 测试4: 获取指定用户 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取用户信息成功', 'green');
      log(`用户信息: ${JSON.stringify(response.data.data)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取用户信息失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 5. 更新用户信息
async function testUpdateUser() {
  log('\n=== 测试5: 更新用户信息 ===', 'blue');
  
  try {
    const response = await axios.put(
      `${BASE_URL}/users/${testUserId}`,
      {
        fullName: '测试用户（已更新）',
        email: 'updated@example.com'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 用户信息更新成功', 'green');
      log(`更新后信息: ${JSON.stringify(response.data.data)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 用户信息更新失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 6. 修改用户密码
async function testChangePassword() {
  log('\n=== 测试6: 修改用户密码 ===', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/users/${testUserId}/change-password`,
      {
        newPassword: 'newpassword123'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 密码修改成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 密码修改失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 7. 测试新密码登录
async function testNewPasswordLogin() {
  log('\n=== 测试7: 使用新密码登录 ===', 'blue');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: 'newpassword123'
    });

    if (response.data.success) {
      log('✓ 新密码登录成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 新密码登录失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 8. 禁用用户
async function testDisableUser() {
  log('\n=== 测试8: 禁用用户 ===', 'blue');
  
  try {
    const response = await axios.put(
      `${BASE_URL}/users/${testUserId}`,
      {
        status: 'disabled'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 用户禁用成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 用户禁用失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 9. 测试禁用用户登录
async function testDisabledUserLogin() {
  log('\n=== 测试9: 禁用用户尝试登录 ===', 'blue');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: 'newpassword123'
    });

    log('✗ 禁用用户不应该能登录', 'red');
    return false;
  } catch (error) {
    if (error.response?.data?.error?.code === 'ACCOUNT_DISABLED') {
      log('✓ 禁用用户登录被正确拒绝', 'green');
      return true;
    } else {
      log(`✗ 错误的响应: ${error.response?.data?.error?.message || error.message}`, 'red');
      return false;
    }
  }
}

// 10. 启用用户
async function testEnableUser() {
  log('\n=== 测试10: 启用用户 ===', 'blue');
  
  try {
    const response = await axios.put(
      `${BASE_URL}/users/${testUserId}`,
      {
        status: 'active'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 用户启用成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 用户启用失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 11. 删除用户
async function testDeleteUser() {
  log('\n=== 测试11: 删除用户 ===', 'blue');
  
  try {
    const response = await axios.delete(`${BASE_URL}/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 用户删除成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 用户删除失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 12. 获取角色列表
async function testGetRoles() {
  log('\n=== 测试12: 获取角色列表 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/users/meta/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取角色列表成功', 'green');
      log(`角色列表: ${JSON.stringify(response.data.data)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取角色列表失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║     用户管理系统功能测试              ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const tests = [
    testAdminLogin,
    testCreateUser,
    testGetAllUsers,
    testGetUser,
    testUpdateUser,
    testChangePassword,
    testNewPasswordLogin,
    testDisableUser,
    testDisabledUserLogin,
    testEnableUser,
    testDeleteUser,
    testGetRoles
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║           测试结果汇总                 ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');
  log(`总测试数: ${tests.length}`, 'yellow');
  log(`通过: ${passed}`, 'green');
  log(`失败: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`成功率: ${((passed / tests.length) * 100).toFixed(2)}%`, 'yellow');
}

// 执行测试
runAllTests().catch(error => {
  log(`\n测试执行出错: ${error.message}`, 'red');
  process.exit(1);
});
