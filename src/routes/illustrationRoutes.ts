import { RequestHandler, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { createIllustrationGenerator } from '../services/illustrationGenerator';
const router = Router();
const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const illustrationGenerator = createIllustrationGenerator(openai);

router.post('/cover/:storyId', (async (req, res) => {
  const { storyId } = req.params;

  try {
    const story = await prisma.story.findUnique({
      where: {
        id: storyId
      }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { url, key } = await illustrationGenerator.generateIllustration({
      storyTitle: story.title,
      storyContent: story.content,
      type: 'cover'
    });

    const image = await prisma.illustration.create({
      data: {
        url: url,
        s3Key: key,
        storyId,
        type: 'cover'
      }
    });

    res.status(201).json(image);
  } catch (error: any) {
    console.error('Error generating cover illustration:', error);
    res.status(500).json({
      error: 'Failed to generate cover illustration',
      details: error.message
    });
  }
}) as RequestHandler);

//TODO: Add routes for other illustration types

export default router;
