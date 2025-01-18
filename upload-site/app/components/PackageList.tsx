'use client'

import { PackageMetadata } from '@/app/lib/types'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

interface PackageListProps {
  packages: PackageMetadata[];
  limit?: number;
}

export const PackageList = ({ packages, limit }: PackageListProps) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const displayPackages = limit ? packages.slice(0, limit) : packages;

  const toggleExpand = (mpackage: string | null) => {
    setExpandedPackage(expandedPackage === mpackage ? null : mpackage);
  };

  return (
    <section className="page-content" aria-label="Package listings">
      <main role="main">
        {displayPackages.map((pkg) => (
          <article
            key={pkg.mpackage}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => toggleExpand(pkg.mpackage)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpand(pkg.mpackage);
              }
            }}
            role="button"
            aria-expanded={expandedPackage === pkg.mpackage}
            aria-controls={`description-${pkg.mpackage}`}
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-2">
                  <a
                    href={`http://mudlet.github.io/mudlet-package-repository/packages/${pkg.filename}`}
                    className="text-blue-600 hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Download ${pkg.mpackage} package`}
                  >
                    {pkg.mpackage}
                  </a>
                </h2>
                <p className="text-gray-600 mb-2">by {pkg.author}, version {pkg.version}</p>
                <p className="text-gray-800">{pkg.title}</p>
              </div>
              {pkg.icon && (
                <div className="flex-shrink-0">
                  <Image
                    src={pkg.icon}
                    alt={`${pkg.mpackage} icon`}
                    width={48}
                    height={48}
                    className="rounded"
                  />
                </div>
              )}
            </div>
            {expandedPackage === pkg.mpackage && (
              <div
                className="mt-4 pt-4 border-t border-gray-200"
                id={`description-${pkg.mpackage}`}
                aria-hidden={expandedPackage !== pkg.mpackage}
              >
                <ReactMarkdown className="prose prose-blue max-w-none">
                  {pkg.description}
                </ReactMarkdown>
              </div>
            )}
          </article>

        ))}
      </main>
    </section>
  );
};
