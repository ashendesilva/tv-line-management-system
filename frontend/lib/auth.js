/**
 * Authentication utilities for client-side usage
 */

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const getAdmin = () => {
  if (typeof window === 'undefined') return null;
  try {
    const admin = localStorage.getItem('admin');
    return admin ? JSON.parse(admin) : null;
  } catch {
    return null;
  }
};

export const setAuth = (token, admin) => {
  localStorage.setItem('token', token);
  localStorage.setItem('admin', JSON.stringify(admin));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('admin');
};

export const isAuthenticated = () => {
  return !!getToken();
};
