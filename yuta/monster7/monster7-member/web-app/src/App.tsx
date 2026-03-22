const isStaging = import.meta.env.VITE_ENV === "staging";

function StagingBanner() {
  if (!isStaging) return null;
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-center text-sm font-bold py-1 z-50">
      STAGING ENVIRONMENT
    </div>
  );
}

function App() {
  return (
    <>
      <StagingBanner />
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isStaging ? "pt-8" : ""}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Monster7 Member System
          </h1>
          <p className="text-gray-600">
            Cloudflare Full-Stack — Pages + Workers + D1 + R2
          </p>
        </div>
      </div>
    </>
  );
}

export default App;
