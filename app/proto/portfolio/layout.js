// Titre, description et aperçu de lien de la version A. À remonter à la racine du site à la mise en production.

const title = "MATT.JNO, photographe de sport";
const description = "Football, handball, basket et football américain : le portfolio de MATT.JNO, photographe de sport au bord du terrain.";

export const metadata = {
  metadataBase: new URL("https://mattjno.com"),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "fr_FR", siteName: "MATT.JNO" },
  twitter: { card: "summary_large_image", title, description },
};

export default function PortfolioLayout({ children }) {
  return (
    <>
      {/* Active les états de départ des animations seulement quand le script tourne : sans lui, tout reste visible */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      {/* Fond noir dès la première image affichée, avant le chargement des feuilles de style de la page */}
      <style dangerouslySetInnerHTML={{ __html: "html,body{background:#080808;color:#f1f1ef}" }} />
      {children}
    </>
  );
}
