import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soğuk Dosya | Dedektif Oyunu",
  description: "Karar odaklı retro soruşturma oyunu — oynanabilir prototip"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
