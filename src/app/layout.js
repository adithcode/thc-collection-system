"use client";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import SplashScreen from "@/components/SplashScreen";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-jakarta',
});

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isLoading, setIsLoading] = useState(isHome);

  useEffect(() => {
    if (isLoading) return;
    
    // PWA Service Worker Registration
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(err => {
          console.log("SW Registration failed: ", err);
        });
      });
    }
  }, [isLoading]);

  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <head>
        <title>THC Group Finance | Collection Portal</title>
        <meta name="description" content="Secure High-Performance Loan Collection Portal" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="theme-color" content="#0A0A0B" />
      </head>
      <body className="jakarta">
        {isLoading && isHome ? (
          <SplashScreen finishLoading={() => setIsLoading(false)} />
        ) : (
          <>
            <Navigation />
            <main style={{ paddingBottom: '100px' }}>
              {children}
            </main>
          </>
        )}
      </body>
    </html>
  );
}
