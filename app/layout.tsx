import type { Metadata } from "next";
import 'leaflet/dist/leaflet.css';
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Poppins } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: "Drone Delivery System",
  description: "Fast, safe, and reliable drone delivery service",
};

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.className}>
      <body className="antialiased">
        <NextTopLoader />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
