export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      drinks: {
        Row: {
          abv: number
          consumed_at: string
          created_at: string
          id: string
          session_id: string
          user_id: string
          volume_ml: number
        }
        Insert: {
          abv: number
          consumed_at?: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
          volume_ml: number
        }
        Update: {
          abv?: number
          consumed_at?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
          volume_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: 'drinks_participant_fkey'
            columns: ['session_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'session_participants'
            referencedColumns: ['session_id', 'user_id']
          },
        ]
      }
      profiles: {
        Row: {
          body_weight_kg: number | null
          completed_at: string | null
          created_at: string
          display_name: string | null
          sex: Database['public']['Enums']['profile_sex'] | null
          user_id: string
        }
        Insert: {
          body_weight_kg?: number | null
          completed_at?: string | null
          created_at?: string
          display_name?: string | null
          sex?: Database['public']['Enums']['profile_sex'] | null
          user_id: string
        }
        Update: {
          body_weight_kg?: number | null
          completed_at?: string | null
          created_at?: string
          display_name?: string | null
          sex?: Database['public']['Enums']['profile_sex'] | null
          user_id?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          display_name: string
          distribution_mass_kg: number
          joined_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          distribution_mass_kg: number
          joined_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          distribution_mass_kg?: number
          joined_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_participants_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          name: string
          started_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          name: string
          started_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          name?: string
          started_at?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      add_session_participant: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      complete_profile: {
        Args: {
          p_body_weight_kg: number
          p_display_name: string
          p_sex: string
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      create_session: { Args: { p_name: string }; Returns: string }
      delete_draft_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      list_selectable_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      log_drink: {
        Args: { p_abv: number; p_session_id: string; p_volume_ml: number }
        Returns: Database['public']['Tables']['drinks']['Row']
      }
      remove_draft_participant: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      start_session: {
        Args: { p_session_id: string }
        Returns: Database['public']['Tables']['sessions']['Row']
      }
    }
    Enums: { profile_sex: 'male' | 'female' }
    CompositeTypes: { [_ in never]: never }
  }
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type SessionRow = Database['public']['Tables']['sessions']['Row']
export type ParticipantRow =
  Database['public']['Tables']['session_participants']['Row']
export type DrinkRow = Database['public']['Tables']['drinks']['Row']
