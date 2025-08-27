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
          chatgpt_url: string | null
          content: string
          content_images: Json | null
          created_at: string
          excerpt: string
          featured: boolean | null
          hero_image: string | null
          hero_image_alt: string | null
          id: string
          notebook_lm_url: string | null
          published: boolean | null
          read_time: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category: string
          chatgpt_url?: string | null
          content: string
          content_images?: Json | null
          created_at?: string
          excerpt: string
          featured?: boolean | null
          hero_image?: string | null
          hero_image_alt?: string | null
          id?: string
          notebook_lm_url?: string | null
          published?: boolean | null
          read_time: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          chatgpt_url?: string | null
          content?: string
          content_images?: Json | null
          created_at?: string
          excerpt?: string
          featured?: boolean | null
          hero_image?: string | null
          hero_image_alt?: string | null
          id?: string
          notebook_lm_url?: string | null
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
      companies: {
        Row: {
          chatgpt_links: Json | null
          company_size: string | null
          created_at: string
          id: string
          industry: string | null
          linkedin_url: string | null
          location: string | null
          name: string
          notebooklm_links: Json | null
          tags: Json | null
          targeting_notes: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          chatgpt_links?: Json | null
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          notebooklm_links?: Json | null
          tags?: Json | null
          targeting_notes?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          chatgpt_links?: Json | null
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notebooklm_links?: Json | null
          tags?: Json | null
          targeting_notes?: string | null
          updated_at?: string
          website?: string | null
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
      demo_requests: {
        Row: {
          ai_features: Json | null
          audience_type: string
          budget_range: string | null
          company: string | null
          created_at: string
          custom_feature_request: string | null
          email: string
          id: string
          name: string
          project_description: string
          selected_features: Json | null
          timeline: string | null
          updated_at: string
        }
        Insert: {
          ai_features?: Json | null
          audience_type: string
          budget_range?: string | null
          company?: string | null
          created_at?: string
          custom_feature_request?: string | null
          email: string
          id?: string
          name: string
          project_description: string
          selected_features?: Json | null
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          ai_features?: Json | null
          audience_type?: string
          budget_range?: string | null
          company?: string | null
          created_at?: string
          custom_feature_request?: string | null
          email?: string
          id?: string
          name?: string
          project_description?: string
          selected_features?: Json | null
          timeline?: string | null
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
      event_connections: {
        Row: {
          connection_quality: string | null
          created_at: string
          discussion_topics: string | null
          event_id: string
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          connection_quality?: string | null
          created_at?: string
          discussion_topics?: string | null
          event_id: string
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          person_id: string
          updated_at?: string
        }
        Update: {
          connection_quality?: string | null
          created_at?: string
          discussion_topics?: string | null
          event_id?: string
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_connections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "networking_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_connections_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          company_id: string | null
          created_at: string
          current_attendees: number | null
          date_time: string | null
          description: string | null
          event_type: string
          id: string
          location: string | null
          max_attendees: number | null
          notes: string | null
          organizer_person_id: string | null
          status: string
          tags: Json | null
          title: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_attendees?: number | null
          date_time?: string | null
          description?: string | null
          event_type?: string
          id?: string
          location?: string | null
          max_attendees?: number | null
          notes?: string | null
          organizer_person_id?: string | null
          status?: string
          tags?: Json | null
          title: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_attendees?: number | null
          date_time?: string | null
          description?: string | null
          event_type?: string
          id?: string
          location?: string | null
          max_attendees?: number | null
          notes?: string | null
          organizer_person_id?: string | null
          status?: string
          tags?: Json | null
          title?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_person_id_fkey"
            columns: ["organizer_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
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
      networking_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          location: string | null
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          chatgpt_links: Json | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          lead_status: string | null
          linkedin_url: string | null
          location: string | null
          name: string
          notebooklm_links: Json | null
          position: string | null
          profile_image_url: string | null
          tags: Json | null
          targeting_notes: string | null
          updated_at: string
        }
        Insert: {
          chatgpt_links?: Json | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_status?: string | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          notebooklm_links?: Json | null
          position?: string | null
          profile_image_url?: string | null
          tags?: Json | null
          targeting_notes?: string | null
          updated_at?: string
        }
        Update: {
          chatgpt_links?: Json | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_status?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notebooklm_links?: Json | null
          position?: string | null
          profile_image_url?: string | null
          tags?: Json | null
          targeting_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      person_notes: {
        Row: {
          created_at: string
          id: string
          note_category: string | null
          note_text: string
          person_id: string
          priority: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_category?: string | null
          note_text: string
          person_id: string
          priority?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note_category?: string | null
          note_text?: string
          person_id?: string
          priority?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
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
      product_people: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          person_id: string
          product_id: string
          relationship_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          person_id: string
          product_id: string
          relationship_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          person_id?: string
          product_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_people_product_id_fkey"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      service_people: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          person_id: string
          relationship_type: string
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          person_id: string
          relationship_type: string
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          person_id?: string
          relationship_type?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_people_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          price_range: string | null
          pricing_model: string | null
          service_type: string | null
          tags: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          price_range?: string | null
          pricing_model?: string | null
          service_type?: string | null
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          price_range?: string | null
          pricing_model?: string | null
          service_type?: string | null
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_interactions: {
        Row: {
          comment_text: string
          commenter_name: string
          commenter_profile_url: string | null
          created_at: string
          id: string
          interaction_timestamp: string
          interaction_type: string
          parent_interaction_id: string | null
          person_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          comment_text: string
          commenter_name: string
          commenter_profile_url?: string | null
          created_at?: string
          id?: string
          interaction_timestamp: string
          interaction_type: string
          parent_interaction_id?: string | null
          person_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          comment_text?: string
          commenter_name?: string
          commenter_profile_url?: string | null
          created_at?: string
          id?: string
          interaction_timestamp?: string
          interaction_type?: string
          parent_interaction_id?: string | null
          person_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_interactions_parent_interaction_id_fkey"
            columns: ["parent_interaction_id"]
            isOneToOne: false
            referencedRelation: "social_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_interactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_images: {
        Row: {
          alt_text: string | null
          carousel_index: number
          created_at: string
          id: string
          image_index: number
          image_prompt: string
          image_url: string
          post_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          carousel_index: number
          created_at?: string
          id?: string
          image_index: number
          image_prompt: string
          image_url: string
          post_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          carousel_index?: number
          created_at?: string
          id?: string
          image_index?: number
          image_prompt?: string
          image_url?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          caption: string
          context_direction: string | null
          created_at: string
          hashtags: string[]
          id: string
          image_seed_instructions: string | null
          image_seed_url: string | null
          is_published: boolean
          platform: string
          platform_type: string | null
          source_items: Json
          style: string
          title: string
          updated_at: string
          voice: string
        }
        Insert: {
          caption: string
          context_direction?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          image_seed_instructions?: string | null
          image_seed_url?: string | null
          is_published?: boolean
          platform: string
          platform_type?: string | null
          source_items?: Json
          style: string
          title: string
          updated_at?: string
          voice: string
        }
        Update: {
          caption?: string
          context_direction?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          image_seed_instructions?: string | null
          image_seed_url?: string | null
          is_published?: boolean
          platform?: string
          platform_type?: string | null
          source_items?: Json
          style?: string
          title?: string
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          created_at: string
          id: string
          media_urls: Json | null
          my_comment_text: string | null
          my_engagement_type: string | null
          platform: string
          post_author_name: string | null
          post_author_profile_url: string | null
          post_content: string | null
          post_timestamp: string | null
          post_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_urls?: Json | null
          my_comment_text?: string | null
          my_engagement_type?: string | null
          platform: string
          post_author_name?: string | null
          post_author_profile_url?: string | null
          post_content?: string | null
          post_timestamp?: string | null
          post_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_urls?: Json | null
          my_comment_text?: string | null
          my_engagement_type?: string | null
          platform?: string
          post_author_name?: string | null
          post_author_profile_url?: string | null
          post_content?: string | null
          post_timestamp?: string | null
          post_url?: string
          updated_at?: string
        }
        Relationships: []
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
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
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
