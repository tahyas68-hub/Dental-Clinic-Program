export interface User {
  id: string;
  uid: string;
  username: string;
  role: 'admin' | 'doctor' | 'accountant' | 'receptionist';
  name: string;
}

export interface Patient {
  id: string;
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
}
