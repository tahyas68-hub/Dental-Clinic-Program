import React from 'react';
import { 
  Users, Calendar, CreditCard, Package, BarChart3, 
  LogOut, Stethoscope, FileText, Settings, Shield, Pill
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { User, ClinicSettings } from '../../types';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  clinicSettings: ClinicSettings | null;
  handleLogout: () => void;
}

export const Sidebar = ({ activeTab, setActiveTab, user, clinicSettings, handleLogout }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3, roles: ['admin', 'doctor', 'accountant', 'receptionist'] },
    { id: 'patients', label: 'المرضى', icon: Users, roles: ['admin', 'doctor', 'receptionist'] },
    { id: 'appointments', label: 'المواعيد', icon: Calendar, roles: ['admin', 'doctor', 'receptionist'] },
    { id: 'prescriptions', label: 'الوصفات', icon: FileText, roles: ['admin', 'doctor'] },
    { id: 'medications', label: 'الأدوية', icon: Pill, roles: ['admin', 'doctor'] },
    { id: 'finance', label: 'المالية', icon: CreditCard, roles: ['admin', 'accountant'] },
    { id: 'inventory', label: 'المخزون', icon: Package, roles: ['admin', 'receptionist'] },
    { id: 'users', label: 'المستخدمين', icon: Shield, roles: ['admin'] },
    { id: 'settings', label: 'الإعدادات', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-slate-200 z-20">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-blue-600 p-1 rounded-lg overflow-hidden w-10 h-10 flex items-center justify-center">
          {clinicSettings?.clinic_logo ? (
            <img src={clinicSettings.clinic_logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Stethoscope className="text-white w-6 h-6" />
          )}
        </div>
        <span className="font-bold text-lg text-slate-800 truncate">
          {clinicSettings?.clinic_name || 'عيادتي'}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {filteredMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
              activeTab === item.id 
                ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id && "scale-110 transition-transform")} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="text-right overflow-hidden">
            <p className="text-sm font-bold text-slate-800 leading-none truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-1">
              {user.role === 'admin' ? 'مدير' : 
               user.role === 'doctor' ? 'طبيب' : 
               user.role === 'accountant' ? 'محاسب' : 'موظف استقبال'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
};
