export function IntroSection() {
  return (
    <div className="max-w-3xl mb-12">
      <h1 className="text-4xl font-bold mb-8">Mudlet Package Repository</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What is this?</h2>
        <p className="mb-4">
          mpkg is a command line package manager for Mudlet which allows you to install, remove, update and search for packages in this repository. 
          Packages like mappers, GUI's, tutorials and helpful functions, all created by Mudlet users. Think of it as a software manager for Mudlet.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Installation</h2>
        <p className="mb-4">To access this repository from within Mudlet, copy/paste the following to your command line:</p>
        <pre className="bg-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <code>lua installPackage("https://mudlet.github.io/mudlet-package-repository/packages/mpkg.mpackage")</code>
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Further help</h2>
        <p className="mb-4">Once installed access the help via:</p>
        <pre className="bg-gray-100 p-4 rounded-lg mb-4">
          <code>mpkg help</code>
        </pre>
      </section>

    </div>
  );
}
