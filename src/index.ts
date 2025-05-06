import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import storyRoutes from './routes/storyRoutes';
import illustrationRoutes from './routes/illustrationRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { specs, swaggerUi } from './swagger';

const app: Application = express();

// Add these middlewares first
app.use(cors());
app.use(express.json());

// Then add the logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log request details
  console.log(`\n🔍 ${req.method} ${req.url}`);
  console.log('📝 Request Body:', req.body);

  // Log response details after request is completed
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`✨ Response Status: ${res.statusCode}`);
    console.log(`⏱️  Duration: ${duration}ms\n`);
  });

  next();
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Server health check endpoint
 *     description: Returns a message to confirm the API is running
 *     responses:
 *       200:
 *         description: The API is running properly
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
app.get('/', (req: Request, res: Response) => {
  res.send('AI Story Generator Backend is running with TypeScript! 🚀');
});

app.use('/users', userRoutes);
app.use('/stories', storyRoutes);
app.use('/illustrations', illustrationRoutes);
app.use('/auth', authRoutes);

// Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `📝 API Documentation available at http://localhost:${PORT}/api-docs`
  );
});
