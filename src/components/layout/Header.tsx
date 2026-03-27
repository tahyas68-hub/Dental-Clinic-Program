import React from 'react';
import { LogOut, Stethoscope } from 'lucide-react';
import { User, ClinicSettings } from '../../types';

interface HeaderProps {
  activeTabLabel: string;
  user: User;
  clinicSettings: ClinicSettings | null;
  handleLogout: () => void;
}

export const Header = ({ activeTabLabel, user, clinicSettings, handleLogout }: HeaderProps) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="lg:hidden bg-blue-600 p-1 rounded-lg overflow-hidden w-10 h-10 flex items-center justify-center">
          {clinicSettings?.clinic_logo ? (
            <img src={clinicSettings.clinic_logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Stethoscope className="text-white w-6 h-6" />
          )}
        </div>
        <span className="font-bold text-lg text-slate-800 lg:hidden">
          {clinicSettings?.clinic_name || 'عيادتي'}
        </span>
        <div className="h-6 w-px bg-slate-200 mx-2 lg:hidden"></div>
        <h2 className="text-md font-bold text-slate-700">
          {activeTabLabel}
        </h2>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex lg:hidden items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {user.name.charAt(0)}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-1">
              {user.role === 'admin' ? 'مدير' : 
               user.role === 'doctor' ? 'طبيب' : 
               user.role === 'accountant' ? 'محاسب' : 'موظف استقبال'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="lg:hidden p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
