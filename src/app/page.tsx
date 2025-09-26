'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    // No security logic, just redirect
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-8 text-center text-4xl font-bold">Welcome Back</h1>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-gray-400" htmlFor="email">
            Email
          </label>
          <input
            className="focus:shadow-outline w-full appearance-none rounded-lg border border-gray-700 bg-gray-700 px-3 py-2 leading-tight text-gray-200 shadow-inner focus:outline-none"
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-400" htmlFor="password">
            Password
          </label>
          <input
            className="focus:shadow-outline mb-3 w-full appearance-none rounded-lg border border-gray-700 bg-gray-700 px-3 py-2 leading-tight text-gray-200 shadow-inner focus:outline-none"
            id="password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="focus:shadow-outline w-full rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white transition-colors hover:bg-indigo-700 focus:outline-none"
            type="button"
            onClick={handleLogin}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;