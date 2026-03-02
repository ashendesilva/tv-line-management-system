'use client';
import { useState, useEffect, useCallback } from 'react';
import DataTable from 'react-data-table-component';
import { StyleSheetManager } from 'styled-components';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import api from '../lib/axios';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currency = (v) => `LKR ${Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const tableStyles = {
  headRow: {
    style: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  },
  headCells: {
    style: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.04em' },
  },
  rows: {
    style: { fontSize: '12px' },
  },
};

export default function PaymentModal({ isOpen, onClose, user, onPaymentChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Pay form state
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState('');

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get(`/users/${user.id}/payments`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchPayments();
      setAmountPaid('');
      setNotes('');
      setAmountError('');
    }
  }, [isOpen, user, fetchPayments]);

  const handlePay = async (e) => {
    e.preventDefault();
    const val = parseFloat(amountPaid);
    if (!amountPaid || isNaN(val) || val <= 0) {
      setAmountError('Please enter a valid amount greater than 0.');
      return;
    }
    setAmountError('');
    setPaying(true);
    try {
      const res = await api.post(`/users/${user.id}/pay`, { amount_paid: val, notes: notes.trim() || undefined });
      toast.success(res.data.message);
      setAmountPaid('');
      setNotes('');
      fetchPayments();
      onPaymentChange?.(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  const handleDeletePayment = async (paymentId, amount) => {
    if (!confirm(`Delete payment of ${currency(amount)}? This will restore the balance.`)) return;
    setDeletingId(paymentId);
    try {
      const res = await api.delete(`/users/${user.id}/payments/${paymentId}`);
      toast.success(res.data.message);
      fetchPayments();
      onPaymentChange?.(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete payment.');
    } finally {
      setDeletingId(null);
    }
  };

  const currentUser = data?.user || user;
  const balance = parseFloat(currentUser?.balance || 0);
  const monthlyFee = parseFloat(currentUser?.monthly_fee || 0);
  const today = new Date();
  const currentMonthPayments = data?.payments?.filter(
    (p) => p.month === today.getMonth() + 1 && p.year === today.getFullYear()
  ) || [];
  const totalPaidThisMonth = currentMonthPayments.reduce((s, p) => s + p.amount_paid, 0);

  const historyColumns = [
    {
      name: 'Date',
      selector: (r) => r.created_at,
      cell: (r) => (
        <span className="text-xs text-gray-600">
          {new Date(r.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })}
        </span>
      ),
      sortable: true,
      width: '110px',
    },
    {
      name: 'Month',
      cell: (r) => <span className="text-xs font-medium text-gray-700">{MONTH_NAMES[r.month - 1]} {r.year}</span>,
      width: '120px',
    },
    {
      name: 'Amount Due',
      selector: (r) => r.amount_due,
      cell: (r) => <span className="text-xs text-gray-500">{currency(r.amount_due)}</span>,
      right: true,
      width: '110px',
    },
    {
      name: 'Amount Paid',
      selector: (r) => r.amount_paid,
      cell: (r) => <span className="text-xs font-semibold text-green-700">{currency(r.amount_paid)}</span>,
      right: true,
      width: '115px',
    },
    {
      name: 'Balance After',
      selector: (r) => r.balance_after,
      cell: (r) => (
        <span className={`text-xs font-medium ${r.balance_after <= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {r.balance_after <= 0 ? `+${currency(Math.abs(r.balance_after))} credit` : currency(r.balance_after)}
        </span>
      ),
      right: true,
      minWidth: '130px',
    },
    {
      name: 'Notes',
      selector: (r) => r.notes,
      cell: (r) => <span className="text-xs text-gray-400 italic">{r.notes || '—'}</span>,
      minWidth: '120px',
    },
    {
      name: '',
      cell: (r) => (
        <button
          onClick={() => handleDeletePayment(r.id, r.amount_paid)}
          disabled={deletingId === r.id}
          className="text-red-400 hover:text-red-600 transition-colors p-1 disabled:opacity-40"
          title="Delete this payment record"
        >
          {deletingId === r.id ? (
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      ),
      width: '48px',
      right: true,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payment Details — ${user?.name || ''}`}
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Balance Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Monthly Fee" value={currency(monthlyFee)} color="blue" />
            <SummaryCard
              label="Current Balance"
              value={balance > 0 ? currency(balance) : balance < 0 ? `${currency(Math.abs(balance))} credit` : 'LKR 0.00'}
              color={balance > 0 ? 'red' : balance < 0 ? 'green' : 'gray'}
              sub={balance > 0 ? 'Still owes' : balance < 0 ? 'Overpaid' : 'Settled'}
            />
            <SummaryCard label="Paid This Month" value={currency(totalPaidThisMonth)} color="green" />
            <SummaryCard
              label="Status"
              value={currentUser?.is_paid ? 'PAID' : 'UNPAID'}
              color={currentUser?.is_paid ? 'green' : 'red'}
            />
          </div>

          {/* Record Payment Form */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Record Payment
            </h3>
            <form onSubmit={handlePay} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Amount Paid <span className="text-red-500">*</span>
                  {monthlyFee > 0 && (
                    <span className="ml-1 text-blue-500 font-normal">(Monthly fee: {currency(monthlyFee)})</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">LKR</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => { setAmountPaid(e.target.value); setAmountError(''); }}
                    className={`w-full pl-12 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${amountError ? 'border-red-400' : 'border-blue-300 bg-white'}`}
                  />
                </div>
                {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
                {/* Quick amount buttons */}
                {monthlyFee > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button type="button" onClick={() => setAmountPaid(String(monthlyFee))}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors">
                      Full ({currency(monthlyFee)})
                    </button>
                    <button type="button" onClick={() => setAmountPaid(String((monthlyFee / 2).toFixed(2)))}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors">
                      Half ({currency(monthlyFee / 2)})
                    </button>
                    {balance > 0 && (
                      <button type="button" onClick={() => setAmountPaid(String(balance.toFixed(2)))}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors">
                        Pay Balance ({currency(balance)})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-blue-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cash payment, partial only..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="success" loading={paying} className="whitespace-nowrap">
                  💵 Record
                </Button>
              </div>
            </form>
          </div>

          {/* This Month Summary */}
          {currentMonthPayments.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <span className="font-semibold text-green-800">This month ({MONTH_NAMES[today.getMonth()]} {today.getFullYear()}):</span>{' '}
              <span className="text-green-700">{currentMonthPayments.length} payment(s) totalling {currency(totalPaidThisMonth)}</span>
              {balance > 0 && (
                <span className="ml-2 text-red-600">— still owes {currency(balance)}</span>
              )}
              {balance <= 0 && (
                <span className="ml-2 text-green-600 font-medium">✓ Fully settled</span>
              )}
            </div>
          )}

          {/* Payment History Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Payment History
              <span className="text-gray-400 font-normal text-xs">({data?.payments?.length || 0} records)</span>
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <StyleSheetManager shouldForwardProp={(p) => !['minWidth','maxWidth','center','right','compact','allowOverflow','wrap','grow','noHeader','sortActive'].includes(p)}>
                <DataTable
                  columns={historyColumns}
                  data={data?.payments || []}
                  customStyles={tableStyles}
                  pagination
                  paginationPerPage={10}
                  paginationRowsPerPageOptions={[10, 20, 50]}
                  noDataComponent={
                    <div className="py-12 text-center text-gray-400 text-sm">No payment records yet.</div>
                  }
                  dense
                  responsive
                  persistTableHead
                />
              </StyleSheetManager>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SummaryCard({ label, value, color, sub }) {
  const colors = {
    blue:  'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    red:   'bg-red-50 border-red-100 text-red-700',
    gray:  'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="font-bold text-sm leading-snug">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}
