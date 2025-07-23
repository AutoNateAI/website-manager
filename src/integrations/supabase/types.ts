export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
      images: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          title: string
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string
          url?: string
          width?: number | null
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
