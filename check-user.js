import database from './src/config/database.js';

async function checkUser() {
  try {
    const email = 'admin@test.com';
    console.log(`🔍 Checking user: ${email}\n`);
    
    const result = await database.query(
      'SELECT user_id, name, email, password, role FROM people WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database!');
      console.log('\nLet me check all users with emails:');
      
      const allUsers = await database.query(
        'SELECT user_id, name, email, role FROM people WHERE email IS NOT NULL'
      );
      
      console.log('\n📋 Users with email addresses:');
      allUsers.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - Role: ${user.role}`);
      });
    } else {
      const user = result.rows[0];
      console.log('✅ User found!');
      console.log('   User ID:', user.user_id);
      console.log('   Name:', user.name);
      console.log('   Email:', user.email);
      console.log('   Password:', user.password);
      console.log('   Role:', user.role);
      
      // Test password match
      const testPassword = 'admin123';
      console.log('\n🔐 Password check:');
      console.log('   Expected:', testPassword);
      console.log('   In DB:', user.password);
      console.log('   Match:', testPassword === user.password ? '✅ YES' : '❌ NO');
      
      if (testPassword !== user.password) {
        console.log('\n⚠️  Password mismatch! The password in database is different.');
        console.log('   Try updating it with:');
        console.log(`   UPDATE people SET password = 'admin123' WHERE email = 'admin@test.com';`);
      }
    }
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await database.close();
    process.exit(1);
  }
}

checkUser();
