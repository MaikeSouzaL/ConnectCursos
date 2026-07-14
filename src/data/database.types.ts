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
      attendance: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          class_id: string | null
          created_at: string
          date: string
          id: string
          method: Database["public"]["Enums"]["attendance_method"]
          person_id: string
          person_role: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          class_id?: string | null
          created_at?: string
          date: string
          id?: string
          method?: Database["public"]["Enums"]["attendance_method"]
          person_id: string
          person_role: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          method?: Database["public"]["Enums"]["attendance_method"]
          person_id?: string
          person_role?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          student_id: string
        }
        Insert: {
          class_id: string
          student_id: string
        }
        Update: {
          class_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number
          course_id: string | null
          end_date: string | null
          id: string
          name: string
          room_id: string | null
          schedule: Json
          start_date: string | null
          status: Database["public"]["Enums"]["class_status"]
          teacher_id: string | null
        }
        Insert: {
          capacity?: number
          course_id?: string | null
          end_date?: string | null
          id?: string
          name: string
          room_id?: string | null
          schedule?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          teacher_id?: string | null
        }
        Update: {
          capacity?: number
          course_id?: string | null
          end_date?: string | null
          id?: string
          name?: string
          room_id?: string | null
          schedule?: Json
          start_date?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_qr: {
        Row: {
          created_at: string
          id: boolean
          token: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          token?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string
          duration_months: number
          id: string
          name: string
          price_monthly: number
          status: Database["public"]["Enums"]["course_status"]
          teacher_id: string | null
          workload_hours: number
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string
          duration_months?: number
          id?: string
          name: string
          price_monthly?: number
          status?: Database["public"]["Enums"]["course_status"]
          teacher_id?: string | null
          workload_hours?: number
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string
          duration_months?: number
          id?: string
          name?: string
          price_monthly?: number
          status?: Database["public"]["Enums"]["course_status"]
          teacher_id?: string | null
          workload_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      institution: {
        Row: {
          address: string
          cnpj: string
          email: string
          id: boolean
          logo_url: string | null
          name: string
          opening_balance: number
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          cnpj?: string
          email?: string
          id?: boolean
          logo_url?: string | null
          name?: string
          opening_balance?: number
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          cnpj?: string
          email?: string
          id?: boolean
          logo_url?: string | null
          name?: string
          opening_balance?: number
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer: string
          date: string
          description: string
          id: string
          number: string
          status: Database["public"]["Enums"]["invoice_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          customer: string
          date: string
          description?: string
          id?: string
          number: string
          status?: Database["public"]["Enums"]["invoice_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          customer?: string
          date?: string
          description?: string
          id?: string
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
        }
        Relationships: []
      }
      messages: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: Database["public"]["Enums"]["role"]
          channel_id: string
          content: string
          created_at: string
          id: string
          image_path: string | null
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_role: Database["public"]["Enums"]["role"]
          channel_id: string
          content: string
          created_at?: string
          id?: string
          image_path?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: Database["public"]["Enums"]["role"]
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          image_path?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method: Database["public"]["Enums"]["payment_method"] | null
          paid_at: string | null
          person_id: string | null
          reference_month: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          method?: Database["public"]["Enums"]["payment_method"] | null
          paid_at?: string | null
          person_id?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          method?: Database["public"]["Enums"]["payment_method"] | null
          paid_at?: string | null
          person_id?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          linked_id: string | null
          must_change_password: boolean
          name: string
          notification_prefs: Json
          role: Database["public"]["Enums"]["role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          linked_id?: string | null
          must_change_password?: boolean
          name: string
          notification_prefs?: Json
          role?: Database["public"]["Enums"]["role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          linked_id?: string | null
          must_change_password?: boolean
          name?: string
          notification_prefs?: Json
          role?: Database["public"]["Enums"]["role"]
        }
        Relationships: []
      }
      room_bookings: {
        Row: {
          class_id: string | null
          date: string
          end_time: string
          id: string
          price: number | null
          renter_name: string | null
          room_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          teacher_id: string | null
          title: string
          type: Database["public"]["Enums"]["booking_type"]
        }
        Insert: {
          class_id?: string | null
          date: string
          end_time: string
          id?: string
          price?: number | null
          renter_name?: string | null
          room_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          teacher_id?: string | null
          title: string
          type: Database["public"]["Enums"]["booking_type"]
        }
        Update: {
          class_id?: string | null
          date?: string
          end_time?: string
          id?: string
          price?: number | null
          renter_name?: string | null
          room_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          teacher_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["booking_type"]
        }
        Relationships: [
          {
            foreignKeyName: "room_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          color: string
          hourly_rate: number
          id: string
          name: string
          resources: string[]
        }
        Insert: {
          capacity?: number
          color?: string
          hourly_rate?: number
          id?: string
          name: string
          resources?: string[]
        }
        Update: {
          capacity?: number
          color?: string
          hourly_rate?: number
          id?: string
          name?: string
          resources?: string[]
        }
        Relationships: []
      }
      students: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cpf: string
          email: string
          enrolled_at: string
          id: string
          monthly_fee: number
          name: string
          phone: string
          status: Database["public"]["Enums"]["student_status"]
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string
          email: string
          enrolled_at?: string
          id?: string
          monthly_fee?: number
          name: string
          phone?: string
          status?: Database["public"]["Enums"]["student_status"]
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string
          email?: string
          enrolled_at?: string
          id?: string
          monthly_fee?: number
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["student_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          avatar_url: string | null
          email: string
          hired_at: string
          id: string
          monthly_rent: number
          name: string
          phone: string
          rent_status: Database["public"]["Enums"]["payment_status"]
          specialty: string
          status: Database["public"]["Enums"]["teacher_status"]
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          email: string
          hired_at?: string
          id?: string
          monthly_rent?: number
          name: string
          phone?: string
          rent_status?: Database["public"]["Enums"]["payment_status"]
          specialty?: string
          status?: Database["public"]["Enums"]["teacher_status"]
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string
          hired_at?: string
          id?: string
          monthly_rent?: number
          name?: string
          phone?: string
          rent_status?: Database["public"]["Enums"]["payment_status"]
          specialty?: string
          status?: Database["public"]["Enums"]["teacher_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: Record<PropertyKey, never>; Returns: boolean }
      counter_token_valido: { Args: { t: string }; Returns: boolean }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      my_linked_id: { Args: Record<PropertyKey, never>; Returns: string }
      my_role: { Args: Record<PropertyKey, never>; Returns: Database["public"]["Enums"]["role"] }
      teaches_class: { Args: { p_class_id: string }; Returns: boolean }
      teaches_student: { Args: { p_student_id: string }; Returns: boolean }
    }
    Enums: {
      attendance_method: "qr" | "manual"
      attendance_status: "presente" | "atrasado" | "falta" | "justificado"
      booking_status: "confirmado" | "pendente" | "cancelado"
      booking_type: "turma" | "aluguel" | "palestra" | "evento" | "manutencao"
      class_status: "em_andamento" | "planejada" | "concluida"
      course_status: "ativo" | "inativo"
      invoice_status: "emitida" | "cancelada"
      payment_kind: "mensalidade" | "aluguel" | "despesa" | "outra_receita"
      payment_method: "pix" | "cartao" | "boleto" | "dinheiro"
      payment_status: "pago" | "pendente" | "atrasado"
      role: "admin" | "professor" | "aluno"
      student_status: "ativo" | "inadimplente" | "trancado" | "concluido"
      teacher_status: "ativo" | "inativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
