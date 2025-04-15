import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import storyRoutes from './routes/storyRoutes';
import illustrationRoutes from './routes/illustrationRoutes';

const prisma = new PrismaClient();
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

app.get('/', (req: Request, res: Response) => {
  res.send('AI Story Generator Backend is running with TypeScript! 🚀');
});

app.use('/stories', storyRoutes);
app.use('/illustrations', illustrationRoutes);

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
