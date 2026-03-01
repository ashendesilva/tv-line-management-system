import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'BINT TV Line - Management System',
  description: 'TV Cable Line Business User & Payment Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#111827',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
