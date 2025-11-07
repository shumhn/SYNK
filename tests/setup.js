// Test setup and utilities
import mongoose from "mongoose";

export async function setupTestDb() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/zpb_test";
  await mongoose.connect(mongoUri);
  console.log("✓ Test DB connected");
}

export async function cleanupTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  console.log("✓ Test DB cleaned up");
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
  console.log("✓ Collections cleared");
}

export function generateTestUser(overrides = {}) {
  const rand = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}_${rand}`,
    email: `test_${timestamp}_${rand}@example.com`,
    password: "Test1234!",
    roles: ["employee"],
    ...overrides,
  };
}

export function generateTestDepartment(overrides = {}) {
  return {
    name: `Test Dept ${Date.now()}`,
    description: "Test department",
    ...overrides,
  };
}

export function generateTestProject(overrides = {}) {
  return {
    title: `Test Project ${Date.now()}`,
    description: "Test project description",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "planning",
    ...overrides,
  };
}

export function generateTestTask(projectId, overrides = {}) {
  return {
    project: projectId,
    title: `Test Task ${Date.now()}`,
    description: "Test task description",
    status: "todo",
    priority: "medium",
    taskType: "task",
    ...overrides,
  };
}
