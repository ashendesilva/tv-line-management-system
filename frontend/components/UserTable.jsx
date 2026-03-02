'use client';
import DataTable from 'react-data-table-component';
import { StyleSheetManager } from 'styled-components';
import Badge from './Badge';
import Button from './Button';

// react-data-table-component passes these as styled-component props;
// filter them so they don't reach the DOM and trigger React warnings.
const RDT_PROPS = new Set(['minWidth', 'maxWidth', 'center', 'right', 'compact', 'allowOverflow', 'wrap', 'grow', 'noHeader', 'sortActive']);
const shouldForwardProp = (prop) => !RDT_PROPS.has(prop);

const currency = (v) => `LKR ${Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const customStyles = {
  headRow: {
    style: {
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
    },
  },
  headCells: {
    style: {
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#6b7280',
      paddingLeft: '16px',
      paddingRight: '16px',
    },
  },
  rows: {
    style: {
      fontSize: '13px',
      color: '#111827',
      '&:hover': { backgroundColor: '#f9fafb' },
    },
    stripedStyle: {
      backgroundColor: '#fafafa',
    },
  },
  cells: {
    style: {
      paddingLeft: '16px',
      paddingRight: '16px',
      paddingTop: '10px',
      paddingBottom: '10px',
    },
  },
  pagination: {
    style: {
      borderTop: '1px solid #e5e7eb',
      fontSize: '13px',
      color: '#374151',
    },
  },
};

const NoDataComponent = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center w-full">
    <svg className="w-14 h-14 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    <p className="text-gray-500 text-lg font-medium">No customers found</p>
    <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
  </div>
);

const ProgressComponent = () => (
  <div className="flex items-center justify-center py-20 w-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
      <p className="text-sm text-gray-500">Loading customers...</p>
    </div>
  </div>
);

export default function UserTable({ users, loading, onPay, onEdit, onDelete, onToggleActive, onViewPayments, payingId, togglingId, deletingId }) {
  const columns = [
    {
      name: '#',
      cell: (_, i) => <span className="text-gray-400 text-xs">{i + 1}</span>,
      width: '50px',
    },
    {
      name: 'Name',
      selector: (row) => row.name,
      cell: (row) => <span className="font-semibold text-gray-900">{row.name}</span>,
      sortable: true,
      minWidth: '140px',
    },
    {
      name: 'Address',
      selector: (row) => row.address,
      cell: (row) => <span className="text-gray-600 text-xs leading-snug">{row.address}</span>,
      sortable: true,
      minWidth: '160px',
      wrap: true,
    },
    {
      name: 'Billing Day',
      selector: (row) => row.monthly_payment_day,
      cell: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs">
          {row.monthly_payment_day}
        </span>
      ),
      sortable: true,
      center: true,
      width: '122px',
    },
    // {
    //   name: 'Monthly Fee',
    //   selector: (row) => row.monthly_fee,
    //   cell: (row) => (
    //     <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
    //       {currency(row.monthly_fee)}
    //     </span>
    //   ),
    //   sortable: true,
    //   right: true,
    //   minWidth: '110px',
    // },
    {
      name: 'Balance',
      selector: (row) => row.balance,
      cell: (row) => {
        const b = parseFloat(row.balance || 0);
        if (b > 0) return <span className="text-xs font-semibold text-red-600">{currency(b)}</span>;
        if (b < 0) return <span className="text-xs font-semibold text-green-600">+{currency(Math.abs(b))} cr.</span>;
        return <span className="text-xs text-gray-400">—</span>;
      },
      sortable: true,
      center: true,
        minWidth: '60px',
    },
    {
      name: 'Last Payment',
      selector: (row) => row.last_payment_date,
      cell: (row) =>
        row.last_payment_date ? (
          <span className="text-gray-600 text-xs">{row.last_payment_date}</span>
        ) : (
          <span className="text-gray-300 italic text-xs">—</span>
        ),
      sortable: true,
      center: true,
      minWidth: '80px',
    },
    {
      name: 'Status',
      selector: (row) => row.payment_status,
      cell: (row) => {
        const s = row.payment_status;
        return (
          <Badge variant={s}>
            {s === 'paid' ? '✓ Paid' : s === 'partial' ? '½ Partial' : '✗ Unpaid'}
          </Badge>
        );
      },
      sortable: true,
      center: true,
      width: '115px',
    },
    {
      name: 'Active',
      selector: (row) => row.is_active,
      cell: (row) => (
        <Badge variant={row.is_active ? 'active' : 'inactive'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      sortable: true,
      center: true,
      width: '100px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1 flex-wrap py-1">
          {/* Payment History / Pay */}
          <Button
            variant="success"
            size="sm"
            onClick={() => onViewPayments(row)}
            title="View Payments & Pay"
          >
            💵 Pay
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)} title="Edit User">
            ✏️
          </Button>
          <Button
            variant={row.is_active ? 'warning' : 'primary'}
            size="sm"
            loading={togglingId === row.id}
            onClick={() => onToggleActive(row.id)}
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active ? '⏸️' : '▶️'}
          </Button>
          {/* <Button variant="danger" size="sm" loading={deletingId === row.id} onClick={() => onDelete(row)} title="Delete">
            🗑️
          </Button> */}
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      minWidth: '190px',
    },
  ];

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <DataTable
        columns={columns}
        data={users}
        progressPending={loading}
        progressComponent={<ProgressComponent />}
        noDataComponent={<NoDataComponent />}
        customStyles={customStyles}
        pagination
        paginationPerPage={15}
        paginationRowsPerPageOptions={[10, 15, 20, 50]}
        highlightOnHover
        striped
        responsive
        persistTableHead
      />
    </StyleSheetManager>
  );
}
