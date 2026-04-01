export interface User {
  id: string;
  uid: string;
  username: string;
  role: 'admin' | 'doctor' | 'accountant' | 'receptionist';
  name: string;
}

export interface Patient {
  id: string;
  file_number?: number;
  name: string;
  phone: string;
  email: string;
  gender: string;
  birthdate: string;
  medical_history: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
}

export interface Procedure {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface Stats {
  patients: number;
  appointments: number;
  revenue: number;
}

export interface ClinicSettings {
  id: string;
  clinic_name: string;
  clinic_logo: string;
  contact_info: string;
  
  // Prescription Settings
  prescription_doctor_name_ar?: string;
  prescription_doctor_title_ar?: string;
  prescription_doctor_name_en?: string;
  prescription_doctor_title_en?: string;
  prescription_center_name_ar?: string;
  prescription_center_name_en?: string;
  prescription_center_subtitle?: string;
  prescription_footer_instructions?: string;
  prescription_address?: string;
  prescription_phones?: string;
}

export interface Medication {
  id: string;
  name: string;
  description: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  weight?: string;
  bp?: string;
  diagnosis?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  created_at: any;
}

export interface DentalChart {
  id: string;
  patient_id: string;
  tooth_number: number;
  status: string;
  notes?: string;
  updated_at: string;
}
