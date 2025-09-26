'use client';

import React, { useState, useEffect } from 'react';
import { getAnalyticsSummary } from '@/services/video-service';
import { IAnalyticsSummary } from '@/types';

const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<IAnalyticsSummary | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const summaryData = await getAnalyticsSummary();
      setSummary(summaryData);
    };

    fetchSummary();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Pending Videos (24h)</h2>
          <p className="text-3xl">{summary?.pendingLast24hCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Approved Videos (24h)</h2>
          <p className="text-3xl">{summary?.approvedCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Rejected Videos (24h)</h2>
          <p className="text-3xl">{summary?.rejectedCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;