/*
  # Portfolio Database Schema

  ## Overview
  Complete database schema for a professional developer portfolio with dynamic content management.

  ## Tables Created

  ### 1. profile_info
  Stores personal profile information
  - `id` (uuid, primary key)
  - `name` (text) - Full name
  - `title` (text) - Professional title/tagline
  - `bio` (text) - Biography description
  - `email` (text) - Contact email
  - `github_url` (text, nullable) - GitHub profile URL
  - `linkedin_url` (text, nullable) - LinkedIn profile URL
  - `twitter_url` (text, nullable) - Twitter profile URL
  - `avatar_url` (text, nullable) - Profile image URL
  - `resume_url` (text, nullable) - Resume/CV file URL
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. projects
  Stores portfolio projects
  - `id` (uuid, primary key)
  - `title` (text) - Project name
  - `description` (text) - Project description
  - `technologies` (text[]) - Array of technology tags
  - `github_url` (text, nullable) - Repository URL
  - `live_url` (text, nullable) - Live demo URL
  - `image_url` (text, nullable) - Project screenshot/image
  - `display_order` (integer) - Sort order for display
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. skills
  Stores technical and professional skills
  - `id` (uuid, primary key)
  - `name` (text) - Skill name
  - `category` (text) - Skill category (frontend, backend, devops, tools, soft-skills)
  - `proficiency` (text) - Proficiency level (expert, advanced, intermediate, learning)
  - `display_order` (integer) - Sort order within category
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. experience
  Stores work experience entries
  - `id` (uuid, primary key)
  - `title` (text) - Job title
  - `company` (text) - Company name
  - `location` (text) - Work location
  - `start_date` (date) - Employment start date
  - `end_date` (date, nullable) - Employment end date (null for current)
  - `description` (text) - Role description
  - `achievements` (text[]) - Array of key achievements
  - `display_order` (integer) - Sort order for display
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. contact_messages
  Stores messages sent through contact form
  - `id` (uuid, primary key)
  - `name` (text) - Sender name
  - `email` (text) - Sender email
  - `subject` (text) - Message subject
  - `message` (text) - Message content
  - `status` (text) - Message status (new, read, archived)
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - RLS enabled on all tables
  - Public read access for portfolio content (profile_info, projects, skills, experience)
  - Public insert access for contact_messages only
  - All other operations require authentication
*/

-- Create profile_info table
CREATE TABLE IF NOT EXISTS profile_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  github_url text,
  linkedin_url text,
  twitter_url text,
  avatar_url text,
  resume_url text,
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  technologies text[] NOT NULL DEFAULT '{}',
  github_url text,
  live_url text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('frontend', 'backend', 'devops', 'tools', 'soft-skills')),
  proficiency text NOT NULL CHECK (proficiency IN ('expert', 'advanced', 'intermediate', 'learning')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create experience table
CREATE TABLE IF NOT EXISTS experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date,
  description text NOT NULL DEFAULT '',
  achievements text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profile_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_info
CREATE POLICY "Anyone can view profile info"
  ON profile_info FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update profile info"
  ON profile_info FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert profile info"
  ON profile_info FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for projects
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for skills
CREATE POLICY "Anyone can view skills"
  ON skills FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for experience
CREATE POLICY "Anyone can view experience"
  ON experience FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert experience"
  ON experience FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update experience"
  ON experience FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete experience"
  ON experience FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for contact_messages
CREATE POLICY "Anyone can insert contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update contact message status"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON projects(display_order);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category, display_order);
CREATE INDEX IF NOT EXISTS idx_experience_display_order ON experience(display_order);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- Insert default profile info if not exists
INSERT INTO profile_info (name, title, bio, email)
SELECT 
  'M6rDev',
  'Systematic Excellence in Software Engineering',
  'Building systematic solutions with precision and excellence.',
  'contact@m6rdev.com'
WHERE NOT EXISTS (SELECT 1 FROM profile_info LIMIT 1);
