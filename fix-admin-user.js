import database from './src/config/database.js';

async function fixAdminUser() {
  try {
    console.log('🔧 Fixing admin test user...\n');
    
    // Check if admin001 exists
    const checkAdmin = await database.query(
      'SELECT user_id, email FROM people WHERE user_id = $1',
      ['admin001']
    );
    
    if (checkAdmin.rows.length > 0) {
      console.log('⚠️  user_id "admin001" already exists:');
      console.log('   Email:', checkAdmin.rows[0].email);
      console.log('\n💡 Using different user_id for test admin: "admin_test"');
    }
    
    // Delete old test admin if exists
    await database.query('DELETE FROM people WHERE user_id = $1', ['admin_test']);
    
    // Dummy embedding (128 dimensions of zeros)
    const dummyEmbedding = '[' + Array(128).fill(0).join(',') + ']';
    
    // Insert new admin user with different user_id
    await database.query(`
      INSERT INTO people (user_id, name, email, password, role, embedding)
      VALUES ($1, $2, $3, $4, $5, $6::vector)
    `, [
      'admin_test',
      'Test Admin',
      'admin@test.com',
      'admin123',
      'admin',
      dummyEmbedding
    ]);
    
    console.log('✅ Admin test user created successfully!');
    console.log('   User ID: admin_test');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    
    // Verify it was created
    const verify = await database.query(
      'SELECT user_id, name, email, role FROM people WHERE email = $1',
      ['admin@test.com']
    );
    
    if (verify.rows.length > 0) {
      console.log('\n✅ Verification successful!');
      console.log('   User found in database');
    } else {
      console.log('\n❌ Verification failed - user not found');
    }
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await database.close();
    process.exit(1);
  }
}

fixAdminUser();
