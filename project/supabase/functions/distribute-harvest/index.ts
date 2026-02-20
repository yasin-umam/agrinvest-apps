import { createClient } from 'npm:@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface HarvestInput {
  product_id: string;
  harvest_kg: number;
  harvest_revenue: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admin can distribute harvest' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: HarvestInput = await req.json();
    const { product_id, harvest_kg, harvest_revenue } = body;

    if (!product_id || !harvest_kg || !harvest_revenue) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: product_id, harvest_kg, harvest_revenue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get product details (total_units)
    const { data: product, error: productError } = await supabase
      .from('chili_products')
      .select('id, name, total_units, available_units')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get all unit owners
    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select('user_id, quantity')
      .eq('product_id', product_id);

    if (portfolioError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch portfolios' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Calculate dividend per unit
    const revenuePerUnit = harvest_revenue / product.total_units;
    const totalUnitsSold = portfolios?.reduce((sum, p) => sum + Number(p.quantity), 0) || 0;
    const adminUnits = product.total_units - totalUnitsSold;

    // Step 4: Insert harvest record (trigger will auto-distribute)
    const { data: harvestRecord, error: harvestError } = await supabase
      .from('harvest_revenue_history')
      .insert({
        product_id,
        harvest_kg,
        harvest_revenue,
        harvest_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (harvestError || !harvestRecord) {
      return new Response(
        JSON.stringify({ error: 'Failed to record harvest', details: harvestError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Get distribution records (created by trigger)
    const { data: distributions } = await supabase
      .from('user_harvest_distributions')
      .select('user_id, units_owned, user_revenue, ownership_percentage')
      .eq('harvest_id', harvestRecord.id);

    // Step 6: Send notifications to all unit owners
    const notifications = [];
    for (const dist of distributions || []) {
      notifications.push({
        user_id: dist.user_id,
        type: 'system',
        title: 'Dividen Panen Diterima',
        message: `Anda menerima dividen sebesar Rp ${dist.user_revenue.toLocaleString('id-ID')} dari panen ${product.name}. Unit yang dimiliki: ${dist.units_owned} (${dist.ownership_percentage.toFixed(2)}%)`,
        metadata: {
          type: 'harvest_dividend',
          product_id,
          product_name: product.name,
          harvest_id: harvestRecord.id,
          units_owned: dist.units_owned,
          dividend_amount: dist.user_revenue,
          ownership_percentage: dist.ownership_percentage,
        },
      });
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Prepare response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Harvest dividend distributed successfully',
        data: {
          harvest_id: harvestRecord.id,
          product_name: product.name,
          harvest_kg,
          total_revenue: harvest_revenue,
          revenue_per_unit: revenuePerUnit,
          total_units: product.total_units,
          units_sold: totalUnitsSold,
          admin_units: adminUnits,
          investors_count: portfolios?.length || 0,
          distributions: distributions?.map(d => ({
            user_id: d.user_id,
            units: d.units_owned,
            dividend: d.user_revenue,
            ownership: `${d.ownership_percentage.toFixed(2)}%`,
          })),
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});