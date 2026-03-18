export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          role: 'user' | 'admin'
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          role?: 'user' | 'admin'
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'user' | 'admin'
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      chili_products: {
        Row: {
          id: string
          name: string
          code: string
          description: string
          image_url: string | null
          category: string
          grade: 'premium' | 'standard' | 'economy'
          unit: string
          current_price: number
          price_change_24h: number
          price_change_percent_24h: number
          high_price_24h: number
          low_price_24h: number
          total_volume: number
          traded_volume_24h: number
          min_order_quantity: number
          is_active: boolean
          location: string | null
          age_days: number
          harvest_status: 'planted' | 'growing' | 'ready' | 'harvested'
          harvest_quantity: number
          selling_price_per_kg: number
          selling_price_change_percent: number
          area_size: number
          plant_population: number
          cost_per_plant: number
          cost_per_area: number
          harvest_kg: number
          total_revenue: number
          revenue_vs_cost_percent: number
          harvest_count: number
          available_units: number
          seller_type: string
          seller_id: string | null
          parent_product_id: string | null
          is_user_listing: boolean
          total_units: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description: string
          image_url?: string | null
          category: string
          grade: 'premium' | 'standard' | 'economy'
          unit?: string
          current_price: number
          price_change_24h?: number
          price_change_percent_24h?: number
          high_price_24h?: number
          low_price_24h?: number
          total_volume?: number
          traded_volume_24h?: number
          min_order_quantity?: number
          is_active?: boolean
          location?: string | null
          age_days?: number
          harvest_status?: 'planted' | 'growing' | 'ready' | 'harvested'
          harvest_quantity?: number
          selling_price_per_kg?: number
          selling_price_change_percent?: number
          area_size?: number
          plant_population?: number
          cost_per_plant?: number
          cost_per_area?: number
          harvest_kg?: number
          total_revenue?: number
          revenue_vs_cost_percent?: number
          harvest_count?: number
          available_units?: number
          seller_type?: string
          seller_id?: string | null
          parent_product_id?: string | null
          is_user_listing?: boolean
          total_units?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string
          image_url?: string | null
          category?: string
          grade?: 'premium' | 'standard' | 'economy'
          unit?: string
          current_price?: number
          price_change_24h?: number
          price_change_percent_24h?: number
          high_price_24h?: number
          low_price_24h?: number
          total_volume?: number
          traded_volume_24h?: number
          min_order_quantity?: number
          is_active?: boolean
          location?: string | null
          age_days?: number
          harvest_status?: 'planted' | 'growing' | 'ready' | 'harvested'
          harvest_quantity?: number
          selling_price_per_kg?: number
          selling_price_change_percent?: number
          area_size?: number
          plant_population?: number
          cost_per_plant?: number
          cost_per_area?: number
          harvest_kg?: number
          total_revenue?: number
          revenue_vs_cost_percent?: number
          harvest_count?: number
          available_units?: number
          seller_type?: string
          seller_id?: string | null
          parent_product_id?: string | null
          is_user_listing?: boolean
          total_units?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          product_id: string
          order_type: 'buy' | 'sell'
          status: 'pending' | 'completed' | 'cancelled' | 'partial' | 'rejected'
          quantity: number
          price: number
          total_amount: number
          filled_quantity: number
          created_at: string
          updated_at: string
          completed_at: string | null
          rejection_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          order_type: 'buy' | 'sell'
          status?: 'pending' | 'completed' | 'cancelled' | 'partial' | 'rejected'
          quantity: number
          price: number
          total_amount: number
          filled_quantity?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          rejection_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          order_type?: 'buy' | 'sell'
          status?: 'pending' | 'completed' | 'cancelled' | 'partial' | 'rejected'
          quantity?: number
          price?: number
          total_amount?: number
          filled_quantity?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          rejection_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          buy_order_id: string
          sell_order_id: string
          buyer_id: string
          seller_id: string
          product_id: string
          quantity: number
          price: number
          total_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          buy_order_id: string
          sell_order_id: string
          buyer_id: string
          seller_id: string
          product_id: string
          quantity: number
          price: number
          total_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          buy_order_id?: string
          sell_order_id?: string
          buyer_id?: string
          seller_id?: string
          product_id?: string
          quantity?: number
          price?: number
          total_amount?: number
          created_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          average_buy_price: number
          total_invested: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity?: number
          average_buy_price: number
          total_invested: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          quantity?: number
          average_buy_price?: number
          total_invested?: number
          created_at?: string
          updated_at?: string
        }
      }
      market_history: {
        Row: {
          id: string
          product_id: string
          price: number
          volume: number
          timestamp: string
        }
        Insert: {
          id?: string
          product_id: string
          price: number
          volume?: number
          timestamp?: string
        }
        Update: {
          id?: string
          product_id?: string
          price?: number
          volume?: number
          timestamp?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'trade' | 'price_alert' | 'system'
          title: string
          message: string
          is_read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'trade' | 'price_alert' | 'system'
          title: string
          message: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'trade' | 'price_alert' | 'system'
          title?: string
          message?: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          product_id: string
          target_price: number
          condition: 'above' | 'below'
          is_active: boolean
          triggered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          target_price: number
          condition: 'above' | 'below'
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          target_price?: number
          condition?: 'above' | 'below'
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
        }
      }
      harvest_revenue_history: {
        Row: {
          id: string
          product_id: string
          harvest_kg: number
          harvest_revenue: number
          harvest_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          harvest_kg?: number
          harvest_revenue?: number
          harvest_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          harvest_kg?: number
          harvest_revenue?: number
          harvest_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      admin_balance_history: {
        Row: {
          id: string
          admin_id: string
          balance_change: number
          balance_after: number
          source: string
          product_id: string | null
          change_date: string
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          balance_change?: number
          balance_after?: number
          source?: string
          product_id?: string | null
          change_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          balance_change?: number
          balance_after?: number
          source?: string
          product_id?: string | null
          change_date?: string
          created_at?: string
        }
      }
      balance_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'topup' | 'withdrawal'
          amount: number
          status: 'pending' | 'approved' | 'rejected'
          payment_method: string
          account_number: string
          account_name: string
          proof_image_url: string | null
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'topup' | 'withdrawal'
          amount: number
          status?: 'pending' | 'approved' | 'rejected'
          payment_method: string
          account_number: string
          account_name: string
          proof_image_url?: string | null
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'topup' | 'withdrawal'
          amount?: number
          status?: 'pending' | 'approved' | 'rejected'
          payment_method?: string
          account_number?: string
          account_name?: string
          proof_image_url?: string | null
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      regions: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          current_price: number
          available_units: number
          image_url: string | null
          price_change_percent_24h: number
          company_count: number
          total_company_value: number
          total_volume: number
          total_revenue: number
          is_active: boolean
          created_at: string
          updated_at: string
          total_units: number
          price_per_unit: number
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          current_price: number
          available_units: number
          image_url?: string | null
          price_change_percent_24h?: number
          company_count?: number
          total_company_value?: number
          total_volume?: number
          total_revenue?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          total_units?: number
          price_per_unit?: number
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          current_price?: number
          available_units?: number
          image_url?: string | null
          price_change_percent_24h?: number
          company_count?: number
          total_company_value?: number
          total_volume?: number
          total_revenue?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          total_units?: number
          price_per_unit?: number
        }
      }
    }
  }
}
