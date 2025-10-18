export default function TestLayout() {
  return (
    <>
      {/* Parent wrap-around - RED */}
      <div className="min-h-screen bg-red-500 p-3 md:p-4 gap-3 md:gap-4 flex flex-col md:flex-row md:items-stretch">
        
        {/* Sidebar - stays in wrap-around */}
        <div className="hidden md:block w-64 bg-red-600 rounded-lg p-4">
          <div className="text-white font-bold">Sidebar (Red)</div>
        </div>

        {/* Content area - the "toad in the hole" - BLUE */}
        <div className="flex-1 bg-blue-500 rounded-lg border-4 border-blue-600 flex items-center justify-center min-h-0 md:min-h-screen">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Floating Content Window</h1>
            <p className="text-lg mb-2">Parent (Red) = wrap-around with padding</p>
            <p className="text-lg">Child (Blue) = content floating inside</p>
          </div>
        </div>
      </div>
    </>
  );
}
