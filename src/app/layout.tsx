import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({ 
  subsets: ["latin"],
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "Reverse Turing Test",
  description: "Please complete this challenge to prove you're not a robot.",
  metadataBase: new URL('https://reverse-turing.nmn.gl/')
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={spaceMono.className}>
        {children}
        <GoogleAnalytics gaId="G-XBFVRCGCD7" />
      </body>
    </html>
  );
}
