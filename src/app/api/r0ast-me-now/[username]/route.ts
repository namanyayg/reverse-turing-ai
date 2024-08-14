import fs from 'fs'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import prisma from '@/app/lib/prisma'

import { User, Submission } from '@prisma/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fetchUser = async (username: string) => {
  // if a user already exists in the database, return it
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    include: {
      submissions: true,
    },
  })
  if (user) {
    return user;
  }
  // otherwise, fetch it from hacker-news and save it to the database
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/user/${username}.json`);
  const userData = await response.json();
  if (!userData) {
    return null;
  }
  delete userData.id
  userData.username = username
  userData.created = new Date(userData.created * 1000).toISOString();
  // get only first 10 submissions from the user
  const submissionsIds = userData.submitted.slice(0, 10)
  // for each submission id, fetch the submission data
  const submissions = await Promise.all(submissionsIds.map(async (id: number) => {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    const submission = await response.json();
    return {
      title: submission.title,
      score: submission.score,
      type: submission.type,
      text: submission.text,
    } as Submission
  }))
  delete userData.submitted
  userData.submissions = submissions
  // save the user to the database
  await prisma.user.create({
    data: {
      ...userData,
      submissions: {
        create: submissions,
      },
    },
    include: {
      submissions: true,
    },
  })
  return userData
}

const roastUserUsingAi = async (userData: User & { submissions: Submission[] }) => {
  // if the user already has a roast, return it
  if (userData.roastText) {
    return userData;
  }
  // if the user is already processing a roast, return
  if (userData.isCurrentlyProcessing) {
    return userData;
  }
  // update the user to be processing
  await prisma.user.update({
    where: {
      username: userData.username,
    },
    data: {
      isCurrentlyProcessing: true,
    }
  })
  setTimeout(async () => {
    await prisma.user.update({
      where: {
        username: userData.username,
      },
      data: {
        isCurrentlyProcessing: false,
      }
    })
  }, 5000)
  const posts = userData.submissions
    ?.filter((post: Submission) => post.type === 'story' && post.title && post.score)
    ?.map((post: Submission) => {
      return `title: ${post.title}, score: ${post.score}`
    })
  const comments = userData.submissions
    ?.filter((comment: Submission) => comment.type === 'comment' && comment.text)
    ?.map((comment: Submission) => {
      return `comment: ${comment.text?.substring(0, 200)}`
    })
  if (!posts.length && !comments.length) {
    console.log('ERROR: No posts or comments found for user', userData.username)
    return userData;
  }
  const prompt = `
  Generate a strong, harsh, realistic, and mind-blowing roast for the user with details given below.
  Give your reply in a JSON object with 3 properties: roastText, strengthsText, weaknessesText.
  MAKE SURE IT'S RUTHLESS. Use simple words, but some technical lingo.
  Make sure each property of the result (roast, strengths, weaknesses) is AT LEAST 3 paragraphs long, multiple lines and long roast is needed. Put some of the important words in <b> tags to highlight them. Make sure you at least include 3 paragraphs or else I'll be fired from my job. Each paragraph should be in it's own <p> </p> tag, but all contained within the same string.
  Make sure the roast is specific to the user and their posts and comments.
  User details:
  username: ${userData.username}
  about: ${userData.about}
  karma: ${userData.karma}
  ${posts && posts.length > 0 ? `posts (submissions of interesting content the user found online): ${posts.join('\n')}` : ''}
  ${comments && comments.length > 0 ? `comments: ${comments.join('\n')}` : ''}
  `
  try {
    const roast = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: "json_object" }
    })
    const roastData = JSON.parse(roast.choices[0].message.content || '{}')
    // write it to db
    userData.roastText = roastData.roastText
    userData.strengthsText = roastData.strengthsText
    userData.weaknessesText = roastData.weaknessesText
    await prisma.user.update({
      where: {
        username: userData.username,
      },
      data: {
        roastText: roastData.roastText,
        strengthsText: roastData.strengthsText,
        weaknessesText: roastData.weaknessesText,
        isCurrentlyProcessing: false,
      }
    })
    revalidatePath(`/api/r0ast-me-now/${userData.username}`)
    revalidatePath(`/u/${userData.username}`)
    return userData
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function GET(req: Request, { params }: { params: { username: string } }) {
  const username = params.username.toLowerCase();
  const user = await fetchUser(username);
  if (!user) {
    return Response.json({ error: 'User not found' });
  }
  // trigger the roasting, but no need to wait for it to finish
  roastUserUsingAi(user);
  return Response.json(user);
}