interface Package {
    mpackage: string;
    author: string;
    title: string;
    version: string;
    description?: string;
  }
  
  interface PackageListProps {
    packages: Package[];
    limit?: number;
  }
  
  export const PackageList = ({ packages, limit }: PackageListProps) => {
    const displayPackages = limit ? packages.slice(0, limit) : packages;
  
    return (
      <section className="page-content">
        <main role="main">
          {displayPackages.map((pkg) => (
            <article key={pkg.mpackage}>
              <h2>
                <a href={`http://mudlet.github.io/mudlet-package-repository/packages/${pkg.mpackage}.mpackage`}>
                  {pkg.mpackage}
                </a>
              </h2>
              <p>by {pkg.author}, version {pkg.version}</p>
              <p>{pkg.title}</p>
            </article>
          ))}
        </main>
      </section>
    );
  };
  