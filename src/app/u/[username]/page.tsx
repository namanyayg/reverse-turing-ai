import { Metadata } from 'next';
import Link from 'next/link';
import Roast from '@/components/Roast';

interface UserData {
  username: string;
  karma: number;
  about: string | null;
  created: Date;
}

async function getUserData(username: string): Promise<UserData | null> {
  const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : 'https://roastmyhn.nmn.gl';
  try {
    const response = await fetch(`${baseUrl}/api/r0ast-me-now/${username}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    const data = await response.json();
    if (!data) {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const userData = await getUserData(params.username.toLowerCase());
  if (!userData) return { title: 'User Not Found' };

  return {
    title: `Roast of ${userData.username} - Roast My HackerNews`,
    description: `Check out the roast of ${userData.username}, a HackerNews user with ${userData.karma} karma.`,
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default async function UserRoast({ params }: { params: { username: string } }) {
  const userData = await getUserData(params.username.toLowerCase());

  if (!userData) {
    return <div className="bg-white text-center text-gray-500 p-8">User not found</div>;
  }

  return (
    <main className="bg-white text-gray-800 p-8 pb-8">
      <div className="flex justify-center mb-8">
        <Link href="/" className="bg-white hover:bg-orange-100 text-orange-500 font-bold py-2 px-4 rounded border border-orange-500">&larr; Back to Home</Link>
      </div>
      <section className="max-w-4xl mx-auto mb-8">
        <div className="text-center">
          <h1 className="text-sm text-gray-500 font-serif uppercase tracking-widest mb-2">THE ROAST OF</h1>
          <h2 className="text-3xl font-bold mb-4">{userData.username}</h2>
          <p className="text-sm text-gray-600 mb-2">Joined: {new Date(userData.created).toLocaleDateString()}</p>
          <p className="text-sm text-gray-600 mb-2">{userData.karma} karma</p>
          <div className="text-gray-600 mb-2" dangerouslySetInnerHTML={{ __html: userData.about || '' }} />
          <Link href={`https://news.ycombinator.com/user?id=${userData.username}`} className="text-gray-500 hover:text-gray-700" target="_blank" rel="noopener noreferrer">
            View profile on HackerNews &rarr;
          </Link>
        </div>
      </section>
      <Roast username={userData.username} />
      <div className="flex justify-center">
        <Link href="/" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">&larr; Back to Home</Link>
      </div>
    </main>
  );
}
