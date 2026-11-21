import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IceWatch GLOF Risk Intelligence | Shisper Glacier",
  description: "AI-Based Multimodal GLOF Early Warning & Downstream Inundation Decision Support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-[#0b0f19] text-gray-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

