export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string;
          name: string;
          created_at: string | null;
          date: string | null;
          venue: string | null;
          rounds: number | null;
          divisions: number | null;
          director_id: string | null;
          current_round: number | null;
          status: string | null;
          last_activity: string | null;
          pairing_system: string | null;
          wizard_responses: any | null;
          tournament_config: any | null;
          team_mode: boolean | null;
          password: string | null;
          public_sharing_enabled: boolean | null;
          share_settings: any | null;
          password_hash: string | null;
          is_password_protected: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string | null;
          date?: string | null;
          venue?: string | null;
          rounds?: number | null;
          divisions?: number | null;
          director_id?: string | null;
          current_round?: number | null;
          status?: string | null;
          last_activity?: string | null;
          pairing_system?: string | null;
          wizard_responses?: any | null;
          tournament_config?: any | null;
          team_mode?: boolean | null;
          password?: string | null;
          public_sharing_enabled?: boolean | null;
          share_settings?: any | null;
          password_hash?: string | null;
          is_password_protected?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string | null;
          date?: string | null;
          venue?: string | null;
          rounds?: number | null;
          divisions?: number | null;
          director_id?: string | null;
          current_round?: number | null;
          status?: string | null;
          last_activity?: string | null;
          pairing_system?: string | null;
          wizard_responses?: any | null;
          tournament_config?: any | null;
          team_mode?: boolean | null;
          password?: string | null;
          public_sharing_enabled?: boolean | null;
          share_settings?: any | null;
          password_hash?: string | null;
          is_password_protected?: boolean | null;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          rating: number;
          tournament_id: string;
          created_at: string | null;
          team_name: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          rating?: number;
          tournament_id: string;
          created_at?: string | null;
          team_name?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          rating?: number;
          tournament_id?: string;
          created_at?: string | null;
          team_name?: string | null;
        };
      };
      pairings: {
        Row: {
          id: string;
          round_number: number;
          tournament_id: string;
          table_number: number;
          player1_id: string;
          player2_id: string;
          player1_rank: number;
          player2_rank: number;
          first_move_player_id: string;
          created_at: string | null;
          player1_gibsonized: boolean | null;
          player2_gibsonized: boolean | null;
        };
        Insert: {
          id?: string;
          round_number: number;
          tournament_id: string;
          table_number: number;
          player1_id: string;
          player2_id: string;
          player1_rank: number;
          player2_rank: number;
          first_move_player_id: string;
          created_at?: string | null;
          player1_gibsonized?: boolean | null;
          player2_gibsonized?: boolean | null;
        };
        Update: {
          id?: string;
          round_number?: number;
          tournament_id?: string;
          table_number?: number;
          player1_id?: string;
          player2_id?: string;
          player1_rank?: number;
          player2_rank?: number;
          first_move_player_id?: string;
          created_at?: string | null;
          player1_gibsonized?: boolean | null;
          player2_gibsonized?: boolean | null;
        };
      };
      results: {
        Row: {
          id: string;
          pairing_id: string;
          round_number: number;
          player1_score: number;
          player2_score: number;
          winner_id: string | null;
          submitted_by: string | null;
          created_at: string;
          tournament_id: string;
        };
        Insert: {
          id?: string;
          pairing_id: string;
          round_number: number;
          player1_score?: number;
          player2_score?: number;
          winner_id?: string | null;
          submitted_by?: string | null;
          created_at?: string;
          tournament_id: string;
        };
        Update: {
          id?: string;
          pairing_id?: string;
          round_number?: number;
          player1_score?: number;
          player2_score?: number;
          winner_id?: string | null;
          submitted_by?: string | null;
          created_at?: string;
          tournament_id?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          logo_url: string | null;
          country: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          logo_url?: string | null;
          country?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          logo_url?: string | null;
          country?: string | null;
          created_at?: string | null;
        };
      };
      divisions: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          division_number: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          division_number: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          division_number?: number;
          created_at?: string | null;
        };
      };
      prompts: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: string;
          created_at?: string | null;
        };
      };
      logic_blocks: {
        Row: {
          id: string;
          title: string;
          description: string;
          logic_code: string;
          feature_name: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          logic_code: string;
          feature_name: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          logic_code?: string;
          feature_name?: string;
          created_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          timestamp: string;
          details: any | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          timestamp?: string;
          details?: any | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          timestamp?: string;
          details?: any | null;
        };
      };
      sponsors: {
        Row: {
          id: string;
          tournament_id: string;
          name: string | null;
          logo_url: string;
          website_link: string | null;
          display_order: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name?: string | null;
          logo_url: string;
          website_link?: string | null;
          display_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string | null;
          logo_url?: string;
          website_link?: string | null;
          display_order?: number | null;
          created_at?: string | null;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          nickname: string | null;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
          country?: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          country?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          country?: string | null;
        };
      };
      ads: {
        Row: {
          id: string;
          text: string;
          url: string | null;
          active: boolean;
          start_date: string;
          end_date: string;
          priority: number;
          countries: string[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          text: string;
          url?: string | null;
          active?: boolean;
          start_date: string;
          end_date: string;
          priority?: number;
          countries?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          text?: string;
          url?: string | null;
          active?: boolean;
          start_date?: string;
          end_date?: string;
          priority?: number;
          countries?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Ad = Database['public']['Tables']['ads']['Row'];