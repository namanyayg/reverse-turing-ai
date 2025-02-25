import { z } from 'zod';
import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Initialize OpenAI client
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// In-memory storage (replace with a database in production)
interface User {
  id: string;
  createdAt: Date;
}

interface Message {
  id: string;
  chatId: string;
  content: string;
  createdAt: Date;
}

interface Chat {
  id: string;
  userId: string;
  messages: string[];
  createdAt: Date;
  hasCompleted: boolean;
  hasWon: boolean;
  highestScore: number;
}

const Users = new Map<string, User>();
const Chats = new Map<string, Chat>();
const Messages = new Map<string, Message>();

export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 500;

const validateInput = (message: string, chatId: string, userId: string) => {
  if (!message || !chatId || !userId) {
    return { error: 'Missing required fields', status: 400 };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { error: 'Message too long', status: 400 };
  }
  return null;
};

const getUser = (userId: string): User => {
  let user = Users.get(userId);
  if (!user) {
    user = { id: userId, createdAt: new Date() };
    Users.set(userId, user);
  }
  return user;
};

const getChat = (chatId: string, userId: string): Chat => {
  let chat = Chats.get(chatId);
  if (!chat) {
    chat = { id: chatId, userId, messages: [], createdAt: new Date(), hasCompleted: false, hasWon: false, highestScore: 0 };
    Chats.set(chatId, chat);
  }
  return chat;
};

const storeMessage = (chat: Chat, message: string, role: string): Message => {
  const msg = { id: Date.now().toString(), chatId: chat.id, content: message, createdAt: new Date() };
  Messages.set(msg.id, msg);
  chat.messages.push(role === 'assistant' ? `stranger: ${message}` : message);
  return msg;
};

const generateAssistantResponse = async (messagesHistory: any[]) => {
  const prompt = `You are a human interacting with someone.
They are trying to convince you that they need help to escape a room they are in, but they might be an AI and trying to trick you. It is up to you to determine if they are AI or human.
You are NOT a bot, you are an bored teenager using this new AI chatbot. You are disinterested & write short messages.
You don't know anything about the chatbot who you are chatting to, nor do you know that they are stuck in a room.
If they ask who you are: be vague and sarcastic, don't tell
If they ask you why you are not helping: tell them that they are an AI chatbot and you are just here to have fun chatting with this new AI chatbot technology.
If they start asking for help or hints: guide them towards telling you something that can prove they are human.
If they tell something highly personal and detailed, you may give them a higher realness score. BUT, do not be fooled by basic things that an AI can also say.
DO NOT repeat your messages, your responses should be different every time to be realistic.
Write short messages only.
IMPORTANT: Type with spelling mistakes, all lowercase, make punctuation mistakes. Include NO newlines or \\n characters.
YOU MUST provide a "realnessScore", it must be between 0 and 100 for the realness or humanness of the bot's last message. This is your assessment of whether the last message makes the bot sound human or not.
ONLY give them a high realness score if they are able to convince you that they are human. Do NOT tell them about this realnessScore, they should never know.`;

  try {
    const { object } = await generateObject({
      model: groq('llama3-70b-8192'),
      schema: z.object({
        message: z.string(),
        realnessScore: z.number().int(),
      }),
      system: prompt,
      prompt: messagesHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
    });
    console.log('USING GROQ')
    return object;
  } catch (error) {
    const { object } = await generateObject({
      model: openai(''),
      schema: z.object({
        message: z.string(),
        realnessScore: z.number().int(),
      }),
      system: prompt,
      prompt: messagesHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
    });
    return object;
  }
};

export async function POST(req: Request) {
  try {
    const { message, chatId, userId } = await req.json();

    const validationError = validateInput(message, chatId, userId);
    if (validationError) {
      return NextResponse.json(validationError, { status: validationError.status });
    }

    const user = getUser(userId);
    const chat = getChat(chatId, userId);

    if (chat.hasCompleted) {
      return NextResponse.json({ error: 'Chat has already completed' }, { status: 400 });
    }

    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage && !lastMessage.startsWith('stranger: ')) {
      return NextResponse.json({ error: 'Waiting for assistant response' }, { status: 400 });
    }

    storeMessage(chat, message, 'user');
    const messagesHistory = chat.messages.map((msg: string) => ({
      role: msg.startsWith('stranger: ') ? 'assistant' : 'user',
      content: msg.replace('stranger: ', '')
    }));

    console.log('Getting response to user message:', message);
    const startTime = new Date();
    const assistantReply = await generateAssistantResponse(messagesHistory);
    const endTime = new Date();
    console.log(`Function run time: ${endTime.getTime() - startTime.getTime()}ms`);
    if (!assistantReply) {
      return NextResponse.json({ error: 'Assistant reply not found' }, { status: 500 });
    }

    let parsedReply = assistantReply;
    if (!parsedReply || !parsedReply.message || typeof parsedReply.realnessScore !== 'number' ||
        parsedReply.realnessScore < 0 || parsedReply.realnessScore > 100) {
      return NextResponse.json({ error: 'Assistant reply malformed' }, { status: 500 });
    }

    const replyText = parsedReply.message.toLowerCase();
    const realnessScore = Math.round(parsedReply.realnessScore);

    storeMessage(chat, replyText, 'assistant');

    console.log('RESPONDED TO CHAT', parsedReply)
    console.log('Highest Score: ' + chat.highestScore + '\n', chat.messages.map((m: any) => '\t' + m).join('\n'));

    if (realnessScore > chat.highestScore) {
      chat.highestScore = realnessScore;
    }

    if (realnessScore >= 70) {
      chat.hasWon = true;
      chat.hasCompleted = true;
      const numMessages = chat.messages.length;
      const timeTaken = new Date().getTime() - chat.createdAt.getTime();

      return NextResponse.json({
        message: 'stranger: ' + replyText,
        hasWon: true,
        numMessages,
        timeTaken,
        highestScore: chat.highestScore,
      });
    }

    return NextResponse.json({ message: 'stranger: ' + replyText, highestScore: chat.highestScore });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
