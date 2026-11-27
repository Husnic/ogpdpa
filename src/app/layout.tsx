import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

// Satoshi by Indian Type Foundry — Fontshare Free Font Licence (src/fonts/FFL.txt)
const satoshi = localFont({
  src: "../fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OGPDPA · Operations Dashboard",
  description: "Ogun State Planning and Development Permit Authority — operations, oversight and reporting (prototype).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${satoshi.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
