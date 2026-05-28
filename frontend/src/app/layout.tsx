import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "InfoFiscus Semantic Repository — Training Data Collection Platform",
  description: "Infometry's tool to collect structured NL→SQL training data for fine-tuning AI models.",
  icons: { icon: `${basePath}/favicon.svg`, shortcut: `${basePath}/favicon.svg` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href={`${basePath}/favicon.svg?v=3`} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('qf-theme');
              if(t) document.documentElement.setAttribute('data-theme', t);
            } catch(e){}
          })();
        `}} />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#131D2E",
              color: "#F0F4FC",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "8px",
              padding: "10px 16px",
              border: "1px solid #2D3B55",
              fontFamily: "'Inter', sans-serif",
            },
            success: { iconTheme: { primary: "#22C55E", secondary: "#F0F4FC" } },
            error:   { iconTheme: { primary: "#EF4444", secondary: "#F0F4FC" } },
            duration: 3500,
          }}
        />
      </body>
    </html>
  );
}
