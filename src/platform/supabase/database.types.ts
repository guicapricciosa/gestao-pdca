export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_proposals: {
        Row: {
          ai_run_id: string;
          company_id: string;
          confirmed_payload: Json | null;
          created_at: string;
          executed_record_id: string | null;
          executed_record_type: string | null;
          id: string;
          payload: Json;
          payload_version: number;
          proposal_type: string;
          review_reason: string | null;
          reviewed_at: string | null;
          reviewed_by_profile_id: string | null;
          status: string;
          target_security_object_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          ai_run_id: string;
          company_id: string;
          confirmed_payload?: Json | null;
          created_at?: string;
          executed_record_id?: string | null;
          executed_record_type?: string | null;
          id?: string;
          payload: Json;
          payload_version?: number;
          proposal_type: string;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
          status?: string;
          target_security_object_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          ai_run_id?: string;
          company_id?: string;
          confirmed_payload?: Json | null;
          created_at?: string;
          executed_record_id?: string | null;
          executed_record_type?: string | null;
          id?: string;
          payload?: Json;
          payload_version?: number;
          proposal_type?: string;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_profile_id?: string | null;
          status?: string;
          target_security_object_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_proposals_ai_run_id_fkey";
            columns: ["ai_run_id"];
            isOneToOne: false;
            referencedRelation: "ai_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_proposals_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_proposals_reviewed_by_profile_id_fkey";
            columns: ["reviewed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "ai_proposals_reviewed_by_profile_id_fkey";
            columns: ["reviewed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_proposals_target_security_object_id_fkey";
            columns: ["target_security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_run_sources: {
        Row: {
          ai_run_id: string;
          context_role: string;
          security_object_id: string;
          source_version: number;
        };
        Insert: {
          ai_run_id: string;
          context_role: string;
          security_object_id: string;
          source_version: number;
        };
        Update: {
          ai_run_id?: string;
          context_role?: string;
          security_object_id?: string;
          source_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_run_sources_ai_run_id_fkey";
            columns: ["ai_run_id"];
            isOneToOne: false;
            referencedRelation: "ai_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_run_sources_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_runs: {
        Row: {
          company_id: string;
          error_category: string | null;
          finished_at: string | null;
          id: string;
          input_tokens: number | null;
          latency_ms: number | null;
          model_name: string;
          model_provider: string;
          output_tokens: number | null;
          prompt_template_version: string;
          requested_by_profile_id: string;
          started_at: string;
          status: string;
          target_security_object_id: string;
          target_version: number;
          use_case: string;
        };
        Insert: {
          company_id: string;
          error_category?: string | null;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model_name: string;
          model_provider: string;
          output_tokens?: number | null;
          prompt_template_version: string;
          requested_by_profile_id: string;
          started_at?: string;
          status?: string;
          target_security_object_id: string;
          target_version: number;
          use_case: string;
        };
        Update: {
          company_id?: string;
          error_category?: string | null;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model_name?: string;
          model_provider?: string;
          output_tokens?: number | null;
          prompt_template_version?: string;
          requested_by_profile_id?: string;
          started_at?: string;
          status?: string;
          target_security_object_id?: string;
          target_version?: number;
          use_case?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_runs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_runs_requested_by_profile_id_fkey";
            columns: ["requested_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "ai_runs_requested_by_profile_id_fkey";
            columns: ["requested_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_runs_target_security_object_id_fkey";
            columns: ["target_security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by_profile_id: string | null;
          filename: string;
          id: string;
          mime_type: string;
          security_object_id: string;
          size_bytes: number;
          storage_bucket: string;
          storage_path: string;
          uploaded_by_profile_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by_profile_id?: string | null;
          filename: string;
          id?: string;
          mime_type: string;
          security_object_id: string;
          size_bytes: number;
          storage_bucket?: string;
          storage_path: string;
          uploaded_by_profile_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by_profile_id?: string | null;
          filename?: string;
          id?: string;
          mime_type?: string;
          security_object_id?: string;
          size_bytes?: number;
          storage_bucket?: string;
          storage_path?: string;
          uploaded_by_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_deleted_by_profile_id_fkey";
            columns: ["deleted_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "attachments_deleted_by_profile_id_fkey";
            columns: ["deleted_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_profile_id_fkey";
            columns: ["uploaded_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_profile_id_fkey";
            columns: ["uploaded_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_profile_id: string | null;
          actor_type: string;
          after_data: Json | null;
          before_data: Json | null;
          company_id: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          reason: string | null;
          request_id: string | null;
          security_object_id: string | null;
          subject_id: string;
          subject_type: string;
        };
        Insert: {
          action: string;
          actor_profile_id?: string | null;
          actor_type?: string;
          after_data?: Json | null;
          before_data?: Json | null;
          company_id: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          reason?: string | null;
          request_id?: string | null;
          security_object_id?: string | null;
          subject_id: string;
          subject_type: string;
        };
        Update: {
          action?: string;
          actor_profile_id?: string | null;
          actor_type?: string;
          after_data?: Json | null;
          before_data?: Json | null;
          company_id?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          reason?: string | null;
          request_id?: string | null;
          security_object_id?: string | null;
          subject_id?: string;
          subject_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          author_profile_id: string;
          body: string;
          created_at: string;
          edited_at: string | null;
          hidden_at: string | null;
          hidden_by_profile_id: string | null;
          id: string;
          security_object_id: string;
        };
        Insert: {
          author_profile_id: string;
          body: string;
          created_at?: string;
          edited_at?: string | null;
          hidden_at?: string | null;
          hidden_by_profile_id?: string | null;
          id?: string;
          security_object_id: string;
        };
        Update: {
          author_profile_id?: string;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          hidden_at?: string | null;
          hidden_by_profile_id?: string | null;
          id?: string;
          security_object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_profile_id_fkey";
            columns: ["author_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "comments_author_profile_id_fkey";
            columns: ["author_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_hidden_by_profile_id_fkey";
            columns: ["hidden_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "comments_hidden_by_profile_id_fkey";
            columns: ["hidden_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          code: string;
          created_at: string;
          deactivated_at: string | null;
          id: string;
          is_active: boolean;
          legal_name: string | null;
          locale: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          deactivated_at?: string | null;
          id?: string;
          is_active?: boolean;
          legal_name?: string | null;
          locale?: string;
          name: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          deactivated_at?: string | null;
          id?: string;
          is_active?: boolean;
          legal_name?: string | null;
          locale?: string;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decision_pdca_links: {
        Row: {
          created_at: string;
          created_by_profile_id: string;
          decision_id: string;
          pdca_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id: string;
          decision_id: string;
          pdca_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string;
          decision_id?: string;
          pdca_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "decision_pdca_links_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "decision_pdca_links_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_pdca_links_decision_id_fkey";
            columns: ["decision_id"];
            isOneToOne: false;
            referencedRelation: "decision_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_pdca_links_decision_id_fkey";
            columns: ["decision_id"];
            isOneToOne: false;
            referencedRelation: "decisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_pdca_links_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_pdca_links_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
        ];
      };
      decision_status_definitions: {
        Row: {
          code: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      decision_task_links: {
        Row: {
          created_at: string;
          created_by_profile_id: string;
          decision_id: string;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id: string;
          decision_id: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string;
          decision_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "decision_task_links_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "decision_task_links_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_task_links_decision_id_fkey";
            columns: ["decision_id"];
            isOneToOne: false;
            referencedRelation: "decision_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_task_links_decision_id_fkey";
            columns: ["decision_id"];
            isOneToOne: false;
            referencedRelation: "decisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_task_links_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decision_task_links_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      decisions: {
        Row: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          decided_by_profile_id: string | null;
          decision_date: string;
          description: string | null;
          id: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by_profile_id: string;
          decided_by_profile_id?: string | null;
          decision_date?: string;
          description?: string | null;
          id?: string;
          security_object_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by_profile_id?: string;
          decided_by_profile_id?: string | null;
          decision_date?: string;
          description?: string | null;
          id?: string;
          security_object_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "decisions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_decided_by_profile_id_fkey";
            columns: ["decided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "decisions_decided_by_profile_id_fkey";
            columns: ["decided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "decision_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      departments: {
        Row: {
          created_at: string;
          organizational_unit_id: string;
          parent_department_id: string | null;
          unit_type: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Insert: {
          created_at?: string;
          organizational_unit_id: string;
          parent_department_id?: string | null;
          unit_type?: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Update: {
          created_at?: string;
          organizational_unit_id?: string;
          parent_department_id?: string | null;
          unit_type?: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Relationships: [
          {
            foreignKeyName: "departments_base_fk";
            columns: ["organizational_unit_id", "unit_type"];
            isOneToOne: false;
            referencedRelation: "organizational_units";
            referencedColumns: ["id", "unit_type"];
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey";
            columns: ["parent_department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["organizational_unit_id"];
          },
        ];
      };
      execution_status_definitions: {
        Row: {
          code: string;
          is_active: boolean;
          label: string;
          semantic_category: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          is_active?: boolean;
          label: string;
          semantic_category: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          label?: string;
          semantic_category?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      explicit_access_grants: {
        Row: {
          created_at: string;
          granted_by_profile_id: string;
          grantee_profile_id: string;
          id: string;
          permission_id: string;
          reason: string;
          revoked_at: string | null;
          revoked_by_profile_id: string | null;
          security_object_id: string;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          created_at?: string;
          granted_by_profile_id: string;
          grantee_profile_id: string;
          id?: string;
          permission_id: string;
          reason: string;
          revoked_at?: string | null;
          revoked_by_profile_id?: string | null;
          security_object_id: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          created_at?: string;
          granted_by_profile_id?: string;
          grantee_profile_id?: string;
          id?: string;
          permission_id?: string;
          reason?: string;
          revoked_at?: string | null;
          revoked_by_profile_id?: string | null;
          security_object_id?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "explicit_access_grants_granted_by_profile_id_fkey";
            columns: ["granted_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "explicit_access_grants_granted_by_profile_id_fkey";
            columns: ["granted_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "explicit_access_grants_grantee_profile_id_fkey";
            columns: ["grantee_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "explicit_access_grants_grantee_profile_id_fkey";
            columns: ["grantee_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "explicit_access_grants_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "explicit_access_grants_revoked_by_profile_id_fkey";
            columns: ["revoked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "explicit_access_grants_revoked_by_profile_id_fkey";
            columns: ["revoked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "explicit_access_grants_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      hierarchy_relationships: {
        Row: {
          child_assignment_id: string;
          created_at: string;
          created_by_profile_id: string | null;
          id: string;
          is_active: boolean;
          parent_assignment_id: string;
          relationship_type: Database["public"]["Enums"]["hierarchy_relationship_type"];
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          child_assignment_id: string;
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          is_active?: boolean;
          parent_assignment_id: string;
          relationship_type?: Database["public"]["Enums"]["hierarchy_relationship_type"];
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          child_assignment_id?: string;
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          is_active?: boolean;
          parent_assignment_id?: string;
          relationship_type?: Database["public"]["Enums"]["hierarchy_relationship_type"];
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hierarchy_relationships_child_assignment_id_fkey";
            columns: ["child_assignment_id"];
            isOneToOne: false;
            referencedRelation: "organizational_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hierarchy_relationships_child_assignment_id_fkey";
            columns: ["child_assignment_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["assignment_id"];
          },
          {
            foreignKeyName: "hierarchy_relationships_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "hierarchy_relationships_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hierarchy_relationships_parent_assignment_id_fkey";
            columns: ["parent_assignment_id"];
            isOneToOne: false;
            referencedRelation: "organizational_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hierarchy_relationships_parent_assignment_id_fkey";
            columns: ["parent_assignment_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["assignment_id"];
          },
        ];
      };
      meeting_agenda_items: {
        Row: {
          carried_forward_from_id: string | null;
          created_at: string;
          created_by_profile_id: string;
          description: string | null;
          estimated_minutes: number | null;
          id: string;
          meeting_session_id: string;
          position: number;
          presenter_profile_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          carried_forward_from_id?: string | null;
          created_at?: string;
          created_by_profile_id: string;
          description?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          meeting_session_id: string;
          position: number;
          presenter_profile_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          carried_forward_from_id?: string | null;
          created_at?: string;
          created_by_profile_id?: string;
          description?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          meeting_session_id?: string;
          position?: number;
          presenter_profile_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_carried_forward_from_id_fkey";
            columns: ["carried_forward_from_id"];
            isOneToOne: false;
            referencedRelation: "meeting_agenda_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_presenter_profile_id_fkey";
            columns: ["presenter_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_presenter_profile_id_fkey";
            columns: ["presenter_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_agenda_items_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "meeting_agenda_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      meeting_agenda_status_definitions: {
        Row: {
          code: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      meeting_notes: {
        Row: {
          author_profile_id: string;
          content: string;
          created_at: string;
          hidden_at: string | null;
          hidden_by_profile_id: string | null;
          id: string;
          meeting_agenda_item_id: string | null;
          meeting_session_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          author_profile_id: string;
          content: string;
          created_at?: string;
          hidden_at?: string | null;
          hidden_by_profile_id?: string | null;
          id?: string;
          meeting_agenda_item_id?: string | null;
          meeting_session_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          author_profile_id?: string;
          content?: string;
          created_at?: string;
          hidden_at?: string | null;
          hidden_by_profile_id?: string | null;
          id?: string;
          meeting_agenda_item_id?: string | null;
          meeting_session_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_notes_author_profile_id_fkey";
            columns: ["author_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_notes_author_profile_id_fkey";
            columns: ["author_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_hidden_by_profile_id_fkey";
            columns: ["hidden_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_notes_hidden_by_profile_id_fkey";
            columns: ["hidden_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_meeting_agenda_item_id_fkey";
            columns: ["meeting_agenda_item_id"];
            isOneToOne: false;
            referencedRelation: "meeting_agenda_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_object_links: {
        Row: {
          id: string;
          linked_at: string;
          linked_by_profile_id: string;
          meeting_agenda_item_id: string | null;
          meeting_session_id: string;
          outcome_notes: string | null;
          relation_type: Database["public"]["Enums"]["meeting_object_relation"];
          security_object_id: string;
          unlinked_at: string | null;
          unlinked_by_profile_id: string | null;
        };
        Insert: {
          id?: string;
          linked_at?: string;
          linked_by_profile_id: string;
          meeting_agenda_item_id?: string | null;
          meeting_session_id: string;
          outcome_notes?: string | null;
          relation_type: Database["public"]["Enums"]["meeting_object_relation"];
          security_object_id: string;
          unlinked_at?: string | null;
          unlinked_by_profile_id?: string | null;
        };
        Update: {
          id?: string;
          linked_at?: string;
          linked_by_profile_id?: string;
          meeting_agenda_item_id?: string | null;
          meeting_session_id?: string;
          outcome_notes?: string | null;
          relation_type?: Database["public"]["Enums"]["meeting_object_relation"];
          security_object_id?: string;
          unlinked_at?: string | null;
          unlinked_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_object_links_linked_by_profile_id_fkey";
            columns: ["linked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_object_links_linked_by_profile_id_fkey";
            columns: ["linked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_object_links_meeting_agenda_item_id_fkey";
            columns: ["meeting_agenda_item_id"];
            isOneToOne: false;
            referencedRelation: "meeting_agenda_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_object_links_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_object_links_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_object_links_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_object_links_unlinked_by_profile_id_fkey";
            columns: ["unlinked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_object_links_unlinked_by_profile_id_fkey";
            columns: ["unlinked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_participants: {
        Row: {
          added_by_profile_id: string;
          attended: boolean | null;
          created_at: string;
          id: string;
          invitation_status: string;
          joined_at: string | null;
          left_at: string | null;
          meeting_session_id: string;
          participant_role: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id: string;
          removed_at: string | null;
          removed_by_profile_id: string | null;
        };
        Insert: {
          added_by_profile_id: string;
          attended?: boolean | null;
          created_at?: string;
          id?: string;
          invitation_status?: string;
          joined_at?: string | null;
          left_at?: string | null;
          meeting_session_id: string;
          participant_role?: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id: string;
          removed_at?: string | null;
          removed_by_profile_id?: string | null;
        };
        Update: {
          added_by_profile_id?: string;
          attended?: boolean | null;
          created_at?: string;
          id?: string;
          invitation_status?: string;
          joined_at?: string | null;
          left_at?: string | null;
          meeting_session_id?: string;
          participant_role?: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id?: string;
          removed_at?: string | null;
          removed_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_participants_added_by_profile_id_fkey";
            columns: ["added_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_participants_added_by_profile_id_fkey";
            columns: ["added_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_removed_by_profile_id_fkey";
            columns: ["removed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_participants_removed_by_profile_id_fkey";
            columns: ["removed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_publications: {
        Row: {
          id: string;
          meeting_session_id: string;
          publication_number: number;
          published_at: string;
          published_by_profile_id: string;
          snapshot: Json;
        };
        Insert: {
          id?: string;
          meeting_session_id: string;
          publication_number: number;
          published_at?: string;
          published_by_profile_id: string;
          snapshot: Json;
        };
        Update: {
          id?: string;
          meeting_session_id?: string;
          publication_number?: number;
          published_at?: string;
          published_by_profile_id?: string;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_publications_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_publications_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_publications_published_by_profile_id_fkey";
            columns: ["published_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_publications_published_by_profile_id_fkey";
            columns: ["published_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_reopening_events: {
        Row: {
          id: string;
          meeting_session_id: string;
          reason: string;
          reopened_at: string;
          reopened_by_profile_id: string;
        };
        Insert: {
          id?: string;
          meeting_session_id: string;
          reason: string;
          reopened_at?: string;
          reopened_by_profile_id: string;
        };
        Update: {
          id?: string;
          meeting_session_id?: string;
          reason?: string;
          reopened_at?: string;
          reopened_by_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_reopening_events_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_reopening_events_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_reopening_events_reopened_by_profile_id_fkey";
            columns: ["reopened_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_reopening_events_reopened_by_profile_id_fkey";
            columns: ["reopened_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_series: {
        Row: {
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          deactivated_at: string | null;
          default_chair_profile_id: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          meeting_type: string;
          recurrence: Json;
          recurrence_metadata: Json;
          recurrence_rule: string | null;
          security_object_id: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by_profile_id: string;
          deactivated_at?: string | null;
          default_chair_profile_id?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          meeting_type: string;
          recurrence?: Json;
          recurrence_metadata?: Json;
          recurrence_rule?: string | null;
          security_object_id: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by_profile_id?: string;
          deactivated_at?: string | null;
          default_chair_profile_id?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          meeting_type?: string;
          recurrence?: Json;
          recurrence_metadata?: Json;
          recurrence_rule?: string | null;
          security_object_id?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_series_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_series_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_series_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_series_default_chair_profile_id_fkey";
            columns: ["default_chair_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_series_default_chair_profile_id_fkey";
            columns: ["default_chair_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_series_meeting_type_fkey";
            columns: ["meeting_type"];
            isOneToOne: false;
            referencedRelation: "meeting_type_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "meeting_series_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_series_participants: {
        Row: {
          added_by_profile_id: string;
          created_at: string;
          ended_at: string | null;
          ended_by_profile_id: string | null;
          id: string;
          meeting_series_id: string;
          participant_role: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id: string;
        };
        Insert: {
          added_by_profile_id: string;
          created_at?: string;
          ended_at?: string | null;
          ended_by_profile_id?: string | null;
          id?: string;
          meeting_series_id: string;
          participant_role?: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id: string;
        };
        Update: {
          added_by_profile_id?: string;
          created_at?: string;
          ended_at?: string | null;
          ended_by_profile_id?: string | null;
          id?: string;
          meeting_series_id?: string;
          participant_role?: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_series_participants_added_by_profile_id_fkey";
            columns: ["added_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_series_participants_added_by_profile_id_fkey";
            columns: ["added_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_series_participants_ended_by_profile_id_fkey";
            columns: ["ended_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_series_participants_ended_by_profile_id_fkey";
            columns: ["ended_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_series_participants_meeting_series_id_fkey";
            columns: ["meeting_series_id"];
            isOneToOne: false;
            referencedRelation: "meeting_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_series_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_series_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_session_status_transitions: {
        Row: {
          changed_at: string;
          changed_by_profile_id: string;
          from_status: string | null;
          id: string;
          meeting_session_id: string;
          reason: string | null;
          to_status: string;
        };
        Insert: {
          changed_at?: string;
          changed_by_profile_id: string;
          from_status?: string | null;
          id?: string;
          meeting_session_id: string;
          reason?: string | null;
          to_status: string;
        };
        Update: {
          changed_at?: string;
          changed_by_profile_id?: string;
          from_status?: string | null;
          id?: string;
          meeting_session_id?: string;
          reason?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_session_status_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_session_status_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_session_status_transitions_from_status_fkey";
            columns: ["from_status"];
            isOneToOne: false;
            referencedRelation: "meeting_status_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "meeting_session_status_transitions_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_session_status_transitions_meeting_session_id_fkey";
            columns: ["meeting_session_id"];
            isOneToOne: false;
            referencedRelation: "meeting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_session_status_transitions_to_status_fkey";
            columns: ["to_status"];
            isOneToOne: false;
            referencedRelation: "meeting_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      meeting_sessions: {
        Row: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          chair_profile_id: string;
          closed_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          meeting_series_id: string | null;
          published_at: string | null;
          reopened_at: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          chair_profile_id: string;
          closed_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by_profile_id: string;
          id?: string;
          meeting_series_id?: string | null;
          published_at?: string | null;
          reopened_at?: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          chair_profile_id?: string;
          closed_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by_profile_id?: string;
          id?: string;
          meeting_series_id?: string | null;
          published_at?: string | null;
          reopened_at?: string | null;
          scheduled_end_at?: string;
          scheduled_start_at?: string;
          security_object_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_sessions_chair_profile_id_fkey";
            columns: ["chair_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_sessions_chair_profile_id_fkey";
            columns: ["chair_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_sessions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_meeting_series_id_fkey";
            columns: ["meeting_series_id"];
            isOneToOne: false;
            referencedRelation: "meeting_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "meeting_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      meeting_status_definitions: {
        Row: {
          code: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      meeting_templates: {
        Row: {
          agenda: Json;
          all_restaurants: boolean;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          default_duration_minutes: number;
          id: string;
          is_active: boolean;
          meeting_type: string;
          name: string;
          participant_profile_ids: string[];
          recurrence: Json;
          restaurant_ids: string[];
          sort_order: number;
          unit_ids: string[];
          updated_at: string;
          version: number;
          visibility: Database["public"]["Enums"]["visibility_mode"];
        };
        Insert: {
          agenda?: Json;
          all_restaurants?: boolean;
          company_id: string;
          created_at?: string;
          created_by_profile_id: string;
          default_duration_minutes?: number;
          id?: string;
          is_active?: boolean;
          meeting_type?: string;
          name: string;
          participant_profile_ids?: string[];
          recurrence?: Json;
          restaurant_ids?: string[];
          sort_order?: number;
          unit_ids?: string[];
          updated_at?: string;
          version?: number;
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Update: {
          agenda?: Json;
          all_restaurants?: boolean;
          company_id?: string;
          created_at?: string;
          created_by_profile_id?: string;
          default_duration_minutes?: number;
          id?: string;
          is_active?: boolean;
          meeting_type?: string;
          name?: string;
          participant_profile_ids?: string[];
          recurrence?: Json;
          restaurant_ids?: string[];
          sort_order?: number;
          unit_ids?: string[];
          updated_at?: string;
          version?: number;
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Relationships: [
          {
            foreignKeyName: "meeting_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_templates_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_templates_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_templates_meeting_type_fkey";
            columns: ["meeting_type"];
            isOneToOne: false;
            referencedRelation: "meeting_type_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      meeting_type_definitions: {
        Row: {
          code: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          attempt_count: number;
          available_at: string;
          channel: string;
          created_at: string;
          id: string;
          last_error: string | null;
          notification_id: string;
          provider_status: number | null;
          status: string;
          subscription_id: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          channel?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          notification_id: string;
          provider_status?: number | null;
          status?: string;
          subscription_id: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          channel?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          notification_id?: string;
          provider_status?: number | null;
          status?: string;
          subscription_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_deliveries_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "push_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          collaboration: boolean;
          deadline_days: number;
          meeting_changes: boolean;
          meeting_participation: boolean;
          meeting_reminders: boolean;
          pdcas: boolean;
          profile_id: string;
          push_enabled: boolean;
          tasks: boolean;
          updated_at: string;
        };
        Insert: {
          collaboration?: boolean;
          deadline_days?: number;
          meeting_changes?: boolean;
          meeting_participation?: boolean;
          meeting_reminders?: boolean;
          pdcas?: boolean;
          profile_id: string;
          push_enabled?: boolean;
          tasks?: boolean;
          updated_at?: string;
        };
        Update: {
          collaboration?: boolean;
          deadline_days?: number;
          meeting_changes?: boolean;
          meeting_participation?: boolean;
          meeting_reminders?: boolean;
          pdcas?: boolean;
          profile_id?: string;
          push_enabled?: boolean;
          tasks?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          category: string;
          company_id: string;
          created_at: string;
          dedupe_key: string;
          href: string;
          id: string;
          metadata: Json;
          read_at: string | null;
          recipient_profile_id: string;
          security_object_id: string | null;
          sensitive: boolean;
          source_event_id: string | null;
          target_id: string;
          target_kind: string;
          title: string;
          type: string;
        };
        Insert: {
          category: string;
          company_id: string;
          created_at?: string;
          dedupe_key: string;
          href: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          recipient_profile_id: string;
          security_object_id?: string | null;
          sensitive?: boolean;
          source_event_id?: string | null;
          target_id: string;
          target_kind: string;
          title: string;
          type: string;
        };
        Update: {
          category?: string;
          company_id?: string;
          created_at?: string;
          dedupe_key?: string;
          href?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          recipient_profile_id?: string;
          security_object_id?: string | null;
          sensitive?: boolean;
          source_event_id?: string | null;
          target_id?: string;
          target_kind?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey";
            columns: ["recipient_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey";
            columns: ["recipient_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_source_event_id_fkey";
            columns: ["source_event_id"];
            isOneToOne: false;
            referencedRelation: "outbox_events";
            referencedColumns: ["id"];
          },
        ];
      };
      object_memberships: {
        Row: {
          added_by_profile_id: string;
          created_at: string;
          ended_at: string | null;
          ended_by_profile_id: string | null;
          id: string;
          membership_role: Database["public"]["Enums"]["object_membership_role"];
          profile_id: string;
          security_object_id: string;
        };
        Insert: {
          added_by_profile_id: string;
          created_at?: string;
          ended_at?: string | null;
          ended_by_profile_id?: string | null;
          id?: string;
          membership_role: Database["public"]["Enums"]["object_membership_role"];
          profile_id: string;
          security_object_id: string;
        };
        Update: {
          added_by_profile_id?: string;
          created_at?: string;
          ended_at?: string | null;
          ended_by_profile_id?: string | null;
          id?: string;
          membership_role?: Database["public"]["Enums"]["object_membership_role"];
          profile_id?: string;
          security_object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "object_memberships_added_by_profile_id_fkey";
            columns: ["added_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "object_memberships_added_by_profile_id_fkey";
            columns: ["added_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_memberships_ended_by_profile_id_fkey";
            columns: ["ended_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "object_memberships_ended_by_profile_id_fkey";
            columns: ["ended_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "object_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_memberships_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      object_scope_organizational_units: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          organizational_unit_id: string;
          security_object_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          organizational_unit_id: string;
          security_object_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          organizational_unit_id?: string;
          security_object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "object_scope_organizational_units_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "object_scope_organizational_units_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_scope_organizational_units_organizational_unit_id_fkey";
            columns: ["organizational_unit_id"];
            isOneToOne: false;
            referencedRelation: "organizational_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_scope_organizational_units_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      object_scope_restaurants: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          restaurant_id: string;
          security_object_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          restaurant_id: string;
          security_object_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          restaurant_id?: string;
          security_object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "object_scope_restaurants_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "object_scope_restaurants_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_scope_restaurants_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "object_scope_restaurants_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      organizational_assignments: {
        Row: {
          company_id: string;
          created_at: string;
          created_by_profile_id: string | null;
          id: string;
          is_active: boolean;
          organizational_unit_id: string | null;
          profile_id: string;
          restaurant_scope_mode: Database["public"]["Enums"]["restaurant_scope_mode"];
          role_id: string;
          title: string | null;
          unit_scope_mode: Database["public"]["Enums"]["unit_scope_mode"];
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          is_active?: boolean;
          organizational_unit_id?: string | null;
          profile_id: string;
          restaurant_scope_mode?: Database["public"]["Enums"]["restaurant_scope_mode"];
          role_id: string;
          title?: string | null;
          unit_scope_mode?: Database["public"]["Enums"]["unit_scope_mode"];
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          is_active?: boolean;
          organizational_unit_id?: string | null;
          profile_id?: string;
          restaurant_scope_mode?: Database["public"]["Enums"]["restaurant_scope_mode"];
          role_id?: string;
          title?: string | null;
          unit_scope_mode?: Database["public"]["Enums"]["unit_scope_mode"];
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizational_assignments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizational_assignments_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "organizational_assignments_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizational_assignments_organizational_unit_id_fkey";
            columns: ["organizational_unit_id"];
            isOneToOne: false;
            referencedRelation: "organizational_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizational_assignments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "organizational_assignments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizational_assignments_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizational_units: {
        Row: {
          active_from: string;
          active_to: string | null;
          code: string;
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          metadata: Json;
          name: string;
          unit_type: Database["public"]["Enums"]["organizational_unit_type"];
          updated_at: string;
        };
        Insert: {
          active_from?: string;
          active_to?: string | null;
          code: string;
          company_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json;
          name: string;
          unit_type: Database["public"]["Enums"]["organizational_unit_type"];
          updated_at?: string;
        };
        Update: {
          active_from?: string;
          active_to?: string | null;
          code?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json;
          name?: string;
          unit_type?: Database["public"]["Enums"]["organizational_unit_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizational_units_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      outbox_events: {
        Row: {
          attempt_count: number;
          available_at: string;
          company_id: string;
          event_type: string;
          id: string;
          idempotency_key: string;
          last_error: string | null;
          occurred_at: string;
          payload: Json;
          payload_version: number;
          processed_at: string | null;
          security_object_id: string | null;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          company_id: string;
          event_type: string;
          id?: string;
          idempotency_key: string;
          last_error?: string | null;
          occurred_at?: string;
          payload: Json;
          payload_version?: number;
          processed_at?: string | null;
          security_object_id?: string | null;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          company_id?: string;
          event_type?: string;
          id?: string;
          idempotency_key?: string;
          last_error?: string | null;
          occurred_at?: string;
          payload?: Json;
          payload_version?: number;
          processed_at?: string | null;
          security_object_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "outbox_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbox_events_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_blockers: {
        Row: {
          blocked_at: string;
          blocked_by_profile_id: string;
          id: string;
          pdca_id: string;
          reason: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by_profile_id: string | null;
        };
        Insert: {
          blocked_at?: string;
          blocked_by_profile_id: string;
          id?: string;
          pdca_id: string;
          reason: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by_profile_id?: string | null;
        };
        Update: {
          blocked_at?: string;
          blocked_by_profile_id?: string;
          id?: string;
          pdca_id?: string;
          reason?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pdca_blockers_blocked_by_profile_id_fkey";
            columns: ["blocked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_blockers_blocked_by_profile_id_fkey";
            columns: ["blocked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_blockers_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_blockers_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_blockers_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_blockers_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_completion_events: {
        Row: {
          actual_result_snapshot: string | null;
          closure_notes: string | null;
          completed_at: string;
          completed_by_profile_id: string;
          cycle_number: number;
          due_date_snapshot: string | null;
          id: string;
          pdca_id: string;
        };
        Insert: {
          actual_result_snapshot?: string | null;
          closure_notes?: string | null;
          completed_at?: string;
          completed_by_profile_id: string;
          cycle_number: number;
          due_date_snapshot?: string | null;
          id?: string;
          pdca_id: string;
        };
        Update: {
          actual_result_snapshot?: string | null;
          closure_notes?: string | null;
          completed_at?: string;
          completed_by_profile_id?: string;
          cycle_number?: number;
          due_date_snapshot?: string | null;
          id?: string;
          pdca_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pdca_completion_events_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_completion_events_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_completion_events_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_completion_events_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_dependencies: {
        Row: {
          created_at: string;
          created_by_profile_id: string;
          dependency_kind: Database["public"]["Enums"]["pdca_dependency_kind"];
          depends_on_pdca_id: string | null;
          depends_on_task_id: string | null;
          external_label: string | null;
          id: string;
          is_resolved: boolean;
          pdca_id: string;
          resolved_at: string | null;
          resolved_by_profile_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id: string;
          dependency_kind: Database["public"]["Enums"]["pdca_dependency_kind"];
          depends_on_pdca_id?: string | null;
          depends_on_task_id?: string | null;
          external_label?: string | null;
          id?: string;
          is_resolved?: boolean;
          pdca_id: string;
          resolved_at?: string | null;
          resolved_by_profile_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string;
          dependency_kind?: Database["public"]["Enums"]["pdca_dependency_kind"];
          depends_on_pdca_id?: string | null;
          depends_on_task_id?: string | null;
          external_label?: string | null;
          id?: string;
          is_resolved?: boolean;
          pdca_id?: string;
          resolved_at?: string | null;
          resolved_by_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pdca_dependencies_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_dependencies_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_depends_on_pdca_id_fkey";
            columns: ["depends_on_pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_depends_on_pdca_id_fkey";
            columns: ["depends_on_pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_depends_on_task_id_fkey";
            columns: ["depends_on_task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_depends_on_task_id_fkey";
            columns: ["depends_on_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_dependencies_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_dependencies_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_due_date_changes: {
        Row: {
          changed_at: string;
          changed_by_profile_id: string;
          id: string;
          new_due_date: string | null;
          old_due_date: string | null;
          pdca_id: string;
          reason: string;
        };
        Insert: {
          changed_at?: string;
          changed_by_profile_id: string;
          id?: string;
          new_due_date?: string | null;
          old_due_date?: string | null;
          pdca_id: string;
          reason: string;
        };
        Update: {
          changed_at?: string;
          changed_by_profile_id?: string;
          id?: string;
          new_due_date?: string | null;
          old_due_date?: string | null;
          pdca_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pdca_due_date_changes_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_due_date_changes_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_due_date_changes_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_due_date_changes_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_phase_transitions: {
        Row: {
          changed_at: string;
          changed_by_profile_id: string;
          from_phase: Database["public"]["Enums"]["pdca_phase"] | null;
          id: string;
          pdca_id: string;
          reason: string | null;
          to_phase: Database["public"]["Enums"]["pdca_phase"];
        };
        Insert: {
          changed_at?: string;
          changed_by_profile_id: string;
          from_phase?: Database["public"]["Enums"]["pdca_phase"] | null;
          id?: string;
          pdca_id: string;
          reason?: string | null;
          to_phase: Database["public"]["Enums"]["pdca_phase"];
        };
        Update: {
          changed_at?: string;
          changed_by_profile_id?: string;
          from_phase?: Database["public"]["Enums"]["pdca_phase"] | null;
          id?: string;
          pdca_id?: string;
          reason?: string | null;
          to_phase?: Database["public"]["Enums"]["pdca_phase"];
        };
        Relationships: [
          {
            foreignKeyName: "pdca_phase_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_phase_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_phase_transitions_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_phase_transitions_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_reopening_events: {
        Row: {
          id: string;
          pdca_id: string;
          previous_completion_event_id: string;
          reason: string;
          reopened_at: string;
          reopened_by_profile_id: string;
        };
        Insert: {
          id?: string;
          pdca_id: string;
          previous_completion_event_id: string;
          reason: string;
          reopened_at?: string;
          reopened_by_profile_id: string;
        };
        Update: {
          id?: string;
          pdca_id?: string;
          previous_completion_event_id?: string;
          reason?: string;
          reopened_at?: string;
          reopened_by_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pdca_reopening_events_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_reopening_events_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_reopening_events_previous_completion_event_id_fkey";
            columns: ["previous_completion_event_id"];
            isOneToOne: false;
            referencedRelation: "pdca_completion_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_reopening_events_reopened_by_profile_id_fkey";
            columns: ["reopened_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_reopening_events_reopened_by_profile_id_fkey";
            columns: ["reopened_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pdca_status_transitions: {
        Row: {
          changed_at: string;
          changed_by_profile_id: string;
          from_status: string | null;
          id: string;
          pdca_id: string;
          reason: string | null;
          to_status: string;
        };
        Insert: {
          changed_at?: string;
          changed_by_profile_id: string;
          from_status?: string | null;
          id?: string;
          pdca_id: string;
          reason?: string | null;
          to_status: string;
        };
        Update: {
          changed_at?: string;
          changed_by_profile_id?: string;
          from_status?: string | null;
          id?: string;
          pdca_id?: string;
          reason?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pdca_status_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdca_status_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_status_transitions_from_status_fkey";
            columns: ["from_status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdca_status_transitions_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_status_transitions_pdca_id_fkey";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdca_status_transitions_to_status_fkey";
            columns: ["to_status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      pdcas: {
        Row: {
          actual_result: string | null;
          archived_at: string | null;
          check_notes: string | null;
          closure_notes: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          corrective_action: string | null;
          created_at: string;
          created_by_profile_id: string;
          due_date: string | null;
          expected_result: string | null;
          first_action_at: string | null;
          id: string;
          impact: string;
          kpi_baseline: number | null;
          kpi_measurement_method: string | null;
          kpi_name: string | null;
          kpi_result: number | null;
          kpi_target: number | null;
          kpi_unit: string | null;
          last_activity_at: string;
          objective: string | null;
          originating_decision_id: string | null;
          outcome_notes: string | null;
          owner_profile_id: string | null;
          phase: Database["public"]["Enums"]["pdca_phase"];
          plan_summary: string | null;
          priority: string;
          problem_statement: string | null;
          responsible_profile_id: string | null;
          risk: string;
          root_cause_or_hypothesis: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          actual_result?: string | null;
          archived_at?: string | null;
          check_notes?: string | null;
          closure_notes?: string | null;
          company_id: string;
          completed_at?: string | null;
          completed_by_profile_id?: string | null;
          corrective_action?: string | null;
          created_at?: string;
          created_by_profile_id: string;
          due_date?: string | null;
          expected_result?: string | null;
          first_action_at?: string | null;
          id?: string;
          impact?: string;
          kpi_baseline?: number | null;
          kpi_measurement_method?: string | null;
          kpi_name?: string | null;
          kpi_result?: number | null;
          kpi_target?: number | null;
          kpi_unit?: string | null;
          last_activity_at?: string;
          objective?: string | null;
          originating_decision_id?: string | null;
          outcome_notes?: string | null;
          owner_profile_id?: string | null;
          phase?: Database["public"]["Enums"]["pdca_phase"];
          plan_summary?: string | null;
          priority?: string;
          problem_statement?: string | null;
          responsible_profile_id?: string | null;
          risk?: string;
          root_cause_or_hypothesis?: string | null;
          security_object_id: string;
          start_date?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          actual_result?: string | null;
          archived_at?: string | null;
          check_notes?: string | null;
          closure_notes?: string | null;
          company_id?: string;
          completed_at?: string | null;
          completed_by_profile_id?: string | null;
          corrective_action?: string | null;
          created_at?: string;
          created_by_profile_id?: string;
          due_date?: string | null;
          expected_result?: string | null;
          first_action_at?: string | null;
          id?: string;
          impact?: string;
          kpi_baseline?: number | null;
          kpi_measurement_method?: string | null;
          kpi_name?: string | null;
          kpi_result?: number | null;
          kpi_target?: number | null;
          kpi_unit?: string | null;
          last_activity_at?: string;
          objective?: string | null;
          originating_decision_id?: string | null;
          outcome_notes?: string | null;
          owner_profile_id?: string | null;
          phase?: Database["public"]["Enums"]["pdca_phase"];
          plan_summary?: string | null;
          priority?: string;
          problem_statement?: string | null;
          responsible_profile_id?: string | null;
          risk?: string;
          root_cause_or_hypothesis?: string | null;
          security_object_id?: string;
          start_date?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pdcas_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdcas_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdcas_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_impact_fkey";
            columns: ["impact"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdcas_originating_decision_id_fkey";
            columns: ["originating_decision_id"];
            isOneToOne: false;
            referencedRelation: "decision_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_originating_decision_id_fkey";
            columns: ["originating_decision_id"];
            isOneToOne: false;
            referencedRelation: "decisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdcas_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_priority_fkey";
            columns: ["priority"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdcas_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdcas_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_risk_fkey";
            columns: ["risk"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdcas_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      permissions: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          is_delegable: boolean;
          permission_key: string;
          risk_level: number;
          scope_requirement: Database["public"]["Enums"]["scope_requirement"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          is_active?: boolean;
          is_delegable?: boolean;
          permission_key: string;
          risk_level?: number;
          scope_requirement?: Database["public"]["Enums"]["scope_requirement"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          is_delegable?: boolean;
          permission_key?: string;
          risk_level?: number;
          scope_requirement?: Database["public"]["Enums"]["scope_requirement"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          auth_user_id: string;
          created_at: string;
          deactivated_at: string | null;
          display_name: string;
          email_snapshot: string;
          id: string;
          is_active: boolean;
          last_seen_at: string | null;
          preferred_locale: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          deactivated_at?: string | null;
          display_name: string;
          email_snapshot: string;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          preferred_locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          deactivated_at?: string | null;
          display_name?: string;
          email_snapshot?: string;
          id?: string;
          is_active?: boolean;
          last_seen_at?: string | null;
          preferred_locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          failure_count: number;
          id: string;
          last_seen_at: string;
          p256dh: string;
          profile_id: string;
          revoked_at: string | null;
          revoked_reason: string | null;
          user_agent: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          failure_count?: number;
          id?: string;
          last_seen_at?: string;
          p256dh: string;
          profile_id: string;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          failure_count?: number;
          id?: string;
          last_seen_at?: string;
          p256dh?: string;
          profile_id?: string;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_assignments: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          id: string;
          is_active: boolean;
          organizational_assignment_id: string;
          responsibility_type: Database["public"]["Enums"]["restaurant_responsibility_type"];
          restaurant_id: string;
          updated_at: string;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          is_active?: boolean;
          organizational_assignment_id: string;
          responsibility_type?: Database["public"]["Enums"]["restaurant_responsibility_type"];
          restaurant_id: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          id?: string;
          is_active?: boolean;
          organizational_assignment_id?: string;
          responsibility_type?: Database["public"]["Enums"]["restaurant_responsibility_type"];
          restaurant_id?: string;
          updated_at?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_assignments_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "restaurant_assignments_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_assignments_organizational_assignment_id_fkey";
            columns: ["organizational_assignment_id"];
            isOneToOne: false;
            referencedRelation: "organizational_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_assignments_organizational_assignment_id_fkey";
            columns: ["organizational_assignment_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["assignment_id"];
          },
          {
            foreignKeyName: "restaurant_assignments_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          address: Json;
          closed_on: string | null;
          code: string;
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          metadata: Json;
          name: string;
          opened_on: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: Json;
          closed_on?: string | null;
          code: string;
          company_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json;
          name: string;
          opened_on?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: Json;
          closed_on?: string | null;
          code?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json;
          name?: string;
          opened_on?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurants_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          created_by_profile_id: string | null;
          permission_id: string;
          role_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id?: string | null;
          permission_id: string;
          role_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string | null;
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "role_permissions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          company_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          company_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          company_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      security_objects: {
        Row: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          object_type: string;
          updated_at: string;
          version: number;
          visibility: Database["public"]["Enums"]["visibility_mode"];
        };
        Insert: {
          archived_at?: string | null;
          company_id: string;
          created_at?: string;
          created_by_profile_id: string;
          id?: string;
          object_type: string;
          updated_at?: string;
          version?: number;
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          created_at?: string;
          created_by_profile_id?: string;
          id?: string;
          object_type?: string;
          updated_at?: string;
          version?: number;
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Relationships: [
          {
            foreignKeyName: "security_objects_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "security_objects_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "security_objects_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      severity_definitions: {
        Row: {
          code: string;
          is_active: boolean;
          label: string;
          sort_order: number;
          weight: number;
        };
        Insert: {
          code: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
          weight: number;
        };
        Update: {
          code?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
          weight?: number;
        };
        Relationships: [];
      };
      shared_services: {
        Row: {
          created_at: string;
          organizational_unit_id: string;
          provider_company_id: string | null;
          unit_type: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Insert: {
          created_at?: string;
          organizational_unit_id: string;
          provider_company_id?: string | null;
          unit_type?: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Update: {
          created_at?: string;
          organizational_unit_id?: string;
          provider_company_id?: string | null;
          unit_type?: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Relationships: [
          {
            foreignKeyName: "shared_services_base_fk";
            columns: ["organizational_unit_id", "unit_type"];
            isOneToOne: false;
            referencedRelation: "organizational_units";
            referencedColumns: ["id", "unit_type"];
          },
          {
            foreignKeyName: "shared_services_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      task_blockers: {
        Row: {
          blocked_at: string;
          blocked_by_profile_id: string;
          id: string;
          reason: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by_profile_id: string | null;
          task_id: string;
        };
        Insert: {
          blocked_at?: string;
          blocked_by_profile_id: string;
          id?: string;
          reason: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by_profile_id?: string | null;
          task_id: string;
        };
        Update: {
          blocked_at?: string;
          blocked_by_profile_id?: string;
          id?: string;
          reason?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by_profile_id?: string | null;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_blockers_blocked_by_profile_id_fkey";
            columns: ["blocked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_blockers_blocked_by_profile_id_fkey";
            columns: ["blocked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_blockers_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_blockers_resolved_by_profile_id_fkey";
            columns: ["resolved_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_blockers_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_blockers_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_completion_events: {
        Row: {
          completed_at: string;
          completed_by_profile_id: string;
          completion_notes: string | null;
          cycle_number: number;
          due_date_snapshot: string | null;
          id: string;
          task_id: string;
        };
        Insert: {
          completed_at?: string;
          completed_by_profile_id: string;
          completion_notes?: string | null;
          cycle_number: number;
          due_date_snapshot?: string | null;
          id?: string;
          task_id: string;
        };
        Update: {
          completed_at?: string;
          completed_by_profile_id?: string;
          completion_notes?: string | null;
          cycle_number?: number;
          due_date_snapshot?: string | null;
          id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_completion_events_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_completion_events_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_completion_events_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_completion_events_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_dependencies: {
        Row: {
          created_at: string;
          created_by_profile_id: string;
          depends_on_task_id: string;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_profile_id: string;
          depends_on_task_id: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          created_by_profile_id?: string;
          depends_on_task_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_dependencies_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_dependencies_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey";
            columns: ["depends_on_task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey";
            columns: ["depends_on_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_due_date_changes: {
        Row: {
          changed_at: string;
          changed_by_profile_id: string;
          id: string;
          new_due_date: string | null;
          old_due_date: string | null;
          reason: string;
          task_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by_profile_id: string;
          id?: string;
          new_due_date?: string | null;
          old_due_date?: string | null;
          reason: string;
          task_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by_profile_id?: string;
          id?: string;
          new_due_date?: string | null;
          old_due_date?: string | null;
          reason?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_due_date_changes_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_due_date_changes_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_due_date_changes_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_due_date_changes_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_reopening_events: {
        Row: {
          id: string;
          previous_completion_event_id: string;
          reason: string;
          reopened_at: string;
          reopened_by_profile_id: string;
          task_id: string;
        };
        Insert: {
          id?: string;
          previous_completion_event_id: string;
          reason: string;
          reopened_at?: string;
          reopened_by_profile_id: string;
          task_id: string;
        };
        Update: {
          id?: string;
          previous_completion_event_id?: string;
          reason?: string;
          reopened_at?: string;
          reopened_by_profile_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_reopening_events_previous_completion_event_id_fkey";
            columns: ["previous_completion_event_id"];
            isOneToOne: false;
            referencedRelation: "task_completion_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_reopening_events_reopened_by_profile_id_fkey";
            columns: ["reopened_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_reopening_events_reopened_by_profile_id_fkey";
            columns: ["reopened_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_reopening_events_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_reopening_events_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_status_transitions: {
        Row: {
          changed_at: string;
          changed_by_profile_id: string;
          from_status: string | null;
          id: string;
          reason: string | null;
          task_id: string;
          to_status: string;
        };
        Insert: {
          changed_at?: string;
          changed_by_profile_id: string;
          from_status?: string | null;
          id?: string;
          reason?: string | null;
          task_id: string;
          to_status: string;
        };
        Update: {
          changed_at?: string;
          changed_by_profile_id?: string;
          from_status?: string | null;
          id?: string;
          reason?: string | null;
          task_id?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_status_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "task_status_transitions_changed_by_profile_id_fkey";
            columns: ["changed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_status_transitions_from_status_fkey";
            columns: ["from_status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "task_status_transitions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_status_transitions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_status_transitions_to_status_fkey";
            columns: ["to_status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      tasks: {
        Row: {
          archived_at: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          completion_notes: string | null;
          created_at: string;
          created_by_profile_id: string;
          description: string | null;
          due_date: string | null;
          first_action_at: string | null;
          id: string;
          last_activity_at: string;
          originating_decision_id: string | null;
          owner_profile_id: string | null;
          pdca_id: string | null;
          priority: string;
          responsible_profile_id: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          company_id: string;
          completed_at?: string | null;
          completed_by_profile_id?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          created_by_profile_id: string;
          description?: string | null;
          due_date?: string | null;
          first_action_at?: string | null;
          id?: string;
          last_activity_at?: string;
          originating_decision_id?: string | null;
          owner_profile_id?: string | null;
          pdca_id?: string | null;
          priority?: string;
          responsible_profile_id?: string | null;
          security_object_id: string;
          start_date?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          completed_at?: string | null;
          completed_by_profile_id?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          created_by_profile_id?: string;
          description?: string | null;
          due_date?: string | null;
          first_action_at?: string | null;
          id?: string;
          last_activity_at?: string;
          originating_decision_id?: string | null;
          owner_profile_id?: string | null;
          pdca_id?: string | null;
          priority?: string;
          responsible_profile_id?: string | null;
          security_object_id?: string;
          start_date?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "tasks_completed_by_profile_id_fkey";
            columns: ["completed_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "tasks_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_originating_decision_id_fkey";
            columns: ["originating_decision_id"];
            isOneToOne: false;
            referencedRelation: "decision_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_originating_decision_id_fkey";
            columns: ["originating_decision_id"];
            isOneToOne: false;
            referencedRelation: "decisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "tasks_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_pdca_fk";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdca_list_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_pdca_fk";
            columns: ["pdca_id"];
            isOneToOne: false;
            referencedRelation: "pdcas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_priority_fkey";
            columns: ["priority"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "tasks_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "tasks_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Views: {
      decision_list_items: {
        Row: {
          created_by_profile_id: string | null;
          decided_by_profile_id: string | null;
          decision_date: string | null;
          description: string | null;
          id: string | null;
          restaurant_ids: string[] | null;
          security_object_id: string | null;
          status: string | null;
          title: string | null;
          unit_ids: string[] | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          created_by_profile_id?: string | null;
          decided_by_profile_id?: string | null;
          decision_date?: string | null;
          description?: string | null;
          id?: string | null;
          restaurant_ids?: never;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          created_by_profile_id?: string | null;
          decided_by_profile_id?: string | null;
          decision_date?: string | null;
          description?: string | null;
          id?: string | null;
          restaurant_ids?: never;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "decisions_created_by_profile_id_fkey";
            columns: ["created_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_decided_by_profile_id_fkey";
            columns: ["decided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "decisions_decided_by_profile_id_fkey";
            columns: ["decided_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "decision_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      execution_activity: {
        Row: {
          action: string | null;
          actor_profile_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          company_id: string | null;
          id: string | null;
          metadata: Json | null;
          occurred_at: string | null;
          reason: string | null;
          security_object_id: string | null;
        };
        Insert: {
          action?: string | null;
          actor_profile_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          company_id?: string | null;
          id?: string | null;
          metadata?: Json | null;
          occurred_at?: string | null;
          reason?: string | null;
          security_object_id?: string | null;
        };
        Update: {
          action?: string | null;
          actor_profile_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          company_id?: string | null;
          id?: string | null;
          metadata?: Json | null;
          occurred_at?: string | null;
          reason?: string | null;
          security_object_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_activity: {
        Row: {
          action: string | null;
          actor_profile_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          company_id: string | null;
          id: string | null;
          metadata: Json | null;
          occurred_at: string | null;
          reason: string | null;
          security_object_id: string | null;
        };
        Insert: {
          action?: string | null;
          actor_profile_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          company_id?: string | null;
          id?: string | null;
          metadata?: Json | null;
          occurred_at?: string | null;
          reason?: string | null;
          security_object_id?: string | null;
        };
        Update: {
          action?: string | null;
          actor_profile_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          company_id?: string | null;
          id?: string | null;
          metadata?: Json | null;
          occurred_at?: string | null;
          reason?: string | null;
          security_object_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey";
            columns: ["actor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: false;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_list_items: {
        Row: {
          chair_profile_id: string | null;
          id: string | null;
          meeting_series_id: string | null;
          participant_ids: string[] | null;
          restaurant_ids: string[] | null;
          scheduled_end_at: string | null;
          scheduled_start_at: string | null;
          security_object_id: string | null;
          status: string | null;
          title: string | null;
          unit_ids: string[] | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          chair_profile_id?: string | null;
          id?: string | null;
          meeting_series_id?: string | null;
          participant_ids?: never;
          restaurant_ids?: never;
          scheduled_end_at?: string | null;
          scheduled_start_at?: string | null;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          chair_profile_id?: string | null;
          id?: string | null;
          meeting_series_id?: string | null;
          participant_ids?: never;
          restaurant_ids?: never;
          scheduled_end_at?: string | null;
          scheduled_start_at?: string | null;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_sessions_chair_profile_id_fkey";
            columns: ["chair_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "meeting_sessions_chair_profile_id_fkey";
            columns: ["chair_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_meeting_series_id_fkey";
            columns: ["meeting_series_id"];
            isOneToOne: false;
            referencedRelation: "meeting_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_sessions_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "meeting_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      pdca_list_items: {
        Row: {
          due_date: string | null;
          id: string | null;
          impact: string | null;
          objective: string | null;
          owner_name: string | null;
          owner_profile_id: string | null;
          phase: Database["public"]["Enums"]["pdca_phase"] | null;
          priority: string | null;
          problem_statement: string | null;
          responsible_name: string | null;
          responsible_profile_id: string | null;
          restaurant_ids: string[] | null;
          risk: string | null;
          security_object_id: string | null;
          status: string | null;
          title: string | null;
          unit_ids: string[] | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          due_date?: string | null;
          id?: string | null;
          impact?: string | null;
          objective?: string | null;
          owner_name?: never;
          owner_profile_id?: string | null;
          phase?: Database["public"]["Enums"]["pdca_phase"] | null;
          priority?: string | null;
          problem_statement?: string | null;
          responsible_name?: never;
          responsible_profile_id?: string | null;
          restaurant_ids?: never;
          risk?: string | null;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          due_date?: string | null;
          id?: string | null;
          impact?: string | null;
          objective?: string | null;
          owner_name?: never;
          owner_profile_id?: string | null;
          phase?: Database["public"]["Enums"]["pdca_phase"] | null;
          priority?: string | null;
          problem_statement?: string | null;
          responsible_name?: never;
          responsible_profile_id?: string | null;
          restaurant_ids?: never;
          risk?: string | null;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pdcas_impact_fkey";
            columns: ["impact"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdcas_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdcas_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_priority_fkey";
            columns: ["priority"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdcas_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "pdcas_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_risk_fkey";
            columns: ["risk"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "pdcas_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdcas_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
      people_directory: {
        Row: {
          assignment_id: string | null;
          auth_user_id: string | null;
          company_id: string | null;
          display_name: string | null;
          email: string | null;
          is_active: boolean | null;
          last_seen_at: string | null;
          profile_id: string | null;
          reports_to_assignment_id: string | null;
          reports_to_name: string | null;
          restaurant_ids: string[] | null;
          restaurant_names: string[] | null;
          restaurant_scope_mode:
            Database["public"]["Enums"]["restaurant_scope_mode"] | null;
          role_code: string | null;
          role_id: string | null;
          role_name: string | null;
          title: string | null;
          unit_id: string | null;
          unit_name: string | null;
          unit_scope_mode:
            Database["public"]["Enums"]["unit_scope_mode"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizational_assignments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizational_assignments_organizational_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "organizational_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizational_assignments_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_list_items: {
        Row: {
          completed_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string | null;
          owner_name: string | null;
          owner_profile_id: string | null;
          priority: string | null;
          responsible_name: string | null;
          responsible_profile_id: string | null;
          restaurant_ids: string[] | null;
          security_object_id: string | null;
          status: string | null;
          title: string | null;
          unit_ids: string[] | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          completed_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string | null;
          owner_name?: never;
          owner_profile_id?: string | null;
          priority?: string | null;
          responsible_name?: never;
          responsible_profile_id?: string | null;
          restaurant_ids?: never;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          completed_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string | null;
          owner_name?: never;
          owner_profile_id?: string | null;
          priority?: string | null;
          responsible_name?: never;
          responsible_profile_id?: string | null;
          restaurant_ids?: never;
          security_object_id?: string | null;
          status?: string | null;
          title?: string | null;
          unit_ids?: never;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "tasks_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_priority_fkey";
            columns: ["priority"];
            isOneToOne: false;
            referencedRelation: "severity_definitions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "tasks_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "people_directory";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "tasks_responsible_profile_id_fkey";
            columns: ["responsible_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_security_object_id_fkey";
            columns: ["security_object_id"];
            isOneToOne: true;
            referencedRelation: "security_objects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "execution_status_definitions";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Functions: {
      activate_decision: {
        Args: { decision_id: string; expected_version: number };
        Returns: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          decided_by_profile_id: string | null;
          decision_date: string;
          description: string | null;
          id: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "decisions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      add_ai_proposal: {
        Args: { ai_run_id: string; payload: Json; proposal_type: string };
        Returns: string;
      };
      add_comment: {
        Args: { body: string; security_object_id: string };
        Returns: string;
      };
      add_decision_pdca_link: {
        Args: { decision_id: string; pdca_id: string };
        Returns: undefined;
      };
      add_decision_task_link: {
        Args: { decision_id: string; task_id: string };
        Returns: undefined;
      };
      add_meeting_agenda_item: {
        Args: {
          carried_forward_from_id?: string;
          description?: string;
          estimated_minutes?: number;
          meeting_session_id: string;
          presenter_profile_id?: string;
          title: string;
        };
        Returns: string;
      };
      add_meeting_note: {
        Args: {
          content: string;
          meeting_agenda_item_id?: string;
          meeting_session_id: string;
        };
        Returns: string;
      };
      add_meeting_participant: {
        Args: {
          meeting_session_id: string;
          participant_role?: Database["public"]["Enums"]["meeting_participant_role"];
          profile_id: string;
        };
        Returns: string;
      };
      add_object_member: {
        Args: {
          membership_role: Database["public"]["Enums"]["object_membership_role"];
          profile_id: string;
          security_object_id: string;
        };
        Returns: string;
      };
      add_pdca_blocker: {
        Args: { pdca_id: string; reason: string };
        Returns: string;
      };
      add_pdca_dependency: {
        Args: {
          dependency_kind: Database["public"]["Enums"]["pdca_dependency_kind"];
          depends_on_pdca_id?: string;
          depends_on_task_id?: string;
          external_label?: string;
          pdca_id: string;
        };
        Returns: string;
      };
      add_task_blocker: {
        Args: { reason: string; task_id: string };
        Returns: string;
      };
      add_task_dependency: {
        Args: { depends_on_task_id: string; task_id: string };
        Returns: undefined;
      };
      archive_decision: {
        Args: { decision_id: string; expected_version: number; reason: string };
        Returns: undefined;
      };
      assign_execution_people: {
        Args: {
          expected_version: number;
          owner_profile_id: string;
          responsible_profile_id: string;
          security_object_id: string;
        };
        Returns: undefined;
      };
      authorize_security_object: {
        Args: { requested_permission: string; target_object_id: string };
        Returns: boolean;
      };
      change_meeting_chair: {
        Args: {
          expected_version: number;
          meeting_session_id: string;
          new_chair_profile_id: string;
        };
        Returns: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          chair_profile_id: string;
          closed_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          meeting_series_id: string | null;
          published_at: string | null;
          reopened_at: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      change_pdca_due_date: {
        Args: {
          expected_version: number;
          new_due_date: string;
          pdca_id: string;
          reason: string;
        };
        Returns: {
          actual_result: string | null;
          archived_at: string | null;
          check_notes: string | null;
          closure_notes: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          corrective_action: string | null;
          created_at: string;
          created_by_profile_id: string;
          due_date: string | null;
          expected_result: string | null;
          first_action_at: string | null;
          id: string;
          impact: string;
          kpi_baseline: number | null;
          kpi_measurement_method: string | null;
          kpi_name: string | null;
          kpi_result: number | null;
          kpi_target: number | null;
          kpi_unit: string | null;
          last_activity_at: string;
          objective: string | null;
          originating_decision_id: string | null;
          outcome_notes: string | null;
          owner_profile_id: string | null;
          phase: Database["public"]["Enums"]["pdca_phase"];
          plan_summary: string | null;
          priority: string;
          problem_statement: string | null;
          responsible_profile_id: string | null;
          risk: string;
          root_cause_or_hypothesis: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "pdcas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      change_pdca_phase: {
        Args: {
          expected_version: number;
          new_phase: Database["public"]["Enums"]["pdca_phase"];
          pdca_id: string;
          reason?: string;
        };
        Returns: {
          actual_result: string | null;
          archived_at: string | null;
          check_notes: string | null;
          closure_notes: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          corrective_action: string | null;
          created_at: string;
          created_by_profile_id: string;
          due_date: string | null;
          expected_result: string | null;
          first_action_at: string | null;
          id: string;
          impact: string;
          kpi_baseline: number | null;
          kpi_measurement_method: string | null;
          kpi_name: string | null;
          kpi_result: number | null;
          kpi_target: number | null;
          kpi_unit: string | null;
          last_activity_at: string;
          objective: string | null;
          originating_decision_id: string | null;
          outcome_notes: string | null;
          owner_profile_id: string | null;
          phase: Database["public"]["Enums"]["pdca_phase"];
          plan_summary: string | null;
          priority: string;
          problem_statement: string | null;
          responsible_profile_id: string | null;
          risk: string;
          root_cause_or_hypothesis: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "pdcas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      change_task_due_date: {
        Args: {
          expected_version: number;
          new_due_date: string;
          reason: string;
          task_id: string;
        };
        Returns: {
          archived_at: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          completion_notes: string | null;
          created_at: string;
          created_by_profile_id: string;
          description: string | null;
          due_date: string | null;
          first_action_at: string | null;
          id: string;
          last_activity_at: string;
          originating_decision_id: string | null;
          owner_profile_id: string | null;
          pdca_id: string | null;
          priority: string;
          responsible_profile_id: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "tasks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      claim_push_deliveries: {
        Args: { p_limit?: number };
        Returns: {
          attempt_count: number;
          auth: string;
          delivery_id: string;
          endpoint: string;
          href: string;
          metadata: Json;
          notification_id: string;
          p256dh: string;
          read_at: string;
          sensitive: boolean;
          subscription_id: string;
          title: string;
          type: string;
        }[];
      };
      complete_ai_run: {
        Args: {
          ai_run_id: string;
          error_category?: string;
          input_tokens?: number;
          latency_ms?: number;
          output_tokens?: number;
          status: string;
        };
        Returns: undefined;
      };
      complete_push_delivery: {
        Args: {
          p_delivery_id: string;
          p_error?: string;
          p_provider_status?: number;
          p_retry_in_seconds?: number;
          p_status: string;
          p_subscription_gone?: boolean;
        };
        Returns: undefined;
      };
      confirm_ai_proposal: {
        Args: { expected_version: number; payload: Json; proposal_id: string };
        Returns: string;
      };
      create_decision: {
        Args: {
          company_id: string;
          decided_by_profile_id?: string;
          decision_date?: string;
          description?: string;
          initial_status?: string;
          restaurant_ids?: string[];
          title: string;
          unit_ids?: string[];
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_meeting_decision: {
        Args: {
          company_id: string;
          decision_date: string;
          description: string;
          meeting_agenda_item_id?: string;
          meeting_session_id: string;
          restaurant_ids: string[];
          title: string;
          unit_ids: string[];
          visibility: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_meeting_pdca: {
        Args: {
          company_id: string;
          due_date: string;
          meeting_agenda_item_id?: string;
          meeting_session_id: string;
          objective: string;
          owner_profile_id: string;
          priority: string;
          problem_statement: string;
          responsible_profile_id: string;
          restaurant_ids: string[];
          title: string;
          unit_ids: string[];
          visibility: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_meeting_series: {
        Args: {
          company_id: string;
          default_chair_profile_id?: string;
          description?: string;
          meeting_type?: string;
          recurrence_metadata?: Json;
          recurrence_rule?: string;
          restaurant_ids?: string[];
          title: string;
          unit_ids?: string[];
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_meeting_session: {
        Args: {
          chair_profile_id: string;
          company_id: string;
          meeting_series_id?: string;
          restaurant_ids?: string[];
          scheduled_end_at: string;
          scheduled_start_at: string;
          title: string;
          unit_ids?: string[];
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_meeting_task: {
        Args: {
          company_id: string;
          description: string;
          due_date: string;
          meeting_agenda_item_id?: string;
          meeting_session_id: string;
          owner_profile_id: string;
          priority: string;
          responsible_profile_id: string;
          restaurant_ids: string[];
          title: string;
          unit_ids: string[];
          visibility: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_organizational_unit: {
        Args: {
          target_code: string;
          target_company_id: string;
          target_name: string;
          target_unit_type: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Returns: {
          active_from: string;
          active_to: string | null;
          code: string;
          company_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          metadata: Json;
          name: string;
          unit_type: Database["public"]["Enums"]["organizational_unit_type"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "organizational_units";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_pdca: {
        Args: {
          company_id: string;
          due_date?: string;
          impact?: string;
          objective?: string;
          originating_decision_id?: string;
          owner_profile_id?: string;
          priority?: string;
          problem_statement?: string;
          responsible_profile_id?: string;
          restaurant_ids?: string[];
          risk?: string;
          root_cause_or_hypothesis?: string;
          start_date?: string;
          title: string;
          unit_ids?: string[];
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      create_task: {
        Args: {
          company_id: string;
          description?: string;
          due_date?: string;
          originating_decision_id?: string;
          owner_profile_id?: string;
          pdca_id?: string;
          priority?: string;
          responsible_profile_id?: string;
          restaurant_ids?: string[];
          start_date?: string;
          title: string;
          unit_ids?: string[];
          visibility?: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      deactivate_meeting_series: {
        Args: {
          expected_version: number;
          meeting_series_id: string;
          reason: string;
        };
        Returns: undefined;
      };
      deactivate_meeting_template: {
        Args: { expected_version: number; template_id: string };
        Returns: undefined;
      };
      deactivate_person: { Args: { p_profile_id: string }; Returns: undefined };
      edit_comment: {
        Args: { body: string; comment_id: string };
        Returns: {
          author_profile_id: string;
          body: string;
          created_at: string;
          edited_at: string | null;
          hidden_at: string | null;
          hidden_by_profile_id: string | null;
          id: string;
          security_object_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "comments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      filter_accessible_security_objects: {
        Args: { requested_permission: string };
        Returns: string[];
      };
      finish_meeting: {
        Args: {
          agenda_outcomes?: Json;
          expected_version: number;
          meeting_session_id: string;
        };
        Returns: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          chair_profile_id: string;
          closed_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          meeting_series_id: string | null;
          published_at: string | null;
          reopened_at: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_deadline_notifications: { Args: never; Returns: number };
      generate_meeting_reminders: {
        Args: { p_minutes?: number };
        Returns: number;
      };
      get_accessible_scope: {
        Args: never;
        Returns: {
          assignment_id: string;
          company_id: string;
          organizational_unit_id: string;
          permission_key: string;
          restaurant_id: string;
          restaurant_scope: Database["public"]["Enums"]["restaurant_scope_mode"];
          unit_scope: Database["public"]["Enums"]["unit_scope_mode"];
        }[];
      };
      get_assignable_profiles: {
        Args: { security_object_id: string };
        Returns: {
          display_name: string;
          profile_id: string;
        }[];
      };
      get_meeting_accessible_profiles: {
        Args: { meeting_security_object_id: string };
        Returns: {
          display_name: string;
          profile_id: string;
        }[];
      };
      get_notification_preferences: {
        Args: never;
        Returns: {
          collaboration: boolean;
          deadline_days: number;
          meeting_changes: boolean;
          meeting_participation: boolean;
          meeting_reminders: boolean;
          pdcas: boolean;
          profile_id: string;
          push_enabled: boolean;
          tasks: boolean;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "notification_preferences";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      has_active_hierarchy_path: {
        Args: { from_assignment_id: string; to_assignment_id: string };
        Returns: boolean;
      };
      hide_comment: {
        Args: { comment_id: string; reason: string };
        Returns: undefined;
      };
      invite_person: {
        Args: {
          p_auth_user_id: string;
          p_company_id: string;
          p_display_name: string;
          p_email: string;
          p_organizational_unit_id: string;
          p_restaurant_ids?: string[];
          p_restaurant_scope_mode: Database["public"]["Enums"]["restaurant_scope_mode"];
          p_role_id: string;
          p_title: string;
          p_unit_scope_mode: Database["public"]["Enums"]["unit_scope_mode"];
        };
        Returns: string;
      };
      link_meeting_object: {
        Args: {
          meeting_agenda_item_id?: string;
          meeting_session_id: string;
          outcome_notes?: string;
          relation_type: Database["public"]["Enums"]["meeting_object_relation"];
          security_object_id: string;
        };
        Returns: string;
      };
      mark_all_notifications_read: { Args: never; Returns: number };
      mark_notifications_read: {
        Args: { notification_ids: string[] };
        Returns: number;
      };
      meeting_previous_followups: {
        Args: { current_session_id: string };
        Returns: {
          kind: string;
          record_id: string;
          source_session_id: string;
          status: string;
          title: string;
        }[];
      };
      my_meetings: {
        Args: never;
        Returns: {
          meeting_session_id: string;
          relationship: string;
          scheduled_start_at: string;
          status: string;
          title: string;
        }[];
      };
      my_work: {
        Args: never;
        Returns: {
          due_date: string;
          last_activity_at: string;
          object_id: string;
          object_type: string;
          priority: string;
          relationship: string;
          security_object_id: string;
          status: string;
          title: string;
        }[];
      };
      operational_dashboard: {
        Args: { p_restaurant_id?: string; p_unit_id?: string };
        Returns: {
          metric: string;
          value: number;
        }[];
      };
      process_outbox: {
        Args: { p_limit?: number };
        Returns: {
          failed: number;
          notifications_created: number;
          processed: number;
        }[];
      };
      purge_old_records: {
        Args: never;
        Returns: {
          deliveries: number;
          notifications: number;
          outbox: number;
          subscriptions: number;
        }[];
      };
      record_ai_run_sources: {
        Args: { ai_run_id: string; sources: Json };
        Returns: undefined;
      };
      register_attachment: {
        Args: {
          filename: string;
          mime_type: string;
          security_object_id: string;
          size_bytes: number;
          storage_path: string;
        };
        Returns: string;
      };
      register_push_subscription: {
        Args: {
          auth: string;
          endpoint: string;
          p256dh: string;
          user_agent?: string;
        };
        Returns: string;
      };
      reject_ai_proposal: {
        Args: { expected_version: number; proposal_id: string; reason: string };
        Returns: undefined;
      };
      remove_meeting_participant: {
        Args: { participant_id: string; reason?: string };
        Returns: undefined;
      };
      remove_object_member: {
        Args: { membership_id: string; reason?: string };
        Returns: undefined;
      };
      reopen_meeting_session: {
        Args: {
          expected_version: number;
          meeting_session_id: string;
          reason: string;
        };
        Returns: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          chair_profile_id: string;
          closed_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          meeting_series_id: string | null;
          published_at: string | null;
          reopened_at: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reorder_meeting_agenda_item: {
        Args: {
          agenda_item_id: string;
          expected_version: number;
          new_position: number;
        };
        Returns: undefined;
      };
      replace_object_scope: {
        Args: {
          expected_version: number;
          reason: string;
          restaurant_ids: string[];
          security_object_id: string;
          unit_ids: string[];
        };
        Returns: undefined;
      };
      resolve_pdca_blocker: {
        Args: { blocker_id: string; resolution_notes?: string };
        Returns: undefined;
      };
      resolve_task_blocker: {
        Args: { blocker_id: string; resolution_notes?: string };
        Returns: undefined;
      };
      revoke_push_subscription: {
        Args: { endpoint: string };
        Returns: boolean;
      };
      revoke_push_subscription_by_id: {
        Args: { subscription_id: string };
        Returns: boolean;
      };
      save_meeting_template: {
        Args: {
          agenda: Json;
          all_restaurants: boolean;
          company_id: string;
          default_duration_minutes: number;
          expected_version: number;
          meeting_type: string;
          name: string;
          participant_profile_ids: string[];
          recurrence: Json;
          restaurant_ids: string[];
          template_id: string;
          unit_ids: string[];
          visibility: Database["public"]["Enums"]["visibility_mode"];
        };
        Returns: string;
      };
      save_notification_preferences: {
        Args: {
          collaboration: boolean;
          deadline_days: number;
          meeting_changes: boolean;
          meeting_participation: boolean;
          meeting_reminders: boolean;
          pdcas: boolean;
          push_enabled: boolean;
          tasks: boolean;
        };
        Returns: {
          collaboration: boolean;
          deadline_days: number;
          meeting_changes: boolean;
          meeting_participation: boolean;
          meeting_reminders: boolean;
          pdcas: boolean;
          profile_id: string;
          push_enabled: boolean;
          tasks: boolean;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "notification_preferences";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_organizational_unit: {
        Args: {
          p_code: string;
          p_company_id: string;
          p_is_active?: boolean;
          p_name: string;
          p_unit_id: string;
          p_unit_type: Database["public"]["Enums"]["organizational_unit_type"];
        };
        Returns: string;
      };
      save_restaurant: {
        Args: {
          p_code: string;
          p_company_id: string;
          p_is_active?: boolean;
          p_name: string;
          p_restaurant_id: string;
        };
        Returns: string;
      };
      search_everything: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          id: string;
          kind: string;
          occurred_on: string;
          rank: number;
          snippet: string;
          status: string;
          title: string;
          updated_at: string;
        }[];
      };
      set_meeting_agenda_status: {
        Args: {
          agenda_item_id: string;
          expected_version: number;
          new_status: string;
          reason?: string;
        };
        Returns: {
          carried_forward_from_id: string | null;
          created_at: string;
          created_by_profile_id: string;
          description: string | null;
          estimated_minutes: number | null;
          id: string;
          meeting_session_id: string;
          position: number;
          presenter_profile_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_agenda_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_meeting_series_recurrence: {
        Args: {
          expected_version: number;
          meeting_series_id: string;
          recurrence: Json;
          recurrence_rule: string;
        };
        Returns: undefined;
      };
      start_ai_run: {
        Args: {
          company_id: string;
          model_name: string;
          model_provider: string;
          prompt_template_version: string;
          target_security_object_id: string;
          use_case: string;
        };
        Returns: string;
      };
      touch_profile_last_seen: { Args: never; Returns: undefined };
      transition_meeting_session: {
        Args: {
          expected_version: number;
          meeting_session_id: string;
          new_status: string;
          reason?: string;
        };
        Returns: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          chair_profile_id: string;
          closed_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          meeting_series_id: string | null;
          published_at: string | null;
          reopened_at: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_pdca: {
        Args: {
          closure_notes?: string;
          expected_version: number;
          new_status: string;
          pdca_id: string;
          reason?: string;
        };
        Returns: {
          actual_result: string | null;
          archived_at: string | null;
          check_notes: string | null;
          closure_notes: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          corrective_action: string | null;
          created_at: string;
          created_by_profile_id: string;
          due_date: string | null;
          expected_result: string | null;
          first_action_at: string | null;
          id: string;
          impact: string;
          kpi_baseline: number | null;
          kpi_measurement_method: string | null;
          kpi_name: string | null;
          kpi_result: number | null;
          kpi_target: number | null;
          kpi_unit: string | null;
          last_activity_at: string;
          objective: string | null;
          originating_decision_id: string | null;
          outcome_notes: string | null;
          owner_profile_id: string | null;
          phase: Database["public"]["Enums"]["pdca_phase"];
          plan_summary: string | null;
          priority: string;
          problem_statement: string | null;
          responsible_profile_id: string | null;
          risk: string;
          root_cause_or_hypothesis: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "pdcas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_task: {
        Args: {
          completion_notes?: string;
          expected_version: number;
          new_status: string;
          reason?: string;
          task_id: string;
        };
        Returns: {
          archived_at: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          completion_notes: string | null;
          created_at: string;
          created_by_profile_id: string;
          description: string | null;
          due_date: string | null;
          first_action_at: string | null;
          id: string;
          last_activity_at: string;
          originating_decision_id: string | null;
          owner_profile_id: string | null;
          pdca_id: string | null;
          priority: string;
          responsible_profile_id: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "tasks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      unlink_meeting_object: {
        Args: { link_id: string; reason: string };
        Returns: undefined;
      };
      unread_notification_count: { Args: never; Returns: number };
      update_decision: {
        Args: {
          decided_by_profile_id: string;
          decision_date: string;
          decision_id: string;
          description: string;
          expected_version: number;
          title: string;
        };
        Returns: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          decided_by_profile_id: string | null;
          decision_date: string;
          description: string | null;
          id: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "decisions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_meeting_note: {
        Args: { content: string; expected_version: number; note_id: string };
        Returns: {
          author_profile_id: string;
          content: string;
          created_at: string;
          hidden_at: string | null;
          hidden_by_profile_id: string | null;
          id: string;
          meeting_agenda_item_id: string | null;
          meeting_session_id: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_notes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_meeting_series: {
        Args: {
          default_chair_profile_id: string;
          description: string;
          expected_version: number;
          meeting_series_id: string;
          meeting_type: string;
          recurrence_metadata: Json;
          recurrence_rule: string;
          title: string;
        };
        Returns: {
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          deactivated_at: string | null;
          default_chair_profile_id: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          meeting_type: string;
          recurrence: Json;
          recurrence_metadata: Json;
          recurrence_rule: string | null;
          security_object_id: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_series";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_meeting_session: {
        Args: {
          expected_version: number;
          meeting_session_id: string;
          scheduled_end_at: string;
          scheduled_start_at: string;
          title: string;
        };
        Returns: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          chair_profile_id: string;
          closed_at: string | null;
          company_id: string;
          created_at: string;
          created_by_profile_id: string;
          id: string;
          meeting_series_id: string | null;
          published_at: string | null;
          reopened_at: string | null;
          scheduled_end_at: string;
          scheduled_start_at: string;
          security_object_id: string;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "meeting_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_pdca: {
        Args: {
          actual_result: string;
          check_notes: string;
          corrective_action: string;
          expected_result: string;
          expected_version: number;
          impact: string;
          objective: string;
          outcome_notes: string;
          owner_profile_id: string;
          pdca_id: string;
          priority: string;
          problem_statement: string;
          responsible_profile_id: string;
          risk: string;
          root_cause_or_hypothesis: string;
          start_date: string;
          title: string;
        };
        Returns: {
          actual_result: string | null;
          archived_at: string | null;
          check_notes: string | null;
          closure_notes: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          corrective_action: string | null;
          created_at: string;
          created_by_profile_id: string;
          due_date: string | null;
          expected_result: string | null;
          first_action_at: string | null;
          id: string;
          impact: string;
          kpi_baseline: number | null;
          kpi_measurement_method: string | null;
          kpi_name: string | null;
          kpi_result: number | null;
          kpi_target: number | null;
          kpi_unit: string | null;
          last_activity_at: string;
          objective: string | null;
          originating_decision_id: string | null;
          outcome_notes: string | null;
          owner_profile_id: string | null;
          phase: Database["public"]["Enums"]["pdca_phase"];
          plan_summary: string | null;
          priority: string;
          problem_statement: string | null;
          responsible_profile_id: string | null;
          risk: string;
          root_cause_or_hypothesis: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "pdcas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_person_assignment: {
        Args: {
          p_assignment_id: string;
          p_organizational_unit_id: string;
          p_reports_to_assignment_id?: string;
          p_restaurant_ids?: string[];
          p_restaurant_scope_mode: Database["public"]["Enums"]["restaurant_scope_mode"];
          p_role_id: string;
          p_title: string;
          p_unit_scope_mode: Database["public"]["Enums"]["unit_scope_mode"];
        };
        Returns: undefined;
      };
      update_task: {
        Args: {
          description: string;
          expected_version: number;
          owner_profile_id: string;
          priority: string;
          responsible_profile_id: string;
          start_date: string;
          task_id: string;
          title: string;
        };
        Returns: {
          archived_at: string | null;
          company_id: string;
          completed_at: string | null;
          completed_by_profile_id: string | null;
          completion_notes: string | null;
          created_at: string;
          created_by_profile_id: string;
          description: string | null;
          due_date: string | null;
          first_action_at: string | null;
          id: string;
          last_activity_at: string;
          originating_decision_id: string | null;
          owner_profile_id: string | null;
          pdca_id: string | null;
          priority: string;
          responsible_profile_id: string | null;
          security_object_id: string;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          version: number;
        };
        SetofOptions: {
          from: "*";
          to: "tasks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      hierarchy_relationship_type: "REPORTS_TO" | "OPERATIONAL_RESPONSIBILITY";
      meeting_object_relation:
        | "CREATED"
        | "REVIEWED"
        | "DISCUSSED"
        | "FOLLOW_UP"
        | "CLOSED_IN_MEETING";
      meeting_participant_role: "CHAIR" | "PARTICIPANT";
      object_membership_role: "COLLABORATOR" | "WATCHER";
      organizational_unit_type: "DEPARTMENT" | "SHARED_SERVICE";
      pdca_dependency_kind: "PDCA" | "TASK" | "EXTERNAL";
      pdca_phase: "PLAN" | "DO" | "CHECK" | "ACT";
      restaurant_responsibility_type: "PRIMARY" | "SECONDARY" | "COVERAGE";
      restaurant_scope_mode: "NONE" | "ASSIGNED" | "INHERITED" | "COMPANY_WIDE";
      scope_requirement: "INTERSECT" | "COVER_ALL";
      unit_scope_mode: "ASSIGNED" | "COMPANY_WIDE";
      visibility_mode: "NORMAL" | "RESTRICTED" | "PRIVATE";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      hierarchy_relationship_type: ["REPORTS_TO", "OPERATIONAL_RESPONSIBILITY"],
      meeting_object_relation: [
        "CREATED",
        "REVIEWED",
        "DISCUSSED",
        "FOLLOW_UP",
        "CLOSED_IN_MEETING",
      ],
      meeting_participant_role: ["CHAIR", "PARTICIPANT"],
      object_membership_role: ["COLLABORATOR", "WATCHER"],
      organizational_unit_type: ["DEPARTMENT", "SHARED_SERVICE"],
      pdca_dependency_kind: ["PDCA", "TASK", "EXTERNAL"],
      pdca_phase: ["PLAN", "DO", "CHECK", "ACT"],
      restaurant_responsibility_type: ["PRIMARY", "SECONDARY", "COVERAGE"],
      restaurant_scope_mode: ["NONE", "ASSIGNED", "INHERITED", "COMPANY_WIDE"],
      scope_requirement: ["INTERSECT", "COVER_ALL"],
      unit_scope_mode: ["ASSIGNED", "COMPANY_WIDE"],
      visibility_mode: ["NORMAL", "RESTRICTED", "PRIVATE"],
    },
  },
} as const;
