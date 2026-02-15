// Test alert rule creation
const axios = require('axios');

const BASE_URL = 'http://localhost:50001/api';

async function testAlertCreation() {
  console.log('=== Testing Alert Rule Creation ===\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✓ Login successful');
    console.log('Token:', token.substring(0, 20) + '...\n');

    // Step 2: Get existing rules
    console.log('2. Fetching existing rules...');
    const rulesResponse = await axios.get(`${BASE_URL}/alert/rules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ Current rules count:', rulesResponse.data.data.rules.length);
    console.log('Rules:', JSON.stringify(rulesResponse.data.data.rules, null, 2));
    console.log();

    // Step 3: Create a new rule
    console.log('3. Creating new alert rule...');
    const newRule = {
      name: 'Test Rule ' + Date.now(),
      nodeId: '*',
      metric: 'cpu_usage',
      operator: 'gt',
      threshold: 80,
      duration: 60,
      notifyChannels: ['websocket']
    };
    
    console.log('Rule data:', JSON.stringify(newRule, null, 2));
    
    const createResponse = await axios.post(`${BASE_URL}/alert/rules`, newRule, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ Rule created successfully!');
    console.log('Created rule:', JSON.stringify(createResponse.data.data, null, 2));
    console.log();

    // Step 4: Verify the rule was created
    console.log('4. Verifying rule creation...');
    const verifyResponse = await axios.get(`${BASE_URL}/alert/rules`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const newRuleCount = verifyResponse.data.data.rules.length;
    console.log('✓ New rules count:', newRuleCount);
    
    const createdRule = verifyResponse.data.data.rules.find(r => r.id === createResponse.data.data.id);
    if (createdRule) {
      console.log('✓ Rule found in list!');
      console.log('Rule details:', JSON.stringify(createdRule, null, 2));
    } else {
      console.log('✗ Rule NOT found in list!');
    }
    
    console.log('\n=== Test Completed Successfully ===');
    
  } catch (error) {
    console.error('\n✗ Test Failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testAlertCreation();
