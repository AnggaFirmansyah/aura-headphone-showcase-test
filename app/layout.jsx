import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

export const metadata = {
  title: "AURA One / Reference wireless headphones",
  description:
    "Interactive 3D showcase of the AURA One reference ANC headphones. Drag to orbit, pick a colourway.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${plexMono.variable} bg-base text-ink font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
