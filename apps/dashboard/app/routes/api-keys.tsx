import { useState } from "react";
import type { Route } from "./+types/api-keys";

// Mock user ID for development
const MOCK_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  keyPrefix: string;
  rateLimit: number;
  allowedDomains: string[];
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface CreateKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  maskedKey: string;
  rateLimit: number;
  allowedDomains: string[];
  permissions: string[];
  createdAt: string;
}

export async function loader() {
  try {
    // Fetch API keys from the API
    const response = await fetch("http://localhost:3000/api/keys", {
      headers: {
        "X-User-ID": MOCK_USER_ID,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch API keys");
    }

    const data = await response.json();
    return { keys: data.keys || [] };
  } catch (error) {
    console.error("Error loading API keys:", error);
    return { keys: [] };
  }
}

export default function ApiKeysPage({ loaderData }: Route.ComponentProps) {
  const [keys, setKeys] = useState<ApiKey[]>(loaderData.keys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000);
  const [newKeyDomains, setNewKeyDomains] = useState("");
  const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      alert("Please enter a key name");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": MOCK_USER_ID,
        },
        body: JSON.stringify({
          name: newKeyName,
          rateLimit: newKeyRateLimit,
          allowedDomains: newKeyDomains
            ? newKeyDomains.split(",").map((d) => d.trim())
            : [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create API key");
      }

      const data = await response.json();
      setCreatedKey(data);
      setShowCreateModal(false);
      setShowKeyModal(true);
      setNewKeyName("");
      setNewKeyDomains("");
      setNewKeyRateLimit(1000);

      // Refresh the keys list
      const keysResponse = await fetch("http://localhost:3000/api/keys", {
        headers: {
          "X-User-ID": MOCK_USER_ID,
        },
      });
      const keysData = await keysResponse.json();
      setKeys(keysData.keys || []);
    } catch (error) {
      console.error("Error creating API key:", error);
      alert("Failed to create API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/keys/${keyId}`, {
        method: "DELETE",
        headers: {
          "X-User-ID": MOCK_USER_ID,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke API key");
      }

      // Refresh the keys list
      const keysResponse = await fetch("http://localhost:3000/api/keys", {
        headers: {
          "X-User-ID": MOCK_USER_ID,
        },
      });
      const keysData = await keysResponse.json();
      setKeys(keysData.keys || []);
      setRevokeConfirm(null);
    } catch (error) {
      console.error("Error revoking API key:", error);
      alert("Failed to revoke API key");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Keys</h1>
          <p className="text-gray-600">
            Manage your API keys for integrating with the x402 VeChain
            Facilitator
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your API Keys</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create New Key
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No API keys yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {key.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {key.maskedKey}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {key.rateLimit}/hour
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleDateString()
                            : "Never"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {key.revokedAt ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Revoked
                          </span>
                        ) : key.isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!key.revokedAt && (
                          <button
                            onClick={() => setRevokeConfirm(key.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Production API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Limit (requests/hour)
                </label>
                <input
                  type="number"
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Domains (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={newKeyDomains}
                  onChange={(e) => setNewKeyDomains(e.target.value)}
                  placeholder="example.com, app.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreateKey}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Key Modal */}
      {showKeyModal && createdKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-green-600">
              ✓ API Key Created Successfully
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                ⚠️ Important: Save this key now!
              </p>
              <p className="text-xs text-yellow-700">
                This is the only time you'll see the full key. Store it securely.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your API Key
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono break-all">
                  {createdKey.key}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {copiedKey ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>
                <strong>Name:</strong> {createdKey.name}
              </p>
              <p>
                <strong>Rate Limit:</strong> {createdKey.rateLimit} requests/hour
              </p>
            </div>
            <button
              onClick={() => {
                setShowKeyModal(false);
                setCreatedKey(null);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-red-600">
              Revoke API Key?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to revoke this API key? This action cannot be
              undone and any applications using this key will stop working.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRevokeKey(revokeConfirm)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isLoading ? "Revoking..." : "Revoke"}
              </button>
              <button
                onClick={() => setRevokeConfirm(null)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
