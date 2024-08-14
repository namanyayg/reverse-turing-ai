"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  id: string;
  username: string;
  karma: number;
  createdAt: string;
}

interface LeaderboardData {
  recent: LeaderboardEntry[];
  top: LeaderboardEntry[];
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard', { next: { revalidate: 60 } });
        const data = await response.json();
        setLeaderboardData(data);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-orange-500"></div>
        </div>
      </section>
    );
  }

  if (!leaderboardData || (leaderboardData?.recent?.length === 0 && leaderboardData?.top?.length === 0)) {
    return null;
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-semibold text-center mb-12 text-orange-600">Roast Leaderboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        {leaderboardData?.recent?.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold mb-4 text-orange-500">Recent Roasts</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-orange-200">
                  <th className="text-left py-2">Username</th>
                  <th className="text-right py-2">Karma</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData?.recent?.map((entry) => (
                  <tr key={`recent-${entry.username}`} className="border-b border-orange-100">
                    <td className="py-2">
                      <Link href={`/u/${entry.username}`} className="hover:text-orange-500 transition-colors">
                        {entry.username}
                      </Link>
                    </td>
                    <td className="text-right py-2">{entry.karma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {leaderboardData?.top?.length > 0 && (
          <div>
            <h3 className="text-2xl font-semibold mb-4 text-orange-500">Highest Karma</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-orange-200">
                  <th className="text-left py-2">Username</th>
                  <th className="text-right py-2">Karma</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData?.top?.map((entry) => (
                  <tr key={`top-${entry.username}`} className="border-b border-orange-100">
                    <td className="py-2">
                      <Link href={`/u/${entry.username}`} className="hover:text-orange-500 transition-colors">
                        {entry.username}
                      </Link>
                    </td>
                    <td className="text-right py-2">{entry.karma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}