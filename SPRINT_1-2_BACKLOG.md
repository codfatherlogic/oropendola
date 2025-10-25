# SPRINT 1-2 BACKLOG - TASK PERSISTENCE LAYER

**Duration:** 6 weeks (240 hours)
**Goal:** Complete task persistence with full lifecycle support
**Start Date:** Week 1 (Nov 1, 2025)
**End Date:** Week 6 (Dec 13, 2025)

---

## 🎯 SPRINT GOAL

Implement enterprise-grade task management system:
- ✅ Tasks persist across extension restarts
- ✅ Task history view with search/filter
- ✅ Export to JSON/TXT/Markdown
- ✅ Load time < 100ms
- ✅ 80% test coverage

---

## 📋 WEEK 1: DATABASE LAYER (80 hrs)

### **Monday (8 hrs) - Database Schema Design**

**Tasks:**
- [ ] Install dependencies: `npm install sqlite3 uuid`
- [ ] Create directory structure:
  ```bash
  mkdir -p src/services/storage/__tests__
  mkdir -p src/services/tasks/__tests__
  mkdir -p src/types
  ```
- [ ] Define Task interface in `src/types/task.ts`
- [ ] Design SQLite schema (tables, indexes, FTS)
- [ ] Write schema.sql file
- [ ] Code review with team

**Deliverables:**
- [ ] `src/types/task.ts` - TypeScript interfaces
- [ ] `src/services/storage/schema.sql` - Database schema
- [ ] Technical design document reviewed

**Acceptance Criteria:**
- TypeScript interfaces compile without errors
- Schema includes all required fields
- FTS (full-text search) configured for task.text

---

### **Tuesday (8 hrs) - TaskStorage Core Methods**

**Tasks:**
- [ ] Create `src/services/storage/TaskStorage.js`
- [ ] Implement constructor and initialize()
- [ ] Implement _initSchema() to create tables
- [ ] Implement createTask() method
- [ ] Implement getTask() method
- [ ] Add helper methods (_run, _get, _all, _exec)

**Deliverables:**
- [ ] `TaskStorage.js` with core CRUD methods
- [ ] Database initialization working
- [ ] Basic task creation/retrieval working

**Acceptance Criteria:**
- Can create database file in ~/.oropendola/
- Can create task and retrieve it by ID
- Returns null for non-existent tasks

---

### **Wednesday (8 hrs) - TaskStorage Update/Delete**

**Tasks:**
- [ ] Implement updateTask() method
- [ ] Implement deleteTask() method
- [ ] Implement _deserializeTask() helper
- [ ] Add proper error handling
- [ ] Test all CRUD operations manually

**Deliverables:**
- [ ] Complete CRUD operations
- [ ] Error handling for edge cases

**Acceptance Criteria:**
- Can update task fields (text, status, messages, etc.)
- Can delete task and confirm deletion
- Throws appropriate errors for invalid operations

---

### **Thursday (8 hrs) - TaskStorage List & Filter**

**Tasks:**
- [ ] Implement listTasks() with filters
- [ ] Add status filter support
- [ ] Add pagination (limit, offset)
- [ ] Add sorting (sortBy, sortOrder)
- [ ] Implement full-text search
- [ ] Test with multiple tasks

**Deliverables:**
- [ ] listTasks() with all filter options
- [ ] FTS search working

**Acceptance Criteria:**
- Can list all tasks
- Can filter by status
- Can paginate results
- Search finds tasks by text content

---

### **Friday (8 hrs) - TaskStorage Export & Stats**

**Tasks:**
- [ ] Implement exportTask() method
- [ ] Add _exportToText() helper
- [ ] Add _exportToMarkdown() helper
- [ ] Implement getStats() method
- [ ] Implement close() method
- [ ] Manual testing of all features

**Deliverables:**
- [ ] Export functionality for JSON/TXT/MD
- [ ] Task statistics working
- [ ] Complete TaskStorage.js

**Acceptance Criteria:**
- Can export task to all 3 formats
- Export includes full conversation
- Stats show correct counts by status

---

### **Saturday-Sunday (40 hrs) - TaskStorage Tests**

**Tasks:**
- [ ] Create `src/services/storage/__tests__/TaskStorage.test.js`
- [ ] Write tests for createTask()
- [ ] Write tests for getTask()
- [ ] Write tests for updateTask()
- [ ] Write tests for deleteTask()
- [ ] Write tests for listTasks() with filters
- [ ] Write tests for exportTask() (all formats)
- [ ] Write tests for getStats()
- [ ] Write tests for FTS search
- [ ] Add edge case tests (null handling, errors)
- [ ] Achieve 80%+ coverage

**Deliverables:**
- [ ] Complete test suite for TaskStorage
- [ ] All tests passing
- [ ] 80%+ code coverage

**Acceptance Criteria:**
- All tests pass: `npm test TaskStorage.test.js`
- Coverage report shows 80%+
- No console errors or warnings

---

## 📋 WEEK 2: TASK MANAGER API (80 hrs)

### **Monday (8 hrs) - TaskManager Foundation**

**Tasks:**
- [ ] Create `src/services/tasks/TaskManager.js`
- [ ] Implement constructor (EventEmitter)
- [ ] Implement initialize() method
- [ ] Integrate with TaskStorage
- [ ] Add event emitter for task lifecycle
- [ ] Test basic initialization

**Deliverables:**
- [ ] TaskManager.js foundation
- [ ] TaskStorage integration working

**Acceptance Criteria:**
- TaskManager initializes TaskStorage
- Can emit events (taskCreated, taskUpdated, etc.)
- No initialization errors

---

### **Tuesday (8 hrs) - Task Creation API**

**Tasks:**
- [ ] Implement createTask() method
- [ ] Add UUID generation
- [ ] Add metadata handling
- [ ] Emit taskCreated event
- [ ] Add logging
- [ ] Test task creation flow

**Deliverables:**
- [ ] createTask() API complete
- [ ] Events working

**Acceptance Criteria:**
- Can create task with text and metadata
- Returns task with generated ID
- Emits taskCreated event
- Task persists to database

---

### **Wednesday (8 hrs) - Task State Management**

**Tasks:**
- [ ] Implement saveTask() method
- [ ] Implement completeTask() method
- [ ] Implement terminateTask() method
- [ ] Implement failTask() method
- [ ] Add activeTasks Map tracking
- [ ] Test all state transitions

**Deliverables:**
- [ ] Task state management complete
- [ ] Active task tracking

**Acceptance Criteria:**
- Can transition task through all states
- activeTasks Map updates correctly
- Events emit for each state change

---

### **Thursday (8 hrs) - Task Loading & Deletion**

**Tasks:**
- [ ] Implement loadTask() method
- [ ] Implement deleteTask() method
- [ ] Add error handling for not found
- [ ] Emit taskLoaded, taskDeleted events
- [ ] Test load/delete flows

**Deliverables:**
- [ ] loadTask() and deleteTask() APIs
- [ ] Complete error handling

**Acceptance Criteria:**
- Can load task by ID
- Can delete task and remove from activeTasks
- Throws error for non-existent tasks

---

### **Friday (8 hrs) - Task Query & Export APIs**

**Tasks:**
- [ ] Implement listTasks() method
- [ ] Implement searchTasks() method
- [ ] Implement exportTask() method
- [ ] Implement getStats() method
- [ ] Add registerActiveTask() and getActiveTask()
- [ ] Test all query/export methods

**Deliverables:**
- [ ] Complete TaskManager API
- [ ] All methods implemented

**Acceptance Criteria:**
- Can list tasks with filters
- Can search tasks
- Can export task in any format
- Stats return correct data

---

### **Saturday-Sunday (40 hrs) - TaskManager Tests & Integration**

**Tasks:**
- [ ] Create `src/services/tasks/__tests__/TaskManager.test.js`
- [ ] Write tests for createTask()
- [ ] Write tests for saveTask()
- [ ] Write tests for loadTask()
- [ ] Write tests for deleteTask()
- [ ] Write tests for state transitions
- [ ] Write tests for events
- [ ] Write tests for listTasks/searchTasks
- [ ] Write integration tests with TaskStorage
- [ ] Achieve 80%+ coverage

**Deliverables:**
- [ ] Complete test suite for TaskManager
- [ ] All tests passing
- [ ] 80%+ coverage

**Acceptance Criteria:**
- All tests pass: `npm test TaskManager.test.js`
- Events emit correctly in tests
- Integration with TaskStorage verified

---

## 📋 WEEK 3: HISTORY VIEW UI (80 hrs)

### **Monday (8 hrs) - HistoryView Component Structure**

**Tasks:**
- [ ] Create `webview-ui/src/components/History/` directory
- [ ] Create `HistoryView.tsx` component
- [ ] Create `HistoryView.css` styles
- [ ] Set up state management (useState hooks)
- [ ] Add message listener for task list
- [ ] Basic UI layout (header, list, controls)

**Deliverables:**
- [ ] HistoryView component structure
- [ ] CSS styling matching Roo-Code

**Acceptance Criteria:**
- Component renders without errors
- Basic layout matches Roo-Code design
- State management hooks set up

---

### **Tuesday (8 hrs) - Search & Filter UI**

**Tasks:**
- [ ] Implement search box with icon
- [ ] Add status filter dropdown
- [ ] Add sort selector (created/updated)
- [ ] Implement clear search button
- [ ] Add search query state
- [ ] Wire up filter/sort state

**Deliverables:**
- [ ] Complete search & filter UI
- [ ] All controls functional

**Acceptance Criteria:**
- Search box accepts input
- Filter dropdown shows all statuses
- Sort selector changes sort order
- Clear button works

---

### **Wednesday (8 hrs) - Task List Virtualization**

**Tasks:**
- [ ] Install react-virtuoso: `npm install react-virtuoso`
- [ ] Implement Virtuoso list
- [ ] Create TaskItem component
- [ ] Add task status indicators (color-coded)
- [ ] Format dates (relative: "2h ago", "3d ago")
- [ ] Add loading state

**Deliverables:**
- [ ] Virtualized task list
- [ ] TaskItem component with styling

**Acceptance Criteria:**
- List renders 1000+ tasks smoothly
- Task items show all metadata
- Status colors match design
- Loading indicator shows while fetching

---

### **Thursday (8 hrs) - Task Actions**

**Tasks:**
- [ ] Add onClick handler to load task
- [ ] Create export dropdown button
- [ ] Add export menu (JSON/TXT/MD)
- [ ] Add delete button with confirmation
- [ ] Implement action handlers
- [ ] Test all actions

**Deliverables:**
- [ ] Complete task action buttons
- [ ] Export dropdown working

**Acceptance Criteria:**
- Click task loads conversation
- Export dropdown shows 3 options
- Delete confirms before removing
- All actions send correct messages to extension

---

### **Friday (8 hrs) - Frontend-Backend Integration**

**Tasks:**
- [ ] Add message handlers in extension.js
- [ ] Handle `listTasks` message
- [ ] Handle `loadTask` message
- [ ] Handle `deleteTask` message
- [ ] Handle `exportTask` message
- [ ] Test end-to-end flow

**Deliverables:**
- [ ] Complete message passing
- [ ] End-to-end integration working

**Acceptance Criteria:**
- HistoryView sends messages to extension
- Extension responds with task data
- UI updates based on responses
- No console errors

---

### **Saturday-Sunday (40 hrs) - UI Polish & Testing**

**Tasks:**
- [ ] Add empty state UI
- [ ] Add error state handling
- [ ] Improve loading indicators
- [ ] Add keyboard shortcuts (Cmd+K for search)
- [ ] Add hover states and animations
- [ ] Test with large datasets (1000+ tasks)
- [ ] Test search performance
- [ ] Test filter combinations
- [ ] Write component tests
- [ ] Fix any bugs

**Deliverables:**
- [ ] Polished HistoryView UI
- [ ] Component tests
- [ ] Performance verified

**Acceptance Criteria:**
- UI matches Roo-Code design 95%
- Handles 1000+ tasks smoothly
- Search returns results < 50ms
- All edge cases handled (empty, error, loading)

---

## 📋 WEEK 4: EXTENSION INTEGRATION (30 hrs)

### **Monday-Tuesday (16 hrs) - Integrate with ConversationTask**

**Tasks:**
- [ ] Update `src/core/ConversationTask.js`
- [ ] Add TaskManager instance to extension.js
- [ ] Create task on conversation start
- [ ] Save task state after each message
- [ ] Update task on completion/termination
- [ ] Test task lifecycle

**Deliverables:**
- [ ] ConversationTask integrated with TaskManager
- [ ] Task auto-saves during conversation

**Acceptance Criteria:**
- New conversation creates task
- Task saves after each assistant response
- Task updates on completion
- Conversation persists across restarts

---

### **Wednesday (8 hrs) - Resume Task Feature**

**Tasks:**
- [ ] Add "Resume Task" button to HistoryView
- [ ] Implement resumeTask() handler in extension
- [ ] Load task messages into ChatContext
- [ ] Restore ConversationTask state
- [ ] Test resume flow

**Deliverables:**
- [ ] Resume task functionality
- [ ] Full conversation restoration

**Acceptance Criteria:**
- Can load previous task
- All messages restored to UI
- Can continue conversation
- API metrics preserved

---

### **Thursday (6 hrs) - Testing & Bug Fixes**

**Tasks:**
- [ ] Test full task lifecycle end-to-end
- [ ] Test edge cases (restart, errors, failures)
- [ ] Fix any integration bugs
- [ ] Performance testing (load 1000 tasks)
- [ ] Memory leak testing

**Deliverables:**
- [ ] All integration tests passing
- [ ] No critical bugs

**Acceptance Criteria:**
- Can create, save, load, delete tasks
- Extension handles restarts gracefully
- No memory leaks
- Performance benchmarks met

---

## 📋 WEEK 5-6: POLISH & DOCUMENTATION (50 hrs)

### **Week 5 (25 hrs) - UI/UX Polish**

**Tasks:**
- [ ] Add task metadata display (mode, model, tokens)
- [ ] Add task duration tracking
- [ ] Improve error messages
- [ ] Add success notifications
- [ ] Add keyboard shortcuts documentation
- [ ] Test accessibility (a11y)
- [ ] Cross-browser testing (if applicable)

**Deliverables:**
- [ ] Polished UI with all metadata
- [ ] Improved UX with notifications

**Acceptance Criteria:**
- UI shows all relevant task info
- Users get clear feedback on actions
- Keyboard shortcuts work consistently

---

### **Week 6 (25 hrs) - Documentation & Final Testing**

**Tasks:**
- [ ] Write user documentation
- [ ] Write developer documentation
- [ ] Create video demo (optional)
- [ ] Final end-to-end testing
- [ ] Performance benchmarking
- [ ] Code review and cleanup
- [ ] Prepare demo for stakeholders

**Deliverables:**
- [ ] Complete documentation
- [ ] Demo-ready build
- [ ] Performance report

**Acceptance Criteria:**
- Documentation covers all features
- All acceptance criteria met
- Ready for Sprint Review demo

---

## ✅ SPRINT 1-2 ACCEPTANCE CRITERIA

### Functionality:
- [x] Tasks persist across extension restarts
- [x] Create task creates new task with ID
- [x] Load task loads full conversation
- [x] Delete task removes from database
- [x] Export works for JSON, TXT, Markdown
- [x] History view shows all tasks
- [x] Search finds tasks by text
- [x] Filter works for all statuses

### Performance:
- [x] Task load time < 100ms
- [x] History view renders 1000+ tasks smoothly
- [x] Search returns results < 50ms
- [x] Export completes < 500ms

### Testing:
- [x] 80% code coverage
- [x] All unit tests passing
- [x] Integration tests passing
- [x] Performance tests passing

### Code Quality:
- [x] No TypeScript errors
- [x] No ESLint errors
- [x] Code reviewed
- [x] Documentation complete

---

## 📊 DAILY STANDUP FORMAT

**Every day at 9:00 AM (15 minutes):**

1. **What did I complete yesterday?**
   - List completed tasks from backlog

2. **What am I working on today?**
   - List planned tasks for today

3. **Any blockers?**
   - Technical issues
   - Missing information
   - External dependencies

**Log standup notes in:** `STANDUP_NOTES.md`

---

## 🎯 SPRINT REVIEW (End of Week 6)

**Agenda:**
1. Demo all features (30 min)
   - Create task
   - View history
   - Search/filter
   - Export task
   - Delete task
2. Review acceptance criteria (15 min)
3. Discuss what went well (10 min)
4. Discuss what to improve (10 min)
5. Plan Sprint 3-4 (5 min)

**Attendees:**
- Engineering lead
- Product manager
- QA (if hired)
- Stakeholders

---

## 📈 PROGRESS TRACKING

**Update weekly in:** `SPRINT_PROGRESS.md`

**Metrics to track:**
- Hours spent vs. estimated
- Tasks completed / Total tasks
- Test coverage %
- Performance benchmarks
- Bug count

**Format:**
```markdown
## Week X Progress

**Hours:** 35/40 (87%)
**Tasks:** 12/15 (80%)
**Coverage:** 75% (target: 80%)
**Performance:** Load time 85ms ✅ (target: <100ms)
**Bugs:** 2 open, 5 closed
```

---

## 🚨 RISKS & MITIGATIONS

### Risk 1: SQLite Performance
**Likelihood:** Medium
**Impact:** High
**Mitigation:** Benchmark early (Week 1), add indexes, use FTS5

### Risk 2: Large Task Export Timeouts
**Likelihood:** Low
**Impact:** Medium
**Mitigation:** Stream export, add progress indicator

### Risk 3: Virtualized List Scrolling Issues
**Likelihood:** Low
**Impact:** Low
**Mitigation:** Use react-virtuoso (proven library), test with 1000+ items

### Risk 4: Extension Restart State Loss
**Likelihood:** Medium
**Impact:** Critical
**Mitigation:** Save task state after each message, test restart scenarios

---

## 📞 NEXT ACTIONS

### This Week (Week 1):
- [ ] Review this backlog
- [ ] Install dependencies
- [ ] Create directory structure
- [ ] Start TaskStorage implementation
- [ ] Daily standups

### Questions to Answer:
1. Where should tasks.db be stored? → `~/.oropendola/` (decided)
2. What task metadata to track? → See Task interface (decided)
3. Export file naming convention? → `task-{id}-{timestamp}.{format}` (decided)

---

**Backlog Version:** 1.0
**Last Updated:** 2025-10-25
**Next Sprint:** Sprint 3-4 (Context Management)
