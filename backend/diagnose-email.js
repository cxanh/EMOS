require('dotenv').config();
const nodemailer = require('nodemailer');

async function diagnose() {
  console.log('========================================');
  console.log('邮件服务诊断工具');
  console.log('========================================\n');

  // 检查配置
  console.log('1. 检查配置...');
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  };

  console.log('   SMTP_HOST:', config.host || '❌ 未配置');
  console.log('   SMTP_PORT:', config.port);
  console.log('   SMTP_SECURE:', config.secure);
  console.log('   SMTP_USER:', config.user || '❌ 未配置');
  console.log('   SMTP_PASS:', config.pass ? '✅ 已配置' : '❌ 未配置');
  console.log('');

  if (!config.host || !config.user || !config.pass) {
    console.log('❌ 配置不完整，请检查.env文件');
    return;
  }

  // 测试不同的配置
  const testConfigs = [
    {
      name: 'Gmail TLS (端口587)',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false
    },
    {
      name: 'Gmail SSL (端口465)',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true
    }
  ];

  for (const testConfig of testConfigs) {
    console.log(`\n2. 测试配置: ${testConfig.name}`);
    console.log('   正在连接...');

    try {
      const transporter = nodemailer.createTransport({
        host: testConfig.host,
        port: testConfig.port,
        secure: testConfig.secure,
        auth: {
          user: config.user,
          pass: config.pass
        },
        connectionTimeout: 10000, // 10秒超时
        greetingTimeout: 10000
      });

      await transporter.verify();
      console.log('   ✅ 连接成功！');
      
      // 尝试发送测试邮件
      console.log('   正在发送测试邮件...');
      const info = await transporter.sendMail({
        from: `"EOMS测试" <${config.user}>`,
        to: process.env.ALERT_EMAIL || config.user,
        subject: '测试邮件 - EOMS监控系统',
        text: '这是一封测试邮件，如果你收到了这封邮件，说明邮件服务配置成功！',
        html: '<p>这是一封测试邮件，如果你收到了这封邮件，说明邮件服务配置成功！</p>'
      });
      
      console.log('   ✅ 邮件发送成功！');
      console.log('   Message ID:', info.messageId);
      console.log('');
      console.log('========================================');
      console.log('✅ 诊断完成 - 邮件服务正常');
      console.log('========================================');
      console.log('');
      console.log('建议配置:');
      console.log(`  SMTP_HOST=${testConfig.host}`);
      console.log(`  SMTP_PORT=${testConfig.port}`);
      console.log(`  SMTP_SECURE=${testConfig.secure}`);
      return;
      
    } catch (error) {
      console.log('   ❌ 失败:', error.message);
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        console.log('   原因: 连接超时');
        console.log('   可能的解决方案:');
        console.log('     1. 检查网络连接');
        console.log('     2. 检查防火墙设置');
        console.log('     3. 尝试使用VPN');
        console.log('     4. 尝试其他邮箱服务（QQ、163等）');
      } else if (error.code === 'EAUTH') {
        console.log('   原因: 认证失败');
        console.log('   可能的解决方案:');
        console.log('     1. 确认使用的是应用专用密码，不是邮箱密码');
        console.log('     2. 检查Gmail是否启用了两步验证');
        console.log('     3. 重新生成应用专用密码');
      }
    }
  }

  console.log('');
  console.log('========================================');
  console.log('❌ 所有配置测试失败');
  console.log('========================================');
  console.log('');
  console.log('建议:');
  console.log('  1. 如果在中国大陆，Gmail可能被防火墙阻止');
  console.log('  2. 建议使用国内邮箱服务（QQ、163等）');
  console.log('  3. 或者暂时只使用钉钉通知');
  console.log('');
  console.log('QQ邮箱配置示例:');
  console.log('  SMTP_HOST=smtp.qq.com');
  console.log('  SMTP_PORT=587');
  console.log('  SMTP_SECURE=false');
  console.log('  SMTP_USER=your-qq-email@qq.com');
  console.log('  SMTP_PASS=your-authorization-code');
  console.log('');
  console.log('163邮箱配置示例:');
  console.log('  SMTP_HOST=smtp.163.com');
  console.log('  SMTP_PORT=465');
  console.log('  SMTP_SECURE=true');
  console.log('  SMTP_USER=your-email@163.com');
  console.log('  SMTP_PASS=your-authorization-password');
}

diagnose().catch(error => {
  console.error('诊断过程中发生错误:', error);
  process.exit(1);
});
