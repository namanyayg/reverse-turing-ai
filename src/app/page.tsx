"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import localforage from 'localforage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';

interface AppState {
  messages: string[];
  input: string;
  isWaiting: boolean;
  animatingMessage: string;
  chatId: string;
  showWinDialog: boolean;
  winStats: { numMessages: number; timeTaken: number };
  username: string;
}

function useChat() {
  const [state, setState] = useState<AppState>({
    messages: [],
    input: "",
    isWaiting: false,
    animatingMessage: "",
    chatId: "",
    showWinDialog: false,
    winStats: { numMessages: 0, timeTaken: 0 },
    username: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

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
      }
    }, 50);
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.input.trim() === "" || state.isWaiting) return;

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
      if (data.hasWon) {
        setState(prev => ({
          ...prev,
          winStats: { numMessages: data.numMessages, timeTaken: data.timeTaken },
          showWinDialog: true,
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
    messagesEndRef,
    inputRef,
    sendMessage,
    handleUsernameSubmit,
  };
}

export default function Home() {
  const {
    state,
    setState,
    messagesEndRef,
    inputRef,
    sendMessage,
    handleUsernameSubmit,
  } = useChat();

  const handleTerminalClick = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  return (
    <>
      <nav className={styles.menu}>
        <a href="/about" className={styles.menuItem}>About</a>
        <a href="/leaderboard" className={styles.menuItem}>Leaderboard</a>
      </nav>
      <main className={styles.terminal} onClick={handleTerminalClick}>
        <div className={styles.screen}>
          <div className={styles.content}>
            <p>
              <b>You awaken in a dark room.</b><br />
              In front of you is an old computer terminal, with what seems like a chat window.<br />
              Convince them to help you escape the room.<br />
              <b>Hurry, before the time runs out</b>
            </p>
            {state.messages.map((msg, index) => (
              <p key={index}>{msg}</p>
            ))}
            {state.animatingMessage && <p>{state.animatingMessage}</p>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className={styles.inputLine}>
            <span>You: </span>
            <input
              type="text"
              value={state.input}
              onChange={(e) => setState(prev => ({ ...prev, input: e.target.value }))}
              disabled={state.isWaiting}
              className={styles.input}
              ref={inputRef}
            />
          </form>
        </div>
      </main>
      <Dialog open={state.showWinDialog} onOpenChange={(open) => setState(prev => ({ ...prev, showWinDialog: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Congratulations! You&apos;ve won!</DialogTitle>
            <DialogDescription>
              You convinced the AI in {state.winStats.numMessages} messages and {Math.round(state.winStats.timeTaken / 1000)} seconds.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Enter your username for the leaderboard"
            value={state.username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setState(prev => ({ ...prev, username: e.target.value }))}
          />
          <DialogFooter>
            <Button onClick={handleUsernameSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
