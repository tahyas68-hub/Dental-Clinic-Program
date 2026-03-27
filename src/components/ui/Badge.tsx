import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export const Badge = ({ className, variant = 'primary', children, ...props }: BadgeProps) => {
  const variants = {
    primary: 'bg-blue-50 text-blue-600',
    secondary: 'bg-slate-50 text-slate-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
  };

  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
