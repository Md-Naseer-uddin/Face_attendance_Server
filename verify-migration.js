import database from './src/config/database.js';

async function verifyMigration() {
  try {
    console.log('🔍 Checking database structure...\n');
    
    // Check if columns exist
    const columnsResult = await database.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'people' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ People table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check for admin user
    const adminResult = await database.query(`
      SELECT user_id, name, email, role 
      FROM people 
      WHERE role = 'admin';
    `);
    
    console.log('\n✅ Admin users found:');
    if (adminResult.rows.length === 0) {
      console.log('   ⚠️  No admin users found!');
    } else {
      adminResult.rows.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.user_id}`);
      });
    }
    
    // Check all users
    const allUsersResult = await database.query(`
      SELECT user_id, name, email, role 
      FROM people;
    `);
    
    console.log(`\n✅ Total users: ${allUsersResult.rows.length}`);
    
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyMigration();
