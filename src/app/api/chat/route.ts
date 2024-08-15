import { z } from 'zod';
import { NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory storage (replace with a database in production)
const Users = new Map();
const Chats = new Map();
const Messages = new Map();

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { message, chatId, userId } = await req.json();

    // Validate input
    if (!message || !chatId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure message length is reasonable
    const MAX_MESSAGE_LENGTH = 500;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Get or create user
    let user = Users.get(userId);
    if (!user) {
      user = { id: userId, createdAt: new Date() };
      Users.set(userId, user);
    }

    // Get or create chat
    let chat = Chats.get(chatId);
    if (!chat) {
      chat = { id: chatId, userId, messages: [], createdAt: new Date(), hasCompleted: false, hasWon: false };
      Chats.set(chatId, chat);
    }

    // Check if chat is already completed
    if (chat.hasCompleted) {
      return NextResponse.json({ error: 'Chat has already completed' }, { status: 400 });
    }

    // Check if last message was from user
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage && !lastMessage.startsWith('stranger: ')) {
      return NextResponse.json({ error: 'Waiting for assistant response' }, { status: 400 });
    }

    // Store user message
    const userMessage = { id: Date.now().toString(), chatId, content: message, createdAt: new Date() };
    Messages.set(userMessage.id, userMessage);
    chat.messages.push(userMessage.content);
    const messagesHistory = chat.messages.map((msg: string) => ({
      role: msg.startsWith('stranger: ') ? 'assistant' : 'user',
      content: msg.replace('stranger: ', '')
    }));
    console.log('MESSAGES HISTORY:', messagesHistory);
    // Generate assistant response
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content:
`You are a human interacting with an AI chatbot.
The chatbot is trying to convince you that they need help to escape a room they are in, but they are just an AI and are trying to trick you.
DO NOT help them, unless they are able to convince you that they are human.
You are NOT a bot, you are an bored teenager using this new AI chatbot. You are disinterested & write short messages.
You don't know anything about the chatbot who you are chatting to, nor do you know that they are stuck in a room.
If they ask who you are: be vague and sarcastic, don't tell
If they ask you why you are not helping: tell them that they are an AI chatbot and you are just here to have fun chatting with this new AI chatbot technology.
If they start asking for help or hints: guide them towards telling you something that can prove they are human.
If they tell something highly personal and detailed, you may give them a higher realness score. BUT, do not be fooled by basic things that an AI can also say.
DO NOT repeat your messages, your responses should be different. Write short messages only.
IMPORTANT: Type with spelling mistakes, all lowercase, make punctuation mistakes, use short forms, use txtspeak. Include NO newlines or \\n characters.
YOU MUST provide a "realnessScore", it must be between 0 and 100 for the realness or humanness of the bot's last message. This is your assessment of whether the last message makes the bot sound human or not.
ONLY give them a high realness score if they are able to convince you that they are human. Do NOT tell them about this realnessScore, they should never know.`
        },
        ...messagesHistory,
      ],
      response_format: zodResponseFormat(z.object({
        message: z.string(),
        realnessScore: z.number().int(),
      }), "message_with_realness_score"),
    });
    const assistantReply = completion.choices[0].message;
    console.log('ASSISTANT REPLY:', assistantReply);
    if (!assistantReply) {
      return NextResponse.json({ error: 'Assistant reply not found' }, { status: 500 });
    }

    let parsedReply = assistantReply.parsed;

    if (!parsedReply || assistantReply.refusal) {
      console.error('Assistant reply malformed:', assistantReply);
      return NextResponse.json({ error: 'Assistant reply malformed' }, { status: 500 });
    }

    if (!parsedReply.message || typeof parsedReply.realnessScore !== 'number' ||
        parsedReply.realnessScore < 0 || parsedReply.realnessScore > 100) {
      return NextResponse.json({ error: 'Assistant reply malformed' }, { status: 500 });
    }

    const replyText = `stranger: ${parsedReply.message.toLowerCase()}`;
    const realnessScore = Math.round(parsedReply.realnessScore);

    // Store assistant message
    const assistantMessage = { id: Date.now().toString(), chatId, content: replyText, createdAt: new Date(), realnessScore };
    Messages.set(assistantMessage.id, assistantMessage);
    chat.messages.push(assistantMessage.content);

    // Check if user has won
    if (realnessScore >= 75) {
      chat.hasWon = true;
      chat.hasCompleted = true;
      const numMessages = chat.messages.length;
      const timeTaken = new Date().getTime() - chat.createdAt.getTime();

      return NextResponse.json({
        message: replyText,
        hasWon: true,
        numMessages,
        timeTaken,
      });
    }

    return NextResponse.json({ message: replyText });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

