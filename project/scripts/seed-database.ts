/**
 * Database Seeding Script
 *
 * Script ini akan membuat sample data untuk testing:
 * - 3 user accounts (2 reguler, 1 admin)
 * - Orders untuk setiap user
 * - Portfolios
 * - Notifications
 * - Price alerts
 *
 * Cara menjalankan:
 * npx tsx scripts/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwmedqwzxtrmdgmzgzoo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bWVkcXd6eHRybWRnbXpnem9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODIzNDYsImV4cCI6MjA3NjQ1ODM0Nn0.JMWlwHqwwYtUNXz-OWE90pxVhlX-8n0Co9jx0t5YGvs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  current_price: number;
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Step 1: Get existing products
    console.log('📦 Fetching products...');
    const { data: products, error: productsError } = await supabase
      .from('chili_products')
      .select('id, code, name, current_price')
      .eq('is_active', true)
      .limit(8);

    if (productsError) throw productsError;
    console.log(`✅ Found ${products.length} products\n`);

    // Step 2: Create sample users
    console.log('👥 Creating sample users...');
    const users: User[] = [];

    const sampleUsers = [
      { email: 'john.doe@example.com', password: 'password123', full_name: 'John Doe' },
      { email: 'jane.smith@example.com', password: 'password123', full_name: 'Jane Smith' },
      { email: 'admin@example.com', password: 'admin123', full_name: 'Admin User' }
    ];

    for (const user of sampleUsers) {
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
      console.log('\n⚠️  No new users created. Fetching existing users...');
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(3);

      if (existingProfiles && existingProfiles.length > 0) {
        console.log(`✅ Found ${existingProfiles.length} existing users\n`);

        // Use existing users for creating orders
        for (let i = 0; i < existingProfiles.length; i++) {
          users.push({
            id: existingProfiles[i].id,
            email: sampleUsers[i]?.email || `user${i}@example.com`,
            full_name: existingProfiles[i].full_name
          });
        }
      } else {
        console.log('❌ No users available to seed data\n');
        return;
      }
    } else {
      console.log(`✅ Created ${users.length} new users\n`);
    }

    // Give profiles a moment to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Update admin role for third user
    if (users.length >= 3) {
      console.log('👑 Setting admin role...');
      const { error: adminError } = await supabase
        .from('profiles')
        .update({ role: 'admin', balance: 5000000 })
        .eq('id', users[2].id);

      if (adminError) {
        console.log(`   ⚠️  Could not set admin role: ${adminError.message}`);
      } else {
        console.log(`   ✅ Admin role set for ${users[2].email}\n`);
      }
    }

    // Step 4: Create orders for each user
    console.log('📋 Creating orders...');
    const ordersCreated: any[] = [];

    // User 1: Buy orders
    if (users[0] && products[0]) {
      console.log(`   Creating buy order for ${users[0].full_name}...`);
      const { data: order1, error: order1Error } = await supabase
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

      if (order1Error) {
        console.log(`   ⚠️  Error: ${order1Error.message}`);
      } else {
        ordersCreated.push(order1);
        console.log(`   ✅ Created buy order: 100 kg ${products[0].code}`);
      }
    }

    // User 1: Another buy order (pending)
    if (users[0] && products[1]) {
      const { data: order2, error: order2Error } = await supabase
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

      if (!order2Error) {
        ordersCreated.push(order2);
        console.log(`   ✅ Created buy order: 50 kg ${products[1].code} (pending)`);
      }
    }

    // User 2: Sell orders
    if (users[1] && products[2]) {
      console.log(`   Creating sell order for ${users[1].full_name}...`);
      const { data: order3, error: order3Error } = await supabase
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

      if (!order3Error) {
        ordersCreated.push(order3);
        console.log(`   ✅ Created sell order: 75 kg ${products[2].code}`);
      }
    }

    // User 2: Another sell order (pending)
    if (users[1] && products[3]) {
      const { data: order4, error: order4Error } = await supabase
        .from('orders')
        .insert({
          user_id: users[1].id,
          product_id: products[3].id,
          type: 'sell',
          status: 'pending',
          quantity: 30,
          price: products[3].current_price * 1.03,
          total_amount: 30 * products[3].current_price * 1.03,
          filled_quantity: 0
        })
        .select()
        .single();

      if (!order4Error) {
        ordersCreated.push(order4);
        console.log(`   ✅ Created sell order: 30 kg ${products[3].code} (pending)`);
      }
    }

    console.log(`✅ Created ${ordersCreated.length} orders\n`);

    // Step 5: Create portfolios for completed orders
    console.log('💼 Creating portfolios...');
    let portfoliosCreated = 0;

    for (const order of ordersCreated) {
      if (order.status === 'completed') {
        const product = products.find(p => p.id === order.product_id);

        if (order.type === 'buy') {
          const { error: portfolioError } = await supabase
            .from('portfolios')
            .insert({
              user_id: order.user_id,
              product_id: order.product_id,
              quantity: order.quantity,
              average_buy_price: order.price,
              total_invested: order.total_amount
            });

          if (!portfolioError) {
            portfoliosCreated++;
            console.log(`   ✅ Portfolio entry: ${order.quantity} kg ${product?.code}`);
          }
        }
      }
    }

    console.log(`✅ Created ${portfoliosCreated} portfolio entries\n`);

    // Step 6: Create notifications
    console.log('🔔 Creating notifications...');
    let notificationsCreated = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // Welcome notification
      const { error: notif1Error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'system',
          title: 'Welcome to AgriTrade',
          message: `Welcome ${user.full_name}! Your account has been created with a starting balance of Rp 1,000,000`,
          is_read: false,
          metadata: { balance: 1000000 }
        });

      if (!notif1Error) notificationsCreated++;

      // Trade notification for users with orders
      if (ordersCreated.some(o => o.user_id === user.id)) {
        const userOrder = ordersCreated.find(o => o.user_id === user.id);
        const product = products.find(p => p.id === userOrder?.product_id);

        const { error: notif2Error } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'trade',
            title: `Order ${userOrder?.status === 'completed' ? 'Completed' : 'Placed'}`,
            message: `Your ${userOrder?.type} order for ${userOrder?.quantity} kg of ${product?.name} has been ${userOrder?.status}`,
            is_read: false,
            metadata: {
              order_id: userOrder?.id,
              product_code: product?.code
            }
          });

        if (!notif2Error) notificationsCreated++;
      }

      // Price alert notification
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const { error: notif3Error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'price_alert',
          title: 'Price Movement Alert',
          message: `${randomProduct.name} price is now at Rp ${randomProduct.current_price.toLocaleString()}/kg`,
          is_read: false,
          metadata: {
            product_code: randomProduct.code,
            current_price: randomProduct.current_price
          }
        });

      if (!notif3Error) notificationsCreated++;
    }

    console.log(`✅ Created ${notificationsCreated} notifications\n`);

    // Step 7: Create price alerts
    console.log('⏰ Creating price alerts...');
    let alertsCreated = 0;

    for (let i = 0; i < users.length && i < 2; i++) {
      const user = users[i];
      const product = products[i];

      if (product) {
        // Alert when price goes above
        const { error: alert1Error } = await supabase
          .from('price_alerts')
          .insert({
            user_id: user.id,
            product_id: product.id,
            target_price: product.current_price * 1.1,
            condition: 'above',
            is_active: true
          });

        if (!alert1Error) {
          alertsCreated++;
          console.log(`   ✅ Alert: ${product.code} above Rp ${(product.current_price * 1.1).toLocaleString()}`);
        }

        // Alert when price goes below
        const { error: alert2Error } = await supabase
          .from('price_alerts')
          .insert({
            user_id: user.id,
            product_id: product.id,
            target_price: product.current_price * 0.9,
            condition: 'below',
            is_active: true
          });

        if (!alert2Error) {
          alertsCreated++;
          console.log(`   ✅ Alert: ${product.code} below Rp ${(product.current_price * 0.9).toLocaleString()}`);
        }
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

    console.log('👤 Test Accounts Created:');
    sampleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      Password: ${user.password}`);
      console.log(`      Role: ${index === 2 ? 'Admin' : 'User'}\n`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase().then(() => {
  console.log('✅ Script completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
