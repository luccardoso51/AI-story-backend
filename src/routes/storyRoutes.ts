import { Router, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { StoryGeneratorService, StoryPrompt } from '../services/storyGenerator';

const router = Router();
const prisma = new PrismaClient();
const storyGenerator = new StoryGeneratorService();

router.post('/generate-story', (async (req, res) => {
  const { ageRange, title, characters, setting } = req.body;
  const defaultUserId = 'd5cc9ace-4d00-442f-b364-ec1f1908df3a';

  if (!ageRange) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['ageRange']
    });
  }

  try {
    const prompt: StoryPrompt = {
      ageRange,
      title,
      characters,
      setting
    };

    const generatedStory = await storyGenerator.generateStory(prompt);

    const newStory = await prisma.story.create({
      data: {
        title: generatedStory.title,
        content: generatedStory.content,
        ageRange,
        author: 'AI',
        userId: defaultUserId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(newStory);
  } catch (error: any) {
    console.error('Story generation error:', error);

    // Handle OpenAI API errors
    if (error.message.includes('OpenAI')) {
      return res.status(500).json({
        error: 'OpenAI API Error',
        details: error.message
      });
    }

    // Handle database errors
    if (error.code?.startsWith('P')) {
      // Prisma error codes start with P
      return res.status(500).json({
        error: 'Database Error',
        details: 'Failed to save the generated story'
      });
    }

    // Generic error fallback
    res.status(500).json({
      error: 'Story Generation Failed',
      details: error.message || 'An unexpected error occurred'
    });
  }
}) as RequestHandler);

// Get all stories with user information
router.get('/', async (req, res) => {
  try {
    const stories = await prisma.story.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        illustrations: {
          select: {
            url: true,
            type: true
          }
        },
        audio: {
          select: {
            url: true
          }
        }
      }
    });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get a specific story with user information
router.get('/:id', (async (req, res) => {
  const { id } = req.params;
  try {
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    res.json(story);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch story' });
  }
}) as RequestHandler);

// Create a new story
router.post('/', (async (req, res) => {
  const { title, content, author, ageRange, userId, characters } = req.body;

  if (!title || !content || !ageRange || !userId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['title', 'content', 'ageRange', 'userId']
    });
  }

  try {
    // First verify the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStory = await prisma.story.create({
      data: {
        title,
        content,
        author,
        ageRange,
        userId,
        characters
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    res.status(201).json(newStory);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
}) as RequestHandler);

// Get stories by user ID
router.get('/user/:userId', (async (req, res) => {
  const { userId } = req.params;
  try {
    const stories = await prisma.story.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (stories.length === 0) {
      return res
        .status(404)
        .json({ message: 'No stories found for this user' });
    }

    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stories' });
  }
}) as RequestHandler);

// Delete a story (with user verification)
router.delete('/:id', (async (req, res) => {
  const { id } = req.params;
  // const { userId } = req.body; // In real app, this would come from auth token
  const userId = 'd5cc9ace-4d00-442f-b364-ec1f1908df3a';

  try {
    // First check if story exists and belongs to user
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        illustrations: true
      }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.userId !== userId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to delete this story' });
    }

    // First delete all related illustrations
    if (story.illustrations.length > 0) {
      await prisma.illustration.deleteMany({
        where: { storyId: id }
      });
    }

    // Then delete the story
    await prisma.story.delete({
      where: { id }
    });

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
}) as RequestHandler);

router.post('/generate-audio/:storyId', (async (req, res) => {
  const { storyId } = req.params;
  const story = await prisma.story.findUnique({
    where: { id: storyId }
  });

  if (!story) {
    return res.status(404).json({ error: 'Story not found' });
  }

  const s3Url = await storyGenerator.generateStoryAudio(story.content);

  await prisma.audio.create({
    data: {
      url: s3Url,
      s3Key: s3Url,
      storyId: story.id
    }
  });

  res.status(200).json({
    message: 'Audio generated successfully',
    audio: {
      url: s3Url,
      s3Key: s3Url
    }
  });
}) as RequestHandler);

export default router;
