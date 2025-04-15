import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedData() {
  try {
    // Create some users
    const user1 = await prisma.user.create({
      data: {
        email: 'parent1@example.com',
        name: 'Parent One'
      }
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'parent2@example.com',
        name: 'Parent Two'
      }
    });

    console.log('Created users:', { user1, user2 });

    // Create stories for user1
    const storiesUser1 = await Promise.all([
      prisma.story.create({
        data: {
          title: 'The Magic Forest',
          content: 'Deep in the forest, there was a magical tree...',
          ageRange: '5-7',
          author: 'AI',
          userId: user1.id
        }
      }),
      prisma.story.create({
        data: {
          title: 'Space Adventure',
          content: 'In a galaxy far away...',
          ageRange: '8-10',
          author: 'AI',
          userId: user1.id
        }
      })
    ]);

    // Create story for user2
    const storyUser2 = await prisma.story.create({
      data: {
        title: 'The Friendly Dragon',
        content: 'Once there was a dragon who loved to bake cookies...',
        ageRange: '5-7',
        author: 'AI',
        userId: user2.id
      }
    });

    console.log('Created stories for user1:', storiesUser1);
    console.log('Created story for user2:', storyUser2);

    // Query to show relationships
    const usersWithStories = await prisma.user.findMany({
      include: {
        stories: true
      }
    });

    console.log('\nUsers with their stories:');
    usersWithStories.forEach(user => {
      console.log(`\n${user.name} (${user.email}):`);
      user.stories.forEach(story => {
        console.log(`- ${story.title} (Age: ${story.ageRange})`);
      });
    });
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
