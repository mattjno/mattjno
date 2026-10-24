import "./globals.css";

const title = "MATT.JNO, photographe de sport";
const description = "Football, handball, basket et football américain : le portfolio de MATT.JNO, photographe de sport au bord du terrain.";

export const metadata = {
  metadataBase: new URL("https://mattjno.com"),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "fr_FR", siteName: "MATT.JNO" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {/* Active les états de départ des animations seulement quand le script tourne : sans lui, tout reste visible */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {children}
      </body>
    </html>
  );
}
