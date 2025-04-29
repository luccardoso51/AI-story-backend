import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

// Create an S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ai-story-project';

/**
 * Uploads an image from a URL to S3
 * @param imageUrl - The temporary URL of the image
 * @param filename - The filename to use in S3
 * @returns The permanent S3 URL
 */
export async function uploadImageToS3(
  imageUrl: string,
  filename: string
): Promise<string> {
  try {
    console.log(`Downloading image from ${imageUrl}...`);

    // 1. Download the image from the URL
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer' // Important: Get binary data
    });

    // 2. Convert the image to a Buffer
    const imageBuffer = Buffer.from(response.data, 'binary');

    console.log(`Image downloaded, size: ${imageBuffer.length} bytes`);

    // 3. Create a unique path in S3
    const s3Key = `illustrations/${filename}`;

    // 4. Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/png' // DALL-E generates PNGs
    });

    console.log(`Uploading to S3 bucket ${BUCKET_NAME} with key ${s3Key}...`);
    await s3Client.send(command);

    // 5. Return the permanent S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
    console.log(`Upload successful. S3 URL: ${s3Url}`);

    return s3Url;
  } catch (error) {
    console.error('Error in uploadImageToS3:', error);
    throw new Error(`Failed to upload image to S3: ${error}`);
  }
}

export async function uploadAudioToS3(
  file: Buffer,
  filename: string
): Promise<any> {
  const s3Key = `stories/${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: file,
    ContentType: 'audio/mpeg'
  });

  await s3Client.send(command);

  const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
  console.log(`Upload successful. S3 URL: ${s3Url}`);

  return s3Url;
}
