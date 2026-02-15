require('dotenv').config();
const emailService = require('./services/emailService');

async function test() {
  console.log('========================================');
  console.log('邮件通知测试');
  console.log('========================================\n');

  // 显示配置信息
  console.log('配置信息:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST || '未配置');
  console.log('  SMTP_PORT:', process.env.SMTP_PORT || '未配置');
  console.log('  SMTP_USER:', process.env.SMTP_USER || '未配置');
  console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '已配置 (****)' : '未配置');
  console.log('  ALERT_EMAIL:', process.env.ALERT_EMAIL || process.env.SMTP_USER || '未配置');
  console.log('');

  // 初始化邮件服务
  console.log('正在初始化邮件服务...');
  await emailService.initialize();
  console.log('');

  if (!emailService.isEnabled()) {
    console.log('❌ 邮件服务未启用');
    console.log('');
    console.log('请检查以下配置是否正确:');
    console.log('  1. SMTP_HOST - SMTP服务器地址');
    console.log('  2. SMTP_PORT - SMTP端口');
    console.log('  3. SMTP_USER - 发件人邮箱');
    console.log('  4. SMTP_PASS - 邮箱密码/授权码');
    console.log('');
    console.log('提示: Gmail需要使用应用专用密码，不是邮箱登录密码！');
    return;
  }

  console.log('✅ 邮件服务已启用');
  console.log('');

  // 测试告警邮件
  console.log('正在发送测试告警邮件...');
  const testEvent = {
    ruleName: '测试告警规则',
    nodeId: 'test-node-001',
    nodeName: '测试节点',
    metric: 'cpu_usage',
    currentValue: 85.5,
    threshold: 80,
    triggeredAt: new Date().toISOString(),
    message: '节点 测试节点 的 CPU使用率 (85.5%) 超过阈值 (80%)'
  };

  const alertResult = await emailService.sendAlert(testEvent);
  console.log('');

  if (alertResult.success) {
    console.log('✅ 告警邮件发送成功!');
    console.log('   Message ID:', alertResult.messageId);
  } else {
    console.log('❌ 告警邮件发送失败:', alertResult.error);
  }

  console.log('');

  // 测试恢复邮件
  console.log('正在发送测试恢复邮件...');
  const testRecovery = {
    ruleName: '测试告警规则',
    nodeId: 'test-node-001',
    nodeName: '测试节点',
    metric: 'cpu_usage',
    currentValue: 65.2,
    threshold: 80,
    message: '节点 测试节点 的 CPU使用率已恢复正常 (65.2% <= 80%)'
  };

  const recoveryResult = await emailService.sendRecovery(testRecovery);
  console.log('');

  if (recoveryResult.success) {
    console.log('✅ 恢复邮件发送成功!');
    console.log('   Message ID:', recoveryResult.messageId);
  } else {
    console.log('❌ 恢复邮件发送失败:', recoveryResult.error);
  }

  console.log('');
  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
  console.log('');
  console.log('请检查邮箱是否收到测试邮件。');
  console.log('如果没有收到，请检查:');
  console.log('  1. 垃圾邮件文件夹');
  console.log('  2. SMTP配置是否正确');
  console.log('  3. 邮箱是否开启了SMTP服务');
  console.log('  4. 是否使用了正确的授权码/应用密码');
}

test().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
