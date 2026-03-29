import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppLayout } from "../components/AppLayout";
import { Providers } from "../components/Providers";
import "../index.css";

export const metadata: Metadata = {
  title: "LiveWell",
  description: "Manage chores, shared notes, and spending in one calm, demo-ready space.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
