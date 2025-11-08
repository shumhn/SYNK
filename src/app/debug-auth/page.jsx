"use client";

import { useSession, signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";

export default function DebugAuthPage() {
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    async function loadProviders() {
      const providers = await getProviders();
      setProviders(providers);
    }
    
    async function loadConfig() {
      try {
        const res = await fetch("/api/auth/test-config");
        const config = await res.json();
        setConfig(config);
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    }
    
    loadProviders();
    loadConfig();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFC] p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Auth Debug Page</h1>
        
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Session Status</h2>
          <p>Status: {status}</p>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Environment Config</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Available Providers</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(providers, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Test Google Sign-in</h2>
          <button
            onClick={() => signIn("google")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Google Sign-in
          </button>
        </div>
      </div>
    </div>
  );
}
