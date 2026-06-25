// Tipos compartidos de AyudaVE.
// Reflejan las tablas definidas en supabase/schema.sql.

export type Urgency = "alta" | "media" | "baja";

export type ReportStatus =
  | "pendiente"
  | "revisado"
  | "asignado"
  | "en_proceso"
  | "atendido"
  | "falso"
  | "duplicado";

// Estado de la asignación de un reporte a una persona.
export type AssignmentStatus =
  | "sin_asignar"
  | "asignado"
  | "aceptado"
  | "en_camino"
  | "completado"
  | "rechazado"
  | "pendiente_sin_asignar";

// Tipo de persona a la que se asigna un caso.
export type AssignedToType = "volunteer" | "donor" | "admin";

export type MissingStatus = "buscando" | "encontrado";

export type VolunteerStatus = "disponible" | "asignado" | "inactivo";

export type DonationStatus =
  | "disponible"
  | "pendiente"
  | "coordinada"
  | "entregada"
  | "inactivo";

export const HELP_TYPES = [
  "Médica",
  "Atrapado",
  "Agua",
  "Comida",
  "Refugio",
  "Medicinas",
  "Transporte",
  "Otro",
] as const;
export type HelpType = (typeof HELP_TYPES)[number];

export const URGENCY_OPTIONS: Urgency[] = ["alta", "media", "baja"];

export const SKILL_OPTIONS = [
  "Médico",
  "Enfermero",
  "Paramédico",
  "Transporte",
  "Camioneta",
  "Cocina",
  "Agua/comida",
  "Electricidad",
  "Construcción",
  "Psicología",
  "Otro",
] as const;

export const DONATION_TYPES = [
  "Agua",
  "Comida",
  "Medicinas",
  "Ropa",
  "Linternas",
  "Baterías",
  "Transporte",
  "Refugio",
  "Dinero",
  "Otro",
] as const;
export type DonationType = (typeof DONATION_TYPES)[number];

export const REPORT_STATUSES: ReportStatus[] = [
  "pendiente",
  "revisado",
  "asignado",
  "en_proceso",
  "atendido",
  "falso",
  "duplicado",
];

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "sin_asignar",
  "asignado",
  "aceptado",
  "en_camino",
  "completado",
  "rechazado",
  "pendiente_sin_asignar",
];

// Habilidades que cuentan como "personal médico" para la prioridad de ayuda Médica.
export const MEDICAL_SKILLS = ["Médico", "Enfermero", "Paramédico"] as const;

// Capacidad máxima de casos activos por defecto (coincide con la migración SQL).
export const MAX_ACTIVE_CASES_VOLUNTEER = 3;
export const MAX_ACTIVE_CASES_DONOR = 5;

export const VOLUNTEER_STATUSES: VolunteerStatus[] = [
  "disponible",
  "asignado",
  "inactivo",
];

export interface Report {
  id: string;
  full_name: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  help_type: string;
  urgency: Urgency;
  description: string | null;
  people_count: number;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  is_public: boolean;
  created_at: string;
  // Campos de asignación automática (ver supabase/migrations/0001_auto_assignment.sql).
  assigned_to_type: AssignedToType | null;
  assigned_to_id: string | null;
  assigned_at: string | null;
  assignment_status: AssignmentStatus;
  distance_km: number | null;
}

export interface SafeReport {
  id: string;
  full_name: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface MissingPerson {
  id: string;
  missing_name: string;
  last_known_location: string | null;
  description: string | null;
  contact_name: string;
  contact_phone: string | null;
  status: MissingStatus;
  created_at: string;
}

export interface Volunteer {
  id: string;
  full_name: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  skills: string | null;
  has_vehicle: boolean;
  availability: string | null;
  status: VolunteerStatus;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  max_active_cases: number | null;
}

export interface Donation {
  id: string;
  donor_name: string | null;
  phone: string | null;
  donation_type: string;
  description: string | null;
  state: string | null;
  city: string | null;
  status: DonationStatus;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  max_active_cases: number | null;
}

export interface Assignment {
  id: string;
  report_id: string;
  assigned_to_type: Exclude<AssignedToType, "admin">;
  assigned_to_id: string;
  distance_km: number | null;
  status: Exclude<AssignmentStatus, "sin_asignar" | "pendiente_sin_asignar">;
  created_at: string;
  updated_at: string;
}

export interface CaseUpdate {
  id: string;
  report_id: string;
  note: string;
  status: string | null;
  created_at: string;
}
