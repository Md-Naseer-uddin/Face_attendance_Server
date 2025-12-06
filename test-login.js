const API_URL = 'http://localhost:3001';

async function testLogin() {
  console.log('🧪 Testing Login Functionality\n');
  
  const testUsers = [
    { email: 'admin@test.com', password: 'admin123', role: 'admin' },
    { email: 'user@test.com', password: 'user123', role: 'user' },
  ];
  
  for (const testUser of testUsers) {
    console.log(`\n📝 Testing login for: ${testUser.email}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });
      
      const data = await response.json();
      
      console.log('✅ Status:', response.status);
      console.log('✅ Success:', data.success);
      console.log('✅ Token received:', data.token ? 'Yes' : 'No');
      
      if (data.success && data.user) {
        console.log('✅ User data:');
        console.log('   - Name:', data.user.name);
        console.log('   - Email:', data.user.email);
        console.log('   - Role:', data.user.role);
        console.log('   - User ID:', data.user.userId);
        
        // Verify token
        console.log('\n🔐 Verifying token...');
        const verifyResponse = await fetch(`${API_URL}/api/verify`, {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });
        
        const verifyData = await verifyResponse.json();
        console.log('✅ Token verification:', verifyData.success ? 'Valid' : 'Invalid');
      } else {
        console.error('❌ Login failed:', data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }
  }
  
  // Test invalid credentials
  console.log('\n\n📝 Testing invalid credentials');
  console.log('─'.repeat(50));
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@test.com',
        password: 'wrongpassword',
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected invalid credentials');
      console.log('   Error message:', data.error);
    } else {
      console.log('❌ Should have returned 401 but got:', response.status);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
  
  console.log('\n\n✅ All tests completed!\n');
}

testLogin().catch(console.error);
