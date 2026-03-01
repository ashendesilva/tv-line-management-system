'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { isAuthenticated } from '../../lib/auth';
import Navbar from '../../components/Navbar';
import UserTable from '../../components/UserTable';
import UserFormModal from '../../components/UserFormModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import Button from '../../components/Button';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function DashboardPage() {
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  // Data state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [active, setActive] = useState('');

  // Action loading states
  const [payingId, setPayingId] = useState(null);
  const [unpayingId, setUnpayingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (paymentDay) params.paymentDay = paymentDay;
      if (active !== '') params.active = active;

      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentDay, active]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Stats
  const paidCount = users.filter((u) => u.is_paid).length;
  const unpaidCount = users.filter((u) => !u.is_paid).length;
  const activeCount = users.filter((u) => u.is_active).length;

  // --- HANDLERS ---

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPaymentDay('');
    setActive('');
  };

  const handleOpenAdd = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const handleOpenEdit = (user) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditUser(null);
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, formData);
        toast.success('User updated successfully.');
      } else {
        await api.post('/users', formData);
        toast.success('User added successfully.');
      }
      handleCloseForm();
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed.';
      toast.error(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handlePay = async (id) => {
    setPayingId(id);
    try {
      const res = await api.post(`/users/${id}/pay`);
      toast.success(res.data.message || 'Payment recorded.');
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record payment.';
      toast.error(msg);
    } finally {
      setPayingId(null);
    }
  };

  const handleUnpay = async (id) => {
    setUnpayingId(id);
    try {
      const res = await api.patch(`/users/${id}/unpay`);
      toast.success(res.data.message || 'Payment reverted.');
      // refresh the editUser state so the modal badge updates
      setEditUser((prev) => prev ? { ...prev, is_paid: false, last_payment_date: null } : prev);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to revert payment.';
      toast.error(msg);
    } finally {
      setUnpayingId(null);
    }
  };

  const handleToggleActive = async (id) => {
    setTogglingId(id);
    try {
      const res = await api.patch(`/users/${id}/toggle-active`);
      toast.success(res.data.message || 'Status updated.');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to toggle status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenDelete = (user) => setDeleteTarget(user);
  const handleCloseDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} deleted.`);
      handleCloseDelete();
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = search || status || paymentDay || active !== '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage TV line subscribers and monthly payments</p>
          </div>
          <Button variant="primary" onClick={handleOpenAdd} size="md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Customers" value={totalCount} color="blue" icon="👥" />
          <StatCard label="Paid" value={paidCount} color="green" icon="✅" />
          <StatCard label="Unpaid" value={unpaidCount} color="red" icon="❌" />
          <StatCard label="Active" value={activeCount} color="indigo" icon="📡" />
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 text-sm"
              />
            </div>

            {/* Payment Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field text-sm min-w-[150px]"
            >
              <option value="">All Status</option>
              <option value="paid">✅ Paid</option>
              <option value="unpaid">❌ Unpaid</option>
            </select>

            {/* Payment Day */}
            <select
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              className="input-field text-sm min-w-[150px]"
            >
              <option value="">All Pay Days</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>

            {/* Active Status */}
            <select
              value={active}
              onChange={(e) => setActive(e.target.value)}
              className="input-field text-sm min-w-[150px]"
            >
              <option value="">All Accounts</option>
              <option value="true">📡 Active</option>
              <option value="false">⛔ Inactive</option>
            </select>

            {/* Reset */}
            {hasActiveFilters && (
              <Button variant="ghost" size="md" onClick={handleResetFilters}>
                Clear
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <p className="text-xs text-gray-400 mt-2">
              Showing <strong className="text-gray-600">{totalCount}</strong> result(s) matching current filters.
            </p>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Customer List
              <span className="ml-2 text-sm font-normal text-gray-400">({totalCount} total)</span>
            </h2>
          </div>

          <UserTable
            users={users}
            loading={loading}
            onPay={handlePay}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onToggleActive={handleToggleActive}
            payingId={payingId}
            togglingId={togglingId}
            deletingId={deletingId}
          />
        </div>
      </main>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        onUnpay={handleUnpay}
        editUser={editUser}
        loading={formLoading}
        unpayLoading={unpayingId === editUser?.id}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        user={deleteTarget}
        loading={deletingId === deleteTarget?.id}
      />
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-100',
    green:  'bg-green-50 border-green-100',
    red:    'bg-red-50 border-red-100',
    indigo: 'bg-indigo-50 border-indigo-100',
  };

  const textColors = {
    blue:   'text-blue-700',
    green:  'text-green-700',
    red:    'text-red-700',
    indigo: 'text-indigo-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
    </div>
  );
}
