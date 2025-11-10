import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Task Board - Time Tracking',
  description: 'Production-grade Trello-like task board with time tracking',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

