import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { ToastHost } from '../web/components/Toasts';
import './globals.css';

// Self-hosted (no request ever leaves for a font CDN). OFL license in ./fonts/OFL.txt.
const vazirmatn = localFont({
  src: [
    { path: './fonts/Vazirmatn-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Vazirmatn-Medium.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Vazirmatn-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-vazir',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'نوبت‌دهی مطب',
  description: 'نوبت‌دهی مطب دندان‌پزشکی',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Keep the bottom sheet's Save button above the on-screen keyboard on Android Chrome.
  interactiveWidget: 'resizes-content',
  themeColor: '#f4f2ed',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
