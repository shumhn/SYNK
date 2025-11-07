/**
 * Test Suite: 2.2 User Management
 * Tests: CRUD, roles, sessions, performance trends
 */

import { setupTestDb, cleanupTestDb, clearCollections, generateTestUser } from "../setup.js";
import User from "../../src/models/User.js";
import Task from "../../src/models/Task.js";
import Project from "../../src/models/Project.js";

describe("2.2 User Management", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  describe("User CRUD", () => {
    test("should create user with all fields", async () => {
      const userData = {
        ...generateTestUser(),
        roles: ["admin", "manager"],
        permissions: ["users.create", "projects.edit"],
        employmentType: "full_time",
        designation: "Senior Developer",
        profile: {
          skills: ["JavaScript", "React", "Node.js"],
          experience: [
            { company: "Tech Corp", role: "Developer", years: 3 },
          ],
          social: {
            linkedin: "https://linkedin.com/in/test",
            github: "https://github.com/test",
          },
        },
      };

      const user = await User.create(userData);

      expect(user).toBeTruthy();
      expect(user.username).toBe(userData.username);
      expect(user.roles).toContain("admin");
      expect(user.profile.skills).toHaveLength(3);
      expect(user.employmentType).toBe("full_time");
      console.log("✓ User created with all fields");
    });

    test("should calculate profile completion", async () => {
      const user = await User.create({
        ...generateTestUser(),
        profile: {
          skills: ["JavaScript"],
          experience: [{ company: "Test", role: "Dev", years: 1 }],
          social: { linkedin: "test" },
        },
        designation: "Developer",
      });

      expect(user.profile.completion).toBeGreaterThan(0);
      expect(user.profile.completion).toBeLessThanOrEqual(100);
      console.log(`✓ Profile completion: ${user.profile.completion}%`);
    });

    test("should track sessions", async () => {
      const user = await User.create(generateTestUser());
      
      user.isOnline = true;
      user.lastLoginAt = new Date();
      user.activeSessions = [{
        sessionId: "test-session-123",
        createdAt: new Date(),
        userAgent: "Test Browser",
      }];
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.isOnline).toBe(true);
      expect(updated.activeSessions).toHaveLength(1);
      expect(updated.activeSessions[0].sessionId).toBe("test-session-123");
      console.log("✓ Sessions tracked");
    });
  });

  describe("Performance Trends", () => {
    test("should calculate performance metrics", async () => {
      const user = await User.create(generateTestUser());
      const project = await Project.create({
        title: "Test Project",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Create completed tasks over time
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const dueDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000); // Past weeks
        await Task.create({
          project: project._id,
          title: `Task ${i}`,
          assignee: user._id,
          status: "completed",
          completedAt: new Date(dueDate.getTime() - 1 * 24 * 60 * 60 * 1000), // Completed 1 day before due
          dueDate,
          createdAt: new Date(dueDate.getTime() - 14 * 24 * 60 * 60 * 1000),
        });
      }

      const tasks = await Task.find({ assignee: user._id });
      expect(tasks).toHaveLength(10);
      
      const completed = tasks.filter(t => t.status === "completed");
      expect(completed).toHaveLength(10);

      // Calculate on-time rate
      const onTime = completed.filter(t => t.completedAt <= t.dueDate);
      const onTimeRate = Math.round((onTime.length / completed.length) * 100);
      expect(onTimeRate).toBe(100);

      console.log(`✓ Performance metrics: ${completed.length} completed, ${onTimeRate}% on-time`);
    });
  });

  describe("Roles and Permissions", () => {
    test("should assign multiple roles", async () => {
      const user = await User.create({
        ...generateTestUser(),
        roles: ["admin", "hr", "manager"],
      });

      expect(user.roles).toContain("admin");
      expect(user.roles).toContain("hr");
      expect(user.roles).toHaveLength(3);
      console.log("✓ Multiple roles assigned");
    });

    test("should validate role enum", async () => {
      const userData = {
        ...generateTestUser(),
        roles: ["invalid_role"],
      };

      await expect(User.create(userData)).rejects.toThrow();
      console.log("✓ Invalid role rejected");
    });
  });
});
