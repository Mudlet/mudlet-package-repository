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

  // Sort packages alphabetically by mpackage, case-insensitive
  // This is not fixed in stone and might change in the future as we get a better understanding of how to handle this.
  const sortedPackages = packages.slice().sort((a, b) => {
    const aName = a.mpackage?.toLowerCase() || '';
    const bName = b.mpackage?.toLowerCase() || '';
    return aName.localeCompare(bName);
  });

  const displayPackages = limit ? sortedPackages.slice(0, limit) : sortedPackages;

  const getPackageCountByAuthor = (authorName: string | null) => {
    if (!authorName || authorName === 'Mudlet Default Package') return 0;
    return packages.filter(pkg => pkg.author === authorName).length;
  };  

  const toggleExpand = (mpackage: string | null) => {
    setExpandedPackage(expandedPackage === mpackage ? null : mpackage);
  };

  return (
    <section className="page-content" aria-label="Package listings">
      <main role="main">
        {displayPackages.map((pkg) => (
          <article
            key={pkg.mpackage}
            id={`pkg-${encodeURIComponent(pkg.mpackage || '')}`}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => toggleExpand(pkg.mpackage)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpand(pkg.mpackage);
              }
            }}
            role="button"
            aria-controls={`description-${pkg.mpackage}`}
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-4 items-stretch">
              <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-2">
                  <a
                    href={`https://github.com/Mudlet/mudlet-package-repository/raw/refs/heads/main/packages/${pkg.filename}`}
                    className="text-blue-600 hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Download ${pkg.mpackage} package`}
                  >
                    {pkg.mpackage}
                  </a>
                </h2>
                <p className="text-gray-600 mb-2">
                  by <span
                    className={`${getPackageCountByAuthor(pkg.author) >= 5 ? 'text-amber-500 font-semibold' : ''}`}
                    title={getPackageCountByAuthor(pkg.author) >= 5 ? 'This author has uploaded 5+ packages' : ''}
                  >
                    {pkg.author}
                  </span>,
                  version {pkg.version}
                </p>
                <p className="text-gray-800">{pkg.title}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col">
                  {pkg.icon && (
                    <Image
                      src={`https://raw.githubusercontent.com/Mudlet/mudlet-package-repository/refs/heads/main/${pkg.icon}`}
                      alt={`${pkg.mpackage} icon`}
                      width={48}
                      height={48}
                      className="rounded flex-shrink-0"
                    />
                  )}
                  <div className="content-end flex-grow-2">
                    <p className="text-gray-600 text-right">
                      <a href={`#pkg-${encodeURIComponent(pkg.mpackage || '')}`}>link</a>
                    </p>
                  </div>
                  
              </div>
              
              
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
