CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create a default user for existing stories
INSERT INTO "User" ("id", "email", "name") 
VALUES ('default-user', 'default@example.com', 'Default User');

-- Add userId column to Story table
ALTER TABLE "Story" 
ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'default-user';

-- Remove the default after the column is added
ALTER TABLE "Story" 
ALTER COLUMN "userId" DROP DEFAULT;

-- Add foreign key constraint
ALTER TABLE "Story" 
ADD CONSTRAINT "Story_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create unique index on User.email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create index on Story.userId
CREATE INDEX "Story_userId_idx" ON "Story"("userId");