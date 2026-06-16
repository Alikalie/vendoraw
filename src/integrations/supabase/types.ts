export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency: string
          rate: number
          updated_at: string
        }
        Insert: {
          currency: string
          rate: number
          updated_at?: string
        }
        Update: {
          currency?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          created_at: string
          daily_earning: number
          duration_days: number
          earnings_accrued: number
          earnings_paid_count: number
          end_date: string
          id: string
          last_earning_at: string | null
          product_id: string
          purchase_price: number
          start_date: string
          status: string
          total_return: number
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_earning: number
          duration_days: number
          earnings_accrued?: number
          earnings_paid_count?: number
          end_date: string
          id?: string
          last_earning_at?: string | null
          product_id: string
          purchase_price: number
          start_date?: string
          status?: string
          total_return: number
          user_id: string
        }
        Update: {
          created_at?: string
          daily_earning?: number
          duration_days?: number
          earnings_accrued?: number
          earnings_paid_count?: number
          end_date?: string
          id?: string
          last_earning_at?: string | null
          product_id?: string
          purchase_price?: number
          start_date?: string
          status?: string
          total_return?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          pinned: boolean
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          pinned?: boolean
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          pinned?: boolean
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          details: Json
          id: string
          instructions: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          instructions?: string
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          instructions?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          daily_earning: number
          description: string | null
          duration_days: number
          earning_frequency: string
          id: string
          image_url: string | null
          name: string
          price: number
          risk_level: string
          total_return: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_earning: number
          description?: string | null
          duration_days: number
          earning_frequency?: string
          id?: string
          image_url?: string | null
          name: string
          price: number
          risk_level?: string
          total_return: number
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_earning?: number
          description?: string | null
          duration_days?: number
          earning_frequency?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          risk_level?: string
          total_return?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          contact: string | null
          country: string
          country_code: string
          created_at: string
          currency: string
          currency_locked_until: string
          email: string | null
          first_name: string
          id: string
          is_blocked: boolean
          last_name: string
          profile_locked: boolean
          referral_code: string | null
          referred_by: string | null
          theme: string
          total_earned: number
          total_invested: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          balance?: number
          contact?: string | null
          country: string
          country_code: string
          created_at?: string
          currency?: string
          currency_locked_until?: string
          email?: string | null
          first_name: string
          id: string
          is_blocked?: boolean
          last_name: string
          profile_locked?: boolean
          referral_code?: string | null
          referred_by?: string | null
          theme?: string
          total_earned?: number
          total_invested?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          contact?: string | null
          country?: string
          country_code?: string
          created_at?: string
          currency?: string
          currency_locked_until?: string
          email?: string | null
          first_name?: string
          id?: string
          is_blocked?: boolean
          last_name?: string
          profile_locked?: boolean
          referral_code?: string | null
          referred_by?: string | null
          theme?: string
          total_earned?: number
          total_invested?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_applications: {
        Row: {
          account_id: string
          created_at: string
          desired_code: string
          email: string
          full_name: string
          id: string
          payout_account: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          desired_code: string
          email: string
          full_name: string
          id?: string
          payout_account: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          desired_code?: string
          email?: string
          full_name?: string
          id?: string
          payout_account?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      resale_listings: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          investment_id: string
          price: number
          seller_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          investment_id: string
          price: number
          seller_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          investment_id?: string
          price?: number
          seller_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "resale_listings_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          body: string
          id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          method_id: string | null
          notes: string | null
          proof_path: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          method_id?: string | null
          notes?: string | null
          proof_path?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          method_id?: string | null
          notes?: string | null
          proof_path?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_methods: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_default: boolean
          kind: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_default?: boolean
          kind: string
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_default?: boolean
          kind?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      auth_login_history: {
        Row: {
          action: string | null
          actor_email: string | null
          created_at: string | null
          id: string | null
          ip_address: string | null
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          action?: never
          actor_email?: never
          created_at?: string | null
          id?: string | null
          ip_address?: string | null
          payload?: Json | null
          user_id?: never
        }
        Update: {
          action?: never
          actor_email?: never
          created_at?: string | null
          id?: string | null
          ip_address?: string | null
          payload?: Json | null
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_referral_commission: {
        Args: { _amount: number; _note?: string; _user_id: string }
        Returns: Json
      }
      approve_referral_application: { Args: { _app_id: string }; Returns: Json }
      gen_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: undefined
      }
      process_daily_earnings: { Args: never; Returns: Json }
      reject_referral_application: {
        Args: { _app_id: string; _reason?: string }
        Returns: Json
      }
      request_affiliate_payout: {
        Args: { _amount: number; _method_id?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
