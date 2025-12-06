import database from './src/config/database.js';

async function addTestUsers() {
  try {
    console.log('👥 Adding test users...\n');
    
    // Dummy embedding (128 dimensions of zeros)
    const dummyEmbedding = '[' + Array(128).fill(0).join(',') + ']';
    
    // Add Admin User
    try {
      await database.query(`
        INSERT INTO people (user_id, name, email, password, role, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        ON CONFLICT (user_id) DO NOTHING
      `, [
        'admin001',
        'Admin User',
        'admin@test.com',
        'admin123',
        'admin',
        dummyEmbedding
      ]);
      console.log('✅ Admin user added:');
      console.log('   Email: admin@test.com');
      console.log('   Password: admin123');
      console.log('   Role: admin\n');
    } catch (err) {
      if (err.code === '23505') {
        console.log('ℹ️  Admin user already exists\n');
      } else {
        throw err;
      }
    }
    
    // Add Normal User
    try {
      await database.query(`
        INSERT INTO people (user_id, name, email, password, role, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        ON CONFLICT (user_id) DO NOTHING
      `, [
        'user001',
        'John Doe',
        'user@test.com',
        'user123',
        'user',
        dummyEmbedding
      ]);
      console.log('✅ Normal user added:');
      console.log('   Email: user@test.com');
      console.log('   Password: user123');
      console.log('   Role: user\n');
    } catch (err) {
      if (err.code === '23505') {
        console.log('ℹ️  Normal user already exists\n');
      } else {
        throw err;
      }
    }
    
    // List all users
    const result = await database.query(`
      SELECT user_id, name, email, role, created_at 
      FROM people 
      ORDER BY created_at DESC
    `);
    
    console.log('📋 All users in database:');
    console.log('─────────────────────────────────────────────────────────');
    result.rows.forEach(user => {
      console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.name}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.created_at.toLocaleString()}`);
      console.log('');
    });
    
    console.log('\n✅ Test users ready! You can now login with:');
    console.log('   Admin: admin@test.com / admin123');
    console.log('   User:  user@test.com / user123');
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await database.close();
    process.exit(1);
  }
}

addTestUsers();
