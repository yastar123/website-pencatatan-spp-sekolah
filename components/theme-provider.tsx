"use client";

import * as React from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
  [key: string]: any;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Simple pass-through provider - no next-themes script injection
  return <>{children}</>;
}
