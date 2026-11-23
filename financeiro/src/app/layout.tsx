import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Financeiro", template: "%s · Financeiro" },
  description: "Controle financeiro em real e boliviano, cada moeda no seu caixa.",
};

export const viewport: Viewport = { themeColor: "#1a1a1f", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
