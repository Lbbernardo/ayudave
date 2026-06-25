// Tipos compartidos de AyudaVE.
// Reflejan las tablas definidas en supabase/schema.sql.

export type Urgency = "alta" | "media" | "baja";

export type ReportStatus =
  | "pendiente"
  | "revisado"
  | "asignado"
  | "atendido"
  | "falso"
  | "duplicado";

export type MissingStatus = "buscando" | "encontrado";

export type VolunteerStatus = "disponible" | "asignado" | "inactivo";

export type DonationStatus = "pendiente" | "coordinada" | "entregada";

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
  "atendido",
  "falso",
  "duplicado",
];

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
}

export interface CaseUpdate {
  id: string;
  report_id: string;
  note: string;
  status: string | null;
  created_at: string;
}
