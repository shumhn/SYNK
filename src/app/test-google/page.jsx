"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";

export default function TestGooglePage() {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadProviders() {
      try {
        const providers = await getProviders();
        setProviders(providers);
        console.log("Providers:", providers);
      } catch (error) {
        console.error("Failed to load providers:", error);
      }
    }
    loadProviders();
  }, []);

  async function testSignIn() {
    setLoading(true);
    setResult(null);
    try {
      console.log("Testing signIn...");
      
      // Test 1: Check if signIn exists
      console.log("signIn function:", typeof signIn);
      
      // Test 2: Try signIn with redirect: false
      const signInResult = await signIn("google", { 
        redirect: false,
        callbackUrl: "/admin/users"
      });
      
      console.log("signIn result:", signInResult);
      setResult(signInResult);
      
    } catch (error) {
      console.error("signIn error:", error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function testDirectRedirect() {
    try {
      console.log("Testing direct redirect...");
      // This should trigger the OAuth flow
      await signIn("google", {
        callbackUrl: "/admin/users",
        redirect: true
      });
    } catch (error) {
      console.error("Direct redirect error:", error);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFC] p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Google OAuth Test Page</h1>
        
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Available Providers</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(providers, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Test signIn (redirect: false)</h2>
          <button
            onClick={testSignIn}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test signIn"}
          </button>
          
          {result && (
            <pre className="mt-4 bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Test Direct Redirect</h2>
          <button
            onClick={testDirectRedirect}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Direct Redirect (should open Google)
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Manual URL Test</h2>
          <a 
            href="/api/auth/signin/google" 
            className="text-blue-600 underline hover:text-blue-800"
          >
            Click here to test direct OAuth URL
          </a>
        </div>
      </div>
    </div>
  );
}
