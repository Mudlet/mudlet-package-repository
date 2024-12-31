import { PackageList } from './components/PackageList';

async function getPackages() {
  // TODO: Replace with actual API call
  const response = await fetch('https://mudlet.github.io/mudlet-package-repository/packages/mpkg.packages.json');
  const data = await response.json();
  return data.packages;
}

export default async function Home() {
  const packages = await getPackages();
  
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">Recent Uploads</h1>
      <PackageList packages={packages} limit={5} />
    </main>
  );
}
