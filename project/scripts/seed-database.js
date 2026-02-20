/**
 * Database Seeding Script (JavaScript Version)
 *
 * Script ini akan membuat sample data untuk testing.
 *
 * Cara menjalankan:
 * node scripts/seed-database.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwmedqwzxtrmdgmzgzoo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bWVkcXd6eHRybWRnbXpnem9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODIzNDYsImV4cCI6MjA3NjQ1ODM0Nn0.JMWlwHqwwYtUNXz-OWE90pxVhlX-8n0Co9jx0t5YGvs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Step 0: Create first admin user to use for seeding
    console.log('🔐 Creating admin account for seeding...');
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';

    let adminUserId = null;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: 'Admin User'
        }
      }
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError;
    }

    // Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (signInError) {
      console.log('⚠️  Could not sign in, trying to continue without auth...');
    } else {
      adminUserId = signInData.user.id;
      console.log('✅ Signed in as admin\n');

      // Wait for profile creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Set admin role
      await supabase
        .from('profiles')
        .update({ role: 'admin', balance: 5000000 })
        .eq('id', adminUserId);
    }

    // Step 1: Get existing products
    console.log('📦 Fetching products...');
    const { data: products, error: productsError } = await supabase
      .from('chili_products')
      .select('id, code, name, current_price')
      .eq('is_active', true)
      .limit(8);

    if (productsError) throw productsError;
    console.log(`✅ Found ${products.length} products\n`);

    // Step 2: Create other sample users
    console.log('👥 Creating additional users...');
    const users = [];

    // Add admin if created successfully
    if (adminUserId) {
      users.push({
        id: adminUserId,
        email: adminEmail,
        full_name: 'Admin User'
      });
    }

    const otherUsers = [
      { email: 'john.doe@example.com', password: 'password123', full_name: 'John Doe' },
      { email: 'jane.smith@example.com', password: 'password123', full_name: 'Jane Smith' }
    ];

    for (const user of otherUsers) {
      console.log(`   Creating user: ${user.email}`);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.full_name
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User ${user.email} already exists, skipping...`);
          continue;
        }
        throw authError;
      }

      if (authData.user) {
        users.push({
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name
        });
        console.log(`   ✅ Created: ${user.email}`);
      }
    }

    if (users.length === 0) {
      console.log('\n⚠️  No users created. Fetching existing users...');
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(3);

      if (existingProfiles && existingProfiles.length > 0) {
        console.log(`✅ Found ${existingProfiles.length} existing users\n`);

        for (let i = 0; i < existingProfiles.length; i++) {
          users.push({
            id: existingProfiles[i].id,
            email: `user${i}@example.com`,
            full_name: existingProfiles[i].full_name
          });
        }
      } else {
        console.log('❌ No users available to seed data\n');
        return;
      }
    } else {
      console.log(`✅ Total users ready: ${users.length}\n`);
    }

    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Create orders
    console.log('📋 Creating orders...');
    const ordersCreated = [];

    if (users[0] && products[0]) {
      const { data: order1 } = await supabase
        .from('orders')
        .insert({
          user_id: users[0].id,
          product_id: products[0].id,
          type: 'buy',
          status: 'completed',
          quantity: 100,
          price: products[0].current_price,
          total_amount: 100 * products[0].current_price,
          filled_quantity: 100
        })
        .select()
        .single();

      if (order1) {
        ordersCreated.push(order1);
        console.log(`   ✅ Buy order: 100 kg ${products[0].code}`);
      }
    }

    if (users[0] && products[1]) {
      const { data: order2 } = await supabase
        .from('orders')
        .insert({
          user_id: users[0].id,
          product_id: products[1].id,
          type: 'buy',
          status: 'pending',
          quantity: 50,
          price: products[1].current_price,
          total_amount: 50 * products[1].current_price,
          filled_quantity: 0
        })
        .select()
        .single();

      if (order2) {
        ordersCreated.push(order2);
        console.log(`   ✅ Buy order: 50 kg ${products[1].code} (pending)`);
      }
    }

    if (users[1] && products[2]) {
      const { data: order3 } = await supabase
        .from('orders')
        .insert({
          user_id: users[1].id,
          product_id: products[2].id,
          type: 'sell',
          status: 'completed',
          quantity: 75,
          price: products[2].current_price * 1.02,
          total_amount: 75 * products[2].current_price * 1.02,
          filled_quantity: 75
        })
        .select()
        .single();

      if (order3) {
        ordersCreated.push(order3);
        console.log(`   ✅ Sell order: 75 kg ${products[2].code}`);
      }
    }

    console.log(`✅ Created ${ordersCreated.length} orders\n`);

    // Step 5: Create portfolios
    console.log('💼 Creating portfolios...');
    let portfoliosCreated = 0;

    for (const order of ordersCreated) {
      if (order.status === 'completed' && order.type === 'buy') {
        const product = products.find(p => p.id === order.product_id);

        const { error } = await supabase
          .from('portfolios')
          .insert({
            user_id: order.user_id,
            product_id: order.product_id,
            quantity: order.quantity,
            average_buy_price: order.price,
            total_invested: order.total_amount
          });

        if (!error) {
          portfoliosCreated++;
          console.log(`   ✅ Portfolio: ${order.quantity} kg ${product?.code}`);
        }
      }
    }

    console.log(`✅ Created ${portfoliosCreated} portfolios\n`);

    // Step 6: Create notifications
    console.log('🔔 Creating notifications...');
    let notificationsCreated = 0;

    for (const user of users) {
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'system',
          title: 'Welcome to AgriTrade',
          message: `Welcome ${user.full_name}! Start trading agricultural products now.`,
          is_read: false,
          metadata: { balance: 1000000 }
        });

      notificationsCreated++;
    }

    console.log(`✅ Created ${notificationsCreated} notifications\n`);

    // Step 7: Create price alerts
    console.log('⏰ Creating price alerts...');
    let alertsCreated = 0;

    for (let i = 0; i < Math.min(users.length, 2); i++) {
      const user = users[i];
      const product = products[i];

      if (product) {
        await supabase
          .from('price_alerts')
          .insert({
            user_id: user.id,
            product_id: product.id,
            target_price: product.current_price * 1.1,
            condition: 'above',
            is_active: true
          });

        alertsCreated++;
        console.log(`   ✅ Alert: ${product.code} above Rp ${(product.current_price * 1.1).toLocaleString()}`);
      }
    }

    console.log(`✅ Created ${alertsCreated} price alerts\n`);

    // Summary
    console.log('🎉 Database seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`   Products: ${products.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Orders: ${ordersCreated.length}`);
    console.log(`   Portfolios: ${portfoliosCreated}`);
    console.log(`   Notifications: ${notificationsCreated}`);
    console.log(`   Price Alerts: ${alertsCreated}\n`);

    console.log('👤 Test Accounts:');
    console.log(`   admin@example.com / admin123 (Admin)`);
    console.log(`   john.doe@example.com / password123 (User)`);
    console.log(`   jane.smith@example.com / password123 (User)`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedDatabase()
  .then(() => {
    console.log('✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
