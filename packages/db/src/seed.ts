import { db } from './client';
import { projects, uploads } from './schema';

// Use hardcoded test user IDs — in a real setup you'd use Clerk Backend API
// to create test users, but for a starter kit we just use placeholder IDs.
const TEST_USER_1 = 'user_test_1';
const TEST_USER_2 = 'user_test_2';

async function seed() {
  console.log('🌱 Seeding database...');

  await db.transaction(async (tx) => {
    // Clear existing data
    await tx.delete(uploads);
    await tx.delete(projects);

    // Insert sample projects for user 1
    const user1Projects = await tx
      .insert(projects)
      .values([
        {
          userId: TEST_USER_1,
          name: 'Mobile App Redesign',
          description: 'Complete UI overhaul for the mobile application',
        },
        {
          userId: TEST_USER_1,
          name: 'API Migration',
          description: 'Migrate REST API to GraphQL',
          status: 'archived',
        },
        { userId: TEST_USER_1, name: 'Landing Page', description: 'New marketing landing page' },
        {
          userId: TEST_USER_1,
          name: 'Design System',
          description: 'Component library and design tokens',
        },
        {
          userId: TEST_USER_1,
          name: 'Analytics Dashboard',
          description: 'Real-time analytics dashboard',
        },
      ])
      .returning();

    // Insert sample projects for user 2
    const user2Projects = await tx
      .insert(projects)
      .values([
        {
          userId: TEST_USER_2,
          name: 'E-commerce Platform',
          description: 'Full e-commerce solution',
        },
        { userId: TEST_USER_2, name: 'Blog Engine', description: 'Headless CMS for blog content' },
        {
          userId: TEST_USER_2,
          name: 'Auth Service',
          description: 'Centralized authentication service',
        },
        {
          userId: TEST_USER_2,
          name: 'Email Templates',
          description: 'Transactional email template system',
          status: 'archived',
        },
        {
          userId: TEST_USER_2,
          name: 'CI/CD Pipeline',
          description: 'Automated deployment pipeline',
        },
      ])
      .returning();

    // Insert sample upload metadata (no actual R2 objects)
    await tx.insert(uploads).values([
      {
        userId: TEST_USER_1,
        objectKey: 'uploads/user1/logo.png',
        filename: 'logo.png',
        contentType: 'image/png',
        sizeBytes: 24567,
        status: 'complete',
      },
      {
        userId: TEST_USER_1,
        objectKey: 'uploads/user1/document.pdf',
        filename: 'document.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1048576,
        status: 'complete',
      },
      {
        userId: TEST_USER_1,
        objectKey: 'uploads/user1/temp.jpg',
        filename: 'temp.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 50000,
        status: 'pending',
      },
      {
        userId: TEST_USER_2,
        objectKey: 'uploads/user2/avatar.png',
        filename: 'avatar.png',
        contentType: 'image/png',
        sizeBytes: 15000,
        status: 'complete',
      },
      {
        userId: TEST_USER_2,
        objectKey: 'uploads/user2/report.pdf',
        filename: 'report.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2097152,
        status: 'complete',
      },
      {
        userId: TEST_USER_2,
        objectKey: 'uploads/user2/draft.docx',
        filename: 'draft.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 35000,
        status: 'pending',
      },
    ]);

    console.log(`✅ Seeded ${user1Projects.length + user2Projects.length} projects and 6 uploads`);
    console.log('   Test user IDs: user_test_1, user_test_2');
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
