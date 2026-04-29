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
              background: "#18181B",
              color: "#FAFAFA",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "8px",
              padding: "10px 16px",
              border: "1px solid #3F3F46",
              fontFamily: "'Inter', sans-serif",
            },
            success: { iconTheme: { primary: "#22C55E", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
            duration: 3500,
          }}
        />
      </body>
    </html>
  );
}
