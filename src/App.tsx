import React, { useState, useEffect, useRef } from 'react';
import { User, Patient, Appointment, Stats, Procedure, ClinicSettings } from './types';
import { 
  Users, Calendar, CreditCard, Package, BarChart3, 
  LogOut, Plus, Search, Bell, Menu, X, ChevronRight,
  Stethoscope, FileText, UserPlus, Clock, Check,
  Settings, Shield, Download, Upload, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { cn } from './lib/utils';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Card } from './components/ui/Card';
import { Modal } from './components/ui/Modal';
import { Table } from './components/ui/Table';
import { Badge } from './components/ui/Badge';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatCard } from './components/dashboard/StatCard';

import { auth, db, loginWithEmail, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  collection, onSnapshot, query, addDoc, updateDoc, doc, 
  deleteDoc, setDoc, getDoc, getDocs, where, orderBy,
  Timestamp, serverTimestamp, getDocFromServer, runTransaction
} from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [selectedPatientFile, setSelectedPatientFile] = useState<Patient | null>(null);
  const [prescriptionToPrint, setPrescriptionToPrint] = useState<{
    patient: Patient, 
    meds: any[], 
    weight?: string, 
    bp?: string, 
    diagnosis?: string
  } | null>(null);
  const prescriptionRef = useRef<HTMLDivElement>(null);
  const [patientTab, setPatientTab] = useState('history');
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Modals
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formatDate = (date: any) => {
    if (!date) return '-';
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString('ar-EG');
    }
    return new Date(date).toLocaleDateString('ar-EG');
  };

  // Form States
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', birthdate: '', gender: 'ذكر', medical_history: '' });
  const [newAppointment, setNewAppointment] = useState({ patient_id: '', start_time: '', notes: '' });
  const [newPrescription, setNewPrescription] = useState({ 
    patient_id: '', 
    weight: '', 
    bp: '', 
    diagnosis: '', 
    medications: [{ name: '', dosage: '', frequency: '' }] 
  });
  const [newMedication, setNewMedication] = useState({ name: '', description: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'doctor', name: '' });
  const [newInventoryItem, setNewInventoryItem] = useState({ item_name: '', quantity: 0, unit: 'قطعة', min_threshold: 10 });
  const [newInvoice, setNewInvoice] = useState({ patient_id: '', total_amount: 0, paid_amount: 0, status: 'pending' });
  const [newProcedure, setNewProcedure] = useState({ name: '', category: '', price: 0 });
  const [showProcedureModal, setShowProcedureModal] = useState(false);

  // Login Form State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsCheckingUser(true);
      try {
        if (firebaseUser) {
          console.log("Firebase user detected:", firebaseUser.uid);
          // Check if user exists in our users collection
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
          }

          if (userDoc && userDoc.exists()) {
            console.log("User document found:", userDoc.data());
            setUser({ ...userDoc.data(), id: userDoc.id, uid: firebaseUser.uid } as User);
          } else {
            console.log("User document not found. Logging out...");
            setLoginError('يرجى التواصل مع المدير لتفعيل حسابك');
            await logout();
          }
        } else {
          console.log("No Firebase user detected.");
          setUser(null);
        }
      } catch (error: any) {
        console.error("Auth state change error:", error);
        setLoginError('حدث خطأ أثناء التحقق من الحساب: ' + error.message);
      } finally {
        setIsCheckingUser(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && isAuthReady) {
      const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
        setPatients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Patient)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'patients'));

      const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
        setAppointments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'appointments'));

      const unsubProcedures = onSnapshot(collection(db, 'procedures'), (snapshot) => {
        setProcedures(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Procedure)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'procedures'));

      const unsubMeds = onSnapshot(collection(db, 'medications'), (snapshot) => {
        setMedications(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'medications'));

      const unsubSettings = onSnapshot(doc(db, 'settings', 'clinic'), (doc) => {
        if (doc.exists()) {
          setClinicSettings({ ...doc.data(), id: doc.id } as ClinicSettings);
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/clinic'));

      const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
        setInventory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'inventory'));

      const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
        setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'invoices'));

      const unsubPrescriptions = onSnapshot(collection(db, 'prescriptions'), (snapshot) => {
        setPrescriptions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'prescriptions'));

      const unsubTreatments = onSnapshot(collection(db, 'treatments'), (snapshot) => {
        setTreatments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'treatments'));

      let unsubUsers: () => void = () => {};
      if (user.role === 'admin') {
        unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          setUsersList(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
        }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
      }

      return () => {
        unsubPatients();
        unsubAppointments();
        unsubProcedures();
        unsubMeds();
        unsubSettings();
        unsubInventory();
        unsubInvoices();
        unsubPrescriptions();
        unsubTreatments();
        unsubUsers();
      };
    }
  }, [user, isAuthReady]);

  // Update stats based on local state
  useEffect(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    setStats({
      patients: patients.length,
      appointments: appointments.length,
      revenue: totalRevenue
    });
  }, [patients, appointments, invoices]);

  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginForm.username || !loginForm.password) {
      setLoginError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      // First, check if the user exists in our Firestore 'users' collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', loginForm.username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Special case for initial setup: if no users exist, allow admin/admin123 to bootstrap
        if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
           // Create the first admin in Firebase Auth and Firestore
           const secondaryApp = initializeApp(firebaseConfig, 'Bootstrap');
           const secondaryAuth = getAuth(secondaryApp);
           const email = `admin@clinic.local`;
           try {
             const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, 'admin123');
             const uid = userCredential.user.uid;
             
             await setDoc(doc(db, 'users', uid), {
               uid: uid,
               username: 'admin',
               password: 'admin123',
               name: 'مدير النظام',
               role: 'admin',
               createdAt: serverTimestamp()
             });
             
             await deleteApp(secondaryApp);
             // Now login with the newly created account
             await loginWithEmail('admin', 'admin123');
             return;
           } catch (err: any) {
             await deleteApp(secondaryApp);
             console.error("Bootstrap error:", err);
             setLoginError('حدث خطأ أثناء إعداد حساب المدير: ' + err.message);
             return;
           }
        } else {
           setLoginError('اسم المستخدم غير موجود');
        }
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.password !== loginForm.password) {
        setLoginError('كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      // If credentials match, we use Firebase Auth to sign in
      try {
        await loginWithEmail(loginForm.username, loginForm.password);
      } catch (authError: any) {
        console.error("Auth error:", authError);
        setLoginError('خطأ في المصادقة: تأكد من تفعيل "Email/Password" في Firebase');
      }
    } catch (error: any) {
      console.error("Login error details:", error);
      setLoginError('حدث خطأ أثناء تسجيل الدخول: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'patients'), {
        ...newPatient,
        created_at: new Date().toISOString()
      });
      setShowPatientModal(false);
      setNewPatient({ name: '', phone: '', birthdate: '', gender: 'ذكر', medical_history: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointment.patient_id || !newAppointment.start_time) {
      alert('يرجى اختيار المريض ووقت الموعد');
      return;
    }

    try {
      const startTime = new Date(newAppointment.start_time);
      const endTime = new Date(startTime.getTime() + 30 * 60000);
      
      const patient = patients.find(p => p.id === newAppointment.patient_id);

      await addDoc(collection(db, 'appointments'), {
        patient_id: newAppointment.patient_id,
        patient_name: patient?.name || '',
        doctor_id: user?.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        notes: newAppointment.notes
      });

      setShowAppointmentModal(false);
      setNewAppointment({ patient_id: '', start_time: '', notes: '' });
      setSuccessMessage('تم حفظ الموعد بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const handleConfirmAppointment = async (id: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'confirmed' });
      setSuccessMessage('تم تأكيد الموعد وإرسال رسالة تذكير للمريض');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clinicSettings) {
        await setDoc(doc(db, 'settings', 'clinic'), clinicSettings);
        setSuccessMessage('تم تحديث الإعدادات بنجاح');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/clinic');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClinicSettings(prev => prev ? { ...prev, clinic_logo: reader.result as string } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create a secondary Firebase app to create the user without logging out the current admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const email = `${newUser.username.toLowerCase()}@clinic.local`;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newUser.password);
      const uid = userCredential.user.uid;

      // Add to Firestore using the new UID
      await setDoc(doc(db, 'users', uid), {
        ...newUser,
        uid: uid,
        createdAt: serverTimestamp()
      });

      // Cleanup secondary app
      await deleteApp(secondaryApp);

      setShowUserModal(false);
      setNewUser({ username: '', password: '', role: 'doctor', name: '' });
      setSuccessMessage('تم إضافة المستخدم بنجاح');
    } catch (error: any) {
      console.error("Error adding user:", error);
      if (error.code === 'auth/email-already-in-box') {
        setErrorMessage('اسم المستخدم موجود مسبقاً');
      } else {
        setErrorMessage('حدث خطأ أثناء إضافة المستخدم: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === user?.id) {
      setErrorMessage('لا يمكن حذف المستخدم الحالي');
      return;
    }
    setUserToDelete(id);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setSuccessMessage('تم حذف المستخدم بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete}`);
    } finally {
      setUserToDelete(null);
    }
  };

  const handleExportData = async (type: 'all' | 'system' = 'all') => {
    try {
      const data: any = {
        patients,
        appointments,
        procedures,
        medications,
        inventory,
        invoices,
        prescriptions,
        treatments,
        settings: clinicSettings
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'all' ? 'dental_clinic_backup' : 'system_data_backup'}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        // Import logic for Firebase
        const collections = ['patients', 'appointments', 'procedures', 'medications', 'inventory', 'invoices', 'prescriptions', 'treatments'];
        for (const colName of collections) {
          if (data[colName]) {
            for (const item of data[colName]) {
              const { id, ...rest } = item;
              await addDoc(collection(db, colName), rest);
            }
          }
        }
        alert('تم استيراد البيانات بنجاح');
      } catch (error) {
        console.error("Import failed", error);
        alert('ملف غير صالح');
      }
    };
    reader.readAsText(file);
  };

  const exportPatientsToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(patients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");
    XLSX.writeFile(workbook, "patients_report.xlsx");
  };

  const exportToPDF = async () => {
    const element = document.getElementById('invoices-table');
    if (!element) return;
    
    setExportingPDF(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Fix for html2canvas not supporting oklch colors in Tailwind v4
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const className = typeof el.className === 'string' ? el.className : (el.className as any).baseVal || '';
            
            // Check and replace common style properties that might use oklch
            if (className.includes('slate')) {
              if (className.includes('bg-slate-50')) el.style.backgroundColor = '#f8fafc';
              if (className.includes('text-slate-600')) el.style.color = '#475569';
              if (className.includes('text-slate-800')) el.style.color = '#1e293b';
            }
            if (className.includes('blue')) {
              if (className.includes('text-blue-600')) el.style.color = '#2563eb';
            }
            if (className.includes('emerald')) {
              if (className.includes('text-emerald-600')) el.style.color = '#059669';
            }
          }
          
          const table = clonedDoc.getElementById('invoices-table');
          if (table) {
            table.style.padding = '20px';
            table.style.background = 'white';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('invoices_report.pdf');
    } catch (error) {
      console.error("Error exporting PDF", error);
    } finally {
      setExportingPDF(false);
    }
  };

  const generatePrescriptionPDF = async (
    patient: Patient, 
    meds: any[], 
    weight?: string, 
    bp?: string, 
    diagnosis?: string
  ) => {
    setPrescriptionToPrint({ patient, meds, weight, bp, diagnosis });
    
    // Wait for the state to update and the component to render
    setTimeout(async () => {
      if (!prescriptionRef.current) return;
      
      try {
        const canvas = await html2canvas(prescriptionRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a5',
        });
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`prescription_${patient.name}_${new Date().toISOString().split('T')[0]}.pdf`);
        
        // Also trigger browser print dialog for immediate printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Prescription - ${patient.name}</title>
                <style>
                  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; background: #f0f0f0; }
                  img { width: 100%; max-width: 148mm; height: auto; box-shadow: 0 0 20px rgba(0,0,0,0.1); background: white; }
                  @page { size: A5; margin: 0; }
                  @media print {
                    body { background: white; }
                    img { box-shadow: none; width: 100%; }
                  }
                </style>
              </head>
              <body>
                <img src="${imgData}" />
                <script>
                  window.onload = () => {
                    window.print();
                    window.onafterprint = () => window.close();
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
        
        setPrescriptionToPrint(null);
      } catch (error) {
        console.error("Error generating prescription:", error);
        setErrorMessage("حدث خطأ أثناء إنشاء الوصفة الطبية للطباعة");
      }
    }, 500);
  };

  const addMedicationRow = () => {
    setNewPrescription({
      ...newPrescription,
      medications: [...newPrescription.medications, { name: '', dosage: '', frequency: '' }]
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updatedMedications = [...newPrescription.medications];
    updatedMedications[index] = { ...updatedMedications[index], [field]: value };
    setNewPrescription({ ...newPrescription, medications: updatedMedications });
  };

  const removeMedicationRow = (index: number) => {
    if (newPrescription.medications.length === 1) return;
    const updatedMedications = newPrescription.medications.filter((_, i) => i !== index);
    setNewPrescription({ ...newPrescription, medications: updatedMedications });
  };

  const handleIssuePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prescriptionData = {
        ...newPrescription,
        doctor_id: user?.id,
        created_at: serverTimestamp()
      };
      await addDoc(collection(db, 'prescriptions'), prescriptionData);
      
      setSuccessMessage('تم إصدار وحفظ الوصفة الطبية بنجاح!');
      const patient = patients.find(p => p.id === newPrescription.patient_id);
      if (patient) generatePrescriptionPDF(
        patient, 
        newPrescription.medications, 
        newPrescription.weight, 
        newPrescription.bp, 
        newPrescription.diagnosis
      );
      setNewPrescription({ 
        patient_id: '', 
        weight: '', 
        bp: '', 
        diagnosis: '', 
        medications: [{ name: '', dosage: '', frequency: '' }] 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prescriptions');
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'medications'), newMedication);
      setShowMedicationModal(false);
      setNewMedication({ name: '', description: '' });
      setSuccessMessage('تم إضافة الدواء بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'medications');
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), newInventoryItem);
      setShowInventoryModal(false);
      setNewInventoryItem({ item_name: '', quantity: 0, unit: 'قطعة', min_threshold: 10 });
      setSuccessMessage('تم إضافة الصنف للمخزون');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const patient = patients.find(p => p.id === newInvoice.patient_id);
      const counterRef = doc(db, 'counters', 'invoices');
      
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextNumber = 10001;
        
        if (counterDoc.exists()) {
          nextNumber = counterDoc.data().current + 1;
        }
        
        transaction.set(counterRef, { current: nextNumber });
        
        const invoiceRef = doc(collection(db, 'invoices'));
        transaction.set(invoiceRef, {
          ...newInvoice,
          invoice_number: nextNumber,
          patient_name: patient?.name || '',
          created_at: serverTimestamp()
        });
      });

      setShowInvoiceModal(false);
      setNewInvoice({ patient_id: '', total_amount: 0, paid_amount: 0, status: 'pending' });
      setSuccessMessage('تم إضافة الفاتورة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
    }
  };

  const handleAddProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'procedures'), newProcedure);
      setShowProcedureModal(false);
      setNewProcedure({ name: '', category: '', price: 0 });
      setSuccessMessage('تم إضافة الخدمة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'procedures');
    }
  };

  const handleUpdateInventoryQty = async (id: string, newQty: number) => {
    try {
      await updateDoc(doc(db, 'inventory', id), { quantity: newQty });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  if (!isAuthReady || isCheckingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-pulse">
          <Stethoscope className="text-white w-8 h-8" />
        </div>
        <p className="text-slate-600 font-bold animate-pulse">جاري التحقق من الحساب...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <Stethoscope className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">عيادتي</h1>
            <p className="text-slate-500">نظام إدارة عيادة الأسنان المتكامل</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100">
                {loginError}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 mr-1">اسم المستخدم</label>
              <Input 
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 mr-1">كلمة المرور</label>
              <Input 
                type="password"
                placeholder="أدخل كلمة المرور"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="text-right"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg"
              disabled={loading}
            >
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </Button>

            <p className="text-xs text-center text-slate-400 mt-6">
              يجب أن يكون حسابك مسجلاً من قبل المسؤول للوصول إلى النظام
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3, roles: ['admin', 'doctor', 'accountant', 'receptionist'] },
    { id: 'patients', label: 'المرضى', icon: Users, roles: ['admin', 'doctor', 'receptionist'] },
    { id: 'appointments', label: 'المواعيد', icon: Calendar, roles: ['admin', 'doctor', 'receptionist'] },
    { id: 'prescriptions', label: 'الوصفات', icon: FileText, roles: ['admin', 'doctor'] },
    { id: 'finance', label: 'المالية', icon: CreditCard, roles: ['admin', 'accountant'] },
    { id: 'inventory', label: 'المخزون', icon: Package, roles: ['admin', 'receptionist'] },
    { id: 'users', label: 'المستخدمين', icon: Shield, roles: ['admin'] },
    { id: 'settings', label: 'الإعدادات', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        clinicSettings={clinicSettings} 
        handleLogout={handleLogout} 
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          activeTabLabel={menuItems.find(i => i.id === activeTab)?.label || ''} 
          user={user} 
          clinicSettings={clinicSettings} 
          handleLogout={handleLogout} 
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-8 md:p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard 
                      title="إجمالي المرضى" 
                      value={stats?.patients || 0} 
                      icon={Users} 
                      color="blue" 
                      trend="+12% من الشهر الماضي"
                    />
                    <StatCard 
                      title="مواعيد اليوم" 
                      value={stats?.appointments || 0} 
                      icon={Calendar} 
                      color="emerald" 
                      trend="3 مواعيد قادمة"
                    />
                    <StatCard 
                      title="إيرادات الشهر" 
                      value={`${(stats?.revenue || 0).toLocaleString()} د.ع`} 
                      icon={CreditCard} 
                      color="amber" 
                      trend="+5% من الشهر الماضي"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chart */}
                    <Card>
                      <Card.Header>
                        <Card.Title>إحصائيات الجلسات</Card.Title>
                      </Card.Header>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[
                            { name: 'السبت', value: 12 },
                            { name: 'الأحد', value: 18 },
                            { name: 'الاثنين', value: 15 },
                            { name: 'الثلاثاء', value: 25 },
                            { name: 'الأربعاء', value: 20 },
                            { name: 'الخميس', value: 30 },
                          ]}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    {/* Recent Appointments */}
                    <Card>
                      <Card.Header>
                        <Card.Title>المواعيد القادمة</Card.Title>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab('appointments')}>عرض الكل</Button>
                      </Card.Header>
                      <Card.Content>
                        {appointments.slice(0, 4).map((apt) => (
                          <div key={apt.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-50 hover:bg-slate-50 transition-all group">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <Clock className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{apt.patient_name}</p>
                              <p className="text-sm text-slate-500">{new Date(apt.start_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <Badge variant={apt.status === 'confirmed' ? 'success' : 'warning'}>
                              {apt.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                            </Badge>
                          </div>
                        ))}
                        {appointments.length === 0 && (
                          <div className="text-center py-8 text-slate-400">لا توجد مواعيد قادمة</div>
                        )}
                      </Card.Content>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'patients' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input 
                        placeholder="البحث عن مريض بالاسم أو الرقم..." 
                        className="pr-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <Button 
                        variant="secondary"
                        onClick={exportPatientsToExcel}
                        className="flex-1 md:flex-none"
                      >
                        <FileText className="w-5 h-5" />
                        تصدير Excel
                      </Button>
                      <Button 
                        onClick={() => setShowPatientModal(true)}
                        className="flex-1 md:flex-none"
                      >
                        <UserPlus className="w-5 h-5" />
                        إضافة مريض جديد
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>الاسم</Table.Head>
                        <Table.Head>رقم الهاتف</Table.Head>
                        <Table.Head>تاريخ الميلاد</Table.Head>
                        <Table.Head>تاريخ التسجيل</Table.Head>
                        <Table.Head className="text-center">الإجراءات</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {patients.filter(p => 
                        (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (p.phone?.includes(searchTerm))
                      ).map((patient) => (
                        <Table.Row key={patient.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                {patient.name.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-800">{patient.name}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell className="text-slate-600">{patient.phone}</Table.Cell>
                          <Table.Cell className="text-slate-600">{patient.birthdate}</Table.Cell>
                          <Table.Cell className="text-slate-600">{formatDate(patient.created_at)}</Table.Cell>
                          <Table.Cell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedPatientFile(patient)}
                            >
                              عرض الملف
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-800">إدارة المواعيد</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input 
                          placeholder="بحث في المواعيد..." 
                          className="pr-10 h-10 text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => setShowAppointmentModal(true)}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="w-5 h-5" />
                        حجز موعد جديد
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>المريض</Table.Head>
                        <Table.Head>الوقت</Table.Head>
                        <Table.Head>الحالة</Table.Head>
                        <Table.Head>ملاحظات</Table.Head>
                        <Table.Head className="text-center">الإجراءات</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {appointments.filter(apt => 
                        apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        apt.notes?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((apt) => (
                        <Table.Row key={apt.id}>
                          <Table.Cell className="font-bold text-slate-800">{apt.patient_name}</Table.Cell>
                          <Table.Cell className="text-slate-600">
                            {new Date(apt.start_time).toLocaleString('ar-EG', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant={apt.status === 'confirmed' ? 'success' : 'warning'}>
                              {apt.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell className="text-slate-500 text-sm max-w-xs truncate">{apt.notes}</Table.Cell>
                          <Table.Cell className="text-center">
                            {apt.status === 'pending' && (
                              <Button 
                                variant="success"
                                size="sm"
                                onClick={() => handleConfirmAppointment(apt.id)}
                                className="mx-auto"
                              >
                                <Check className="w-4 h-4" />
                                تأكيد
                              </Button>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                      {appointments.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={5} className="py-12 text-center text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>لا توجد مواعيد مسجلة حالياً</p>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <Card.Header>
                        <Card.Title>ملخص الدخل</Card.Title>
                      </Card.Header>
                      <Card.Content>
                        <div className="flex items-end gap-4">
                          <span className="text-4xl font-bold text-blue-600">{(stats?.revenue || 0).toLocaleString()}</span>
                          <span className="text-slate-500 mb-1">دينار عراقي إجمالي</span>
                        </div>
                      </Card.Content>
                    </Card>
                    <Card>
                      <Card.Header>
                        <Card.Title>الفواتير المعلقة</Card.Title>
                      </Card.Header>
                      <Card.Content>
                        <div className="flex items-end gap-4">
                          <span className="text-4xl font-bold text-amber-600">
                            {invoices.filter(i => i.status === 'pending').length}
                          </span>
                          <span className="text-slate-500 mb-1">فواتير لم تسدد بالكامل</span>
                        </div>
                      </Card.Content>
                    </Card>
                  </div>
                  
                  <Card>
                    <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <Card.Title>آخر الفواتير</Card.Title>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input 
                            placeholder="بحث في الفواتير..." 
                            className="pr-10 h-10 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={() => setShowInvoiceModal(true)}
                          className="flex-1 sm:flex-none"
                        >
                          إضافة فاتورة
                        </Button>
                        <Button 
                          variant="secondary"
                          onClick={exportToPDF}
                          disabled={exportingPDF}
                          className="flex-1 sm:flex-none"
                        >
                          {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Content id="invoices-table">
                      {invoices.length > 0 ? (
                        <Table>
                          <Table.Header>
                            <Table.Row>
                              <Table.Head>رقم الفاتورة</Table.Head>
                              <Table.Head>المريض</Table.Head>
                              <Table.Head>المبلغ الكلي</Table.Head>
                              <Table.Head>المدفوع</Table.Head>
                              <Table.Head>التاريخ</Table.Head>
                              <Table.Head>الحالة</Table.Head>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {invoices.filter(inv => 
                              inv.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (inv.invoice_number?.toString().includes(searchTerm))
                            ).map((inv) => (
                              <Table.Row key={inv.id}>
                                <Table.Cell className="text-slate-800 font-medium">#{inv.invoice_number || inv.id}</Table.Cell>
                                <Table.Cell className="text-slate-800 font-bold">{inv.patient_name}</Table.Cell>
                                <Table.Cell className="text-blue-600 font-bold">{inv.total_amount.toLocaleString()} د.ع</Table.Cell>
                                <Table.Cell className="text-emerald-600 font-bold">{inv.paid_amount.toLocaleString()} د.ع</Table.Cell>
                                <Table.Cell className="text-slate-600">{formatDate(inv.created_at)}</Table.Cell>
                                <Table.Cell>
                                  <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                                    {inv.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                                  </Badge>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table>
                      ) : (
                        <div className="p-12 text-center text-slate-400">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p>لا توجد فواتير مسجلة حالياً</p>
                        </div>
                      )}
                    </Card.Content>
                  </Card>
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  <Card>
                    <Card.Header className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-xl">
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <Card.Title className="text-xl">إصدار وصفة طبية جديدة</Card.Title>
                        <p className="text-slate-500">قم بتعبئة بيانات الأدوية والجرعات للمريض</p>
                      </div>
                    </Card.Header>

                    <Card.Content>
                      <form onSubmit={handleIssuePrescription} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">اختيار المريض</label>
                            <select 
                              required
                              value={newPrescription.patient_id}
                              onChange={e => setNewPrescription({...newPrescription, patient_id: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                              <option value="">اختر مريضاً...</option>
                              {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <Input 
                            label="التاريخ"
                            disabled 
                            value={new Date().toLocaleDateString('ar-EG')} 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Input 
                            label="الوزن (Weight)"
                            placeholder="مثال: 70 كجم"
                            value={newPrescription.weight}
                            onChange={e => setNewPrescription({...newPrescription, weight: e.target.value})}
                          />
                          <Input 
                            label="ضغط الدم (B.P)"
                            placeholder="مثال: 120/80"
                            value={newPrescription.bp}
                            onChange={e => setNewPrescription({...newPrescription, bp: e.target.value})}
                          />
                          <Input 
                            label="التشخيص (Diagnosis)"
                            placeholder="التشخيص الطبي"
                            value={newPrescription.diagnosis}
                            onChange={e => setNewPrescription({...newPrescription, diagnosis: e.target.value})}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">الأدوية والتعليمات</h4>
                            <div className="flex gap-4">
                              <Button 
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMedicationModal(true)}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <Plus className="w-4 h-4" />
                                تعريف دواء جديد
                              </Button>
                              <Button 
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addMedicationRow}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Plus className="w-4 h-4" />
                                إضافة دواء للوصفة
                              </Button>
                            </div>
                          </div>

                          {newPrescription.medications.map((med, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 rounded-xl bg-slate-50 border border-slate-100 relative">
                              <div className="md:col-span-5">
                                <Input 
                                  label="اسم الدواء"
                                  required
                                  list="medications-list"
                                  placeholder="مثال: أموكسيسيلين"
                                  value={med.name}
                                  onChange={e => updateMedication(index, 'name', e.target.value)}
                                />
                                <datalist id="medications-list">
                                  {medications.map(m => (
                                    <option key={m.id} value={m.name} />
                                  ))}
                                </datalist>
                              </div>
                              <div className="md:col-span-3">
                                <Input 
                                  label="الجرعة"
                                  required
                                  placeholder="مثال: 500 ملغ"
                                  value={med.dosage}
                                  onChange={e => updateMedication(index, 'dosage', e.target.value)}
                                />
                              </div>
                              <div className="md:col-span-3">
                                <Input 
                                  label="التكرار"
                                  required
                                  placeholder="مثال: 3 مرات يومياً"
                                  value={med.frequency}
                                  onChange={e => updateMedication(index, 'frequency', e.target.value)}
                                />
                              </div>
                              <div className="md:col-span-1 flex justify-center pb-2">
                                <Button 
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMedicationRow(index)}
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex gap-4">
                          <Button 
                            type="submit"
                            className="flex-1 py-4"
                          >
                            إصدار وطباعة الوصفة
                          </Button>
                          <Button 
                            type="button"
                            variant="secondary"
                            onClick={() => setNewPrescription({ 
                              patient_id: '', 
                              weight: '', 
                              bp: '', 
                              diagnosis: '', 
                              medications: [{ name: '', dosage: '', frequency: '' }] 
                            })}
                            className="px-8"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </form>
                    </Card.Content>
                  </Card>

                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
                    <Bell className="w-6 h-6 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 leading-relaxed">
                      <strong>ملاحظة:</strong> سيتم حفظ الوصفة الطبية في ملف المريض تلقائياً بعد الإصدار. يمكنك الوصول إليها لاحقاً من قسم "المرضى".
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-800">المخزون الطبي</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input 
                          placeholder="بحث في المخزون..." 
                          className="pr-10 h-10 text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => setShowInventoryModal(true)}
                        className="w-full sm:w-auto"
                      >
                        <Plus className="w-5 h-5" />
                        إضافة صنف جديد
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inventory.filter(item => 
                      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((item) => (
                      <Card key={item.id}>
                        <Card.Header className="flex items-center justify-between pb-2">
                          <Badge variant={item.quantity <= item.min_threshold ? 'danger' : 'success'}>
                            {item.quantity <= item.min_threshold ? 'مخزون منخفض' : 'متوفر'}
                          </Badge>
                          <Package className="w-5 h-5 text-slate-300" />
                        </Card.Header>
                        <Card.Content>
                          <h4 className="font-bold text-slate-800 text-lg mb-1">{item.item_name}</h4>
                          <p className="text-slate-500 text-sm mb-4">الكمية الحالية: {item.quantity} {item.unit}</p>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-500", item.quantity <= item.min_threshold ? "bg-red-500" : "bg-blue-500")} 
                              style={{ width: `${Math.min((item.quantity / (item.min_threshold * 5)) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdateInventoryQty(item.id, item.quantity + 1)}
                              className="flex-1"
                            >
                              + زيادة
                            </Button>
                            <Button 
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdateInventoryQty(item.id, Math.max(0, item.quantity - 1))}
                              className="flex-1"
                            >
                              - تقليل
                            </Button>
                          </div>
                        </Card.Content>
                      </Card>
                    ))}
                    {inventory.length === 0 && (
                      <div className="col-span-full p-12 text-center text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>لا توجد أصناف في المخزون حالياً</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'users' && user.role === 'admin' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-800">إدارة المستخدمين</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input 
                          placeholder="بحث في المستخدمين..." 
                          className="pr-10 h-10 text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => setShowUserModal(true)}
                        className="w-full sm:w-auto"
                      >
                        <UserPlus className="w-5 h-5" />
                        إضافة مستخدم جديد
                      </Button>
                    </div>
                  </div>
                  
                  <Card className="overflow-hidden">
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>الاسم</Table.Head>
                          <Table.Head>اسم المستخدم</Table.Head>
                          <Table.Head>الدور</Table.Head>
                          <Table.Head className="text-center">الإجراءات</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {usersList.filter(u => 
                          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.username?.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((u) => (
                          <Table.Row key={u.id}>
                            <Table.Cell className="font-bold text-slate-800">{u.name}</Table.Cell>
                            <Table.Cell className="text-slate-600">{u.username}</Table.Cell>
                            <Table.Cell>
                              <Badge variant={
                                u.role === 'admin' ? 'danger' : 
                                u.role === 'doctor' ? 'primary' : 
                                u.role === 'accountant' ? 'success' : 'secondary'
                              }>
                                {u.role === 'admin' ? 'مدير' : u.role === 'doctor' ? 'طبيب' : u.role === 'accountant' ? 'محاسب' : 'موظف استقبال'}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell className="text-center">
                              {u.id !== user?.id && (
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u.id!)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  حذف
                                </Button>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  </Card>
                </div>
              )}

              {activeTab === 'settings' && user.role === 'admin' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  <Card>
                    <Card.Header>
                      <Card.Title className="flex items-center gap-2">
                        <Settings className="w-6 h-6 text-blue-600" />
                        إعدادات العيادة
                      </Card.Title>
                    </Card.Header>
                    
                    <Card.Content>
                      <form onSubmit={handleUpdateSettings} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <Input 
                              label="اسم العيادة"
                              required
                              value={clinicSettings?.clinic_name || ''}
                              onChange={e => setClinicSettings(prev => prev ? {...prev, clinic_name: e.target.value} : null)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">شعار العيادة</label>
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                {clinicSettings?.clinic_logo ? (
                                  <img src={clinicSettings.clinic_logo} alt="Logo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Stethoscope className="w-8 h-8 text-slate-300" />
                                )}
                              </div>
                              <label className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
                                رفع شعار جديد
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                              </label>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">معلومات الاتصال</label>
                            <textarea 
                              rows={3}
                              required
                              value={clinicSettings?.contact_info || ''}
                              onChange={e => setClinicSettings(prev => prev ? {...prev, contact_info: e.target.value} : null)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-4">
                          <Button type="submit">
                            حفظ الإعدادات
                          </Button>
                        </div>
                      </form>
                    </Card.Content>
                  </Card>

                  <Card>
                    <Card.Header>
                      <Card.Title className="flex items-center gap-2">
                        <Download className="w-6 h-6 text-emerald-600" />
                        إدارة البيانات
                      </Card.Title>
                    </Card.Header>
                    <Card.Content>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                          <h4 className="font-bold text-slate-800 mb-2">تصدير البيانات</h4>
                          <p className="text-sm text-slate-500 mb-4">قم بتحميل نسخة احتياطية من كافة بيانات النظام أو بيانات الإعدادات فقط.</p>
                          <div className="flex flex-wrap gap-3">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportData('all')}
                            >
                              <Download className="w-4 h-4" />
                              تصدير قاعدة البيانات
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportData('system')}
                            >
                              <Shield className="w-4 h-4" />
                              تصدير بيانات النظام
                            </Button>
                          </div>
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                          <h4 className="font-bold text-slate-800 mb-2">استيراد البيانات</h4>
                          <p className="text-sm text-slate-500 mb-4">قم برفع ملف نسخة احتياطية لاستعادة البيانات (سيتم حذف البيانات الحالية).</p>
                          <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer w-fit">
                            <Upload className="w-4 h-4" />
                            استيراد قاعدة البيانات
                            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </Card.Content>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] overflow-x-auto">
        {filteredMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all relative px-2 py-1 rounded-xl min-w-[60px]",
              activeTab === item.id 
                ? "text-blue-600" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-blue-50 rounded-xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon className={cn("w-5 h-5", activeTab === item.id && "scale-110 transition-transform")} />
            <span className="text-[9px] font-bold whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Patient Modal */}
      <Modal 
        isOpen={showPatientModal} 
        onClose={() => setShowPatientModal(false)}
        title="إضافة مريض جديد"
      >
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input 
                label="الاسم بالكامل"
                required 
                value={newPatient.name} 
                onChange={e => setNewPatient({...newPatient, name: e.target.value})} 
              />
            </div>
            <Input 
              label="رقم الهاتف"
              type="tel" 
              required 
              value={newPatient.phone} 
              onChange={e => setNewPatient({...newPatient, phone: e.target.value})} 
            />
            <Input 
              label="تاريخ الميلاد"
              type="date" 
              required 
              value={newPatient.birthdate} 
              onChange={e => setNewPatient({...newPatient, birthdate: e.target.value})} 
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الجنس</label>
              <select 
                value={newPatient.gender} 
                onChange={e => setNewPatient({...newPatient, gender: e.target.value})} 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option>ذكر</option>
                <option>أنثى</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">التاريخ المرضي</label>
            <textarea 
              rows={3} 
              value={newPatient.medical_history} 
              onChange={e => setNewPatient({...newPatient, medical_history: e.target.value})} 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            ></textarea>
          </div>
          <Button type="submit" className="w-full">حفظ البيانات</Button>
        </form>
      </Modal>

      {/* Appointment Modal */}
      <Modal 
        isOpen={showAppointmentModal} 
        onClose={() => setShowAppointmentModal(false)}
        title="حجز موعد جديد"
      >
        <form onSubmit={handleAddAppointment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اختر المريض</label>
            <select 
              required 
              value={newAppointment.patient_id} 
              onChange={e => setNewAppointment({...newAppointment, patient_id: e.target.value})} 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">اختر مريض...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Input 
            label="وقت الموعد"
            type="datetime-local" 
            required 
            value={newAppointment.start_time} 
            onChange={e => setNewAppointment({...newAppointment, start_time: e.target.value})} 
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
            <textarea 
              rows={3} 
              value={newAppointment.notes} 
              onChange={e => setNewAppointment({...newAppointment, notes: e.target.value})} 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            ></textarea>
          </div>
          <Button type="submit" className="w-full">تأكيد الحجز</Button>
        </form>
      </Modal>

      {/* Medication Modal */}
      <Modal 
        isOpen={showMedicationModal} 
        onClose={() => setShowMedicationModal(false)}
        title="تعريف دواء جديد"
      >
        <form onSubmit={handleAddMedication} className="space-y-4">
          <Input 
            label="اسم الدواء"
            required 
            value={newMedication.name} 
            onChange={e => setNewMedication({...newMedication, name: e.target.value})} 
            placeholder="مثال: Amoxicillin" 
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الوصف / الاستخدام</label>
            <textarea 
              rows={3} 
              value={newMedication.description} 
              onChange={e => setNewMedication({...newMedication, description: e.target.value})} 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="وصف مختصر للدواء..."
            ></textarea>
          </div>
          <Button type="submit" variant="success" className="w-full">إضافة لقاعدة البيانات</Button>
        </form>
      </Modal>

      {/* User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUserModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">إضافة مستخدم جديد</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                  <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم</label>
                  <input type="text" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
                  <input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الدور</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="doctor">طبيب</option>
                    <option value="accountant">محاسب</option>
                    <option value="receptionist">موظف استقبال</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">إضافة المستخدم</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inventory Modal */}
      <AnimatePresence>
        {showInventoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInventoryModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">إضافة صنف للمخزون</h3>
                <button onClick={() => setShowInventoryModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddInventory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الصنف</label>
                  <input type="text" required value={newInventoryItem.item_name} onChange={e => setNewInventoryItem({...newInventoryItem, item_name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: قفازات طبية" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الكمية</label>
                    <input type="number" required value={newInventoryItem.quantity} onChange={e => setNewInventoryItem({...newInventoryItem, quantity: Number(e.target.value) || 0})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                    <input type="text" required value={newInventoryItem.unit} onChange={e => setNewInventoryItem({...newInventoryItem, unit: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: علبة" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">حد التنبيه (الحد الأدنى)</label>
                  <input type="number" required value={newInventoryItem.min_threshold} onChange={e => setNewInventoryItem({...newInventoryItem, min_threshold: Number(e.target.value) || 0})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">إضافة للمخزون</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInvoiceModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">إصدار فاتورة جديدة</h3>
                <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اختر المريض</label>
                  <select required value={newInvoice.patient_id} onChange={e => setNewInvoice({...newInvoice, patient_id: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">اختر مريض...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ الكلي (د.ع)</label>
                    <input type="number" required value={newInvoice.total_amount} onChange={e => setNewInvoice({...newInvoice, total_amount: Number(e.target.value) || 0})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المبلغ المدفوع (د.ع)</label>
                    <input type="number" required value={newInvoice.paid_amount} onChange={e => setNewInvoice({...newInvoice, paid_amount: Number(e.target.value) || 0})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
                  <select value={newInvoice.status} onChange={e => setNewInvoice({...newInvoice, status: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="pending">معلقة</option>
                    <option value="paid">مدفوعة</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">إصدار الفاتورة</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Procedure Modal */}
      <AnimatePresence>
        {showProcedureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProcedureModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">إضافة خدمة جديدة</h3>
                <button onClick={() => setShowProcedureModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddProcedure} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الخدمة</label>
                  <input type="text" required value={newProcedure.name} onChange={e => setNewProcedure({...newProcedure, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: حشو تجميلي" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">التصنيف</label>
                  <input type="text" required value={newProcedure.category} onChange={e => setNewProcedure({...newProcedure, category: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثال: حشوات" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">السعر (د.ع)</label>
                  <input type="number" required value={newProcedure.price} onChange={e => setNewProcedure({...newProcedure, price: Number(e.target.value) || 0})} className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">حفظ الخدمة</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Patient File Modal */}
      <Modal 
        isOpen={!!selectedPatientFile} 
        onClose={() => {
          setSelectedPatientFile(null);
          setPatientTab('history');
        }}
        title="ملف المريض الإلكتروني"
        className="max-w-4xl"
      >
        {selectedPatientFile && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-2xl">
                {selectedPatientFile.name[0]}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{selectedPatientFile.name}</h3>
                <p className="text-slate-500">رقم الملف: #{selectedPatientFile.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">العمر</p>
                <p className="font-bold text-slate-800">
                  {selectedPatientFile.birthdate ? new Date().getFullYear() - new Date(selectedPatientFile.birthdate).getFullYear() : 'N/A'} سنة
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">الجنس</p>
                <p className="font-bold text-slate-800">{selectedPatientFile.gender}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">رقم الهاتف</p>
                <p className="font-bold text-slate-800 font-mono">{selectedPatientFile.phone}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500 mb-1">تاريخ التسجيل</p>
                <p className="font-bold text-slate-800">{new Date(selectedPatientFile.created_at).toLocaleDateString('ar-EG')}</p>
              </Card>
            </div>

            <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-2">
              <button
                onClick={() => setPatientTab('history')}
                className={cn(
                  "pb-2 px-1 font-bold whitespace-nowrap transition-colors border-b-2",
                  patientTab === 'history' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                التاريخ الطبي
              </button>
              <button
                onClick={() => setPatientTab('appointments')}
                className={cn(
                  "pb-2 px-1 font-bold whitespace-nowrap transition-colors border-b-2",
                  patientTab === 'appointments' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                المواعيد
              </button>
              <button
                onClick={() => setPatientTab('treatments')}
                className={cn(
                  "pb-2 px-1 font-bold whitespace-nowrap transition-colors border-b-2",
                  patientTab === 'treatments' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                العلاجات والإجراءات
              </button>
              <button
                onClick={() => setPatientTab('prescriptions')}
                className={cn(
                  "pb-2 px-1 font-bold whitespace-nowrap transition-colors border-b-2",
                  patientTab === 'prescriptions' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                الوصفات الطبية
              </button>
              <button
                onClick={() => setPatientTab('invoices')}
                className={cn(
                  "pb-2 px-1 font-bold whitespace-nowrap transition-colors border-b-2",
                  patientTab === 'invoices' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                الفواتير
              </button>
            </div>

            <div className="space-y-4">
              {patientTab === 'history' && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-slate-800 text-lg">التاريخ الطبي والملاحظات</h4>
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedPatientFile.medical_history || 'لا يوجد تاريخ طبي مسجل لهذا المريض.'}
                  </p>
                </Card>
              )}

              {patientTab === 'appointments' && (
                <div className="space-y-4">
                  {appointments.filter(a => a.patient_id === selectedPatientFile.id).length > 0 ? (
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>التاريخ والوقت</Table.Head>
                          <Table.Head>الطبيب</Table.Head>
                          <Table.Head>الحالة</Table.Head>
                          <Table.Head>ملاحظات</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {appointments
                          .filter(a => a.patient_id === selectedPatientFile.id)
                          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                          .map(apt => (
                            <Table.Row key={apt.id}>
                              <Table.Cell className="font-medium text-slate-800">
                                {new Date(apt.start_time).toLocaleString('ar-EG', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </Table.Cell>
                              <Table.Cell>{usersList.find(u => u.id === apt.doctor_id)?.name || 'غير محدد'}</Table.Cell>
                              <Table.Cell>
                                <Badge variant={
                                  apt.status === 'completed' ? 'success' :
                                  apt.status === 'cancelled' ? 'danger' :
                                  apt.status === 'confirmed' ? 'primary' : 'warning'
                                }>
                                  {apt.status === 'completed' ? 'مكتمل' :
                                   apt.status === 'cancelled' ? 'ملغي' :
                                   apt.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell className="text-slate-600">{apt.notes || '-'}</Table.Cell>
                            </Table.Row>
                          ))}
                      </Table.Body>
                    </Table>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 font-medium">لا توجد مواعيد مسجلة لهذا المريض</p>
                    </div>
                  )}
                </div>
              )}

              {patientTab === 'treatments' && (
                <div className="space-y-4">
                  {treatments.filter(t => t.patient_id === selectedPatientFile.id).length > 0 ? (
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>التاريخ</Table.Head>
                          <Table.Head>الإجراء</Table.Head>
                          <Table.Head>الطبيب</Table.Head>
                          <Table.Head>التكلفة</Table.Head>
                          <Table.Head>ملاحظات</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {treatments
                          .filter(t => t.patient_id === selectedPatientFile.id)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(treatment => (
                            <Table.Row key={treatment.id}>
                              <Table.Cell className="font-medium text-slate-800">
                                {new Date(treatment.date).toLocaleDateString('ar-EG')}
                              </Table.Cell>
                              <Table.Cell className="font-bold text-blue-600">{treatment.procedure_name}</Table.Cell>
                              <Table.Cell>{treatment.doctor_name}</Table.Cell>
                              <Table.Cell className="font-bold text-emerald-600">{treatment.cost?.toLocaleString()} د.ع</Table.Cell>
                              <Table.Cell className="text-slate-600">{treatment.notes || '-'}</Table.Cell>
                            </Table.Row>
                          ))}
                      </Table.Body>
                    </Table>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 font-medium">لا توجد علاجات مسجلة لهذا المريض</p>
                    </div>
                  )}
                </div>
              )}

              {patientTab === 'invoices' && (
                <div className="space-y-4">
                  {invoices.filter(i => i.patient_id === selectedPatientFile.id).length > 0 ? (
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>رقم الفاتورة</Table.Head>
                          <Table.Head>التاريخ</Table.Head>
                          <Table.Head>المبلغ الإجمالي</Table.Head>
                          <Table.Head>المبلغ المدفوع</Table.Head>
                          <Table.Head>الحالة</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {invoices
                          .filter(i => i.patient_id === selectedPatientFile.id)
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map(inv => (
                            <Table.Row key={inv.id}>
                              <Table.Cell className="font-medium text-slate-800">#{inv.id}</Table.Cell>
                              <Table.Cell className="text-slate-600">
                                {new Date(inv.created_at).toLocaleDateString('ar-EG')}
                              </Table.Cell>
                              <Table.Cell className="font-bold text-blue-600">{inv.total_amount?.toLocaleString()} د.ع</Table.Cell>
                              <Table.Cell className="font-bold text-emerald-600">{inv.paid_amount?.toLocaleString()} د.ع</Table.Cell>
                              <Table.Cell>
                                <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                                  {inv.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                                </Badge>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                      </Table.Body>
                    </Table>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 font-medium">لا توجد فواتير مسجلة لهذا المريض</p>
                    </div>
                  )}
                </div>
              )}

              {patientTab === 'prescriptions' && (
                <div className="space-y-4">
                  {prescriptions.filter(p => p.patient_id === selectedPatientFile.id).length > 0 ? (
                    <div className="space-y-4">
                      {prescriptions
                        .filter(p => p.patient_id === selectedPatientFile.id)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((prescription) => (
                          <Card key={prescription.id} className="p-0 overflow-hidden border-blue-100 hover:border-blue-300 transition-colors">
                            <div className="bg-slate-50 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    وصفة طبية
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    بتاريخ: {formatDate(prescription.created_at)}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="secondary"
                                size="sm"
                                onClick={() => generatePrescriptionPDF(
                                  selectedPatientFile, 
                                  prescription.medications, 
                                  prescription.weight, 
                                  prescription.bp, 
                                  prescription.diagnosis
                                )}
                                className="w-full sm:w-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                طباعة الوصفة
                              </Button>
                            </div>
                            <div className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {prescription.medications.map((med: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-3 bg-white border border-slate-100 p-3 rounded-xl">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0"></span>
                                    <div>
                                      <p className="font-bold text-slate-800">{med.name}</p>
                                      <p className="text-sm text-slate-500 mt-0.5">
                                        الجرعة: {med.dosage} | التكرار: {med.frequency}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 font-medium">لا توجد وصفات طبية مسجلة لهذا المريض</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal 
        isOpen={userToDelete !== null} 
        onClose={() => setUserToDelete(null)}
        title="تأكيد الحذف"
      >
        <div className="space-y-4">
          <p className="text-slate-600">هل أنت متأكد من أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setUserToDelete(null)}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={confirmDeleteUser}>
              تأكيد الحذف
            </Button>
          </div>
        </div>
      </Modal>

      {/* Error Message Modal */}
      <Modal 
        isOpen={errorMessage !== null} 
        onClose={() => setErrorMessage(null)}
        title="تنبيه"
      >
        <div className="space-y-4">
          <p className="text-slate-600">{errorMessage}</p>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setErrorMessage(null)}>
              حسناً
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Message Modal */}
      <Modal 
        isOpen={successMessage !== null} 
        onClose={() => setSuccessMessage(null)}
        title="نجاح"
      >
        <div className="space-y-4">
          <p className="text-slate-600">{successMessage}</p>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setSuccessMessage(null)}>
              حسناً
            </Button>
          </div>
        </div>
      </Modal>

      {/* Hidden Printable Prescription Template */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={prescriptionRef}
          className="w-[800px] bg-white p-0 font-sans relative overflow-hidden"
          dir="rtl"
        >
          {prescriptionToPrint && (
            <>
              {/* Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <div className="w-[500px] h-[500px] border-[40px] border-blue-900 rounded-full flex items-center justify-center">
                  <Stethoscope className="w-80 h-80 text-blue-900" />
                </div>
              </div>

              {/* Header Section */}
              <div className="flex justify-between items-start p-6 border-b-2 border-blue-900 mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-900 flex items-center justify-center bg-white z-10 shrink-0">
                    <div className="relative">
                      <Stethoscope className="w-12 h-12 text-blue-900" />
                      <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1 rounded-sm">M</span>
                    </div>
                  </div>
                  <div className="bg-blue-900 text-white px-4 py-2 rounded-sm flex-1">
                    <h1 className="text-lg font-bold leading-tight">مركز الدكتور مطهر الدرويش الطبي التشخيصي</h1>
                    <p className="text-[10px] opacity-90 font-medium">Dr. Mutahar Al Darwish Therapeutic & Diagnostic Center</p>
                    <div className="mt-1 border-t border-white/20 pt-1">
                      <p className="text-[10px] font-bold text-center">صحتكم أولويتنا</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-left mr-6 text-blue-900">
                  <h2 className="text-sm font-bold">عيادة الدكتورة / أحلام عبده صويلح</h2>
                  <p className="text-[10px] font-bold">استشارية طب الأطفال وحديثي الولادة</p>
                  <h2 className="text-sm font-bold mt-1">Dr. Ahlam Abdo Sweileh</h2>
                  <p className="text-[10px] font-bold">Pediatric Consultant</p>
                </div>
              </div>

              <div className="px-8 py-2">
                {/* Patient Info Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-6 text-sm">
                  <div className="flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                    <span className="font-bold text-blue-900 whitespace-nowrap">Name :</span>
                    <span className="flex-1 text-center font-medium">{prescriptionToPrint?.patient.name}</span>
                    <span className="font-bold text-blue-900 whitespace-nowrap">: الأسم</span>
                  </div>
                  <div className="flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                    <span className="font-bold text-blue-900 whitespace-nowrap">Date :</span>
                    <span className="flex-1 text-center font-medium">{new Date().toLocaleDateString('ar-EG')}</span>
                    <span className="font-bold text-blue-900 whitespace-nowrap">: التاريخ</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-blue-900 whitespace-nowrap">Age :</span>
                      <span className="flex-1 text-center font-medium">
                        {prescriptionToPrint?.patient.birthdate 
                          ? new Date().getFullYear() - new Date(prescriptionToPrint.patient.birthdate).getFullYear() 
                          : '-'}
                      </span>
                      <span className="font-bold text-blue-900 whitespace-nowrap">: العمر</span>
                    </div>
                    <div className="flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-blue-900 whitespace-nowrap">Sex :</span>
                      <span className="flex-1 text-center font-medium">{prescriptionToPrint?.patient.gender}</span>
                      <span className="font-bold text-blue-900 whitespace-nowrap">: الجنس</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-blue-900 whitespace-nowrap">Weight :</span>
                      <span className="flex-1 text-center font-medium">{prescriptionToPrint?.weight || '-'}</span>
                      <span className="font-bold text-blue-900 whitespace-nowrap">: وزن المريض</span>
                    </div>
                    <div className="flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-blue-900 whitespace-nowrap">B.P :</span>
                      <span className="flex-1 text-center font-medium">{prescriptionToPrint?.bp || '-'}</span>
                      <span className="font-bold text-blue-900 whitespace-nowrap">: ضغط الدم</span>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-end gap-2 border-b border-dotted border-slate-400 pb-1">
                    <span className="font-bold text-blue-900 whitespace-nowrap">Diagnosis :</span>
                    <span className="flex-1 text-center font-medium">{prescriptionToPrint?.diagnosis || '-'}</span>
                    <span className="font-bold text-blue-900 whitespace-nowrap">: التشخيص</span>
                  </div>
                </div>

                {/* Prescription Badge */}
                <div className="flex justify-center mb-6">
                  <div className="bg-blue-900 text-white px-8 py-1 rounded-md font-bold text-sm">
                    وصفة طبية
                  </div>
                </div>

                {/* Rx Symbol */}
                <div className="mb-4">
                  <span className="text-4xl font-serif text-blue-900 italic font-bold">Rx</span>
                </div>

                {/* Medications List */}
                <div className="min-h-[450px] px-4">
                  <div className="space-y-6">
                    {prescriptionToPrint?.meds.map((med, index) => (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="w-6 h-6 rounded-full border border-blue-900 flex items-center justify-center text-blue-900 font-bold text-xs shrink-0 mt-1">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg text-slate-900">{med.name}</p>
                          <p className="text-sm text-slate-600 font-medium">
                            الجرعة: {med.dosage} | التكرار: {med.frequency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature Area */}
                <div className="flex justify-end mb-8">
                  <div className="text-center">
                    <p className="text-sm font-serif italic text-blue-900 mb-1">Signature : ....................................................</p>
                  </div>
                </div>

                {/* Footer Banner */}
                <div className="border-t-2 border-blue-900 pt-2">
                  <div className="bg-blue-900/5 p-2 rounded-sm text-center mb-2">
                    <p className="text-[10px] font-bold text-blue-900 flex justify-center gap-4">
                      <span>الرجاء عرض العلاج قبل الإستخدام</span>
                      <span>•</span>
                      <span>إحضار هذه الوصفة في الزيارة القادمة</span>
                      <span>•</span>
                      <span>المراجعة خلال 10 أيام</span>
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-blue-900 px-2">
                    <p>صنعاء - جولة عمران - أمام مدارس النجباء للبنين</p>
                    <div className="flex gap-4">
                      <span>01 322 811</span>
                      <span>777512221</span>
                      <span>777717544</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

