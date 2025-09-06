#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function createUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'shellplatform',
    password: 'shellplatform123',
    database: 'shellplatform'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);
    const demoPassword = await bcrypt.hash('demo123', 10);

    // Update existing admin user
    await client.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE username = 'admin'
    `, [adminPassword]);
    console.log('Updated admin user password');

    // Create regular user
    await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES ('user', 'user@shellplatform.local', $1, 'user', true)
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = $1
    `, [userPassword]);
    console.log('Created/Updated regular user');

    // Create demo user
    await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES ('demo', 'demo@shellplatform.local', $1, 'user', true)
      ON CONFLICT (username) DO UPDATE 
      SET password_hash = $1
    `, [demoPassword]);
    console.log('Created/Updated demo user');

    console.log('\n✅ Users created successfully!\n');
    console.log('Available login credentials:');
    console.log('----------------------------');
    console.log('Admin User:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('');
    console.log('Regular User:');
    console.log('  Username: user');
    console.log('  Password: user123');
    console.log('');
    console.log('Demo User:');
    console.log('  Username: demo');
    console.log('  Password: demo123');
    console.log('----------------------------\n');

  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createUsers();