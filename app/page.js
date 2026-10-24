import Portfolio from "./_site/Portfolio";
import { getSite } from "./_site/data";

// La page est régénérée au plus toutes les 5 minutes : une photo déposée dans R2 apparaît sans redéploiement.
export const revalidate = 300;

export default async function Home() {
  const { hero, chapters } = await getSite();
  return <Portfolio hero={hero} chapters={chapters} />;
}
