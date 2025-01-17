import { PackageList } from './components/PackageList';
import { IntroSection } from './components/IntroSection';
import { promises as fs } from 'fs';

const getPackages = async () => {
  if (process.env.NODE_ENV === 'development') {
    const jsonData = await fs.readFile('../packages/mpkg.packages.json', 'utf8');
    return JSON.parse(jsonData).packages;
  }
  const response = await fetch('https://mudlet.github.io/mudlet-package-repository/packages/mpkg.packages.json');
  const data = await response.json();
  return data.packages;
};

export default async function Home() {
  const packages = await getPackages();
  
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-16">
        <IntroSection />
      </div>
      <div className="border-t pt-8">
        <h2 className="text-2xl font-bold mb-8">Recent uploads</h2>
        <PackageList packages={packages} limit={5} />
      </div>
    </main>
  );
}
