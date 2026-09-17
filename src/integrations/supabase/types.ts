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
      activity_logs: {
        Row: {
          action_type: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          action: Database["public"]["Enums"]["app_action"]
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["app_action"]
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["app_action"]
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          allowed_login_method: string
          archived_at: string | null
          created_at: string
          created_by: string | null
          designation: string | null
          designation_code: string | null
          display_name: string | null
          email: string
          employee_id: string | null
          last_login_at: string | null
          last_login_ip: string | null
          mobile: string | null
          must_change_password: boolean
          notification_prefs: Json
          preferred_language: string
          service_scope: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_login_method?: string
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          designation_code?: string | null
          display_name?: string | null
          email: string
          employee_id?: string | null
          last_login_at?: string | null
          last_login_ip?: string | null
          mobile?: string | null
          must_change_password?: boolean
          notification_prefs?: Json
          preferred_language?: string
          service_scope?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_login_method?: string
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          designation_code?: string | null
          display_name?: string | null
          email?: string
          employee_id?: string | null
          last_login_at?: string | null
          last_login_ip?: string | null
          mobile?: string | null
          must_change_password?: boolean
          notification_prefs?: Json
          preferred_language?: string
          service_scope?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          target_id: string | null
          target_table: string | null
          user_agent: string | null
          verification_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          verification_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          verification_id?: string | null
        }
        Relationships: []
      }
      backup_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["backup_kind"]
          retention_until: string
          size_bytes: number | null
          started_at: string
          status: Database["public"]["Enums"]["backup_status"]
          storage_path: string | null
          table_counts: Json
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["backup_kind"]
          retention_until: string
          size_bytes?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
          storage_path?: string | null
          table_counts?: Json
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["backup_kind"]
          retention_until?: string
          size_bytes?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
          storage_path?: string | null
          table_counts?: Json
          triggered_by?: string | null
        }
        Relationships: []
      }
      birth_certificate_records: {
        Row: {
          applicant_details: Json
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          certificate_number: string | null
          child_name: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          external_reference: string | null
          father_name: string | null
          id: string
          issue_date: string
          mother_name: string | null
          notes: string | null
          pdf_storage_path: string | null
          place_of_birth: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          applicant_details?: Json
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certificate_number?: string | null
          child_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          external_reference?: string | null
          father_name?: string | null
          id?: string
          issue_date?: string
          mother_name?: string | null
          notes?: string | null
          pdf_storage_path?: string | null
          place_of_birth?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          applicant_details?: Json
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certificate_number?: string | null
          child_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          external_reference?: string | null
          father_name?: string | null
          id?: string
          issue_date?: string
          mother_name?: string | null
          notes?: string | null
          pdf_storage_path?: string | null
          place_of_birth?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      business_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          rule_key: string
          rule_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          rule_key: string
          rule_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          rule_key?: string
          rule_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      certificate_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["cert_audit_action"]
          actor_email: string | null
          actor_user_id: string | null
          cert_id: string
          cert_kind: Database["public"]["Enums"]["cert_kind"]
          cert_table: string
          certificate_number: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["cert_audit_action"]
          actor_email?: string | null
          actor_user_id?: string | null
          cert_id: string
          cert_kind: Database["public"]["Enums"]["cert_kind"]
          cert_table: string
          certificate_number?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["cert_audit_action"]
          actor_email?: string | null
          actor_user_id?: string | null
          cert_id?: string
          cert_kind?: Database["public"]["Enums"]["cert_kind"]
          cert_table?: string
          certificate_number?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      certificate_sequences: {
        Row: {
          created_at: string
          last_value: number
          sequence_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_value?: number
          sequence_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_value?: number
          sequence_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      citizen_account_health: {
        Row: {
          admin_note: string | null
          created_at: string
          health: Database["public"]["Enums"]["citizen_health_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          health?: Database["public"]["Enums"]["citizen_health_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          health?: Database["public"]["Enums"]["citizen_health_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      citizen_activity_logs: {
        Row: {
          action_type: string
          citizen_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          target_id: string | null
          target_table: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          citizen_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          citizen_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      citizen_login_identifiers: {
        Row: {
          auth_email: string
          created_at: string
          identifier: string
          user_id: string
        }
        Insert: {
          auth_email: string
          created_at?: string
          identifier: string
          user_id: string
        }
        Update: {
          auth_email?: string
          created_at?: string
          identifier?: string
          user_id?: string
        }
        Relationships: []
      }
      citizen_notifications: {
        Row: {
          action_href: string | null
          action_label: string | null
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["citizen_notification_kind"]
          read_at: string | null
          requires_action: boolean
          resolved_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_href?: string | null
          action_label?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["citizen_notification_kind"]
          read_at?: string | null
          requires_action?: boolean
          resolved_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_href?: string | null
          action_label?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["citizen_notification_kind"]
          read_at?: string | null
          requires_action?: boolean
          resolved_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      citizen_profiles: {
        Row: {
          aadhaar_doc_path: string | null
          aadhaar_last4: string | null
          alternate_mobile: string | null
          block: string
          citizen_id: string
          created_at: string
          date_of_birth: string | null
          district: string
          email: string | null
          email_verified: boolean
          epic_doc_path: string | null
          epic_no: string | null
          first_name: string
          gender: string | null
          gram_panchayat: string
          guardian_name: string | null
          last_name: string
          marital_status: string | null
          middle_name: string | null
          mobile: string | null
          mother_name: string | null
          occupation: string | null
          pan_doc_path: string | null
          pan_no: string | null
          photo_path: string | null
          pin_code: string | null
          police_station: string
          post_office: string | null
          preferred_language: string
          prefix: string | null
          profile_completed_at: string | null
          state: string
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          aadhaar_doc_path?: string | null
          aadhaar_last4?: string | null
          alternate_mobile?: string | null
          block?: string
          citizen_id?: string
          created_at?: string
          date_of_birth?: string | null
          district?: string
          email?: string | null
          email_verified?: boolean
          epic_doc_path?: string | null
          epic_no?: string | null
          first_name: string
          gender?: string | null
          gram_panchayat?: string
          guardian_name?: string | null
          last_name: string
          marital_status?: string | null
          middle_name?: string | null
          mobile?: string | null
          mother_name?: string | null
          occupation?: string | null
          pan_doc_path?: string | null
          pan_no?: string | null
          photo_path?: string | null
          pin_code?: string | null
          police_station?: string
          post_office?: string | null
          preferred_language?: string
          prefix?: string | null
          profile_completed_at?: string | null
          state?: string
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          aadhaar_doc_path?: string | null
          aadhaar_last4?: string | null
          alternate_mobile?: string | null
          block?: string
          citizen_id?: string
          created_at?: string
          date_of_birth?: string | null
          district?: string
          email?: string | null
          email_verified?: boolean
          epic_doc_path?: string | null
          epic_no?: string | null
          first_name?: string
          gender?: string | null
          gram_panchayat?: string
          guardian_name?: string | null
          last_name?: string
          marital_status?: string | null
          middle_name?: string | null
          mobile?: string | null
          mother_name?: string | null
          occupation?: string | null
          pan_doc_path?: string | null
          pan_no?: string | null
          photo_path?: string | null
          pin_code?: string | null
          police_station?: string
          post_office?: string | null
          preferred_language?: string
          prefix?: string | null
          profile_completed_at?: string | null
          state?: string
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      death_certificate_records: {
        Row: {
          applicant_details: Json
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          certificate_number: string | null
          created_at: string
          created_by: string | null
          date_of_death: string | null
          deceased_name: string | null
          external_reference: string | null
          father_or_husband_name: string | null
          id: string
          issue_date: string
          notes: string | null
          pdf_storage_path: string | null
          place_of_death: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          applicant_details?: Json
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certificate_number?: string | null
          created_at?: string
          created_by?: string | null
          date_of_death?: string | null
          deceased_name?: string | null
          external_reference?: string | null
          father_or_husband_name?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          pdf_storage_path?: string | null
          place_of_death?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          applicant_details?: Json
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certificate_number?: string | null
          created_at?: string
          created_by?: string | null
          date_of_death?: string | null
          deceased_name?: string | null
          external_reference?: string | null
          father_or_husband_name?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          pdf_storage_path?: string | null
          place_of_death?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      dependent_certificates: {
        Row: {
          applicant_details: Json
          applicant_name: string
          approval_timestamp: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          cert_date: string | null
          certificate_number: string | null
          citizen_user_id: string | null
          config_snapshot: Json | null
          contact_email: string | null
          contact_mobile: string | null
          created_at: string
          created_by: string | null
          data: Json
          department: string | null
          document_mode: string
          id: string
          issue_date: string | null
          last_returned_at: string | null
          memo_no: string | null
          memo_serial: number | null
          memo_year: number | null
          office_copy_opened_at: string | null
          parent_application_id: string | null
          pdf_storage_path: string | null
          public_edit_until: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          rejection_reason: string | null
          rejection_timestamp: string | null
          restored_at: string | null
          return_count: number
          source: string
          status: string
          submitted_at: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          verification_count: number
          verification_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          village: string | null
        }
        Insert: {
          applicant_details?: Json
          applicant_name: string
          approval_timestamp?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cert_date?: string | null
          certificate_number?: string | null
          citizen_user_id?: string | null
          config_snapshot?: Json | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string
          created_by?: string | null
          data: Json
          department?: string | null
          document_mode?: string
          id?: string
          issue_date?: string | null
          last_returned_at?: string | null
          memo_no?: string | null
          memo_serial?: number | null
          memo_year?: number | null
          office_copy_opened_at?: string | null
          parent_application_id?: string | null
          pdf_storage_path?: string | null
          public_edit_until?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          rejection_reason?: string | null
          rejection_timestamp?: string | null
          restored_at?: string | null
          return_count?: number
          source?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          verification_count?: number
          verification_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          village?: string | null
        }
        Update: {
          applicant_details?: Json
          applicant_name?: string
          approval_timestamp?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cert_date?: string | null
          certificate_number?: string | null
          citizen_user_id?: string | null
          config_snapshot?: Json | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          department?: string | null
          document_mode?: string
          id?: string
          issue_date?: string | null
          last_returned_at?: string | null
          memo_no?: string | null
          memo_serial?: number | null
          memo_year?: number | null
          office_copy_opened_at?: string | null
          parent_application_id?: string | null
          pdf_storage_path?: string | null
          public_edit_until?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          rejection_reason?: string | null
          rejection_timestamp?: string | null
          restored_at?: string | null
          return_count?: number
          source?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          verification_count?: number
          verification_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          village?: string | null
        }
        Relationships: []
      }
      documents_engine: {
        Row: {
          application_id: string | null
          created_at: string | null
          document_type_id: string | null
          file_path: string
          file_size_bytes: number | null
          hash_value: string | null
          id: string
          is_active: boolean | null
          mime_type: string | null
          owner_id: string
          requirement_id: string | null
          updated_at: string | null
          uploaded_by: string | null
          verification_status: string | null
          version: number | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          document_type_id?: string | null
          file_path: string
          file_size_bytes?: number | null
          hash_value?: string | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          owner_id: string
          requirement_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          version?: number | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          document_type_id?: string | null
          file_path?: string
          file_size_bytes?: number | null
          hash_value?: string | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          owner_id?: string
          requirement_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_engine_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "master_document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_engine_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "master_document_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      events_engine: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          application_id: string | null
          created_at: string | null
          event_metadata: Json | null
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          application_id?: string | null
          created_at?: string | null
          event_metadata?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          application_id?: string | null
          created_at?: string | null
          event_metadata?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      master_appointment_document_types: {
        Row: {
          appointment_type: string
          created_at: string | null
          document_type_id: string | null
          id: string
          is_mandatory: boolean | null
        }
        Insert: {
          appointment_type: string
          created_at?: string | null
          document_type_id?: string | null
          id?: string
          is_mandatory?: boolean | null
        }
        Update: {
          appointment_type?: string
          created_at?: string | null
          document_type_id?: string | null
          id?: string
          is_mandatory?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "master_appointment_document_types_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "master_document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      master_certificate_types: {
        Row: {
          cert_kind: string
          created_at: string
          id: string
          id_format: string
          id_prefix: string
          is_active: boolean
          sequence_reset_period: string
          updated_at: string
          validity_duration: number | null
          validity_enabled: boolean
          validity_unit: string | null
        }
        Insert: {
          cert_kind: string
          created_at?: string
          id?: string
          id_format: string
          id_prefix: string
          is_active?: boolean
          sequence_reset_period?: string
          updated_at?: string
          validity_duration?: number | null
          validity_enabled?: boolean
          validity_unit?: string | null
        }
        Update: {
          cert_kind?: string
          created_at?: string
          id?: string
          id_format?: string
          id_prefix?: string
          is_active?: boolean
          sequence_reset_period?: string
          updated_at?: string
          validity_duration?: number | null
          validity_enabled?: boolean
          validity_unit?: string | null
        }
        Relationships: []
      }
      master_data: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string
          label_bn: string | null
          parent_code: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label: string
          label_bn?: string | null
          parent_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          label_bn?: string | null
          parent_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      master_designations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_document_requirements: {
        Row: {
          allowed_extensions: string[] | null
          cert_kind: Database["public"]["Enums"]["cert_kind"]
          created_at: string | null
          display_order: number | null
          document_type_id: string | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          max_files: number | null
          requirement_stage: Database["public"]["Enums"]["document_requirement_stage"]
          updated_at: string | null
        }
        Insert: {
          allowed_extensions?: string[] | null
          cert_kind: Database["public"]["Enums"]["cert_kind"]
          created_at?: string | null
          display_order?: number | null
          document_type_id?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_files?: number | null
          requirement_stage: Database["public"]["Enums"]["document_requirement_stage"]
          updated_at?: string | null
        }
        Update: {
          allowed_extensions?: string[] | null
          cert_kind?: Database["public"]["Enums"]["cert_kind"]
          created_at?: string | null
          display_order?: number | null
          document_type_id?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_files?: number | null
          requirement_stage?: Database["public"]["Enums"]["document_requirement_stage"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_document_requirements_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "master_document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      master_document_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          type_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          type_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_notification_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          template: string | null
          type_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template?: string | null
          type_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template?: string | null
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_post_offices: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pin_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pin_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pin_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_rejection_reasons: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          reason_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          reason_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          reason_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_relations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          relation_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          relation_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          relation_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_sansads: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      master_village_post_offices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          post_office_id: string
          updated_at: string
          village_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          post_office_id: string
          updated_at?: string
          village_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          post_office_id?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_village_post_offices_post_office_id_fkey"
            columns: ["post_office_id"]
            isOneToOne: false
            referencedRelation: "master_post_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_village_post_offices_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "master_villages"
            referencedColumns: ["id"]
          },
        ]
      }
      master_villages: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      master_ward_sansads: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sansad_id: string
          updated_at: string
          ward_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sansad_id: string
          updated_at?: string
          ward_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sansad_id?: string
          updated_at?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_ward_sansads_sansad_id_fkey"
            columns: ["sansad_id"]
            isOneToOne: false
            referencedRelation: "master_sansads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_ward_sansads_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "master_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      master_wards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          ward_number: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          ward_number: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          ward_number?: string
        }
        Relationships: []
      }
      master_workflow_states: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          state_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          state_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          state_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      office_notifications: {
        Row: {
          action_href: string | null
          action_label: string | null
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["office_notification_kind"]
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_href?: string | null
          action_label?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["office_notification_kind"]
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_href?: string | null
          action_label?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["office_notification_kind"]
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restore_jobs: {
        Row: {
          backup_job_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          ip_address: string | null
          reason: string
          started_at: string
          status: Database["public"]["Enums"]["backup_status"]
          triggered_by: string
          triggered_by_email: string | null
        }
        Insert: {
          backup_job_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          reason: string
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
          triggered_by: string
          triggered_by_email?: string | null
        }
        Update: {
          backup_job_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
          triggered_by?: string
          triggered_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restore_jobs_backup_job_id_fkey"
            columns: ["backup_job_id"]
            isOneToOne: false
            referencedRelation: "backup_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action_name: string
          created_at: string | null
          id: string
          is_allowed: boolean | null
          role_name: string
        }
        Insert: {
          action_name: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          role_name: string
        }
        Update: {
          action_name?: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          role_name?: string
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action_timestamp: string | null
          action_type: string
          after_state: Json | null
          application_id: string | null
          before_state: Json | null
          id: string
          reason: string | null
          record_id: string
          table_name: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action_timestamp?: string | null
          action_type: string
          after_state?: Json | null
          application_id?: string | null
          before_state?: Json | null
          id?: string
          reason?: string | null
          record_id: string
          table_name: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action_timestamp?: string | null
          action_type?: string
          after_state?: Json | null
          application_id?: string | null
          before_state?: Json | null
          id?: string
          reason?: string | null
          record_id?: string
          table_name?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
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
      verification_lookups: {
        Row: {
          created_at: string
          found: boolean
          id: string
          ip_hash: string
          looked_up_at: string
          memo_no: string | null
          verification_id: string | null
        }
        Insert: {
          created_at?: string
          found?: boolean
          id?: string
          ip_hash: string
          looked_up_at?: string
          memo_no?: string | null
          verification_id?: string | null
        }
        Update: {
          created_at?: string
          found?: boolean
          id?: string
          ip_hash?: string
          looked_up_at?: string
          memo_no?: string | null
          verification_id?: string | null
        }
        Relationships: []
      }
      warish_certificates: {
        Row: {
          applicant_details: Json
          applicant_name: string
          approval_timestamp: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          cert_date: string | null
          certificate_number: string | null
          citizen_user_id: string | null
          config_snapshot: Json | null
          contact_email: string | null
          contact_mobile: string | null
          created_at: string
          created_by: string | null
          data: Json
          deceased_name: string
          document_mode: string
          id: string
          issue_date: string | null
          last_returned_at: string | null
          memo_no: string | null
          memo_serial: number | null
          memo_year: number | null
          office_copy_opened_at: string | null
          parent_application_id: string | null
          pdf_storage_path: string | null
          public_edit_until: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          rejection_reason: string | null
          rejection_timestamp: string | null
          restored_at: string | null
          return_count: number
          source: string
          status: string
          submitted_at: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          verification_count: number
          verification_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          village: string | null
        }
        Insert: {
          applicant_details?: Json
          applicant_name: string
          approval_timestamp?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cert_date?: string | null
          certificate_number?: string | null
          citizen_user_id?: string | null
          config_snapshot?: Json | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string
          created_by?: string | null
          data: Json
          deceased_name: string
          document_mode?: string
          id?: string
          issue_date?: string | null
          last_returned_at?: string | null
          memo_no?: string | null
          memo_serial?: number | null
          memo_year?: number | null
          office_copy_opened_at?: string | null
          parent_application_id?: string | null
          pdf_storage_path?: string | null
          public_edit_until?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          rejection_reason?: string | null
          rejection_timestamp?: string | null
          restored_at?: string | null
          return_count?: number
          source?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          verification_count?: number
          verification_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          village?: string | null
        }
        Update: {
          applicant_details?: Json
          applicant_name?: string
          approval_timestamp?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cert_date?: string | null
          certificate_number?: string | null
          citizen_user_id?: string | null
          config_snapshot?: Json | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          deceased_name?: string
          document_mode?: string
          id?: string
          issue_date?: string | null
          last_returned_at?: string | null
          memo_no?: string | null
          memo_serial?: number | null
          memo_year?: number | null
          office_copy_opened_at?: string | null
          parent_application_id?: string | null
          pdf_storage_path?: string | null
          public_edit_until?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          rejection_reason?: string | null
          rejection_timestamp?: string | null
          restored_at?: string | null
          return_count?: number
          source?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          verification_count?: number
          verification_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          village?: string | null
        }
        Relationships: []
      }
      whats_new_entries: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          expiry_mode: string
          id: string
          is_pinned: boolean
          is_published: boolean
          posted_on: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          expiry_mode?: string
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          posted_on?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          expiry_mode?: string
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          posted_on?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      workflow_transitions: {
        Row: {
          created_at: string | null
          description: string | null
          from_state_id: string | null
          id: string
          is_active: boolean | null
          role_required: string | null
          to_state_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          from_state_id?: string | null
          id?: string
          is_active?: boolean | null
          role_required?: string | null
          to_state_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          from_state_id?: string | null
          id?: string
          is_active?: boolean | null
          role_required?: string | null
          to_state_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_transitions_from_state_id_fkey"
            columns: ["from_state_id"]
            isOneToOne: false
            referencedRelation: "master_workflow_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_to_state_id_fkey"
            columns: ["to_state_id"]
            isOneToOne: false
            referencedRelation: "master_workflow_states"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      application_timeline: {
        Args: {
          _cert_id: string
          _kind: Database["public"]["Enums"]["cert_kind"]
        }
        Returns: {
          action: string
          actor_email: string
          created_at: string
          event: string
          metadata: Json
          reason: string
        }[]
      }
      approve_certificate: {
        Args: {
          _cert_id: string
          _issue_date: string
          _kind: string
          _memo_no: string
        }
        Returns: undefined
      }
      approve_certificate_v2:
        | {
            Args: {
              _cert_id: string
              _issue_date: string
              _kind: Database["public"]["Enums"]["cert_kind"]
              _memo_serial: number
              _memo_year: number
            }
            Returns: Json
          }
        | {
            Args: {
              _cert_id: string
              _issue_date: string
              _kind: string
              _memo_serial: number
              _memo_year: number
            }
            Returns: Json
          }
      archive_certificate: {
        Args: {
          _cert_id: string
          _ip?: string
          _kind: Database["public"]["Enums"]["cert_kind"]
          _reason: string
          _user_agent?: string
        }
        Returns: undefined
      }
      archive_expired_rejections: { Args: never; Returns: number }
      bootstrap_admin_role: {
        Args: never
        Returns: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          was_created: boolean
        }[]
      }
      check_permission: {
        Args: { p_action_name: string; p_role_name: string }
        Returns: boolean
      }
      citizen_profile_is_complete: {
        Args: { _user_id: string }
        Returns: boolean
      }
      create_citizen_draft: {
        Args: {
          _applicant_name?: string
          _contact_email?: string
          _contact_mobile?: string
          _data: Json
          _deceased_name?: string
          _kind: Database["public"]["Enums"]["cert_kind"]
          _parent_application_id?: string
          _village?: string
        }
        Returns: string
      }
      delete_unlinked_document: {
        Args: { _storage_path: string }
        Returns: undefined
      }
      find_citizen_duplicates: {
        Args: {
          _email?: string
          _kind: Database["public"]["Enums"]["cert_kind"]
          _mobile: string
        }
        Returns: {
          applicant_name: string
          created_at: string
          id: string
          kind: string
          memo_no: string
          source: string
          status: string
          village: string
        }[]
      }
      generate_verification_id: {
        Args: { _kind: string; _year: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      job_archive_completed_records: { Args: never; Returns: undefined }
      job_close_expired_drafts: { Args: never; Returns: undefined }
      job_close_expired_uploads: { Args: never; Returns: undefined }
      job_refresh_credits: { Args: never; Returns: undefined }
      link_document_to_application: {
        Args: {
          _app_id: string
          _file_size_bytes: number
          _kind: Database["public"]["Enums"]["cert_kind"]
          _mime_type: string
          _req_id: string
          _storage_path: string
        }
        Returns: string
      }
      log_citizen_activity: {
        Args: {
          _action_type: string
          _metadata?: Json
          _target_id?: string
          _target_table?: string
        }
        Returns: undefined
      }
      log_office_activity: {
        Args: {
          _action_type: string
          _metadata?: Json
          _target_id?: string
          _target_table?: string
        }
        Returns: undefined
      }
      next_citizen_id: { Args: never; Returns: string }
      notify_office_user: {
        Args: {
          _action_href?: string
          _action_label?: string
          _body?: string
          _kind: Database["public"]["Enums"]["office_notification_kind"]
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      open_office_working_copy: {
        Args: {
          _cert_id: string
          _kind: Database["public"]["Enums"]["cert_kind"]
        }
        Returns: undefined
      }
      permanently_delete_rejected:
        | {
            Args: {
              _cert_id: string
              _kind: Database["public"]["Enums"]["cert_kind"]
            }
            Returns: undefined
          }
        | { Args: { _cert_id: string; _kind: string }; Returns: undefined }
      public_verify: {
        Args: { _ip_hash: string; _verification_id: string }
        Returns: Json
      }
      public_verify_advanced: {
        Args: {
          _deceased_name: string
          _ip_hash: string
          _issue_date: string
          _memo_no: string
        }
        Returns: Json
      }
      reject_certificate: {
        Args: { _cert_id: string; _kind: string; _reason: string }
        Returns: undefined
      }
      reject_certificate_v2:
        | {
            Args: {
              _cert_id: string
              _kind: Database["public"]["Enums"]["cert_kind"]
              _reason: string
            }
            Returns: undefined
          }
        | {
            Args: { _cert_id: string; _kind: string; _reason: string }
            Returns: undefined
          }
      replace_application_document: {
        Args: {
          _app_id: string
          _kind: Database["public"]["Enums"]["cert_kind"]
          _new_file_size: number
          _new_mime: string
          _new_storage_path: string
          _old_doc_id: string
        }
        Returns: string
      }
      restore_certificate:
        | {
            Args: {
              _cert_id: string
              _kind: Database["public"]["Enums"]["cert_kind"]
            }
            Returns: undefined
          }
        | { Args: { _cert_id: string; _kind: string }; Returns: undefined }
      return_application: {
        Args: {
          _cert_id: string
          _kind: Database["public"]["Enums"]["cert_kind"]
          _reason: string
        }
        Returns: Json
      }
      rpc_approve_application: {
        Args: { p_application_id: string; p_table_name: string }
        Returns: Json
      }
      rpc_submit_application: {
        Args: { p_application_id: string; p_table_name: string }
        Returns: Json
      }
      save_citizen_draft: {
        Args: {
          _applicant_name?: string
          _cert_id: string
          _contact_email?: string
          _contact_mobile?: string
          _data: Json
          _deceased_name?: string
          _kind: Database["public"]["Enums"]["cert_kind"]
          _village?: string
        }
        Returns: undefined
      }
      submit_application: {
        Args: {
          _cert_id: string
          _kind: Database["public"]["Enums"]["cert_kind"]
        }
        Returns: Json
      }
      submit_citizen_application: {
        Args: {
          _cert_id: string
          _kind: Database["public"]["Enums"]["cert_kind"]
        }
        Returns: Json
      }
      unified_find_duplicates: {
        Args: {
          _email?: string
          _identity_id?: string
          _mobile?: string
          _person_name?: string
        }
        Returns: Json
      }
      verify_application_document: {
        Args: {
          _doc_id: string
          _notes?: string
          _status: Database["public"]["Enums"]["verification_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_action: "view" | "create" | "edit" | "delete"
      app_permission:
        | "notices"
        | "representatives"
        | "staff"
        | "homepage_content"
        | "redirects"
        | "warish_certs"
        | "dependent_certs"
        | "birth_certs"
        | "admins"
        | "activity_logs"
        | "backups"
      app_role:
        | "admin"
        | "user"
        | "super_admin"
        | "deo"
        | "monitoring_authority"
      backup_kind: "daily" | "weekly" | "monthly" | "manual"
      backup_status: "running" | "success" | "failed"
      cert_audit_action:
        | "created"
        | "approved"
        | "rejected"
        | "downloaded"
        | "modified"
        | "archived"
        | "restored"
        | "verified"
        | "revoked"
      cert_kind: "warish" | "dependent" | "birth" | "death"
      citizen_health_status: "good" | "watch" | "restricted" | "suspended"
      citizen_notification_kind:
        | "application_returned"
        | "certificate_ready"
        | "profile_incomplete"
        | "account_warning"
        | "office_notice"
        | "security_alert"
        | "general"
      document_requirement_stage: "PRE_SUBMISSION" | "PRE_APPROVAL"
      office_notification_kind:
        | "application_returned"
        | "certificate_issued"
        | "new_notice"
        | "system_alert"
        | "public_draft"
        | "general"
      verification_status: "pending" | "verified" | "rejected" | "revoked"
      whats_new_expiry_mode: "never" | "date" | "datetime" | "manual"
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
    Enums: {
      app_action: ["view", "create", "edit", "delete"],
      app_permission: [
        "notices",
        "representatives",
        "staff",
        "homepage_content",
        "redirects",
        "warish_certs",
        "dependent_certs",
        "birth_certs",
        "admins",
        "activity_logs",
        "backups",
      ],
      app_role: ["admin", "user", "super_admin", "deo", "monitoring_authority"],
      backup_kind: ["daily", "weekly", "monthly", "manual"],
      backup_status: ["running", "success", "failed"],
      cert_audit_action: [
        "created",
        "approved",
        "rejected",
        "downloaded",
        "modified",
        "archived",
        "restored",
        "verified",
        "revoked",
      ],
      cert_kind: ["warish", "dependent", "birth", "death"],
      citizen_health_status: ["good", "watch", "restricted", "suspended"],
      citizen_notification_kind: [
        "application_returned",
        "certificate_ready",
        "profile_incomplete",
        "account_warning",
        "office_notice",
        "security_alert",
        "general",
      ],
      document_requirement_stage: ["PRE_SUBMISSION", "PRE_APPROVAL"],
      office_notification_kind: [
        "application_returned",
        "certificate_issued",
        "new_notice",
        "system_alert",
        "public_draft",
        "general",
      ],
      verification_status: ["pending", "verified", "rejected", "revoked"],
      whats_new_expiry_mode: ["never", "date", "datetime", "manual"],
    },
  },
} as const
