import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between mb-6', className)} {...props}>
    {children}
  </div>
);

Card.Title = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-bold text-slate-800', className)} {...props}>
    {children}
  </h3>
);

Card.Content = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-4', className)} {...props}>
    {children}
  </div>
);
