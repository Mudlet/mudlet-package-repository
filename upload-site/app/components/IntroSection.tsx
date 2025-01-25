export function IntroSection() {
  return (
    <div className="max-w-3xl mb-12">
      <h1 className="text-4xl font-bold mb-8">Mudlet packages</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What is this?</h2>
        <p className="mb-4">
          <code>mpkg</code> is an additional package manager for <a href="https://www.mudlet.org/">Mudlet</a> which allows you to install, remove, update and search for packages in this website. 
          Packages like game interfaces, mappers, tutorials and helpful functions, all created by Mudlet users can now be found in one place - <a href="packages">here</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Installation</h2>
        <p className="mb-4">To access this website from within Mudlet, copy/paste the following to your command line:</p>
        <pre className="bg-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <code>lua installPackage("https://github.com/Mudlet/mudlet-package-repository/raw/refs/heads/main/packages/mpkg.mpackage")</code>
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Further help</h2>
        <p className="mb-4">Once installed access the help via:</p>
        <pre className="bg-gray-100 p-4 rounded-lg mb-4">
          <code>mpkg help</code>
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Share your creations 🌟</h2>
        <p className="mb-4">
          Created something cool for Mudlet? Share it with <a href="https://stats.mudlet.org">thousands of players</a>!
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Get automatic updates for your package</li>
          <li>Reach users through this website</li>
          <li>Or through the quick <code>mpkg install</code> commands</li>
          <li>Join our growing collection of Mudlet community tools</li>
        </ul>
        <p className="mb-4">
          Upload your package <a href="upload">right here</a> to get started.
        </p>
      </section>

    </div>
  );
}
