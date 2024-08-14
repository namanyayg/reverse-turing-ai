import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roast My HackerNews",
  description: "Analyze your HackerNews posts and get an AI to review it",
  openGraph: {
    images: [
      "https://roastmyhn.nmn.gl/og-image.png"
    ]
  },
  icons: {
    icon: "/favicon.png"
  },
  metadataBase: new URL('https://roastmyhn.nmn.gl/')
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white">
      <body className={`${spaceGrotesk.className} bg-white`}>
        {children}

        {/* About the Creator Section */}
        <section className="py-20 bg-orange-50 text-gray-600">
          <h1 className="text-sm text-center text-gray-300 font-serif uppercase tracking-widest mb-6 px-4">About the Creator</h1>
          <div className="text-center max-w-7xl mx-auto px-4">
            <a className="flex items-center justify-center mb-6" href="https://x.com/NamanyayG" target="_blank" rel="noopener noreferrer">
              <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden mr-4">
                <img src="https://pbs.twimg.com/profile_images/1808192564257841152/6S6mwLb4_400x400.jpg" alt="NamanyayG" width={48} height={48} />
              </div>
              <h2 className="text-2xl font-semibold text-orange-600">Hi, I&rsquo;m nmn</h2>
            </a>
            <p className="text-lg mb-4">I&rsquo;m an indie developer and I&rsquo;ve been programming since the age of 13.</p>
            <p className="text-lg mb-4">After ~10 years of consulting, I reached my <a href="https://x.com/NamanyayG/status/1786049433324462278" target="_blank" rel="noopener noreferrer" className="text-orange-600">FIRE goal</a> last year.</p>
            <p className="text-lg mb-4">Since then, I&rsquo;ve been playing with AI for fun.</p>
            <p className="text-lg mb-8 italic">This is my dedication to HN for all it taught me over the years.</p>
            <p className="text-lg mb-4">I keep using AI in creative ways & <span className="font-bold">I would love to earn your follow</span>:</p>
            <a 
              href="https://x.com/NamanyayG" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-full transition duration-300"
            >
              My X (Twitter) Profile
            </a>
          </div>
        </section>
        <GoogleAnalytics gaId="G-TK2ZPV82TV" />
      </body>
    </html>
  );
}
