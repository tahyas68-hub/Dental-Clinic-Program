import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table = ({ className, children, ...props }: TableProps) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className={cn('w-full text-right min-w-[800px]', className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

Table.Header = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('bg-slate-50 border-b border-slate-200', className)} {...props}>
    {children}
  </thead>
);

Table.Body = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('divide-y divide-slate-100', className)} {...props}>
    {children}
  </tbody>
);

Table.Row = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('hover:bg-slate-50 transition-all', className)} {...props}>
    {children}
  </tr>
);

Table.Head = ({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-6 py-4 font-bold text-slate-600 text-sm', className)} {...props}>
    {children}
  </th>
);

Table.Cell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-6 py-4 text-sm text-slate-800', className)} {...props}>
    {children}
  </td>
);
