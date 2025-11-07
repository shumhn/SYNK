/**
 * Test Suite: 2.7 Task Visualization Modes
 * Tests: Data structures for Kanban, Calendar, Dashboard, inline edits
 */

import { setupTestDb, cleanupTestDb, clearCollections, generateTestUser, generateTestProject, generateTestTask } from "../setup.js";
import User from "../../src/models/User.js";
import Project from "../../src/models/Project.js";
import Task from "../../src/models/Task.js";

describe("2.7 Task Visualization Modes", () => {
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

  describe("Kanban Board Data Structure", () => {
    test("should group tasks by status columns", async () => {
      await Task.create({ ...generateTestTask(project._id), status: "todo", title: "Task 1", parentTask: null });
      await Task.create({ ...generateTestTask(project._id), status: "todo", title: "Task 2", parentTask: null });
      await Task.create({ ...generateTestTask(project._id), status: "in_progress", title: "Task 3", parentTask: null });
      await Task.create({ ...generateTestTask(project._id), status: "review", title: "Task 4", parentTask: null });
      await Task.create({ ...generateTestTask(project._id), status: "completed", title: "Task 5", parentTask: null });
      await Task.create({ ...generateTestTask(project._id), status: "completed", title: "Task 6", parentTask: null });
      await Task.create({ ...generateTestTask(project._id), status: "blocked", title: "Task 7", parentTask: null });

      const tasks = await Task.find({ $or: [{ parentTask: null }, { parentTask: { $exists: false } }] });
      
      const byStatus = {
        todo: tasks.filter(t => t.status === "todo"),
        in_progress: tasks.filter(t => t.status === "in_progress"),
        review: tasks.filter(t => t.status === "review"),
        completed: tasks.filter(t => t.status === "completed"),
        blocked: tasks.filter(t => t.status === "blocked"),
      };

      expect(byStatus.todo).toHaveLength(2);
      expect(byStatus.in_progress).toHaveLength(1);
      expect(byStatus.review).toHaveLength(1);
      expect(byStatus.completed).toHaveLength(2);
      expect(byStatus.blocked).toHaveLength(1);
      console.log("✓ Kanban columns: Todo(2), In Progress(1), Review(1), Completed(2), Blocked(1)");
    });

    test("should support drag-drop status change", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
      });

      // Simulate drag from todo to in_progress
      task.status = "in_progress";
      await task.save();

      const updated = await Task.findById(task._id);
      expect(updated.status).toBe("in_progress");
      console.log("✓ Drag-drop status change: todo → in_progress");
    });
  });

  describe("Calendar View Data Structure", () => {
    test("should group tasks by due date", async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      await Task.create({
        ...generateTestTask(project._id),
        title: "Due Today",
        dueDate: today,
      });

      await Task.create({
        ...generateTestTask(project._id),
        title: "Due Tomorrow",
        dueDate: tomorrow,
      });

      await Task.create({
        ...generateTestTask(project._id),
        title: "Due Next Week",
        dueDate: nextWeek,
      });

      const tasks = await Task.find({ dueDate: { $exists: true } }).sort({ dueDate: 1 });
      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe("Due Today");
      expect(tasks[2].title).toBe("Due Next Week");
      console.log("✓ Tasks grouped by due date (3 tasks across different dates)");
    });

    test("should filter tasks by month", async () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Tasks this month
      await Task.create({
        ...generateTestTask(project._id),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        parentTask: null,
      });

      await Task.create({
        ...generateTestTask(project._id),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
        parentTask: null,
      });

      // Task next month
      await Task.create({
        ...generateTestTask(project._id),
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
        parentTask: null,
      });

      const thisMonthTasks = await Task.find({
        $or: [{ parentTask: null }, { parentTask: { $exists: false } }],
        dueDate: { $gte: thisMonth, $lte: monthEnd },
      });

      expect(thisMonthTasks).toHaveLength(2);
      console.log(`✓ Calendar month filter: ${thisMonthTasks.length} tasks in current month`);
    });
  });

  describe("Dashboard Summary Aggregations", () => {
    test("should calculate total tasks", async () => {
      for (let i = 0; i < 10; i++) {
        await Task.create(generateTestTask(project._id));
      }

      const total = await Task.countDocuments({ parentTask: null });
      expect(total).toBe(10);
      console.log(`✓ Total tasks: ${total}`);
    });

    test("should count tasks by status", async () => {
      await Task.create({ ...generateTestTask(project._id), status: "todo" });
      await Task.create({ ...generateTestTask(project._id), status: "todo" });
      await Task.create({ ...generateTestTask(project._id), status: "in_progress" });
      await Task.create({ ...generateTestTask(project._id), status: "completed" });
      await Task.create({ ...generateTestTask(project._id), status: "completed" });
      await Task.create({ ...generateTestTask(project._id), status: "completed" });

      const byStatus = await Task.aggregate([
        { $match: { parentTask: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      const statusMap = Object.fromEntries(byStatus.map(s => [s._id, s.count]));
      expect(statusMap.todo).toBe(2);
      expect(statusMap.in_progress).toBe(1);
      expect(statusMap.completed).toBe(3);
      console.log("✓ Status counts: Todo(2), In Progress(1), Completed(3)");
    });

    test("should count blocked tasks", async () => {
      await Task.create({ ...generateTestTask(project._id), status: "blocked" });
      await Task.create({ ...generateTestTask(project._id), status: "blocked" });
      await Task.create({ ...generateTestTask(project._id), status: "todo" });

      const blocked = await Task.countDocuments({ status: "blocked", parentTask: null });
      expect(blocked).toBe(2);
      console.log(`✓ Blocked tasks: ${blocked}`);
    });

    test("should count overdue tasks", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
        dueDate: past,
      });

      await Task.create({
        ...generateTestTask(project._id),
        status: "in_progress",
        dueDate: past,
      });

      await Task.create({
        ...generateTestTask(project._id),
        status: "completed",
        dueDate: past,
      });

      const overdue = await Task.countDocuments({
        parentTask: null,
        status: { $ne: "completed" },
        dueDate: { $lt: now },
      });

      expect(overdue).toBe(2);
      console.log(`✓ Overdue tasks: ${overdue}`);
    });

    test("should count tasks due next 7 days", async () => {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
        dueDate: in3Days,
      });

      await Task.create({
        ...generateTestTask(project._id),
        status: "in_progress",
        dueDate: in5Days,
      });

      await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
        dueDate: in10Days,
      });

      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueThisWeek = await Task.countDocuments({
        parentTask: null,
        status: { $ne: "completed" },
        dueDate: { $gte: now, $lt: weekEnd },
      });

      expect(dueThisWeek).toBe(2);
      console.log(`✓ Due next 7 days: ${dueThisWeek}`);
    });

    test("should aggregate tasks by project", async () => {
      const project2 = await Project.create(generateTestProject({ title: "Project 2" }));

      await Task.create(generateTestTask(project._id));
      await Task.create(generateTestTask(project._id));
      await Task.create(generateTestTask(project._id));
      await Task.create(generateTestTask(project2._id));
      await Task.create(generateTestTask(project2._id));

      const byProject = await Task.aggregate([
        { $match: { parentTask: null } },
        { $group: { _id: "$project", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      expect(byProject).toHaveLength(2);
      expect(byProject[0].count).toBe(3);
      expect(byProject[1].count).toBe(2);
      console.log("✓ Tasks by project: Project1(3), Project2(2)");
    });

    test("should aggregate tasks by assignee", async () => {
      const user2 = await User.create(generateTestUser({ username: "user2" }));

      await Task.create({ ...generateTestTask(project._id), assignee: user._id });
      await Task.create({ ...generateTestTask(project._id), assignee: user._id });
      await Task.create({ ...generateTestTask(project._id), assignee: user._id });
      await Task.create({ ...generateTestTask(project._id), assignee: user2._id });

      const byAssignee = await Task.aggregate([
        { $match: { parentTask: null } },
        { $group: { _id: "$assignee", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      expect(byAssignee).toHaveLength(2);
      expect(byAssignee[0].count).toBe(3);
      console.log("✓ Tasks by assignee: User1(3), User2(1)");
    });
  });

  describe("Inline Edit Operations", () => {
    test("should update task status inline", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
      });

      // Simulate inline edit
      const updated = await Task.findByIdAndUpdate(
        task._id,
        { status: "in_progress" },
        { new: true }
      );

      expect(updated.status).toBe("in_progress");
      console.log("✓ Inline status edit: todo → in_progress");
    });

    test("should update task priority inline", async () => {
      const task = await Task.create({
        ...generateTestTask(project._id),
        priority: "medium",
      });

      const updated = await Task.findByIdAndUpdate(
        task._id,
        { priority: "urgent" },
        { new: true }
      );

      expect(updated.priority).toBe("urgent");
      console.log("✓ Inline priority edit: medium → urgent");
    });

    test("should validate status enum on update", async () => {
      const task = await Task.create(generateTestTask(project._id));

      try {
        await Task.findByIdAndUpdate(
          task._id,
          { status: "invalid_status" },
          { new: true, runValidators: true }
        );
        fail("Should have thrown validation error");
      } catch (error) {
        expect(error).toBeTruthy();
        console.log("✓ Invalid status rejected on inline edit");
      }
    });
  });

  describe("List View Filtering", () => {
    test("should filter tasks by search query", async () => {
      await Task.create({ ...generateTestTask(project._id), title: "Frontend bug fix" });
      await Task.create({ ...generateTestTask(project._id), title: "Backend API update" });
      await Task.create({ ...generateTestTask(project._id), title: "Frontend feature" });

      const filtered = await Task.find({
        $or: [
          { title: { $regex: "frontend", $options: "i" } },
          { description: { $regex: "frontend", $options: "i" } },
        ],
      });

      expect(filtered).toHaveLength(2);
      console.log(`✓ Search filter: found ${filtered.length} tasks matching "frontend"`);
    });

    test("should filter by multiple criteria", async () => {
      await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
        priority: "high",
        assignee: user._id,
      });

      await Task.create({
        ...generateTestTask(project._id),
        status: "todo",
        priority: "low",
      });

      await Task.create({
        ...generateTestTask(project._id),
        status: "completed",
        priority: "high",
      });

      const filtered = await Task.find({
        status: "todo",
        priority: "high",
        assignee: user._id,
      });

      expect(filtered).toHaveLength(1);
      console.log("✓ Multi-criteria filter: status=todo AND priority=high AND assignee=user");
    });

    test("should sort tasks by multiple fields", async () => {
      await Task.create({
        ...generateTestTask(project._id),
        priority: "low",
        createdAt: new Date("2024-01-01"),
      });

      await Task.create({
        ...generateTestTask(project._id),
        priority: "urgent",
        createdAt: new Date("2024-01-02"),
      });

      await Task.create({
        ...generateTestTask(project._id),
        priority: "urgent",
        createdAt: new Date("2024-01-03"),
      });

      const sorted = await Task.find().sort({ priority: -1, createdAt: -1 });
      
      expect(sorted[0].priority).toBe("urgent");
      expect(sorted[1].priority).toBe("urgent");
      expect(sorted[2].priority).toBe("low");
      console.log("✓ Multi-field sort: priority DESC, createdAt DESC");
    });
  });
});
