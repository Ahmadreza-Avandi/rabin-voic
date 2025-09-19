import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'دستیار رابین - دستیار هوشمند صوتی',
  description: 'دستیار صوتی تعاملی شبیه جارویس برای کار با هوش مصنوعی',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-vazir">
        {children}
      </body>
    </html>
  );
}