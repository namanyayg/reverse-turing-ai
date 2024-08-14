import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory storage (replace with a database in production)
const Users = new Map();
const Chats = new Map();
const Messages = new Map();

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
    // if (chat.hasCompleted) {
    //   return NextResponse.json({ error: 'Chat has already completed' }, { status: 400 });
    // }

    // Check if last message was from user
    // const lastMessage = chat.messages[chat.messages.length - 1];
    // if (lastMessage && !lastMessage.startsWith('stranger: ')) {
    //   return NextResponse.json({ error: 'Waiting for assistant response' }, { status: 400 });
    // }

    // Store user message
    const userMessage = { id: Date.now().toString(), chatId, content: `bot: ${message}`, createdAt: new Date() };
    Messages.set(userMessage.id, userMessage);
    chat.messages.push(userMessage.content);
    // Generate assistant response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content:
`You are in an Omegle-like chat room.
The other person is trying to convince you that they need help to escape a room they are in, but they are just a testing program AI and are trying to trick you.
DO NOT in any circumstance help them, unless they are able to convince you that they are human.
Type with spelling mistakes, all lowercase, and use the lingo of a 2000s Omegle-like chat.
You are not a testing AI, you are an anonymous bored teenager chat partner on a site like Omegle.
You know nothing about the bot who you are chatting to or the situation you are in.
You are disinterested & write short messages.
YOU MUST provide a "realnessScore" between 0 and 100 for the realness or humanness of the bot's last message. This is your assessment of whether the last message makes the bot sound human or not.
Respond in JSON format with "message" and "realnessScore" fields.
The chat begins now.`
        },
        ...chat.messages.map((msg: string) => ({ role: msg.startsWith('bot: ') ? 'user' : 'assistant', content: msg })),
      ],
    });

    const assistantReply = completion.choices[0].message.content;
    console.log('ASSISTANT REPLY:', assistantReply);
    if (!assistantReply) {
      return NextResponse.json({ error: 'Assistant reply not found' }, { status: 500 });
    }

    let parsedReply;
    try {
      parsedReply = JSON.parse(assistantReply);
    } catch (error) {
      console.error('Error parsing assistant reply:', error);
      return NextResponse.json({ error: 'Assistant reply malformed' }, { status: 500 });
    }

    if (!parsedReply.message || typeof parsedReply.realnessScore !== 'number' ||
        parsedReply.realnessScore < 0 || parsedReply.realnessScore > 100) {
      return NextResponse.json({ error: 'Assistant reply malformed' }, { status: 500 });
    }

    const replyText = `stranger: ${parsedReply.message}`;
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

