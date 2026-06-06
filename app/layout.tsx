import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { AppShell } from "../components/layout/app-shell";

export const metadata = {
  title: "SMK PGRI 4 Pasuruan",
  description: "Sistem Pembayaran PMS - SMK PGRI 4 Pasuruan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
