import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppLayout } from "../components/AppLayout";
import { Providers } from "../components/Providers";
import "../index.css";

export const metadata: Metadata = {
  title: "LiveWell",
  description: "Manage chores, shopping, and shared spending in one calm, demo-ready space.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
