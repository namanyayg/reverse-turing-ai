"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Leaderboard from "@/components/Leaderboard";

export default function Home() {
  const usernameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const username = usernameRef.current?.value.replace("@", "");
    if (!username) {
      return;
    }
    router.push(`/u/${username}`);
  };

  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-orange-600 mb-6">Roast my HackerNews</h1>
          <p className="text-xl text-center mb-2 italic text-gray-600">Is your HN history as good as you think it is?</p>
          <p className="text-xl text-center mb-12 italic text-gray-600">Submit your HN username for a reality check</p>
          <form className="max-w-md mx-auto mb-12" onSubmit={handleSubmit}>
            <div className="flex items-center border-b-2 border-orange-500 py-2">
              <input ref={usernameRef} className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none" type="text" placeholder="Enter your Hackernews username" aria-label="Hackernews username" />
              <button className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-sm border-4 text-white py-1 px-4 rounded" type="submit">
                Roast Me
              </button>
            </div>
          </form>
          <h2 className="text-2xl font-semibold text-orange-600 mb-6">How it works</h2>
          <div className="max-w-3xl w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">Step 1</h3>
              <p className="text-center md:text-left">The AI will fetch your HN profile, recent posts, and comments</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">Step 2</h3>
              <p className="text-center md:text-left">AI analyzes your description, karma, profile, and submissions</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-center">Step 3</h3>
              <p className="text-center md:text-left">AI will prepare your roast and display it on a webpage</p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Roasts Section */}
      <section className="py-20 bg-orange-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-4 text-orange-600">Don&apos;t want to be roasted just yet?</h2>
          <p className="text-xl text-center mb-12">See some roasts below</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { username: "pg", about: "Bug fixer" },
              { username: "patio11", about: "I work for the Internet" },
              { username: "tptacek", about: "Helu! I'm Thomas" }
            ].map((user, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-orange-600">{user.username}</h3>
                <p className="text-gray-600 mb-4">{user.about}</p>
                <Link href={`/u/${user.username}`} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded inline-block">
                  View roast
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Leaderboard />
    </main>
  );
}
