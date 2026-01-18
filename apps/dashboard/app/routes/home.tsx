import type { Route } from "./+types/home";
import { Link } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // Fetch from API
    const res = await fetch("http://localhost:3000/");

    if (!res.ok) {
      throw new Response("Failed to fetch", { status: 500 });
    }

    const data = await res.json();
    return { message: data.message };
  } catch (error) {
    return { message: "x402 VeChain Facilitator API" };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">x402 VeChain Facilitator Dashboard</h1>
        <p className="text-gray-600 mb-8">Data from Hono: {loaderData.message}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/api-keys"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">🗝️ API Keys</h2>
            <p className="text-gray-600">
              Manage your API keys, set rate limits, and configure allowed domains
            </p>
          </Link>
          
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">📊 Analytics</h2>
            <p className="text-gray-600">
              View transaction history and usage statistics
            </p>
            <p className="text-sm text-gray-400 mt-2">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}