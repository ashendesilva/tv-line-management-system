'use client';
import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import FormInput from './FormInput';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const DEFAULT_FORM = {
  name: '',
  address: '',
  monthly_payment_day: '5',
  is_active: true,
};

export default function UserFormModal({ isOpen, onClose, onSubmit, onUnpay, editUser, loading, unpayLoading }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editUser) {
      setForm({
        name: editUser.name || '',
        address: editUser.address || '',
        monthly_payment_day: String(editUser.monthly_payment_day) || '5',
        is_active: editUser.is_active !== undefined ? editUser.is_active : true,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
  }, [editUser, isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.address.trim()) errs.address = 'Address is required.';
    if (!form.monthly_payment_day) errs.monthly_payment_day = 'Payment day is required.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit({
      ...form,
      monthly_payment_day: parseInt(form.monthly_payment_day),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editUser ? 'Edit User' : 'Add New User'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading || unpayLoading}>
            Cancel
          </Button>
          {/* Mark as Unpaid — only shown when editing a paid user */}
          {editUser && editUser.is_paid && (
            <Button
              variant="warning"
              onClick={() => onUnpay(editUser.id)}
              loading={unpayLoading}
              disabled={loading}
              title="Revert payment for this month"
            >
              ✗ Mark as Unpaid
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={unpayLoading}>
            {editUser ? 'Save Changes' : 'Add User'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Payment status indicator in edit mode */}
        {editUser && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm font-medium ${
            editUser.is_paid
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <span>{editUser.is_paid ? '✅' : '❌'}</span>
            <span>
              Payment Status: <strong>{editUser.is_paid ? 'Paid' : 'Unpaid'}</strong>
              {editUser.last_payment_date && (
                <span className="font-normal text-green-700 ml-1">(Last: {editUser.last_payment_date})</span>
              )}
            </span>
          </div>
        )}

        <FormInput
          label="Full Name"
          id="name"
          placeholder="e.g. Juan dela Cruz"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          required
        />

        <FormInput
          label="Address"
          id="address"
          as="textarea"
          rows={3}
          placeholder="e.g. Block 1, Lot 5, Sampaguita St., Brgy. Mabini"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          error={errors.address}
          required
        />

        <FormInput
          label="Monthly Payment Day"
          id="monthly_payment_day"
          as="select"
          value={form.monthly_payment_day}
          onChange={(e) => setForm({ ...form, monthly_payment_day: e.target.value })}
          error={errors.monthly_payment_day}
          required
        >
          {DAYS.map((day) => (
            <option key={day} value={day}>
              Day {day}
            </option>
          ))}
        </FormInput>

        {/* Active Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                form.is_active ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  form.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${form.is_active ? 'text-blue-700' : 'text-gray-500'}`}>
              {form.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
