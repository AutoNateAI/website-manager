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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      advertisements: {
        Row: {
          alt_text: string | null
          created_at: string
          end_date: string | null
          height: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_type: string | null
          link_url: string | null
          position: string
          product_id: string | null
          start_date: string | null
          target_type: string
          target_value: string | null
          title: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          end_date?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_type?: string | null
          link_url?: string | null
          position: string
          product_id?: string | null
          start_date?: string | null
          target_type?: string
          target_value?: string | null
          title: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          end_date?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_type?: string | null
          link_url?: string | null
          position?: string
          product_id?: string | null
          start_date?: string | null
          target_type?: string
          target_value?: string | null
          title?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      blog_ads: {
        Row: {
          advertisement_id: string
          blog_id: string
          created_at: string
          id: string
          position_after_heading: number
        }
        Insert: {
          advertisement_id: string
          blog_id: string
          created_at?: string
          id?: string
          position_after_heading: number
        }
        Update: {
          advertisement_id?: string
          blog_id?: string
          created_at?: string
          id?: string
          position_after_heading?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_ads_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_ads_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_images: {
        Row: {
          blog_id: string
          created_at: string
          display_order: number | null
          id: string
          image_id: string
          position: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_id: string
          position: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_id?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_images_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_images_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author: string
          category: string
          content: string
          content_images: Json | null
          created_at: string
          excerpt: string
          featured: boolean | null
          hero_image: string | null
          hero_image_alt: string | null
          id: string
          published: boolean | null
          read_time: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category: string
          content: string
          content_images?: Json | null
          created_at?: string
          excerpt: string
          featured?: boolean | null
          hero_image?: string | null
          hero_image_alt?: string | null
          id?: string
          published?: boolean | null
          read_time: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          content_images?: Json | null
          created_at?: string
          excerpt?: string
          featured?: boolean | null
          hero_image?: string | null
          hero_image_alt?: string | null
          id?: string
          published?: boolean | null
          read_time?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          institution: string | null
          message: string | null
          name: string
          research_area: string | null
          service: string | null
          timeline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          institution?: string | null
          message?: string | null
          name: string
          research_area?: string | null
          service?: string | null
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          institution?: string | null
          message?: string | null
          name?: string
          research_area?: string | null
          service?: string | null
          timeline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_inquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          inquiry_type: string | null
          message: string
          name: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          inquiry_type?: string | null
          message: string
          name: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: string | null
          message?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_popup_tracking: {
        Row: {
          browser_fingerprint: string
          created_at: string
          email: string | null
          email_captured: boolean | null
          id: string
          last_shown: string
        }
        Insert: {
          browser_fingerprint: string
          created_at?: string
          email?: string | null
          email_captured?: boolean | null
          id?: string
          last_shown?: string
        }
        Update: {
          browser_fingerprint?: string
          created_at?: string
          email?: string | null
          email_captured?: boolean | null
          id?: string
          last_shown?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          email: string
          form_type: string
          id: string
          message: string | null
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          form_type: string
          id?: string
          message?: string | null
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          form_type?: string
          id?: string
          message?: string | null
          name?: string | null
        }
        Relationships: []
      }
      generation_sessions: {
        Row: {
          batch_id: string
          completed_images: number
          created_at: string
          id: string
          status: string
          total_images: number
          updated_at: string
        }
        Insert: {
          batch_id: string
          completed_images?: number
          created_at?: string
          id?: string
          status?: string
          total_images: number
          updated_at?: string
        }
        Update: {
          batch_id?: string
          completed_images?: number
          created_at?: string
          id?: string
          status?: string
          total_images?: number
          updated_at?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          alt_text: string | null
          blog_id: string | null
          blog_section: string | null
          caption: string | null
          created_at: string
          file_size: number | null
          generation_batch_id: string | null
          height: number | null
          id: string
          mime_type: string | null
          parent_image_id: string | null
          title: string
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          blog_id?: string | null
          blog_section?: string | null
          caption?: string | null
          created_at?: string
          file_size?: number | null
          generation_batch_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          parent_image_id?: string | null
          title: string
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          blog_id?: string | null
          blog_section?: string | null
          caption?: string | null
          created_at?: string
          file_size?: number | null
          generation_batch_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          parent_image_id?: string | null
          title?: string
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_image"
            columns: ["parent_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      link_previews: {
        Row: {
          blog_id: string | null
          created_at: string
          description: string
          id: string
          image_url: string
          page_path: string
          page_type: string
          product_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          blog_id?: string | null
          created_at?: string
          description: string
          id?: string
          image_url: string
          page_path: string
          page_type?: string
          product_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          blog_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          page_path?: string
          page_type?: string
          product_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_builds: {
        Row: {
          calendly_url: string | null
          content: string | null
          created_at: string
          current_attendees: number | null
          description: string
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_published: boolean | null
          max_attendees: number | null
          replay_url: string | null
          scheduled_date: string
          short_description: string | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          calendly_url?: string | null
          content?: string | null
          created_at?: string
          current_attendees?: number | null
          description: string
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          max_attendees?: number | null
          replay_url?: string | null
          scheduled_date: string
          short_description?: string | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          calendly_url?: string | null
          content?: string | null
          created_at?: string
          current_attendees?: number | null
          description?: string
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          max_attendees?: number | null
          replay_url?: string | null
          scheduled_date?: string
          short_description?: string | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_access: {
        Row: {
          access_url: string
          created_at: string
          id: string
          is_active: boolean | null
          password: string
          purchase_id: string
          updated_at: string
          username: string
        }
        Insert: {
          access_url: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          password: string
          purchase_id: string
          updated_at?: string
          username: string
        }
        Update: {
          access_url?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          password?: string
          purchase_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_access_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          benefits: Json | null
          created_at: string
          description: string
          features: Json | null
          id: string
          is_active: boolean | null
          price: string
          slug: string
          sort_order: number | null
          tagline: string | null
          testimonials: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          created_at?: string
          description: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          price: string
          slug: string
          sort_order?: number | null
          tagline?: string | null
          testimonials?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          created_at?: string
          description?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          price?: string
          slug?: string
          sort_order?: number | null
          tagline?: string | null
          testimonials?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          email: string
          id: string
          product_id: string
          status: string | null
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          email: string
          id?: string
          product_id: string
          status?: string | null
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          product_id?: string
          status?: string | null
          stripe_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_requests: {
        Row: {
          created_at: string
          email: string
          format: string | null
          id: string
          message: string | null
          name: string
          organization: string | null
          participants: string | null
          timeline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          format?: string | null
          id?: string
          message?: string | null
          name: string
          organization?: string | null
          participants?: string | null
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          format?: string | null
          id?: string
          message?: string | null
          name?: string
          organization?: string | null
          participants?: string | null
          timeline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rebuild_blog_content_images: {
        Args: { blog_id_param: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
