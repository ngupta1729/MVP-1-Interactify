import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H5P ChatGPT App - demo",
  description: "Turn content into an interactive H5P activity and export a .h5p file.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
