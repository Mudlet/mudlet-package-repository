'use client'

import { UploadedPackageMetadata, UploadedPackageSortByOptions } from '@/app/lib/types'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

interface PackageListProps {
  packages: UploadedPackageMetadata[];
  limit?: number;
  sortBy?: UploadedPackageSortByOptions; // will sort by mpackage by default
  reverse?: boolean;
  hideLinks?: boolean;
}

export const PackageList = ({ packages, limit, sortBy, reverse, hideLinks }: PackageListProps) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  // will sort by mpackage by default.
  const _sortBy = sortBy ? sortBy : UploadedPackageSortByOptions.mpackage;

  // will not reverse the sort order by default.
  const _reverse = reverse ? reverse : false;

  // Sort packages alphabetically by mpackage, case-insensitive
  // This is not fixed in stone and might change in the future as we get a better understanding of how to handle this.
  const sortedPackages = packages.slice().sort(
    
    // If we're sorting by 'uploaded' - uploaded is a number (not a string), so we compare the 'uploaded' values mathematically.
    (_sortBy == UploadedPackageSortByOptions.uploaded) 
    ? (a1, b1) => {
      const aUpload = a1.uploaded;
      const bUpload = b1.uploaded;
      return bUpload - aUpload;
    } 
    // otherwise, we sort them alphabetically (case-insensitive) by the appropriate field (as defined by _sortBy)
    : (a2, b2) => {
      const aName = a2[_sortBy]?.toLowerCase() || '';
      const bName = b2[_sortBy]?.toLowerCase() || '';
      return aName.localeCompare(bName);
    }
  );

  if (_reverse){
    sortedPackages.reverse();
  }

  const displayPackages = limit ? sortedPackages.slice(0, limit) : sortedPackages;

  const getPackageCountByAuthor = (authorName: string | null) => {
    if (!authorName || authorName === 'Mudlet Default Package') return 0;
    return packages.filter(pkg => pkg.author === authorName).length;
  };  

  const toggleExpand = (mpackage: string | null) => {
    setExpandedPackage(expandedPackage === mpackage ? null : mpackage);
  };

  const _showLinks = hideLinks ? false : true;

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
                  {_showLinks && (
                    <div className="content-end flex-grow-2">
                      <p className="text-gray-600 text-right">
                        <a href={`#pkg-${encodeURIComponent(pkg.mpackage || '')}`}>link</a>
                      </p>
                    </div>
                  )}
                  
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
