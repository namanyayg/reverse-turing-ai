"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import localforage from 'localforage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';

interface AppState {
  messages: string[];
  input: string;
  isWaiting: boolean;
  animatingMessage: string;
  chatId: string;
  showWinDialog: boolean;
  showLoseDialog: boolean;
  winStats: { numMessages: number; timeTaken: number };
  highestScore: number;
  username: string;
  timeRemaining: number;
  timerStarted: boolean;
  gameOver: boolean;
}

function useChat() {
  const [state, setState] = useState<AppState>({
    messages: [],
    input: "",
    isWaiting: false,
    animatingMessage: "",
    chatId: "",
    showWinDialog: false,
    showLoseDialog: false,
    winStats: { numMessages: 0, timeTaken: 0 },
    highestScore: 0,
    username: "",
    timeRemaining: 120,
    timerStarted: false,
    gameOver: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeStorage = async () => {
      if (!(await localforage.getItem('userId'))) {
        await localforage.setItem('userId', Math.random().toString(36).slice(2, 11));
      }
      setState(prev => ({ ...prev, chatId: Math.random().toString(36).slice(2, 11) }));
    };
    initializeStorage();

    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state.timerStarted && state.timeRemaining > 0) {
      timer = setInterval(() => {
        setState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
      }, 1000);
    } else if (state.timeRemaining === 0) {
      setState(prev => ({
        ...prev,
        isWaiting: true,
        showLoseDialog: true,
        timerStarted: false,
        gameOver: true,
      }));
    }
    return () => clearInterval(timer);
  }, [state.timerStarted, state.timeRemaining]);

  const animateMessage = (message: string) => {
    const prefix = "stranger: ";
    const content = message.slice(prefix.length);
    let i = 0;
    const interval = setInterval(() => {
      if (i <= content.length) {
        setState(prev => ({ ...prev, animatingMessage: prefix + content.slice(0, i) }));
        i++;
      } else {
        clearInterval(interval);
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message],
          animatingMessage: "",
        }));
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, 5);
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.input.trim() === "" || state.isWaiting || state.timeRemaining === 0) return;

    if (!state.timerStarted) {
      setState(prev => ({ ...prev, timerStarted: true }));
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, `You: ${prev.input}`],
      input: "",
      isWaiting: true,
    }));

    try {
      const userId = await localforage.getItem('userId');
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: state.input, userId, chatId: state.chatId }),
      });
      const data = await response.json();
      if (!data.message || !data.message.includes("stranger: ")) {
        throw new Error("Invalid message");
      }
      animateMessage(data.message);
      setState(prev => ({ ...prev, highestScore: data.highestScore }));
      if (data.hasWon) {
        setState(prev => ({
          ...prev,
          winStats: { numMessages: data.numMessages, timeTaken: data.timeTaken },
          showWinDialog: true,
          gameOver: true,
        }));
      }
    } catch (error) {
      console.error("Error:", error);
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, "system: An error occurred. Please try again later."],
      }));
    } finally {
      setState(prev => ({ ...prev, isWaiting: false }));
    }
  };

  const handleUsernameSubmit = async () => {
    if (state.username.trim() === "") return;
    const userId = await localforage.getItem('userId');
    await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: state.username, userId, chatId: state.chatId }),
    });
    router.push('/leaderboard');
  };

  return {
    state,
    setState,
    inputRef,
    sendMessage,
    handleUsernameSubmit,
  };
}

function Sharers({ win, numMessages, timeTaken, highestScore }: { win: boolean, numMessages: number, timeTaken: number, highestScore: number }) {
  const shareText = win
    ? `I won the Reverse Turing Test in ${numMessages} messages and ${Math.round(timeTaken / 1000)} seconds with a score of ${highestScore}! Can you beat my score? https://reverse-turing.nmn.gl/`
    : `I played the Reverse Turing Test and got a score of ${highestScore} in ${numMessages} messages. Can you do better? https://reverse-turing.nmn.gl/`;

  const shareToTwitter = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareWithWebAPI = async () => {
    try {
      const canvas = await html2canvas(document.querySelector(`.${styles.terminal}`) as HTMLElement);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
      if (blob) {
        const files = [new File([blob], 'chat.png', { type: blob.type })];
        await navigator.share({
          title: 'The Reverse Turing Test',
          text: shareText,
          files,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    // @ts-ignore
    <>{navigator.share ? (
        <Button onClick={shareWithWebAPI}>Share</Button>
      ) : (
        <Button onClick={shareToTwitter}>Share to X</Button>
      )}
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    state,
    setState,
    inputRef,
    sendMessage,
    handleUsernameSubmit,
  } = useChat();

  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [introDialogOpen, setIntroDialogOpen] = useState(true);

  const handleTerminalClick = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getTimerColor = () => {
    if (state.timeRemaining <= 30) return 'red';
    if (state.timeRemaining <= 60) return 'yellow';
    return 'white';
  };

  return (
    <>
      <nav className={styles.menu}>
        <a href="#" className={styles.menuItem} onClick={() => setAboutDialogOpen(true)}>About</a>
        <a href="#" className={styles.menuItem}>Leaderboard (soon)</a>
      </nav>
      <main className={styles.terminal} onClick={handleTerminalClick}>
        <div className={`${styles.screen} ${styles.crt} text-sm md:text-lg`}>
          <div className={styles.content}>
            <div className={styles.contentContainer}>
              {state.messages.map((msg, index) => (
                <p key={index}>{msg}</p>
              ))}
              {state.animatingMessage && <p>{state.animatingMessage}</p>}
            </div>
          </div>
          {state.gameOver ? (
            <div className={`${styles.inputLine} flex justify-between`}>
              <div className="flex flex-col items-center mr-4">
                <span className="uppercase text-sm">Score</span>
                <span className="text-2xl">{state.highestScore}</span>
              </div>
              <div>
                <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>Retry</Button>
                <Sharers win={state.winStats.numMessages > 0} numMessages={state.messages.length} timeTaken={state.winStats.timeTaken} highestScore={state.highestScore} />
              </div>
            </div>
          ) : (
            <form onSubmit={sendMessage} className={styles.inputLine}>
              <span>You: </span>
              <input
                type="text"
                value={state.input}
                onChange={(e) => setState(prev => ({ ...prev, input: e.target.value }))}
                disabled={state.isWaiting || state.timeRemaining === 0}
                className={styles.input}
                ref={inputRef}
              />
            </form>
          )}
        </div>
        {state.timerStarted && (
          <div className={styles.timer} style={{ color: getTimerColor() }}>
            <span>Time Left: </span>{formatTime(state.timeRemaining)}
          </div>
        )}
      </main>
      <Dialog open={state.showWinDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showWinDialog: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Congratulations! You&apos;ve won!</DialogTitle>
            <DialogDescription>
              You convinced the AI in {state.winStats.numMessages / 2} messages and {Math.round(state.winStats.timeTaken / 1000)} seconds.
              <div className="flex flex-col items-center my-4">
              <span>Score</span>
              <br />
              <span className="text-2xl">{state.highestScore}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Sharers win={true} numMessages={state.winStats.numMessages} timeTaken={state.winStats.timeTaken} highestScore={state.highestScore} />
            <Button variant="ghost" onClick={() => window.location.reload()}>Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={state.showLoseDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showLoseDialog: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Over</DialogTitle>
            <DialogDescription>
              You ran out of time after sending {state.messages.length / 2} messages.
              <div className="flex flex-col items-center my-4">
                <span className="uppercase">Score</span>
                <br />
                <span className="text-3xl">{state.highestScore}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Sharers win={false} numMessages={state.messages.length} timeTaken={state.winStats.timeTaken} highestScore={state.highestScore} />
            <Button variant="ghost" onClick={() => window.location.reload()}>Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About</DialogTitle>
            <DialogDescription>
              &ldquo;The Test&rdquo; is an interactive AI-based game to question what does it mean to be &ldquo;human&rdquo;.<br /><br />
              As the clock runs out, what will you say to convince the AI of your humanity?<br /><br />
              Made with love by <a className="text-green-500 hover:underline" target="_blank" rel="noopener noreferrer" href="https://x.com/NamanyayG">Namanyay</a>.<br /><br />I keep playing with AI & I would love to <a className="text-green-500 hover:underline" target="_blank" rel="noopener noreferrer"  href="https://x.com/NamanyayG">earn your follow on Twitter</a> if you liked this.<br /><br/>
              <hr></hr><br/>
              Inspired by Sam Hughes&apos; story <a className="text-green-500 hover:underline" target="_blank" rel="noopener noreferrer" href="https://qntm.org/difference">&ldquo;The Difference&rdquo;</a>.<br/><br/>
              CRT CSS effects by <a className="text-green-500 hover:underline" target="_blank" rel="noopener noreferrer" href="http://aleclownes.com/2017/02/01/crt-display.html">Alec Lownes</a>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAboutDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={introDialogOpen} onOpenChange={setIntroDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>The Test</DialogTitle>
            <DialogDescription>
              <p className="my-4"><b>You awaken, alone, in a dark empty room.</b></p>
              <p className="mb-4">The only thing you see is an old computer terminal, with what seems like a chat window.</p>
              <p className="mb-4"><b>Ask for help and escape, before time runs out.</b></p>
              <p className="mb-4">They think that you are an AI.</p>
              <p className="mb-4"><b>Can you convince them you are human?</b></p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIntroDialogOpen(false)}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
