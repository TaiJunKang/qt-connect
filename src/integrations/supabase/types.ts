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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      communities: {
        Row: { id: string; name: string; sort_order: number; created_at: string }
        Insert: { id?: string; name: string; sort_order?: number; created_at?: string }
        Update: { id?: string; name?: string; sort_order?: number; created_at?: string }
        Relationships: []
      }
      announcements: {
        Row: {
          community_id: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          publish_end: string | null
          publish_start: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          publish_end?: string | null
          publish_start?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          publish_end?: string | null
          publish_start?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bible_readings: {
        Row: {
          book: string
          chapter: number
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          book: string
          chapter: number
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          book?: string
          chapter?: number
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          is_anonymous: boolean
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          content?: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          updated_at?: string
          user_id: string
          user_name?: string
        }
        Update: {
          content?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          answered_at: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          is_answered: boolean
          title: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          answered_at?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_answered?: boolean
          title?: string
          updated_at?: string
          user_id: string
          user_name?: string
        }
        Update: {
          answered_at?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_answered?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      prayer_responses: {
        Row: {
          created_at: string
          id: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_responses_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          community_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qt_drafts: {
        Row: {
          commentary: string
          created_at: string
          date: string
          id: string
          reference: string
          sermon_id: string | null
          text: string
          title: string
          updated_at: string
        }
        Insert: {
          commentary?: string
          created_at?: string
          date: string
          id?: string
          reference?: string
          sermon_id?: string | null
          text?: string
          title?: string
          updated_at?: string
        }
        Update: {
          commentary?: string
          created_at?: string
          date?: string
          id?: string
          reference?: string
          sermon_id?: string | null
          text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qt_drafts_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      qt_logs: {
        Row: {
          is_anonymous: boolean
          application: string | null
          created_at: string
          date: string
          id: string
          is_public: boolean
          meditation: string | null
          prayer: string | null
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          is_anonymous?: boolean
          application?: string | null
          created_at?: string
          date: string
          id?: string
          is_public?: boolean
          meditation?: string | null
          prayer?: string | null
          updated_at?: string
          user_id: string
          user_name?: string
        }
        Update: {
          is_anonymous?: boolean
          application?: string | null
          created_at?: string
          date?: string
          id?: string
          is_public?: boolean
          meditation?: string | null
          prayer?: string | null
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      qt_plans: {
        Row: {
          commentary: string
          created_at: string
          date: string
          id: string
          reference: string
          sermon_id: string | null
          text: string
          title: string
          updated_at: string
        }
        Insert: {
          commentary?: string
          created_at?: string
          date: string
          id?: string
          reference?: string
          sermon_id?: string | null
          text?: string
          title?: string
          updated_at?: string
        }
        Update: {
          commentary?: string
          created_at?: string
          date?: string
          id?: string
          reference?: string
          sermon_id?: string | null
          text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qt_plans_sermon_id_fkey"
            columns: ["sermon_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      sermons: {
        Row: {
          content: string
          created_at: string
          id: string
          sermon_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          sermon_date?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sermon_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_prayer_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string | null
          user_name: string
          title: string
          content: string
          category: string
          is_anonymous: boolean
          is_answered: boolean
          answered_at: string | null
          created_at: string
        }[]
      }
      get_my_communities: {
        Args: Record<PropertyKey, never>
        Returns: { id: string; name: string; role: string; is_current: boolean }[]
      }
      switch_community: {
        Args: { p_community: string }
        Returns: undefined
      }
      is_community_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_shared_logs: {
        Args: { p_from: string; p_to: string }
        Returns: {
          id: string
          user_id: string | null
          user_name: string
          avatar_url: string | null
          date: string
          meditation: string
          application: string
          created_at: string
          is_anonymous: boolean
          is_mine: boolean
          like_count: number
          comment_count: number
          liked: boolean
        }[]
      }
      get_monthly_ranking: {
        Args: { p_year: number; p_month: number }
        Returns: {
          user_id: string
          user_name: string
          count: number
        }[]
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
