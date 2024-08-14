
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import Leaderboard from "@/components/Leaderboard";

interface UserData {
  username: string
  karma: number
  about: string
  created: string
  roastText?: string
  strengthsText?: string
  weaknessesText?: string
}

const fetchAndPollData = async (username: string, setUserData: (data: UserData) => void, setIsLoading: (isLoading: boolean) => void) => {
    const fetchUserData = async (retryCount = 0) => {
      try {
        let opts = {}
        if (retryCount > 2) {
          opts = { next: { revalidate: 1 } }
        }
        const response = await fetch(`/api/r0ast-me-now/${username}`, opts);
        const data = await response.json();
        setUserData(data);
        if (!data.roastText || !data.strengthsText || !data.weaknessesText) {
          if (retryCount < 8) {
            setTimeout(() => fetchUserData(retryCount + 1), 6000);
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }

const ShareButton = ({ text, color, elementId }: { text: string; color: 'green' | 'red'; elementId: string }) => {
  const generateImage = async () => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    // Temporarily hide the share buttons
    const shareButtons = element.querySelectorAll('button');
    shareButtons.forEach(button => button.style.display = 'none');

    // Add credit byline
    const creditLine = document.createElement('p');
    creditLine.textContent = 'Roasted by https://roastmyhn.nmn.gl/';
    creditLine.style.fontSize = '12px';
    creditLine.style.textAlign = 'center';
    creditLine.style.marginTop = '10px';
    element.appendChild(creditLine);

    const canvas = await html2canvas(element);

    // Restore the share buttons visibility
    shareButtons.forEach(button => button.style.display = '');

    // Remove the credit line after capturing
    element.removeChild(creditLine);

    return canvas.toDataURL('image/png');
  };
  const handleTwitterShare = () => {
    const content = document.getElementById(elementId)?.querySelector('p')?.textContent;
    const trimmedContent = content ? content.split(/\s+/).reduce((acc, word) => {
      if (acc.length + word.length + 1 <= 140) return acc + ' ' + word;
      return acc;
    }, '').trim() + '...' : '';
    const twitterText = `${text}\n\n"${trimmedContent}"`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleWebShare = async () => {
    const imageUrl = await generateImage();
    if (imageUrl && navigator.share) {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'roast.png', { type: 'image/png' });
      try {
        await navigator.share({
          title: 'Roast My HackerNews',
          text: text,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <div className="flex justify-center mt-4 space-x-4">
      <button
        className={`${color === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-bold py-2 px-4 rounded`}
        onClick={handleTwitterShare}
      >
        Share on X
      </button>
      {/* @ts-ignore */}
      {typeof navigator !== 'undefined' && navigator.share && (
        <button
          className={`${color === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-bold py-2 px-4 rounded`}
          onClick={handleWebShare}
        >
          Share
        </button>
      )}
    </div>
  );
};

const Loader = ({ color }: { color: 'green' | 'red' }) => {
  const loadingTexts = useMemo(() => [
    "Pulling up your profile",
    "Analyzing weaknesses",
    "Drafting roast",
    "Sharpening wit",
    "Brewing sarcasm",
  ], []);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % loadingTexts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [loadingTexts]);

  return (
    <div className="flex flex-col items-center justify-center h-96">
      <div className={`animate-spin rounded-full h-16 w-16 border-4 border-t-transparent ${color === 'green' ? 'border-green-500' : 'border-red-500'}`}></div>
      <p className={`mt-8 text-xl ${color === 'green' ? 'text-green-600' : 'text-red-600'}`}>{loadingTexts[currentTextIndex]}...</p>
    </div>
  );
};

export default function RoastClientSide({ username }: { username: string }) {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  username = username.toLowerCase();

  useEffect(() => {
    fetchAndPollData(username, setUserData, setIsLoading);
  }, [username]);

  if (isLoading || !userData) {
    return <Loader color="red" />;
  }

  return (
    <>
      {userData.roastText ? (
        <div id="roast-content" className="bg-red-50 border border-red-300 text-red-900 p-6 rounded relative mb-8 max-w-[60em] mx-auto">
          <div className="[&>p]:mb-4 text-lg" dangerouslySetInnerHTML={{ __html: userData.roastText }} />
          <ShareButton text={`The roast of ${userData.username} from HackerNews (https://roastmyhn.nmn.gl/u/${userData.username})`} color="red" elementId="roast-content" />
        </div>
      ) : (
        <Loader color="red" />
      )}
      <div className="flex flex-wrap -mx-4">
        <div className="w-full md:w-1/2 px-4 mb-4">
          <div id="strengths-content" className="bg-green-50 border border-green-300 text-green-800 p-6 rounded relative h-full flex flex-col max-w-[60em] mx-auto">
            <h3 className="font-serif text-2xl mb-2">Strengths</h3>
            {userData.strengthsText ? (
              <>
                <div className="[&>p]:mb-4 flex-grow text-lg" dangerouslySetInnerHTML={{ __html: userData.strengthsText }} />
                <ShareButton text={`The strengths of ${userData.username} from HackerNews (https://roastmyhn.nmn.gl/u/${userData.username})`} color="green" elementId="strengths-content" />
              </>
            ) : (
              <Loader color="green" />
            )}
          </div>
        </div>
        <div className="w-full md:w-1/2 px-4 mb-4">
          <div id="weaknesses-content" className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded relative h-full flex flex-col max-w-[60em] mx-auto">
            <h3 className="font-serif text-2xl mb-2">Weaknesses</h3>
            {userData.weaknessesText ? (
              <>
                <div className="[&>p]:mb-4 flex-grow text-lg" dangerouslySetInnerHTML={{ __html: userData.weaknessesText }} />
                <ShareButton text={`The weaknesses of ${userData.username} from HackerNews (https://roastmyhn.nmn.gl/u/${userData.username})`} color="red" elementId="weaknesses-content" />
              </>
            ) : (
              <Loader color="red" />
            )}
          </div>
        </div>
      </div>

      <section className="max-w-4xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-center mb-6">Enjoyed this? Do another roast:</h2>
        <form className="max-w-md mx-auto" onSubmit={(e) => {
          e.preventDefault();
          const username = (e.target as HTMLFormElement).username.value.replace("@", "");
          if (username) {
            router.push(`/u/${username}`);
          }
        }}>
          <div className="flex items-center border-b-2 border-orange-500 py-2">
            <input
              className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
              type="text"
              placeholder="Enter another Hackernews username"
              aria-label="Hackernews username"
              name="username"
            />
            <button
              className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-sm border-4 text-white py-1 px-4 rounded"
              type="submit"
            >
              Roast Again
            </button>
          </div>
        </form>
      </section>

      <Leaderboard />
    </>
  );
}
