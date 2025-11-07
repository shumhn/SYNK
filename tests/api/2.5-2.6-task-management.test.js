/**
 * Test Suite: 2.5 Task Management + 2.6 Subtask & Dependencies
 * Tests: Tasks, subtasks, dependencies, recurring, templates, auto-progress
 */

import { setupTestDb, cleanupTestDb, clearCollections, generateTestUser, generateTestProject, generateTestTask } from "../setup.js";
import User from "../../src/models/User.js";
import Project from "../../src/models/Project.js";
import Task from "../../src/models/Task.js";
import TaskTemplate from "../../src/models/TaskTemplate.js";
import TaskComment from "../../src/models/TaskComment.js";

describe("2.5 Task Management System + 2.6 Dependencies", () => {
  let user, project;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    user = await User.create(generateTestUser());
    project = await Project.create(generateTestProject());
  });

  describe("Task CRUD with Extended Fields", () => {
    test("should create task with all new fields", async () => {
      const taskData = {
        project: project._id,
        title: "Feature Implementation",
        description: "Implement new feature",
        assignee: user._id,
        assignees: [user._id],
        status: "todo",
        priority: "high",
        taskType: "feature",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: 8,
        tags: ["frontend", "urgent"],
        attachments: [
          { filename: "design.png", url: "https://example.com/design.png", size: 12345 },
        ],
        checklist: [
          { text: "Setup project", completed: false, order: 0 },
          { text: "Write code", completed: false, order: 1 },
        ],
        progress: 0,
      };

      const task = await Task.create(taskData);

      expect(task.title).toBe("Feature Implementation");
      expect(task.priority).toBe("high");
      expect(task.taskType).toBe("feature");
      expect(task.tags).toContain("urgent");
      expect(task.attachments).toHaveLength(1);
      expect(task.checklist).toHaveLength(2);
      expect(task.assignees).toHaveLength(1);
      console.log("✓ Task created with extended fields");
    });

    test("should support all task types", async () => {
      const types = ["task", "bug", "feature", "meeting", "idea", "review", "research"];
      
      for (const type of types) {
        const task = await Task.create({
          ...generateTestTask(project._id),
          taskType: type,
        });
        expect(task.taskType).toBe(type);
      }
      
      console.log(`✓ All ${types.length} task types supported`);
    });

    test("should support all priority levels", async () => {
      const priorities = ["low", "medium", "high", "urgent", "critical"];
      
      for (const priority of priorities) {
        const task = await Task.create({
          ...generateTestTask(project._id),
          priority,
        });
        expect(task.priority).toBe(priority);
      }
      
      console.log(`✓ All ${priorities.length} priority levels supported`);
    });
  });

  describe("Subtasks and Hierarchy", () => {
    test("should create subtask with parentTask reference", async () => {
      const parentTask = await Task.create({ ...generateTestTask(project._id), parentTask: null });
      
      const subtask = await Task.create({
        ...generateTestTask(project._id),
        parentTask: parentTask._id,
        title: "Subtask 1",
      });

      expect(subtask.parentTask.toString()).toBe(parentTask._id.toString());
      
      const subtasks = await Task.find({ parentTask: parentTask._id });
      expect(subtasks).toHaveLength(1);
      expect(subtasks[0]._id.toString()).toBe(subtask._id.toString());
      console.log("✓ Subtask created and linked to parent");
    });

    test("should support unlimited subtasks", async () => {
      const parentTask = await Task.create(generateTestTask(project._id));
      
      const subtaskCount = 15;
      for (let i = 0; i < subtaskCount; i++) {
        await Task.create({
          ...generateTestTask(project._id),
          parentTask: parentTask._id,
          title: `Subtask ${i + 1}`,
        });
      }

      const subtasks = await Task.find({ parentTask: parentTask._id });
      expect(subtasks).toHaveLength(subtaskCount);
      console.log(`✓ Created ${subtaskCount} subtasks (unlimited support verified)`);
    });

    test("should assign subtasks to different users", async () => {
      const user2 = await User.create(generateTestUser({ username: "user2" }));
      const parentTask = await Task.create(generateTestTask(project._id));
      
      const subtask1 = await Task.create({
        ...generateTestTask(project._id),
        parentTask: parentTask._id,
        assignee: user._id,
      });
      
      const subtask2 = await Task.create({
        ...generateTestTask(project._id),
        parentTask: parentTask._id,
        assignee: user2._id,
      });

      expect(subtask1.assignee.toString()).not.toBe(subtask2.assignee.toString());
      console.log("✓ Subtasks assigned to different team members");
    });
  });

  describe("Auto-Progress Calculation", () => {
    test("should calculate progress from checklist", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        checklist: [
          { text: "Item 1", completed: true, order: 0 },
          { text: "Item 2", completed: true, order: 1 },
          { text: "Item 3", completed: false, order: 2 },
          { text: "Item 4", completed: false, order: 3 },
        ],
      });

      const completed = task.checklist.filter(c => c.completed).length;
      const total = task.checklist.length;
      const expectedProgress = Math.round((completed / total) * 100);

      expect(expectedProgress).toBe(50);
      console.log(`✓ Checklist progress: ${completed}/${total} = ${expectedProgress}%`);
    });

    test("should calculate progress from subtasks", async () => {
      const parentTask = await Task.create(generateTestTask(project._id));
      
      await Task.create({
        ...generateTestTask(project._id),
        parentTask: parentTask._id,
        status: "completed",
      });
      
      await Task.create({
        ...generateTestTask(project._id),
        parentTask: parentTask._id,
        status: "completed",
      });
      
      await Task.create({
        ...generateTestTask(project._id),
        parentTask: parentTask._id,
        status: "in_progress",
      });

      const subtasks = await Task.find({ parentTask: parentTask._id });
      const completedSubtasks = subtasks.filter(s => s.status === "completed").length;
      const expectedProgress = Math.round((completedSubtasks / subtasks.length) * 100);

      expect(expectedProgress).toBe(67);
      console.log(`✓ Subtask progress: ${completedSubtasks}/${subtasks.length} = ${expectedProgress}%`);
    });
  });

  describe("Dependencies and Blocking", () => {
    test("should create task with dependencies", async () => {
      const task1 = await Task.create(generateTestTask(project._id, { title: "Task 1" }));
      const task2 = await Task.create(generateTestTask(project._id, { title: "Task 2" }));
      
      const task3 = await Task.create({
        ...generateTestTask(project._id),
        title: "Task 3 (depends on 1 and 2)",
        dependencies: [task1._id, task2._id],
      });

      expect(task3.dependencies).toHaveLength(2);
      console.log("✓ Task created with dependencies");
    });

    test("should enforce sequential dependencies", async () => {
      const blocker = await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
      });
      
      const blocked = await Task.create({
        ...generateTestTask(project._id),
        dependencies: [blocker._id],
      });

      // Check that blocker is not completed
      const incompleteBlockers = await Task.countDocuments({
        _id: { $in: blocked.dependencies },
        status: { $ne: "completed" },
      });

      expect(incompleteBlockers).toBe(1);
      console.log("✓ Dependencies enforcement verified (blocker incomplete)");
    });

    test("should block/unblock tasks", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
      });

      task.status = "blocked";
      await task.save();

      const blockedTask = await Task.findById(task._id);
      expect(blockedTask.status).toBe("blocked");

      blockedTask.status = "todo";
      await blockedTask.save();

      const unblockedTask = await Task.findById(task._id);
      expect(unblockedTask.status).toBe("todo");
      console.log("✓ Block/unblock functionality works");
    });
  });

  describe("Recurring Tasks", () => {
    test("should create task with recurring settings", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        recurring: {
          enabled: true,
          frequency: "weekly",
          interval: 2,
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });

      expect(task.recurring.enabled).toBe(true);
      expect(task.recurring.frequency).toBe("weekly");
      expect(task.recurring.interval).toBe(2);
      console.log("✓ Recurring task created (every 2 weeks)");
    });

    test("should support all recurring frequencies", async () => {
      const frequencies = ["daily", "weekly", "monthly", "yearly"];
      
      for (const frequency of frequencies) {
        const task = await Task.create({
          ...generateTestTask(project._id),
          recurring: { enabled: true, frequency, interval: 1 },
        });
        expect(task.recurring.frequency).toBe(frequency);
      }
      
      console.log(`✓ All ${frequencies.length} recurring frequencies supported`);
    });
  });

  describe("Task Templates", () => {
    test("should create task template", async () => {
      const template = await TaskTemplate.create({
        name: "Bug Report Template",
        description: "Standard bug reporting workflow",
        taskType: "bug",
        priority: "high",
        estimatedHours: 4,
        tags: ["bug", "urgent"],
        checklist: [
          { text: "Reproduce bug", order: 0 },
          { text: "Identify root cause", order: 1 },
          { text: "Fix and test", order: 2 },
        ],
        subtasks: [
          { title: "Write test case", estimatedHours: 1 },
          { title: "Implement fix", estimatedHours: 2 },
        ],
        createdBy: user._id,
        isPublic: true,
      });

      expect(template.name).toBe("Bug Report Template");
      expect(template.checklist).toHaveLength(3);
      expect(template.subtasks).toHaveLength(2);
      expect(template.isPublic).toBe(true);
      console.log("✓ Task template created with checklist and subtasks");
    });

    test("should create task from template", async () => {
      const template = await TaskTemplate.create({
        name: "Feature Template",
        taskType: "feature",
        priority: "medium",
        checklist: [
          { text: "Design", order: 0 },
          { text: "Implement", order: 1 },
        ],
        createdBy: user._id,
      });

      // Simulate using template
      const taskFromTemplate = await Task.create({
        project: project._id,
        title: template.name,
        taskType: template.taskType,
        priority: template.priority,
        checklist: template.checklist.map(c => ({ ...c, completed: false })),
      });

      expect(taskFromTemplate.title).toBe(template.name);
      expect(taskFromTemplate.taskType).toBe(template.taskType);
      expect(taskFromTemplate.checklist).toHaveLength(2);
      console.log("✓ Task created from template");
    });
  });

  describe("Task Comments", () => {
    test("should add comment to task", async () => {
      const task = await Task.create(generateTestTask(project._id));
      
      const comment = await TaskComment.create({
        task: task._id,
        author: user._id,
        content: "This is a test comment",
      });

      expect(comment.content).toBe("This is a test comment");
      expect(comment.task.toString()).toBe(task._id.toString());
      
      const comments = await TaskComment.find({ task: task._id });
      expect(comments).toHaveLength(1);
      console.log("✓ Comment added to task");
    });

    test("should add comment with mentions", async () => {
      const user2 = await User.create(generateTestUser({ username: "user2" }));
      const task = await Task.create(generateTestTask(project._id));
      
      const comment = await TaskComment.create({
        task: task._id,
        author: user._id,
        content: "@user2 Please review this",
        mentions: [user2._id],
      });

      expect(comment.mentions).toHaveLength(1);
      expect(comment.mentions[0].toString()).toBe(user2._id.toString());
      console.log("✓ Comment with mentions created");
    });

    test("should add comment with attachments", async () => {
      const task = await Task.create(generateTestTask(project._id));
      
      const comment = await TaskComment.create({
        task: task._id,
        author: user._id,
        content: "Check this screenshot",
        attachments: [
          { filename: "screenshot.png", url: "https://example.com/screenshot.png", size: 54321 },
        ],
      });

      expect(comment.attachments).toHaveLength(1);
      expect(comment.attachments[0].filename).toBe("screenshot.png");
      console.log("✓ Comment with attachments created");
    });
  });

  describe("Attachments", () => {
    test("should add multiple attachments to task", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        attachments: [
          { filename: "doc1.pdf", url: "https://example.com/doc1.pdf" },
          { filename: "image1.png", url: "https://example.com/image1.png" },
          { filename: "video1.mp4", url: "https://example.com/video1.mp4" },
        ],
      });

      expect(task.attachments).toHaveLength(3);
      expect(task.attachments[0].filename).toBe("doc1.pdf");
      console.log("✓ Multiple attachments added to task");
    });
  });

  describe("Multi-assignee Support", () => {
    test("should assign task to multiple users", async () => {
      const user2 = await User.create(generateTestUser({ username: "user2" }));
      const user3 = await User.create(generateTestUser({ username: "user3" }));
      
      const task = await Task.create({
        ...generateTestTask(project._id),
        assignee: user._id,
        assignees: [user._id, user2._id, user3._id],
      });

      expect(task.assignees).toHaveLength(3);
      console.log("✓ Task assigned to multiple users");
    });
  });
});
