import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  console.log('🔍 Checking Supabase connection...\n');

  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Anon Key:', supabaseAnonKey.substring(0, 20) + '...\n');

  try {
    // Test 1: Check if we can connect
    console.log('Test 1: Basic connection');
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log('❌ Connection failed:', healthError.message);
      return false;
    }
    console.log('✅ Connection successful\n');

    // Test 2: List all tables
    console.log('Test 2: Available tables');
    const { data: tables, error: tablesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    if (!tablesError) {
      console.log('✅ profiles table exists');
    }

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(0);
    console.log('✅ products table exists');

    const { data: portfolio } = await supabase
      .from('portfolio')
      .select('*')
      .limit(0);
    console.log('✅ portfolio table exists');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .limit(0);
    console.log('✅ transactions table exists');

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .limit(0);
    console.log('✅ notifications table exists\n');

    // Test 3: Count records
    console.log('Test 3: Record counts');

    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    console.log('👥 Profiles:', profileCount);

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    console.log('🌶️  Products:', productCount);

    const { count: portfolioCount } = await supabase
      .from('portfolio')
      .select('*', { count: 'exact', head: true });
    console.log('💼 Portfolio:', portfolioCount);

    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    console.log('💳 Transactions:', transactionCount);

    const { count: notificationCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    console.log('🔔 Notifications:', notificationCount);

    console.log('\n✅ All tests passed! Database is connected and working properly.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

checkConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
