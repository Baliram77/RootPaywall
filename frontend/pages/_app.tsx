import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';
import { cn } from '@/components/ui/cn';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>x402 Unlocker — Rootstock Paywall</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ToastProvider>
        <div className="min-h-screen">
          <Navbar />
          <main className={cn('rsk-container py-10', 'animate-fade-up')}>
            <Component {...pageProps} />
          </main>
          <Footer />
        </div>
      </ToastProvider>
    </>
  );
}
