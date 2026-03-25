/**
 * 报表系统测试脚本
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:50001/api';
let adminToken = '';
let testReportId = '';
let testNodeIds = [];

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
async function testLogin() {
  log('\n=== 测试1: 管理员登录 ===', 'blue');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });

    if (response.data.success) {
      adminToken = response.data.data.token;
      log('✓ 管理员登录成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 管理员登录失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 2. 获取在线节点
async function testGetNodes() {
  log('\n=== 测试2: 获取在线节点 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/agent/list`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success && response.data.data.length > 0) {
      testNodeIds = response.data.data.map(node => node.node_id);
      log('✓ 获取节点成功', 'green');
      log(`节点数量: ${testNodeIds.length}`, 'yellow');
      log(`节点列表: ${testNodeIds.join(', ')}`, 'yellow');
      return true;
    } else {
      log('✗ 没有在线节点', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 获取节点失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 3. 生成日报
async function testGenerateDailyReport() {
  log('\n=== 测试3: 生成日报 ===', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/reports/generate/daily`,
      {
        nodeIds: testNodeIds
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      testReportId = response.data.data.id;
      log('✓ 日报生成成功', 'green');
      log(`报表ID: ${testReportId}`, 'yellow');
      log(`节点数量: ${response.data.data.statistics.totalNodes}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 日报生成失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 4. 生成周报
async function testGenerateWeeklyReport() {
  log('\n=== 测试4: 生成周报 ===', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/reports/generate/weekly`,
      {
        nodeIds: testNodeIds
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 周报生成成功', 'green');
      log(`报表ID: ${response.data.data.id}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 周报生成失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 5. 生成月报
async function testGenerateMonthlyReport() {
  log('\n=== 测试5: 生成月报 ===', 'blue');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/reports/generate/monthly`,
      {
        nodeIds: testNodeIds
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 月报生成成功', 'green');
      log(`报表ID: ${response.data.data.id}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 月报生成失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 6. 生成自定义报表
async function testGenerateCustomReport() {
  log('\n=== 测试6: 生成自定义报表 ===', 'blue');
  
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    const response = await axios.post(
      `${BASE_URL}/reports/generate`,
      {
        nodeIds: testNodeIds,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✓ 自定义报表生成成功', 'green');
      log(`报表ID: ${response.data.data.id}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 自定义报表生成失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 7. 获取所有报表
async function testGetAllReports() {
  log('\n=== 测试7: 获取所有报表 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取报表列表成功', 'green');
      log(`报表数量: ${response.data.data.length}`, 'yellow');
      response.data.data.forEach(report => {
        log(`  - ${report.type} (${report.id}) - ${report.createdAt}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取报表列表失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 8. 获取指定报表
async function testGetReport() {
  log('\n=== 测试8: 获取指定报表 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/reports/${testReportId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取报表详情成功', 'green');
      log(`报表类型: ${response.data.data.type}`, 'yellow');
      log(`节点数量: ${response.data.data.statistics.totalNodes}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取报表详情失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 9. 获取报表摘要
async function testGetReportSummary() {
  log('\n=== 测试9: 获取报表摘要 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/reports/${testReportId}/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取报表摘要成功', 'green');
      log(`摘要信息: ${JSON.stringify(response.data.data)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取报表摘要失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 10. 获取报表类型列表
async function testGetReportTypes() {
  log('\n=== 测试10: 获取报表类型列表 ===', 'blue');
  
  try {
    const response = await axios.get(`${BASE_URL}/reports/meta/types`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 获取报表类型成功', 'green');
      log(`类型列表: ${JSON.stringify(response.data.data)}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取报表类型失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 11. 删除报表
async function testDeleteReport() {
  log('\n=== 测试11: 删除报表 ===', 'blue');
  
  try {
    const response = await axios.delete(`${BASE_URL}/reports/${testReportId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      log('✓ 报表删除成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 报表删除失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║       报表系统功能测试                 ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const tests = [
    testLogin,
    testGetNodes,
    testGenerateDailyReport,
    testGenerateWeeklyReport,
    testGenerateMonthlyReport,
    testGenerateCustomReport,
    testGetAllReports,
    testGetReport,
    testGetReportSummary,
    testGetReportTypes,
    testDeleteReport
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

runAllTests().catch(error => {
  log(`\n测试执行出错: ${error.message}`, 'red');
  process.exit(1);
});
