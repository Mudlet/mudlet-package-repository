import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Descriptions come from the uploader's mfile, and the links in them point at
 * repositories, MUD sites and screenshots - somewhere other than here. They
 * open in a new tab so following one does not throw away the package page the
 * reader was on; in-page anchors stay in this tab, since a new tab for them
 * would just be a duplicate of the page.
 *
 * GFM is on for the autolink literals: plenty of descriptions write a bare URL
 * rather than a markdown link, and those were rendering as unclickable text.
 */
export function PackageDescription({ children }: { children: string }) {
  return (
    <ReactMarkdown
      className="prose-package"
      remarkPlugins={[remarkGfm]}
      components={{
        a({ node, href, ...props }) {
          const external = /^https?:\/\//i.test(href ?? '')
          return (
            <a
              href={href}
              {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
              {...props}
            />
          )
        },
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
