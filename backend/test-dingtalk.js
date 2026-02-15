require('dotenv').config();
const dingtalkService = require('./services/dingtalkService');

async function test() {
  console.log('========================================');
  console.log('钉钉通知测试');
  console.log('========================================\n');

  // 显示配置信息
  console.log('配置信息:');
  console.log('  DINGTALK_WEBHOOK:', process.env.DINGTALK_WEBHOOK ? '已配置' : '未配置');
  if (process.env.DINGTALK_WEBHOOK) {
    const webhook = process.env.DINGTALK_WEBHOOK;
    const maskedWebhook = webhook.substring(0, 50) + '...' + webhook.substring(webhook.length - 10);
    console.log('    URL:', maskedWebhook);
  }
  console.log('  DINGTALK_SECRET:', process.env.DINGTALK_SECRET ? '已配置 (****)' : '未配置');
  console.log('');

  // 初始化钉钉服务
  console.log('正在初始化钉钉服务...');
  dingtalkService.initialize();
  console.log('');

  if (!dingtalkService.isEnabled()) {
    console.log('❌ 钉钉服务未启用');
    console.log('');
    console.log('请检查以下配置是否正确:');
    console.log('  1. DINGTALK_WEBHOOK - 钉钉机器人Webhook地址');
    console.log('  2. DINGTALK_SECRET - 钉钉机器人加签密钥（可选）');
    console.log('');
    console.log('配置步骤:');
    console.log('  1. 打开钉钉群 → 群设置 → 智能群助手');
    console.log('  2. 添加机器人 → 自定义机器人');
    console.log('  3. 安全设置选择"加签"');
    console.log('  4. 复制Webhook地址和密钥到.env文件');
    return;
  }

  console.log('✅ 钉钉服务已启用');
  console.log('');

  // 测试告警消息
  console.log('正在发送测试告警消息...');
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

  const alertResult = await dingtalkService.sendAlert(testEvent);
  console.log('');

  if (alertResult.success) {
    console.log('✅ 告警消息发送成功!');
  } else {
    console.log('❌ 告警消息发送失败:', alertResult.error);
    console.log('');
    console.log('常见错误:');
    console.log('  - sign not match: 密钥配置错误或安全设置不是"加签"');
    console.log('  - keywords not in content: 安全设置是"自定义关键词"，需要改为"加签"');
    console.log('  - ip not in whitelist: 安全设置是"IP地址"，需要改为"加签"');
  }

  console.log('');

  // 测试恢复消息
  console.log('正在发送测试恢复消息...');
  const testRecovery = {
    ruleName: '测试告警规则',
    nodeId: 'test-node-001',
    nodeName: '测试节点',
    metric: 'cpu_usage',
    currentValue: 65.2,
    threshold: 80,
    message: '节点 测试节点 的 CPU使用率已恢复正常 (65.2% <= 80%)'
  };

  const recoveryResult = await dingtalkService.sendRecovery(testRecovery);
  console.log('');

  if (recoveryResult.success) {
    console.log('✅ 恢复消息发送成功!');
  } else {
    console.log('❌ 恢复消息发送失败:', recoveryResult.error);
  }

  console.log('');
  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
  console.log('');
  console.log('请检查钉钉群是否收到测试消息。');
  console.log('如果没有收到，请检查:');
  console.log('  1. Webhook地址是否正确');
  console.log('  2. 密钥是否正确（包括SEC前缀）');
  console.log('  3. 机器人安全设置是否为"加签"');
  console.log('  4. 机器人是否被禁用');
}

test().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
