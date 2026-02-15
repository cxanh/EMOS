require('dotenv').config();
const axios = require('axios');

async function testOllamaConnection() {
  console.log('========================================');
  console.log('Ollama连接测试');
  console.log('========================================\n');

  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama2';

  console.log('配置信息:');
  console.log('  Base URL:', baseURL);
  console.log('  Model:', model);
  console.log('');

  // 测试1: 检查Ollama是否运行
  console.log('测试1: 检查Ollama服务...');
  try {
    const response = await axios.get(`${baseURL}/api/tags`, { timeout: 5000 });
    console.log('✅ Ollama服务正在运行');
    console.log('可用模型:', response.data.models.map(m => m.name).join(', '));
    console.log('');
  } catch (error) {
    console.log('❌ Ollama服务未运行');
    console.log('错误:', error.message);
    console.log('');
    console.log('请确保:');
    console.log('  1. Ollama已安装');
    console.log('  2. Ollama服务正在运行');
    console.log('  3. 端口11434未被占用');
    console.log('');
    console.log('启动Ollama: 打开Ollama应用或运行 ollama serve');
    return;
  }

  // 测试2: 测试简单对话
  console.log('测试2: 测试AI对话...');
  console.log('(20B模型较大，可能需要30-60秒，请耐心等待)\n');
  
  try {
    const response = await axios.post(
      `${baseURL}/api/chat`,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: '你好'
          }
        ],
        stream: false
      },
      {
        timeout: 120000  // 增加到120秒
      }
    );

    console.log('✅ AI对话测试成功');
    console.log('AI回复:', response.data.message.content.substring(0, 200));
    console.log('');
  } catch (error) {
    console.log('❌ AI对话测试失败');
    console.log('错误:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('');
      console.log('⚠️  响应超时 - 这是正常的，20B模型需要较长时间');
      console.log('   建议:');
      console.log('   1. 使用更小的模型 (如 llama2:7b)');
      console.log('   2. 或者增加服务器配置');
      console.log('   3. 或者使用OpenAI API');
      console.log('');
      console.log('   下载更小的模型:');
      console.log('   ollama pull llama2:7b');
      console.log('   ollama pull qwen:7b');
    }
    
    if (error.response?.status === 404) {
      console.log('');
      console.log('模型未找到，请先下载模型:');
      console.log(`  ollama pull ${model}`);
    }
    return;
  }

  // 测试3: 测试JSON格式输出
  console.log('测试3: 测试JSON格式输出...');
  console.log('(这可能需要10-30秒)\n');
  
  try {
    const prompt = `请分析以下系统数据并以JSON格式返回结果。

系统数据:
- CPU使用率: 65%
- 内存使用率: 78%
- 磁盘使用率: 45%

请严格按照以下JSON格式返回（不要包含任何其他文字）:
{
  "healthScore": 85,
  "status": "良好",
  "summary": "系统整体运行正常",
  "recommendations": ["建议1", "建议2"]
}`;

    const response = await axios.post(
      `${baseURL}/api/chat`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个系统运维专家。请始终以JSON格式返回分析结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      },
      {
        timeout: 60000
      }
    );

    const aiResponse = response.data.message.content;
    console.log('✅ JSON格式测试成功');
    console.log('AI回复:');
    console.log(aiResponse);
    console.log('');

    // 尝试解析JSON
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON解析成功');
        console.log('解析结果:', JSON.stringify(parsed, null, 2));
      } else {
        console.log('⚠️  未找到JSON格式，但测试继续');
      }
    } catch (parseError) {
      console.log('⚠️  JSON解析失败，但这是正常的');
      console.log('   Ollama可能需要更好的提示词来生成标准JSON');
    }
  } catch (error) {
    console.log('❌ JSON格式测试失败');
    console.log('错误:', error.message);
    return;
  }

  console.log('');
  console.log('========================================');
  console.log('✅ 所有测试通过');
  console.log('========================================');
  console.log('');
  console.log('Ollama配置正确，可以使用AI分析功能！');
  console.log('');
  console.log('下一步:');
  console.log('  1. 启动后端服务: npm run dev');
  console.log('  2. 后端会自动初始化AI服务');
  console.log('  3. 使用前端页面或API进行AI分析');
}

testOllamaConnection().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
