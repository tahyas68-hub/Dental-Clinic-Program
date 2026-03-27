import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'amber' | 'rose';
  trend?: string;
}

export const StatCard = ({ title, value, icon: Icon, color, trend }: StatCardProps) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 shadow-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 shadow-emerald-100',
    amber: 'bg-amber-50 text-amber-600 shadow-amber-100',
    rose: 'bg-rose-50 text-rose-600 shadow-rose-100',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-3 rounded-xl transition-transform group-hover:scale-110', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
};
