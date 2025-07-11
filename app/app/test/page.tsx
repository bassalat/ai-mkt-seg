export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-500 p-8">
      <h1 className="text-4xl font-bold text-white mb-4">Tailwind Test</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-gray-800">If you can see this with blue background and white card, Tailwind is working!</p>
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Test Button
        </button>
      </div>
    </div>
  );
}