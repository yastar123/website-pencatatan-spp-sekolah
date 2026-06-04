import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { AppShell } from "../components/layout/app-shell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
