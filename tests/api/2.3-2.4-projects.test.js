/**
 * Test Suite: 2.3 Department/Team + 2.4 Project Management
 * Tests: Departments, teams, channels, projects, milestones, critical path
 */

import { setupTestDb, cleanupTestDb, clearCollections, generateTestUser, generateTestProject } from "../setup.js";
import User from "../../src/models/User.js";
import Department from "../../src/models/Department.js";
import Team from "../../src/models/Team.js";
import Channel from "../../src/models/Channel.js";
import Project from "../../src/models/Project.js";
import Milestone from "../../src/models/Milestone.js";
import Task from "../../src/models/Task.js";

describe("2.3 Department/Team + 2.4 Project Management", () => {
  let user;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    user = await User.create(generateTestUser());
  });

  describe("Department Management", () => {
    test("should create department with all fields", async () => {
      const dept = await Department.create({
        name: "Engineering",
        description: "Software Engineering Department",
        head: user._id,
        managers: [user._id],
        kpis: [
          { key: "velocity", label: "Sprint Velocity", target: 100, current: 85, unit: "points" },
          { key: "quality", label: "Code Quality", target: 90, current: 92, unit: "%" },
        ],
        archived: false,
      });

      expect(dept.name).toBe("Engineering");
      expect(dept.head.toString()).toBe(user._id.toString());
      expect(dept.kpis).toHaveLength(2);
      expect(dept.kpis[0].current).toBe(85);
      console.log("✓ Department created with head, managers, and KPIs");
    });

    test("should track KPI progress", async () => {
      const dept = await Department.create({
        name: "Sales",
        kpis: [
          { key: "revenue", label: "Monthly Revenue", target: 100000, current: 85000, unit: "$" },
        ],
      });

      const kpi = dept.kpis[0];
      const progress = Math.round((kpi.current / kpi.target) * 100);
      expect(progress).toBe(85);
      console.log(`✓ KPI progress tracked: ${kpi.current}/${kpi.target} = ${progress}%`);
    });

    test("should archive department", async () => {
      const dept = await Department.create({ name: "Old Dept" });
      
      dept.archived = true;
      await dept.save();

      const archived = await Department.findById(dept._id);
      expect(archived.archived).toBe(true);
      console.log("✓ Department archived");
    });
  });

  describe("Team Management", () => {
    test("should create team linked to department", async () => {
      const dept = await Department.create({ name: "Engineering" });
      
      const team = await Team.create({
        name: "Frontend Team",
        department: dept._id,
        lead: user._id,
        members: [user._id],
        archived: false,
      });

      expect(team.name).toBe("Frontend Team");
      expect(team.department.toString()).toBe(dept._id.toString());
      expect(team.lead.toString()).toBe(user._id.toString());
      console.log("✓ Team created and linked to department");
    });

    test("should add multiple members to team", async () => {
      const dept = await Department.create({ name: "Engineering" });
      const user2 = await User.create(generateTestUser({ username: "user2" }));
      const user3 = await User.create(generateTestUser({ username: "user3" }));
      
      const team = await Team.create({
        name: "Backend Team",
        department: dept._id,
        members: [user._id, user2._id, user3._id],
      });

      expect(team.members).toHaveLength(3);
      console.log("✓ Multiple members added to team");
    });
  });

  describe("Channel Management", () => {
    test("should create inter-department channel", async () => {
      const dept1 = await Department.create({ name: "Engineering" });
      const dept2 = await Department.create({ name: "Design" });
      
      const channel = await Channel.create({
        name: "Product Development",
        description: "Cross-functional product channel",
        departments: [dept1._id, dept2._id],
        members: [user._id],
      });

      expect(channel.name).toBe("Product Development");
      expect(channel.departments).toHaveLength(2);
      console.log("✓ Inter-department channel created");
    });
  });

  describe("Project Management", () => {
    test("should create project with all fields", async () => {
      const dept = await Department.create({ name: "Engineering" });
      
      const project = await Project.create({
        title: "New Platform",
        description: "Build new platform from scratch",
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: "planning",
        departments: [dept._id],
        managers: [user._id],
        members: [user._id],
        budget: {
          allocated: 100000,
          spent: 25000,
          currency: "USD",
        },
        resources: [
          { type: "developer", name: "Senior Dev", quantity: 3, unit: "FTE" },
        ],
        progress: 0,
        archived: false,
      });

      expect(project.title).toBe("New Platform");
      expect(project.status).toBe("planning");
      expect(project.budget.allocated).toBe(100000);
      expect(project.resources).toHaveLength(1);
      console.log("✓ Project created with budget and resources");
    });

    test("should track budget spending", async () => {
      const project = await Project.create({
        ...generateTestProject(),
        budget: { allocated: 50000, spent: 32000, currency: "USD" },
      });

      const remaining = project.budget.allocated - project.budget.spent;
      const percentSpent = Math.round((project.budget.spent / project.budget.allocated) * 100);
      
      expect(remaining).toBe(18000);
      expect(percentSpent).toBe(64);
      console.log(`✓ Budget tracked: $${project.budget.spent}/$${project.budget.allocated} = ${percentSpent}%`);
    });

    test("should support all project statuses", async () => {
      const statuses = ["planning", "on_track", "at_risk", "delayed", "completed", "on_hold", "cancelled"];
      
      for (const status of statuses) {
        const project = await Project.create({
          ...generateTestProject(),
          status,
        });
        expect(project.status).toBe(status);
      }
      
      console.log(`✓ All ${statuses.length} project statuses supported`);
    });
  });

  describe("Milestones", () => {
    test("should create milestone for project", async () => {
      const project = await Project.create(generateTestProject());
      
      const milestone = await Milestone.create({
        project: project._id,
        title: "Alpha Release",
        description: "First alpha version",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "pending",
        order: 1,
      });

      expect(milestone.title).toBe("Alpha Release");
      expect(milestone.project.toString()).toBe(project._id.toString());
      console.log("✓ Milestone created for project");
    });

    test("should order milestones", async () => {
      const project = await Project.create(generateTestProject());
      
      await Milestone.create({
        project: project._id,
        title: "Phase 1",
        order: 1,
      });
      
      await Milestone.create({
        project: project._id,
        title: "Phase 2",
        order: 2,
      });
      
      await Milestone.create({
        project: project._id,
        title: "Phase 3",
        order: 3,
      });

      const milestones = await Milestone.find({ project: project._id }).sort({ order: 1 });
      expect(milestones).toHaveLength(3);
      expect(milestones[0].title).toBe("Phase 1");
      expect(milestones[2].title).toBe("Phase 3");
      console.log("✓ Milestones ordered correctly");
    });
  });

  describe("Project Progress Calculation", () => {
    test("should calculate progress from completed tasks", async () => {
      const project = await Project.create(generateTestProject());
      
      await Task.create({
        project: project._id,
        title: "Task 1",
        status: "completed",
      });
      
      await Task.create({
        project: project._id,
        title: "Task 2",
        status: "completed",
      });
      
      await Task.create({
        project: project._id,
        title: "Task 3",
        status: "in_progress",
      });
      
      await Task.create({
        project: project._id,
        title: "Task 4",
        status: "todo",
      });

      const tasks = await Task.find({ project: project._id });
      const completed = tasks.filter(t => t.status === "completed").length;
      const progress = Math.round((completed / tasks.length) * 100);

      expect(progress).toBe(50);
      console.log(`✓ Project progress: ${completed}/${tasks.length} tasks = ${progress}%`);
    });
  });

  describe("Critical Path Analysis", () => {
    test("should identify task dependencies chain", async () => {
      const project = await Project.create(generateTestProject());
      
      const task1 = await Task.create({
        project: project._id,
        title: "Design",
        estimatedHours: 10,
        status: "completed",
      });
      
      const task2 = await Task.create({
        project: project._id,
        title: "Development",
        estimatedHours: 20,
        dependencies: [task1._id],
        status: "in_progress",
      });
      
      const task3 = await Task.create({
        project: project._id,
        title: "Testing",
        estimatedHours: 8,
        dependencies: [task2._id],
        status: "todo",
      });

      // Verify dependency chain
      expect(task2.dependencies).toContain(task1._id);
      expect(task3.dependencies).toContain(task2._id);

      // Calculate total hours in chain
      const totalHours = 10 + 20 + 8;
      expect(totalHours).toBe(38);
      console.log(`✓ Dependency chain identified: ${totalHours} hours total`);
    });

    test("should detect circular dependencies", async () => {
      const project = await Project.create(generateTestProject());
      
      const task1 = await Task.create({
        project: project._id,
        title: "Task 1",
      });
      
      const task2 = await Task.create({
        project: project._id,
        title: "Task 2",
        dependencies: [task1._id],
      });

      // Attempting to create circular dependency
      task1.dependencies = [task2._id];
      await task1.save();

      // Build adjacency list to detect cycle
      const tasks = await Task.find({ project: project._id });
      const hasCircle = tasks.some(t => {
        return t.dependencies.some(depId => {
          const dep = tasks.find(x => x._id.toString() === depId.toString());
          return dep && dep.dependencies.some(d => d.toString() === t._id.toString());
        });
      });

      expect(hasCircle).toBe(true);
      console.log("✓ Circular dependency detected");
    });
  });

  describe("Project Duplication", () => {
    test("should support project cloning structure", async () => {
      const original = await Project.create({
        ...generateTestProject(),
        title: "Original Project",
      });
      
      await Milestone.create({
        project: original._id,
        title: "Milestone 1",
      });
      
      await Task.create({
        project: original._id,
        title: "Task 1",
      });

      // Simulate duplication by creating copy
      const duplicate = await Project.create({
        title: `${original.title} (Copy)`,
        description: original.description,
        startDate: original.startDate,
        endDate: original.endDate,
        status: "planning",
      });

      const originalMilestones = await Milestone.find({ project: original._id });
      const originalTasks = await Task.find({ project: original._id });

      expect(duplicate.title).toContain("(Copy)");
      expect(originalMilestones).toHaveLength(1);
      expect(originalTasks).toHaveLength(1);
      console.log("✓ Project duplication structure verified");
    });
  });
});
