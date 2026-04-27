require('dotenv').config();
const aiService = require('./services/aiService');

async function test() {
  console.log('========================================');
  console.log('AI服务测试');
  console.log('========================================\n');

  // 显示配置
  console.log('配置信息:');
  console.log('  LLM_PROVIDER:', process.env.LLM_PROVIDER || '未配置');
  if (process.env.LLM_PROVIDER === 'openai') {
    console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已配置 (****)' : '未配置');
    console.log('  OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4');
  } else if (process.env.LLM_PROVIDER === 'ollama') {
    console.log('  OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
    console.log('  OLLAMA_MODEL:', process.env.OLLAMA_MODEL || 'llama2');
  }
  console.log('');

  // 初始化
  console.log('正在初始化AI服务...');
  aiService.initialize();
  console.log('');

  if (!aiService.isEnabled()) {
    console.log('❌ AI服务未启用');
    console.log('');
    console.log('请配置以下环境变量:');
    console.log('');
    console.log('选项1 - 使用OpenAI:');
    console.log('  LLM_PROVIDER=openai');
    console.log('  OPENAI_API_KEY=sk-your-api-key');
    console.log('  OPENAI_MODEL=gpt-4');
    console.log('');
    console.log('选项2 - 使用Ollama (本地):');
    console.log('  LLM_PROVIDER=ollama');
    console.log('  OLLAMA_BASE_URL=http://localhost:11434');
    console.log('  OLLAMA_MODEL=llama2');
    console.log('');
    console.log('配置后重启后端服务即可使用AI功能。');
    return;
  }

  console.log('✅ AI服务已启用\n');

  // 测试系统健康检查
  console.log('========================================');
  console.log('测试1: 系统健康检查');
  console.log('========================================\n');
  console.log('正在分析系统健康状况...');
  console.log('(这可能需要10-30秒，请耐心等待)\n');

  try {
    const healthResult = await aiService.analyzeSystemHealth();
    
    if (healthResult.success) {
      console.log('✅ 健康检查完成\n');
      console.log('【分析结果】');
      console.log('  健康评分:', healthResult.data.healthScore + '/100');
      console.log('  状态:', healthResult.data.status);
      console.log('  紧急程度:', healthResult.data.urgency);
      console.log('');
      console.log('【摘要】');
      console.log(' ', healthResult.data.summary);
      console.log('');
      
      if (healthResult.data.issues && healthResult.data.issues.length > 0) {
        console.log('【发现的问题】(' + healthResult.data.issues.length + '个)');
        healthResult.data.issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. [${issue.severity}] ${issue.node} - ${issue.description}`);
        });
        console.log('');
      }
      
      if (healthResult.data.recommendations && healthResult.data.recommendations.length > 0) {
        console.log('【优化建议】(' + healthResult.data.recommendations.length + '个)');
        healthResult.data.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
        console.log('');
      }
    } else {
      console.log('❌ 健康检查失败:', healthResult.error);
    }
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
  console.log('');
  console.log('提示:');
  console.log('  - 如果测试成功，说明AI服务配置正确');
  console.log('  - 可以在前端页面使用AI分析功能');
  console.log('  - 查看 docs/archive/root/AI_SYSTEM_IMPLEMENTATION.md 了解更多');
}

test().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
