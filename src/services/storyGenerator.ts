import OpenAI from 'openai';

export interface StoryPrompt {
  ageRange: string;
  title?: string;
  theme?: string;
  characters?: string[];
  setting?: string;
}

export class StoryGeneratorService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateStory(
    prompt: StoryPrompt
  ): Promise<{ title: string; content: string }> {
    const systemPrompt = this.createSystemPrompt(prompt.ageRange);
    const userPrompt = this.createUserPrompt(prompt);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      });

      const story = completion.choices[0].message.content;
      if (!story) throw new Error('OpenAI returned empty response');

      // Parse the story to separate title and content
      const [title, ...contentArr] = story.split('\n');
      const content = contentArr.join('\n');

      return {
        title: title.replace('Title: ', '').trim(),
        content: content.trim()
      };
    } catch (error: any) {
      // Throw the original OpenAI error
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      // For other errors, throw with more context
      throw new Error(`Story generation failed: ${error.message}`);
    }
  }

  private createSystemPrompt(ageRange: string): string {
    return `You are a children's story writer creating content for children aged ${ageRange}. 
    Write stories that are:
    1. Age-appropriate and engaging
    2. Educational and positive
    3. Have a clear beginning, middle, and end
    4. Include a subtle moral lesson
    5. Use simple language for young readers
    
    Format the response with "Title: [Story Title]" on the first line, followed by the story content.`;
  }

  private createUserPrompt(prompt: StoryPrompt): string {
    let userPrompt = `Create a children's story`;

    if (prompt.title) {
      userPrompt += ` titled "${prompt.title}"`;
    }
    if (prompt.theme) {
      userPrompt += ` about ${prompt.theme}`;
    }
    if (prompt.characters?.length) {
      userPrompt += ` featuring ${prompt.characters.join(', ')}`;
    }
    if (prompt.setting) {
      userPrompt += ` set in ${prompt.setting}`;
    }

    return userPrompt;
  }
}
