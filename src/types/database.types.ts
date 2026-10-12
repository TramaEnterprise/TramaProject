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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      work_sources: {
        Row: {
          authorship_evidence: Json | null
          contents: string | null
          contributors: Json | null
          edition_statement: string | null
          extent: string | null
          grouping_signals: Json | null
          imported_at: string
          is_selected: boolean
          isbns: string[]
          language: string | null
          metadata_imported_at: string | null
          normalization_version: string | null
          notes: string | null
          publication_date_raw: string | null
          publication_year: number | null
          publisher: string | null
          source: string
          source_record_id: string
          source_responsibility_statement: string | null
          source_series_statement: string | null
          source_title: string | null
          work_id: string
        }
        Insert: {
          authorship_evidence?: Json | null
          contents?: string | null
          contributors?: Json | null
          edition_statement?: string | null
          extent?: string | null
          grouping_signals?: Json | null
          imported_at?: string
          is_selected?: boolean
          isbns?: string[]
          language?: string | null
          metadata_imported_at?: string | null
          normalization_version?: string | null
          notes?: string | null
          publication_date_raw?: string | null
          publication_year?: number | null
          publisher?: string | null
          source: string
          source_record_id: string
          source_responsibility_statement?: string | null
          source_series_statement?: string | null
          source_title?: string | null
          work_id: string
        }
        Update: {
          authorship_evidence?: Json | null
          contents?: string | null
          contributors?: Json | null
          edition_statement?: string | null
          extent?: string | null
          grouping_signals?: Json | null
          imported_at?: string
          is_selected?: boolean
          isbns?: string[]
          language?: string | null
          metadata_imported_at?: string | null
          normalization_version?: string | null
          notes?: string | null
          publication_date_raw?: string | null
          publication_year?: number | null
          publisher?: string | null
          source?: string
          source_record_id?: string
          source_responsibility_statement?: string | null
          source_series_statement?: string | null
          source_title?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sources_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          alternative_titles: string[]
          author_names: string[]
          cover_url: string | null
          created_at: string
          genres: string[]
          id: string
          original_publication_year: number | null
          original_title: string | null
          pages: number | null
          selected_language: string | null
          selected_publication_year: number | null
          selected_publisher: string | null
          series_name: string | null
          series_position: number | null
          status: string
          synopsis: string | null
          title: string
          updated_at: string
        }
        Insert: {
          alternative_titles?: string[]
          author_names?: string[]
          cover_url?: string | null
          created_at?: string
          genres?: string[]
          id?: string
          original_publication_year?: number | null
          original_title?: string | null
          pages?: number | null
          selected_language?: string | null
          selected_publication_year?: number | null
          selected_publisher?: string | null
          series_name?: string | null
          series_position?: number | null
          status?: string
          synopsis?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          alternative_titles?: string[]
          author_names?: string[]
          cover_url?: string | null
          created_at?: string
          genres?: string[]
          id?: string
          original_publication_year?: number | null
          original_title?: string | null
          pages?: number | null
          selected_language?: string | null
          selected_publication_year?: number | null
          selected_publisher?: string | null
          series_name?: string | null
          series_position?: number | null
          status?: string
          synopsis?: string | null
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
      apply_bne_pilot_batch: {
        Args: { p_apply?: boolean; p_batch: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
