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
  "Agua",
  "Comida",
  "Medicinas",
  "Ropa",
  "Refugio",
  "Transporte",
  "Herramientas",
  "Remoción de escombros",
  "Atención médica",
  "Electricidad",
  "Comunicación/internet",
  "Baterías/linternas",
  "Atrapado",
  "Otro",
] as const;
export type HelpType = (typeof HELP_TYPES)[number];

// Capacidades que un ayudante puede ofrecer (tags canónicos para el matching).
export const CAPABILITIES = [
  { value: "agua", label: "Puedo donar agua" },
  { value: "comida", label: "Puedo donar comida" },
  { value: "medicinas", label: "Puedo donar medicinas" },
  { value: "ropa", label: "Puedo donar ropa" },
  { value: "refugio", label: "Puedo ofrecer refugio" },
  { value: "transporte_personas", label: "Puedo transportar personas" },
  { value: "transporte_carga", label: "Puedo transportar agua/comida/carga" },
  { value: "herramientas", label: "Tengo herramientas" },
  { value: "remocion", label: "Ayudo con remoción de escombros/construcción" },
  { value: "medico", label: "Soy médico/enfermero/paramédico" },
  { value: "electricidad", label: "Ayudo con electricidad" },
  { value: "comunicacion", label: "Ayudo con comunicación/internet" },
  { value: "baterias", label: "Tengo baterías/linternas" },
] as const;

// Qué capacidades satisfacen cada tipo de necesidad (incluye tipos antiguos).
export const NEED_TO_CAPABILITY: Record<string, string[]> = {
  Agua: ["agua"],
  Comida: ["comida"],
  Medicinas: ["medicinas", "medico"],
  Ropa: ["ropa"],
  Refugio: ["refugio"],
  Transporte: ["transporte_personas", "transporte_carga"],
  Herramientas: ["herramientas"],
  "Remoción de escombros": ["remocion", "herramientas"],
  "Atención médica": ["medico"],
  Electricidad: ["electricidad"],
  "Comunicación/internet": ["comunicacion"],
  "Baterías/linternas": ["baterias"],
  // Compatibilidad con tipos antiguos:
  "Médica": ["medico", "medicinas"],
  Atrapado: ["remocion", "herramientas"],
  Otro: [],
};

// Mapeo de tipo de donación -> capacidad equivalente.
export const DONATION_TO_CAPABILITY: Record<string, string> = {
  Agua: "agua",
  Comida: "comida",
  Medicinas: "medicinas",
  Ropa: "ropa",
  Refugio: "refugio",
  Transporte: "transporte_carga",
  Linternas: "baterias",
  Baterías: "baterias",
};

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
  match_score: number | null;
  email: string | null;
  tracking_token: string | null;
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
  user_id: string | null;
  capabilities: string | null; // tags separados por coma (ver CAPABILITIES)
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
  user_id: string | null;
}

export interface Assignment {
  id: string;
  report_id: string;
  assigned_to_type: Exclude<AssignedToType, "admin">;
  assigned_to_id: string;
  distance_km: number | null;
  score: number | null;
  status: Exclude<AssignmentStatus, "sin_asignar" | "pendiente_sin_asignar">;
  created_at: string;
  updated_at: string;
}

export interface CaseUpdate {
  id: string;
  report_id: string;
  note: string;
  status: string | null;
  actor: string | null;
  created_at: string;
}

export type UserRole = "helper" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  report_id: string | null;
  read: boolean;
  created_at: string;
}
