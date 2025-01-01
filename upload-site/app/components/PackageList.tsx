import { PackageMetadata } from '@/app/lib/types'
  
  interface PackageListProps {
    packages: PackageMetadata[];
    limit?: number;
  }
  
  export const PackageList = ({ packages, limit }: PackageListProps) => {
    const displayPackages = limit ? packages.slice(0, limit) : packages;
  
    return (
      <section className="page-content">
        <main role="main">
          {displayPackages.map((pkg) => (
            <article key={pkg.mpackage} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-2">
                <a 
                  href={`http://mudlet.github.io/mudlet-package-repository/packages/${pkg.mpackage}.mpackage`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {pkg.mpackage}
                </a>
              </h2>
              <p className="text-gray-600 mb-2">by {pkg.author}, version {pkg.version}</p>
              <p className="text-gray-800">{pkg.title}</p>
            </article>
          ))}
        </main>
      </section>
    );
  };
  