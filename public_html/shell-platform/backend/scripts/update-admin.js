#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function updateAdminAccount() {
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

    // Hash the new password
    const newPassword = await bcrypt.hash('(130Bpm)', 10);
    console.log('Password hashed');

    // Update admin user in database
    await client.query(`
      UPDATE users 
      SET email = 'kevin.althaus@gmail.com',
          password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE username = 'admin'
    `, [newPassword]);
    
    console.log('✅ Admin account updated in database');
    console.log('\nNew credentials:');
    console.log('Email: kevin.althaus@gmail.com');
    console.log('Password: (130Bpm)');

  } catch (error) {
    console.error('Error updating admin account:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateAdminAccount();