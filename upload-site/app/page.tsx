import { PackageList } from './components/PackageList';
import { IntroSection } from './components/IntroSection';
import { ProgressBar } from './components/ProgressBar';
import { UploadedPackageSortByOptions } from './lib/types';
import { promises as fs } from 'fs';

const PACKAGE_GOAL = 100;

const getPackages = async () => {
  if (process.env.NODE_ENV === 'development') {
    const jsonData = await fs.readFile('../packages/mpkg.packages.json', 'utf8');
    return JSON.parse(jsonData).packages;
  }
  const response = await fetch('https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main/packages/mpkg.packages.json');
  const data = await response.json();
  return data.packages;
};

export default async function Home() {
  const packages = await getPackages();
  const currentCount = packages.length;
  const progressPercentage = Math.min((currentCount / PACKAGE_GOAL) * 100, 100);
  
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-16">
        <IntroSection />
      </div>
      <div className="mb-16">
        <ProgressBar 
          current={currentCount}
          goal={PACKAGE_GOAL}
          percentage={progressPercentage}
        />
      </div>
      <div className="border-t pt-8">
        <h2 className="text-2xl font-bold mb-8">Recent uploads</h2>
        <PackageList packages={packages} limit={5} sortBy={UploadedPackageSortByOptions.uploaded} hideLinks={true} />
      </div>
    </main>
  );
}
