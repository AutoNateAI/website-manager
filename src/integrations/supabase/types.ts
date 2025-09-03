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
      assessment_responses: {
        Row: {
          assessment_id: string
          created_at: string
          deck_id: string
          id: string
          is_correct: boolean | null
          response_time_seconds: number | null
          session_metadata: Json | null
          user_response: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          deck_id: string
          id?: string
          is_correct?: boolean | null
          response_time_seconds?: number | null
          session_metadata?: Json | null
          user_response: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          deck_id?: string
          id?: string
          is_correct?: boolean | null
          response_time_seconds?: number | null
          session_metadata?: Json | null
          user_response?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "slide_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          correct_answer: string | null
          created_at: string
          deck_id: string
          difficulty_level: number | null
          explanation: string | null
          id: string
          options: Json | null
          question_text: string
          question_type: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          deck_id: string
          difficulty_level?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text: string
          question_type: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          deck_id?: string
          difficulty_level?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "slide_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_network: {
        Row: {
          attention_strength: number | null
          attention_type: string
          created_at: string
          frequency_score: number | null
          id: string
          influence_weight: number | null
          network_cluster: string | null
          recency_score: number | null
          source_user_id: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          attention_strength?: number | null
          attention_type: string
          created_at?: string
          frequency_score?: number | null
          id?: string
          influence_weight?: number | null
          network_cluster?: string | null
          recency_score?: number | null
          source_user_id: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          attention_strength?: number | null
          attention_type?: string
          created_at?: string
          frequency_score?: number | null
          id?: string
          influence_weight?: number | null
          network_cluster?: string | null
          recency_score?: number | null
          source_user_id?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attention_network_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attention_network_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          account_id: string
          created_at: string
          enabled: boolean
          id: string
          params: Json
          rule_type: string
          schedule: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          params?: Json
          rule_type: string
          schedule?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          params?: Json
          rule_type?: string
          schedule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_sops: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          sop_document_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          sop_document_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          sop_document_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          actual_revenue: number | null
          created_at: string
          description: string | null
          end_date: string
          financial_target: number | null
          id: string
          name: string
          projected_revenue: number | null
          start_date: string
          status: string
          target_entities: Json | null
          updated_at: string
        }
        Insert: {
          actual_revenue?: number | null
          created_at?: string
          description?: string | null
          end_date: string
          financial_target?: number | null
          id?: string
          name: string
          projected_revenue?: number | null
          start_date: string
          status?: string
          target_entities?: Json | null
          updated_at?: string
        }
        Update: {
          actual_revenue?: number | null
          created_at?: string
          description?: string | null
          end_date?: string
          financial_target?: number | null
          id?: string
          name?: string
          projected_revenue?: number | null
          start_date?: string
          status?: string
          target_entities?: Json | null
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
      comment_like_history: {
        Row: {
          changed_by: string
          comment_id: string
          created_at: string
          id: string
          new_count: number
          previous_count: number
        }
        Insert: {
          changed_by?: string
          comment_id: string
          created_at?: string
          id?: string
          new_count?: number
          previous_count?: number
        }
        Update: {
          changed_by?: string
          comment_id?: string
          created_at?: string
          id?: string
          new_count?: number
          previous_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_like_history_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "social_media_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          chatgpt_links: Json | null
          company_size: string | null
          created_at: string
          endowment_balance: number | null
          form_990_years: Json | null
          id: string
          leadership_compensation: Json | null
          linkedin_url: string | null
          location: string | null
          name: string
          notebooklm_links: Json | null
          program_expenses: number | null
          propublic_link: string | null
          tags: Json | null
          target_type: string | null
          targeting_notes: string | null
          top_vendors: string | null
          total_grants_paid: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          chatgpt_links?: Json | null
          company_size?: string | null
          created_at?: string
          endowment_balance?: number | null
          form_990_years?: Json | null
          id?: string
          leadership_compensation?: Json | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          notebooklm_links?: Json | null
          program_expenses?: number | null
          propublic_link?: string | null
          tags?: Json | null
          target_type?: string | null
          targeting_notes?: string | null
          top_vendors?: string | null
          total_grants_paid?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          chatgpt_links?: Json | null
          company_size?: string | null
          created_at?: string
          endowment_balance?: number | null
          form_990_years?: Json | null
          id?: string
          leadership_compensation?: Json | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notebooklm_links?: Json | null
          program_expenses?: number | null
          propublic_link?: string | null
          tags?: Json | null
          target_type?: string | null
          targeting_notes?: string | null
          top_vendors?: string | null
          total_grants_paid?: number | null
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
      content_analysis: {
        Row: {
          analysis_metadata: Json | null
          confidence_score: number | null
          content_id: string
          content_type: string
          created_at: string
          hashtags: string[] | null
          id: string
          keywords: string[] | null
          language: string | null
          mentions: string[] | null
          sentiment_label: string | null
          sentiment_score: number | null
          topics: string[] | null
        }
        Insert: {
          analysis_metadata?: Json | null
          confidence_score?: number | null
          content_id: string
          content_type: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          mentions?: string[] | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          topics?: string[] | null
        }
        Update: {
          analysis_metadata?: Json | null
          confidence_score?: number | null
          content_id?: string
          content_type?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          mentions?: string[] | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          topics?: string[] | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          status: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      core_concepts: {
        Row: {
          concept_description: string
          concept_title: string
          created_at: string
          deck_id: string
          id: string
          importance_level: number | null
          related_slide_numbers: number[] | null
        }
        Insert: {
          concept_description: string
          concept_title: string
          created_at?: string
          deck_id: string
          id?: string
          importance_level?: number | null
          related_slide_numbers?: number[] | null
        }
        Update: {
          concept_description?: string
          concept_title?: string
          created_at?: string
          deck_id?: string
          id?: string
          importance_level?: number | null
          related_slide_numbers?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "core_concepts_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "slide_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_history: {
        Row: {
          campaign_id: string | null
          closed_at: string
          created_at: string
          deal_amount: number
          id: string
          notes: string | null
          person_id: string
        }
        Insert: {
          campaign_id?: string | null
          closed_at?: string
          created_at?: string
          deal_amount: number
          id?: string
          notes?: string | null
          person_id: string
        }
        Update: {
          campaign_id?: string | null
          closed_at?: string
          created_at?: string
          deal_amount?: number
          id?: string
          notes?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_history_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
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
      engagement_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          engagement_score: number | null
          id: string
          led_to_follow: boolean | null
          notes: string | null
          parent_comment_id: string | null
          response_content: string | null
          response_received: boolean | null
          response_timestamp: string | null
          sentiment_analysis: string | null
          target_post_id: string | null
          target_user_id: string | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          led_to_follow?: boolean | null
          notes?: string | null
          parent_comment_id?: string | null
          response_content?: string | null
          response_received?: boolean | null
          response_timestamp?: string | null
          sentiment_analysis?: string | null
          target_post_id?: string | null
          target_user_id?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          led_to_follow?: boolean | null
          notes?: string | null
          parent_comment_id?: string | null
          response_content?: string | null
          response_received?: boolean | null
          response_timestamp?: string | null
          sentiment_analysis?: string | null
          target_post_id?: string | null
          target_user_id?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_activities_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "engagement_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_activities_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "instagram_target_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_activities_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
            referencedColumns: ["id"]
          },
        ]
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
      goals: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          target_metrics: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          target_metrics?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          target_metrics?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      instagram_accounts: {
        Row: {
          access_status: string | null
          connected_at: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          phyllo_account_id: string | null
          phyllo_profile_id: string | null
          platform: string
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          access_status?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          phyllo_account_id?: string | null
          phyllo_profile_id?: string | null
          platform?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          access_status?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          phyllo_account_id?: string | null
          phyllo_profile_id?: string | null
          platform?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      instagram_engagement_log: {
        Row: {
          account_id: string
          action_type: string
          comment_text: string | null
          created_at: string
          error: string | null
          id: string
          status: string
          target_post_url: string | null
          target_user: string | null
        }
        Insert: {
          account_id: string
          action_type: string
          comment_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          target_post_url?: string | null
          target_user?: string | null
        }
        Update: {
          account_id?: string
          action_type?: string
          comment_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          target_post_url?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_engagement_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_target_posts: {
        Row: {
          analysis_status: string | null
          attention_score: number | null
          authenticity_score: number | null
          comment_count: number | null
          created_at: string
          hashtags: string[] | null
          id: string
          last_scored_at: string | null
          like_count: number | null
          location_tag: string | null
          market_fit_score: number | null
          mention_count: number | null
          network_value_score: number | null
          notes: string | null
          overall_attention_score: number | null
          post_content: string | null
          post_id: string | null
          post_timestamp: string | null
          post_url: string
          poster_user_id: string | null
          poster_username: string | null
          repost_count: number | null
          scoring_metadata: Json | null
          share_count: number | null
          updated_at: string
        }
        Insert: {
          analysis_status?: string | null
          attention_score?: number | null
          authenticity_score?: number | null
          comment_count?: number | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          last_scored_at?: string | null
          like_count?: number | null
          location_tag?: string | null
          market_fit_score?: number | null
          mention_count?: number | null
          network_value_score?: number | null
          notes?: string | null
          overall_attention_score?: number | null
          post_content?: string | null
          post_id?: string | null
          post_timestamp?: string | null
          post_url: string
          poster_user_id?: string | null
          poster_username?: string | null
          repost_count?: number | null
          scoring_metadata?: Json | null
          share_count?: number | null
          updated_at?: string
        }
        Update: {
          analysis_status?: string | null
          attention_score?: number | null
          authenticity_score?: number | null
          comment_count?: number | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          last_scored_at?: string | null
          like_count?: number | null
          location_tag?: string | null
          market_fit_score?: number | null
          mention_count?: number | null
          network_value_score?: number | null
          notes?: string | null
          overall_attention_score?: number | null
          post_content?: string | null
          post_id?: string | null
          post_timestamp?: string | null
          post_url?: string
          poster_user_id?: string | null
          poster_username?: string | null
          repost_count?: number | null
          scoring_metadata?: Json | null
          share_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_target_posts_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_users: {
        Row: {
          account_type: string | null
          bio: string | null
          created_at: string
          discovered_through: string | null
          discovery_source_id: string | null
          display_name: string | null
          engagement_rate: number | null
          external_url: string | null
          followed_at: string | null
          follower_count: number | null
          following_count: number | null
          follows_me: boolean | null
          id: string
          influence_score: number | null
          is_business_account: boolean | null
          is_verified: boolean | null
          location: string | null
          niche_categories: string[] | null
          notes: string | null
          post_count: number | null
          profile_image_url: string | null
          sentiment_score: number | null
          updated_at: string
          username: string
        }
        Insert: {
          account_type?: string | null
          bio?: string | null
          created_at?: string
          discovered_through?: string | null
          discovery_source_id?: string | null
          display_name?: string | null
          engagement_rate?: number | null
          external_url?: string | null
          followed_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          follows_me?: boolean | null
          id?: string
          influence_score?: number | null
          is_business_account?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          niche_categories?: string[] | null
          notes?: string | null
          post_count?: number | null
          profile_image_url?: string | null
          sentiment_score?: number | null
          updated_at?: string
          username: string
        }
        Update: {
          account_type?: string | null
          bio?: string | null
          created_at?: string
          discovered_through?: string | null
          discovery_source_id?: string | null
          display_name?: string | null
          engagement_rate?: number | null
          external_url?: string | null
          followed_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          follows_me?: boolean | null
          id?: string
          influence_score?: number | null
          is_business_account?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          niche_categories?: string[] | null
          notes?: string | null
          post_count?: number | null
          profile_image_url?: string | null
          sentiment_score?: number | null
          updated_at?: string
          username?: string
        }
        Relationships: []
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
      location_intelligence: {
        Row: {
          active_times: Json | null
          created_at: string
          engagement_quality_score: number | null
          id: string
          latitude: number | null
          location_name: string
          location_type: string | null
          longitude: number | null
          notes: string | null
          trending_topics: string[] | null
          updated_at: string
          user_count: number | null
        }
        Insert: {
          active_times?: Json | null
          created_at?: string
          engagement_quality_score?: number | null
          id?: string
          latitude?: number | null
          location_name: string
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          trending_topics?: string[] | null
          updated_at?: string
          user_count?: number | null
        }
        Update: {
          active_times?: Json | null
          created_at?: string
          engagement_quality_score?: number | null
          id?: string
          latitude?: number | null
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          trending_topics?: string[] | null
          updated_at?: string
          user_count?: number | null
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
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          chatgpt_links: Json | null
          company_id: string | null
          created_at: string
          deal_amount: number | null
          deal_closed_at: string | null
          deal_status: string | null
          email: string | null
          financial_projection: number | null
          id: string
          lead_status: string | null
          linkedin_url: string | null
          location: string | null
          name: string
          notebooklm_links: Json | null
          position: string | null
          profile_image_url: string | null
          projection_justification: string | null
          tags: Json | null
          targeting_notes: string | null
          updated_at: string
        }
        Insert: {
          chatgpt_links?: Json | null
          company_id?: string | null
          created_at?: string
          deal_amount?: number | null
          deal_closed_at?: string | null
          deal_status?: string | null
          email?: string | null
          financial_projection?: number | null
          id?: string
          lead_status?: string | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          notebooklm_links?: Json | null
          position?: string | null
          profile_image_url?: string | null
          projection_justification?: string | null
          tags?: Json | null
          targeting_notes?: string | null
          updated_at?: string
        }
        Update: {
          chatgpt_links?: Json | null
          company_id?: string | null
          created_at?: string
          deal_amount?: number | null
          deal_closed_at?: string | null
          deal_status?: string | null
          email?: string | null
          financial_projection?: number | null
          id?: string
          lead_status?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notebooklm_links?: Json | null
          position?: string | null
          profile_image_url?: string | null
          projection_justification?: string | null
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
      post_search_queries: {
        Row: {
          discovery_date: string | null
          id: string
          post_id: string | null
          relevance_score: number | null
          search_query_id: string | null
        }
        Insert: {
          discovery_date?: string | null
          id?: string
          post_id?: string | null
          relevance_score?: number | null
          search_query_id?: string | null
        }
        Update: {
          discovery_date?: string | null
          id?: string
          post_id?: string | null
          relevance_score?: number | null
          search_query_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_search_queries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "instagram_target_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_search_queries_search_query_id_fkey"
            columns: ["search_query_id"]
            isOneToOne: false
            referencedRelation: "search_queries"
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
      prompt_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          media_type: string | null
          platform: string | null
          style: string | null
          template: string
          type: Database["public"]["Enums"]["prompt_template_type"]
          updated_at: string
          voice: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          media_type?: string | null
          platform?: string | null
          style?: string | null
          template: string
          type: Database["public"]["Enums"]["prompt_template_type"]
          updated_at?: string
          voice?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          media_type?: string | null
          platform?: string | null
          style?: string | null
          template?: string
          type?: Database["public"]["Enums"]["prompt_template_type"]
          updated_at?: string
          voice?: string | null
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
      scheduled_posts: {
        Row: {
          account_id: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          scheduled_for: string
          social_media_post_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          scheduled_for: string
          social_media_post_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          scheduled_for?: string
          social_media_post_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_algorithms: {
        Row: {
          algorithm_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          thresholds: Json | null
          updated_at: string
          weights: Json
        }
        Insert: {
          algorithm_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          thresholds?: Json | null
          updated_at?: string
          weights?: Json
        }
        Update: {
          algorithm_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          thresholds?: Json | null
          updated_at?: string
          weights?: Json
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          created_at: string
          description: string | null
          engagement_thresholds: Json | null
          hashtag_filters: Json | null
          id: string
          is_active: boolean | null
          location_filters: Json | null
          parameters: Json
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          engagement_thresholds?: Json | null
          hashtag_filters?: Json | null
          id?: string
          is_active?: boolean | null
          location_filters?: Json | null
          parameters?: Json
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          engagement_thresholds?: Json | null
          hashtag_filters?: Json | null
          id?: string
          is_active?: boolean | null
          location_filters?: Json | null
          parameters?: Json
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
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
      sessions: {
        Row: {
          activities_completed: Json | null
          campaign_id: string
          created_at: string
          duration_hours: number | null
          goal_id: string | null
          id: string
          notes: string | null
          session_date: string
        }
        Insert: {
          activities_completed?: Json | null
          campaign_id: string
          created_at?: string
          duration_hours?: number | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          session_date?: string
        }
        Update: {
          activities_completed?: Json | null
          campaign_id?: string
          created_at?: string
          duration_hours?: number | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_decks: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string | null
          id: string
          insights: string | null
          metadata: Json | null
          presentation_style: string | null
          slide_count: number
          status: string
          target_audience: string | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          insights?: string | null
          metadata?: Json | null
          presentation_style?: string | null
          slide_count?: number
          status?: string
          target_audience?: string | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          insights?: string | null
          metadata?: Json | null
          presentation_style?: string | null
          slide_count?: number
          status?: string
          target_audience?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_decks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      slides: {
        Row: {
          content: string
          created_at: string
          deck_id: string
          id: string
          image_prompt: string | null
          image_url: string | null
          layout_type: string | null
          slide_number: number
          speaker_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deck_id: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          layout_type?: string | null
          slide_number: number
          speaker_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deck_id?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          layout_type?: string | null
          slide_number?: number
          speaker_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slides_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "slide_decks"
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
      social_media_comments: {
        Row: {
          caused_dm: boolean | null
          comment_text: string
          comment_timestamp: string
          commenter_display_name: string | null
          commenter_username: string
          created_at: string
          id: string
          is_my_comment: boolean | null
          is_reply_to_my_comment: boolean | null
          like_count: number | null
          notification_sent: boolean | null
          parent_comment_id: string | null
          post_id: string
          reply_count: number | null
          scheduled_for: string | null
          status: string | null
          thread_depth: number | null
          updated_at: string
        }
        Insert: {
          caused_dm?: boolean | null
          comment_text: string
          comment_timestamp: string
          commenter_display_name?: string | null
          commenter_username: string
          created_at?: string
          id?: string
          is_my_comment?: boolean | null
          is_reply_to_my_comment?: boolean | null
          like_count?: number | null
          notification_sent?: boolean | null
          parent_comment_id?: string | null
          post_id: string
          reply_count?: number | null
          scheduled_for?: string | null
          status?: string | null
          thread_depth?: number | null
          updated_at?: string
        }
        Update: {
          caused_dm?: boolean | null
          comment_text?: string
          comment_timestamp?: string
          commenter_display_name?: string | null
          commenter_username?: string
          created_at?: string
          id?: string
          is_my_comment?: boolean | null
          is_reply_to_my_comment?: boolean | null
          like_count?: number | null
          notification_sent?: boolean | null
          parent_comment_id?: string | null
          post_id?: string
          reply_count?: number | null
          scheduled_for?: string | null
          status?: string | null
          thread_depth?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "social_media_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "instagram_target_posts"
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
          assigned_user_id: string | null
          caption: string
          caused_dm: boolean | null
          context_direction: string | null
          created_at: string
          generation_progress: Json | null
          hashtags: string[]
          id: string
          image_seed_instructions: string | null
          image_seed_url: string | null
          is_published: boolean
          media_type: string | null
          platform: string
          platform_type: string | null
          post_status: string | null
          posted_at: string | null
          scheduled_at: string | null
          source_items: Json
          status: string | null
          style: string
          title: string
          updated_at: string
          voice: string
        }
        Insert: {
          assigned_user_id?: string | null
          caption: string
          caused_dm?: boolean | null
          context_direction?: string | null
          created_at?: string
          generation_progress?: Json | null
          hashtags?: string[]
          id?: string
          image_seed_instructions?: string | null
          image_seed_url?: string | null
          is_published?: boolean
          media_type?: string | null
          platform: string
          platform_type?: string | null
          post_status?: string | null
          posted_at?: string | null
          scheduled_at?: string | null
          source_items?: Json
          status?: string | null
          style: string
          title: string
          updated_at?: string
          voice: string
        }
        Update: {
          assigned_user_id?: string | null
          caption?: string
          caused_dm?: boolean | null
          context_direction?: string | null
          created_at?: string
          generation_progress?: Json | null
          hashtags?: string[]
          id?: string
          image_seed_instructions?: string | null
          image_seed_url?: string | null
          is_published?: boolean
          media_type?: string | null
          platform?: string
          platform_type?: string | null
          post_status?: string | null
          posted_at?: string | null
          scheduled_at?: string | null
          source_items?: Json
          status?: string | null
          style?: string
          title?: string
          updated_at?: string
          voice?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
            referencedColumns: ["id"]
          },
        ]
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
      sop_conversations: {
        Row: {
          conversation_data: Json
          conversation_stage: string | null
          created_at: string
          extracted_data: Json | null
          extraction_status: string | null
          generation_ready: boolean | null
          id: string
          sop_document_id: string | null
          template_suggestions: Json | null
          turn_count: number | null
          updated_at: string
        }
        Insert: {
          conversation_data?: Json
          conversation_stage?: string | null
          created_at?: string
          extracted_data?: Json | null
          extraction_status?: string | null
          generation_ready?: boolean | null
          id?: string
          sop_document_id?: string | null
          template_suggestions?: Json | null
          turn_count?: number | null
          updated_at?: string
        }
        Update: {
          conversation_data?: Json
          conversation_stage?: string | null
          created_at?: string
          extracted_data?: Json | null
          extraction_status?: string | null
          generation_ready?: boolean | null
          id?: string
          sop_document_id?: string | null
          template_suggestions?: Json | null
          turn_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_conversations_sop_document_id_fkey"
            columns: ["sop_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_documents: {
        Row: {
          category: string
          content: string | null
          created_at: string
          current_version: number | null
          description: string | null
          generation_metadata: Json | null
          id: string
          screenshots_count: number | null
          status: string | null
          structured_data: Json | null
          template_id: string | null
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          current_version?: number | null
          description?: string | null
          generation_metadata?: Json | null
          id?: string
          screenshots_count?: number | null
          status?: string | null
          structured_data?: Json | null
          template_id?: string | null
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          current_version?: number | null
          description?: string | null
          generation_metadata?: Json | null
          id?: string
          screenshots_count?: number | null
          status?: string | null
          structured_data?: Json | null
          template_id?: string | null
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      sop_screenshots: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string
          placeholder_id: string | null
          position_order: number | null
          position_section: string
          sop_document_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          placeholder_id?: string | null
          position_order?: number | null
          position_section: string
          sop_document_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          placeholder_id?: string | null
          position_order?: number | null
          position_section?: string
          sop_document_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sop_screenshots_document"
            columns: ["sop_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          formatting_rules: Json | null
          id: string
          is_active: boolean | null
          screenshot_placeholders: Json | null
          sections: Json
          template_structure: Json
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          formatting_rules?: Json | null
          id?: string
          is_active?: boolean | null
          screenshot_placeholders?: Json | null
          sections?: Json
          template_structure?: Json
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          formatting_rules?: Json | null
          id?: string
          is_active?: boolean | null
          screenshot_placeholders?: Json | null
          sections?: Json
          template_structure?: Json
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      sop_versions: {
        Row: {
          change_description: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          sop_document_id: string
          structured_data: Json | null
          title: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          sop_document_id: string
          structured_data?: Json | null
          title: string
          version_number?: number
        }
        Update: {
          change_description?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          sop_document_id?: string
          structured_data?: Json | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_sop_versions_document"
            columns: ["sop_document_id"]
            isOneToOne: false
            referencedRelation: "sop_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string
          description: string | null
          due_date: string | null
          goal_id: string
          id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id: string
          id?: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_id?: string
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          discovered_at: string
          id: string
          interaction_context: string | null
          interaction_type: string
          strength_score: number | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          discovered_at?: string
          id?: string
          interaction_context?: string | null
          interaction_type: string
          strength_score?: number | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          discovered_at?: string
          id?: string
          interaction_context?: string | null
          interaction_type?: string
          strength_score?: number | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "instagram_users"
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
      delete_comment_cascade: {
        Args: { comment_id: string }
        Returns: undefined
      }
      increment_image_progress: {
        Args: { carousel_index_param: number; post_id_param: string }
        Returns: undefined
      }
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
      prompt_template_type: "concept" | "caption" | "image_prompts"
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
      prompt_template_type: ["concept", "caption", "image_prompts"],
    },
  },
} as const
