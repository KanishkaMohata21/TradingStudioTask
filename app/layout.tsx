import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { LineChart } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Strategy Simulator',
  description: 'Backtest your trading strategies with our powerful simulation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="border-b">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <LineChart className="h-6 w-6" />
              <span>Trading Strategy Simulator</span>
            </Link>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}