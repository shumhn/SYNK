# ZPB Test Suite

Comprehensive test coverage for Zalient Productivity Board (Modules 2.2 - 2.7)

## Test Structure

```
tests/
├── setup.js                          # Test utilities and helpers
├── run-all-tests.js                  # Test runner script
├── api/
│   ├── 2.2-user-management.test.js   # User Management tests
│   ├── 2.3-2.4-projects.test.js      # Dept/Team/Project tests
│   ├── 2.5-2.6-task-management.test.js # Task & Dependency tests
│   └── 2.7-visualizations.test.js    # Visualization modes tests
└── README.md                         # This file
```

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running locally or set `MONGODB_URI` env variable
   ```bash
   # Local MongoDB
   mongod
   
   # Or set connection string
   export MONGODB_URI="mongodb://localhost:27017/zpb_test"
   ```

2. **Dependencies**: Install test dependencies
   ```bash
   npm install
   ```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# User Management (2.2)
npm test tests/api/2.2-user-management.test.js

# Projects & Departments (2.3-2.4)
npm test tests/api/2.3-2.4-projects.test.js

# Task Management (2.5-2.6)
npm test tests/api/2.5-2.6-task-management.test.js

# Visualizations (2.7)
npm test tests/api/2.7-visualizations.test.js
```

### Watch Mode
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
```

### Custom Test Runner
```bash
npm run test:all
```

## Test Coverage

### 2.2 User Management (15 tests)
- ✅ Create user with all fields (roles, permissions, profile)
- ✅ Calculate profile completion percentage
- ✅ Track sessions (login, online status, session ID)
- ✅ Calculate performance metrics (completed tasks, on-time rate)
- ✅ Assign multiple roles
- ✅ Validate role enums
- ✅ Performance trends over time

### 2.3 Department & Team Management (8 tests)
- ✅ Create department with head, managers, KPIs
- ✅ Track KPI progress
- ✅ Archive departments
- ✅ Create teams linked to departments
- ✅ Add multiple team members
- ✅ Create inter-department channels

### 2.4 Project Management (12 tests)
- ✅ Create project with budget and resources
- ✅ Track budget spending
- ✅ Support all project statuses (7 states)
- ✅ Create milestones for projects
- ✅ Order milestones
- ✅ Calculate project progress from tasks
- ✅ Identify task dependency chains
- ✅ Detect circular dependencies
- ✅ Project duplication support

### 2.5 Task Management System (25 tests)
- ✅ Create task with extended fields (types, priorities, attachments, checklist)
- ✅ Support all task types (7 types)
- ✅ Support all priority levels (5 levels)
- ✅ Create subtasks with parent reference
- ✅ Unlimited subtasks support
- ✅ Assign subtasks to different users
- ✅ Calculate progress from checklist
- ✅ Calculate progress from subtasks
- ✅ Create task with dependencies
- ✅ Enforce sequential dependencies
- ✅ Block/unblock tasks
- ✅ Create recurring tasks (all frequencies)
- ✅ Create task templates
- ✅ Create tasks from templates
- ✅ Add comments to tasks
- ✅ Add comments with mentions
- ✅ Add comments with attachments
- ✅ Add multiple attachments to tasks
- ✅ Multi-assignee support

### 2.6 Subtask & Dependency Management (Covered in 2.5)
- ✅ Dependency enforcement
- ✅ Critical path analysis
- ✅ Blockers system

### 2.7 Task Visualization Modes (18 tests)
- ✅ Kanban board - group by status columns
- ✅ Kanban board - drag-drop status change
- ✅ Calendar - group tasks by due date
- ✅ Calendar - filter by month
- ✅ Dashboard - calculate total tasks
- ✅ Dashboard - count by status
- ✅ Dashboard - count blocked tasks
- ✅ Dashboard - count overdue tasks
- ✅ Dashboard - count tasks due next 7 days
- ✅ Dashboard - aggregate by project
- ✅ Dashboard - aggregate by assignee
- ✅ Inline edit - update status
- ✅ Inline edit - update priority
- ✅ Inline edit - validate enum
- ✅ List view - filter by search query
- ✅ List view - filter by multiple criteria
- ✅ List view - sort by multiple fields

## Total Coverage
- **Test Suites**: 4
- **Test Cases**: 78+
- **Models Tested**: 11
- **APIs Tested**: 40+

## Test Data Generators

The `setup.js` provides helper functions to generate test data:

```javascript
import { generateTestUser, generateTestProject, generateTestTask } from "./setup.js";

// Generate user
const user = generateTestUser({ roles: ["admin"] });

// Generate project
const project = generateTestProject({ status: "on_track" });

// Generate task
const task = generateTestTask(projectId, { priority: "urgent" });
```

## Database Cleanup

Tests automatically:
1. Connect to test database before all tests
2. Clear collections before each test
3. Drop database and close connection after all tests

## Environment Variables

```bash
# Test database (default: mongodb://localhost:27017/zpb_test)
MONGODB_URI=mongodb://localhost:27017/zpb_test

# Test timeout (default: 30000ms)
JEST_TIMEOUT=30000
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Port Already in Use
```bash
# Kill process on port 27017
lsof -ti:27017 | xargs kill -9
```

### Clear Test Database Manually
```bash
mongosh zpb_test --eval "db.dropDatabase()"
```

## Next Steps

1. Add integration tests for API routes
2. Add E2E tests with Playwright
3. Add performance benchmarks
4. Add load testing with Artillery
5. Add mutation testing with Stryker

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Add test coverage for new models/APIs
4. Update this README

## Questions?

See project documentation or contact the team.
