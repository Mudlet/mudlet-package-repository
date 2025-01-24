import { PackageList } from '../components/PackageList';
import { promises as fs } from 'fs';

const getPackages = async () => {
  if (process.env.NODE_ENV === 'development') {
    const jsonData = await fs.readFile('../packages/mpkg.packages.json', 'utf8');
    return JSON.parse(jsonData).packages;
  }
  const response = await fetch('https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main/packages/mpkg.packages.json');
  const data = await response.json();
  return data.packages;
};


export default async function PackagesPage() {
  const packages = await getPackages();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">All available packages</h1>
      <PackageList packages={packages} />
    </main>
  );
}
