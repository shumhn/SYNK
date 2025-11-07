#!/usr/bin/env node
/**
 * Manual Test Runner - Quick verification of all models and features
 * Run: node tests/manual-test.js
 */

import mongoose from "mongoose";
import User from "../src/models/User.js";
import Department from "../src/models/Department.js";
import Team from "../src/models/Team.js";
import Channel from "../src/models/Channel.js";
import Project from "../src/models/Project.js";
import Milestone from "../src/models/Milestone.js";
import Task from "../src/models/Task.js";
import TaskComment from "../src/models/TaskComment.js";
import TaskTemplate from "../src/models/TaskTemplate.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/zpb_test";

async function connect() {
  await mongoose.connect(MONGO_URI);
  console.log("✓ Connected to MongoDB");
}

async function cleanup() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  console.log("✓ Database cleaned and connection closed");
}

async function test2_2_UserManagement() {
  console.log("\n▶ Testing 2.2 User Management");
  
  const user = await User.create({
    username: "testuser",
    email: "test@example.com",
    password: "Test1234!",
    roles: ["admin", "manager"],
    permissions: ["users.create"],
    employmentType: "full_time",
    designation: "Senior Developer",
    profile: {
      skills: ["JavaScript", "React", "Node.js"],
      experience: [{ company: "TechCorp", role: "Dev", years: 3 }],
      social: { linkedin: "test", github: "test" },
    },
  });

  console.log(`  ✓ User created: ${user.username}`);
  console.log(`  ✓ Roles: ${user.roles.join(", ")}`);
  console.log(`  ✓ Skills: ${user.profile.skills.length}`);
  console.log(`  ✓ Profile completion: ${user.profile.completionPercentage}%`);
  
  return user;
}

async function test2_3_DepartmentTeam() {
  console.log("\n▶ Testing 2.3 Department & Team Management");
  
  const dept = await Department.create({
    name: "Engineering",
    description: "Software Engineering",
    kpis: [
      { key: "velocity", label: "Sprint Velocity", target: 100, current: 85, unit: "points" },
    ],
  });

  const team = await Team.create({
    name: "Frontend Team",
    department: dept._id,
  });

  const channel = await Channel.create({
    name: "Product Dev",
    departments: [dept._id],
  });

  console.log(`  ✓ Department created: ${dept.name}`);
  console.log(`  ✓ Team created: ${team.name}`);
  console.log(`  ✓ Channel created: ${channel.name}`);
  console.log(`  ✓ KPI progress: ${dept.kpis[0].current}/${dept.kpis[0].target}`);
  
  return dept;
}

async function test2_4_ProjectManagement() {
  console.log("\n▶ Testing 2.4 Project Management");
  
  const project = await Project.create({
    title: "Platform Redesign",
    description: "Complete platform overhaul",
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: "on_track",
    budget: { allocated: 100000, spent: 25000, currency: "USD" },
    resources: [{ type: "developer", name: "Sr Dev", quantity: 3, unit: "FTE" }],
  });

  const milestone = await Milestone.create({
    project: project._id,
    title: "Alpha Release",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "pending",
    order: 1,
  });

  console.log(`  ✓ Project created: ${project.title}`);
  console.log(`  ✓ Status: ${project.status}`);
  console.log(`  ✓ Budget: $${project.budget.spent}/$${project.budget.allocated}`);
  console.log(`  ✓ Milestone created: ${milestone.title}`);
  
  return project;
}

async function test2_5_TaskManagement(project, user) {
  console.log("\n▶ Testing 2.5 Task Management System");
  
  const task = await Task.create({
    project: project._id,
    title: "Implement Authentication",
    description: "Add OAuth2 support",
    assignee: user._id,
    assignees: [user._id],
    status: "in_progress",
    priority: "high",
    taskType: "feature",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
    tags: ["backend", "security"],
    attachments: [{ filename: "design.pdf", url: "https://example.com/design.pdf" }],
    checklist: [
      { text: "Research OAuth providers", completed: true, order: 0 },
      { text: "Implement Google SSO", completed: false, order: 1 },
    ],
    recurring: { enabled: true, frequency: "weekly", interval: 1 },
    progress: 50,
  });

  const subtask = await Task.create({
    project: project._id,
    parentTask: task._id,
    title: "Write tests",
    status: "todo",
  });

  const comment = await TaskComment.create({
    task: task._id,
    author: user._id,
    content: "Started working on this",
    mentions: [user._id],
    attachments: [{ filename: "screenshot.png", url: "https://example.com/img.png" }],
  });

  const template = await TaskTemplate.create({
    name: "Bug Report Template",
    taskType: "bug",
    priority: "high",
    checklist: [
      { text: "Reproduce bug", order: 0 },
      { text: "Fix issue", order: 1 },
    ],
    createdBy: user._id,
  });

  console.log(`  ✓ Task created: ${task.title}`);
  console.log(`  ✓ Task type: ${task.taskType}, Priority: ${task.priority}`);
  console.log(`  ✓ Tags: ${task.tags.join(", ")}`);
  console.log(`  ✓ Checklist items: ${task.checklist.length}`);
  console.log(`  ✓ Attachments: ${task.attachments.length}`);
  console.log(`  ✓ Recurring: ${task.recurring.enabled ? "Yes" : "No"}`);
  console.log(`  ✓ Progress: ${task.progress}%`);
  console.log(`  ✓ Subtask created: ${subtask.title}`);
  console.log(`  ✓ Comment added with ${comment.mentions.length} mentions`);
  console.log(`  ✓ Template created: ${template.name}`);
  
  return task;
}

async function test2_6_Dependencies(project, user) {
  console.log("\n▶ Testing 2.6 Subtask & Dependency Management");
  
  const task1 = await Task.create({
    project: project._id,
    title: "Design UI",
    status: "completed",
    estimatedHours: 10,
  });

  const task2 = await Task.create({
    project: project._id,
    title: "Implement UI",
    dependencies: [task1._id],
    status: "in_progress",
    estimatedHours: 20,
  });

  const task3 = await Task.create({
    project: project._id,
    title: "Test UI",
    dependencies: [task2._id],
    status: "todo",
    estimatedHours: 8,
  });

  const blockedTask = await Task.create({
    project: project._id,
    title: "Blocked Task",
    status: "blocked",
  });

  // Check dependencies
  const incompleteBlockers = await Task.countDocuments({
    _id: { $in: task2.dependencies },
    status: { $ne: "completed" },
  });

  console.log(`  ✓ Dependency chain created: Design → Implement → Test`);
  console.log(`  ✓ Total estimated hours: ${10 + 20 + 8}h`);
  console.log(`  ✓ Task2 has ${incompleteBlockers} incomplete blockers`);
  console.log(`  ✓ Blocked task status: ${blockedTask.status}`);
}

async function test2_7_Visualizations(project) {
  console.log("\n▶ Testing 2.7 Task Visualization Modes");
  
  // Create tasks for Kanban
  await Task.create({ project: project._id, title: "Todo Task", status: "todo" });
  await Task.create({ project: project._id, title: "In Progress", status: "in_progress" });
  await Task.create({ project: project._id, title: "Review", status: "review" });
  await Task.create({ project: project._id, title: "Done", status: "completed" });
  await Task.create({ project: project._id, title: "Blocked", status: "blocked" });

  const allTasks = await Task.find({ project: project._id, parentTask: null });
  const byStatus = {
    todo: allTasks.filter(t => t.status === "todo").length,
    in_progress: allTasks.filter(t => t.status === "in_progress").length,
    review: allTasks.filter(t => t.status === "review").length,
    completed: allTasks.filter(t => t.status === "completed").length,
    blocked: allTasks.filter(t => t.status === "blocked").length,
  };

  console.log("  ✓ Kanban Board Data:");
  console.log(`    - Todo: ${byStatus.todo}`);
  console.log(`    - In Progress: ${byStatus.in_progress}`);
  console.log(`    - Review: ${byStatus.review}`);
  console.log(`    - Completed: ${byStatus.completed}`);
  console.log(`    - Blocked: ${byStatus.blocked}`);

  // Dashboard aggregations
  const total = await Task.countDocuments({ parentTask: null });
  const statusAgg = await Task.aggregate([
    { $match: { parentTask: null } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  console.log(`  ✓ Dashboard Summary:`);
  console.log(`    - Total tasks: ${total}`);
  console.log(`    - Status breakdown: ${statusAgg.length} categories`);
}

async function runAllTests() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ZPB Manual Test Suite");
  console.log("  Testing Modules 2.2 through 2.7");
  console.log("═══════════════════════════════════════════════════════");

  try {
    await connect();
    
    const user = await test2_2_UserManagement();
    const dept = await test2_3_DepartmentTeam();
    const project = await test2_4_ProjectManagement();
    await test2_5_TaskManagement(project, user);
    await test2_6_Dependencies(project, user);
    await test2_7_Visualizations(project);

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  ✅ ALL TESTS PASSED");
    console.log("═══════════════════════════════════════════════════════\n");

    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("\n✗ TEST FAILED:");
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

runAllTests();
