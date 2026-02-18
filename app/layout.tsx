import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NavigationProgressProvider } from '@/components/providers/NavigationProgress';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'BH Dashboard',
    template: '%s | BH Dashboard',
  },
  description: 'BH dashboard',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense
          fallback={
            <>
              {children}
              <Toaster position="top-center" />
            </>
          }
        >
          <TooltipProvider>
            <NavigationProgressProvider>
              {children}
              <Toaster position="top-center" />
            </NavigationProgressProvider>
          </TooltipProvider>
        </Suspense>
      </body>
    </html>
  );
}
