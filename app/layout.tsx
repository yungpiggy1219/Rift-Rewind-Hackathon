import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rift Rewind - League of Legends Analytics",
  description: "Analyze your League of Legends performance with AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
