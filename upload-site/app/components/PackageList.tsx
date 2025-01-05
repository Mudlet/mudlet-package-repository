'use client'

import { PackageMetadata } from '@/app/lib/types'
import { useState } from 'react'

interface PackageListProps {
  packages: PackageMetadata[];
  limit?: number;
}

export const PackageList = ({ packages, limit }: PackageListProps) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const displayPackages = limit ? packages.slice(0, limit) : packages;

  const toggleExpand = (mpackage: string) => {
    setExpandedPackage(expandedPackage === mpackage ? null : mpackage);
  };

  return (
    <section className="page-content">
      <main role="main">
        {displayPackages.map((pkg) => (
          <article 
            key={pkg.mpackage} 
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 mb-4"
            onClick={() => toggleExpand(pkg.mpackage)}
          >
            <h2 className="text-xl font-semibold mb-2">
              <a 
                href={`http://mudlet.github.io/mudlet-package-repository/packages/${pkg.mpackage}.mpackage`}
                className="text-blue-600 hover:text-blue-800"
                onClick={(e) => e.stopPropagation()}
              >
                {pkg.mpackage}
              </a>
            </h2>
            <p className="text-gray-600 mb-2">by {pkg.author}, version {pkg.version}</p>
            <p className="text-gray-800">{pkg.title}</p>
            {expandedPackage === pkg.mpackage && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-700">{pkg.description}</p>
              </div>
            )}
          </article>
        ))}
      </main>
    </section>
  );
};
