import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tu Tiên Nhàn Rỗi",
  description: "Idle cultivation game — bế quan luyện khí, vượt ải trảm yêu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
