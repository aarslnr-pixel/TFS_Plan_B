import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Object Eraser',
  description: 'Mobile-first object eraser starter built with Next.js and FastAPI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
