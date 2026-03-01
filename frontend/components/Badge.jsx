'use client';

/**
 * Badge component for status display
 * variant: 'paid' | 'unpaid' | 'active' | 'inactive'
 */
export default function Badge({ variant, children }) {
  const styles = {
    paid:     'bg-green-100 text-green-800 border border-green-200',
    unpaid:   'bg-red-100 text-red-800 border border-red-200',
    active:   'bg-blue-100 text-blue-800 border border-blue-200',
    inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
    overdue:  'bg-orange-100 text-orange-800 border border-orange-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant] || styles.inactive}`}>
      {children}
    </span>
  );
}
