import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { uploadImageToS3 } from '../utils/s3Service';

export interface IllustrationPrompt {
  storyTitle: string;
  storyContent: string;
  type: 'cover' | 'illustration';
  sequence?: number;
}

export function createIllustrationGenerator(openaiClient: OpenAI) {
  return {
    async generateIllustration(
      prompt: IllustrationPrompt
    ): Promise<{ url: string; key: string }> {
      try {
        const illustrationPrompt = createIllustrationPrompt(prompt);

        const response = await openaiClient.images.generate({
          model: 'dall-e-3',
          prompt: illustrationPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        });

        const temporaryUrl = response.data[0].url || '';

        const filename = `${prompt.type}_${uuidv4()}.png`;

        const s3Url = await uploadImageToS3(temporaryUrl, filename);

        const s3Key = `illustrations/${filename}`;

        return {
          url: s3Url,
          key: s3Key
        };
      } catch (error) {
        console.error('Error generating image:', error);
        throw error;
      }
    }
  };
}

function createIllustrationPrompt(prompt: IllustrationPrompt): string {
  const { storyTitle, storyContent, type, sequence } = prompt;

  if (type === 'cover') {
    return `Create a colorful, child-friendly book cover illustration for a children's story titled "${storyTitle}". 
    The image should be engaging, bright, and suitable for children. 
    IMPORTANT INSTRUCTIONS:
    1. Create ONLY the cover illustration itself - do NOT show a book or book cover object
    2. Make ONE single cohesive scene - do NOT split the image into multiple panels or sections
    3. Do NOT create duplicated or mirrored content within the same image
    4. Fill the entire square canvas with a single unified illustration, ensuring no borders or empty spaces are left
    5. Use cartoon style with vibrant colors and simple shapes suitable for children
    6. Do NOT include any text or words in the image
    7. Reflect the theme and mood of the story, such as whimsical, adventurous, or magical
    8. Include key elements or characters from the story, such as a brave knight or a magical forest
    9. Use a color palette that matches the story's tone, like warm and vibrant colors for a happy story
    
    The illustration should visually represent the story about "${storyTitle}".`;
  } else {
    // For illustrations, extract relevant part of the story
    const storyParts = storyContent.split('\n\n');
    const relevantPart = sequence
      ? storyParts[sequence - 1] || storyContent
      : storyContent;

    return `Create a colorful, child-friendly illustration for a children's story. 
    IMPORTANT INSTRUCTIONS:
    1. Create ONE single cohesive scene - do NOT split the image into multiple panels or sections
    2. Do NOT create duplicated or mirrored content within the same image
    3. Fill the entire square canvas with a single unified illustration, ensuring no borders or empty spaces are left
    4. Use cartoon style with vibrant colors and simple shapes suitable for children
    5. Do NOT include any text or words in the image
    6. Include key elements or characters from the story, such as a brave knight or a magical forest
    7. Use a color palette that matches the story's tone, like warm and vibrant colors for a happy story
    
    The image should depict this story excerpt: ${relevantPart.substring(
      0,
      300
    )}...`;
  }
}
