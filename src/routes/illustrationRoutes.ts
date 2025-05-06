import { Router, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { createIllustrationGenerator } from '../services/illustrationGenerator';
import { OpenAI } from 'openai';

const router = Router();
const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const illustrationGenerator = createIllustrationGenerator(openai);

/**
 * @swagger
 * /illustrations/generate:
 *   post:
 *     summary: Generate a new illustration for a story
 *     tags: [Illustrations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storyId
 *               - prompt
 *             properties:
 *               storyId:
 *                 type: string
 *                 format: uuid
 *               prompt:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [cover, scene]
 *                 default: scene
 *     responses:
 *       201:
 *         description: Illustration generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Illustration'
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Story not found
 *       500:
 *         description: Server error or AI generation error
 */
router.post('/generate', (async (req, res) => {
  const { storyId, prompt, type = 'scene' } = req.body;

  if (!storyId || !prompt) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['storyId', 'prompt']
    });
  }

  try {
    // Check if the story exists
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Generate illustration
    const { url, key } = await illustrationGenerator.generateIllustration({
      storyTitle: story.title,
      storyContent: prompt,
      type
    });

    // Save illustration to database
    const illustration = await prisma.illustration.create({
      data: {
        url,
        s3Key: key,
        storyId,
        type
      }
    });

    res.status(201).json(illustration);
  } catch (error: any) {
    console.error('Illustration generation error:', error);

    // Handle OpenAI API errors
    if (error.message.includes('OpenAI')) {
      return res.status(500).json({
        error: 'OpenAI API Error',
        details: error.message
      });
    }

    // Generic error fallback
    res.status(500).json({
      error: 'Illustration Generation Failed',
      details: error.message || 'An unexpected error occurred'
    });
  }
}) as RequestHandler);

/**
 * @swagger
 * /illustrations/{id}:
 *   get:
 *     summary: Get a specific illustration by ID
 *     tags: [Illustrations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Illustration ID
 *     responses:
 *       200:
 *         description: Illustration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Illustration'
 *       404:
 *         description: Illustration not found
 *       500:
 *         description: Server error
 */
router.get('/:id', (async (req, res) => {
  const { id } = req.params;

  try {
    const illustration = await prisma.illustration.findUnique({
      where: { id }
    });

    if (!illustration) {
      return res.status(404).json({ error: 'Illustration not found' });
    }

    res.json(illustration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch illustration' });
  }
}) as RequestHandler);

/**
 * @swagger
 * /illustrations/story/{storyId}:
 *   get:
 *     summary: Get all illustrations for a specific story
 *     tags: [Illustrations]
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Story ID
 *     responses:
 *       200:
 *         description: List of illustrations for the story
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Illustration'
 *       404:
 *         description: No illustrations found for this story
 *       500:
 *         description: Server error
 */
router.get('/story/:storyId', (async (req, res) => {
  const { storyId } = req.params;

  try {
    const illustrations = await prisma.illustration.findMany({
      where: { storyId }
    });

    if (illustrations.length === 0) {
      return res.status(404).json({
        message: 'No illustrations found for this story'
      });
    }

    res.json(illustrations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch illustrations' });
  }
}) as RequestHandler);

export default router;
