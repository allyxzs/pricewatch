import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'PriceWatch — Seu preço. Seu momento.',
  description:
    'Acompanhe seus produtos favoritos e receba um alerta só quando o preço chegar à sua meta.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
