# Batch 7 Chat Analysis Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal JWT-protected conversational AI analysis backend with short sessions, backend-generated context summaries, and action-registry-filtered recommendations.

**Architecture:** Add a dedicated `aiChat` backend slice under `backend/services/aiChat/` plus a route mounted at `/api/ai/v2/chat`. Keep responsibilities narrow: the store persists short sessions with TTL and caps, the context service generates summaries from backend data, the chat service validates/filters model outputs, and the route layer only authenticates and validates request shapes.

**Tech Stack:** Express, Node.js built-in test runner, Redis-style storage, existing `aiService`, existing `actionRegistry` / `actionPolicy`

---

## Chunk 1: Tests First

### Task 1: Store and session policy tests

**Files:**
- Create: `backend/tests/aiChat.store.test.js`
- Create: `backend/services/aiChat/aiChatStore.js`
- Create: `backend/services/aiChat/aiChatSessionPolicy.js`

- [ ] Write failing tests for session creation, TTL application, per-session message cap, and recent-session cap.
- [ ] Run the store test to confirm the feature is missing.
- [ ] Implement minimal store and policy behavior to satisfy the test.
- [ ] Re-run the store test and confirm it passes.

### Task 2: Context summary tests

**Files:**
- Create: `backend/tests/aiChat.context.test.js`
- Create: `backend/services/aiChat/aiContextService.js`

- [ ] Write failing tests for backend-generated summaries using only `nodeId`, `incidentId`, and `timeRange`.
- [ ] Run the context test to confirm the failure is due to missing implementation.
- [ ] Implement minimal context summary construction from backend services.
- [ ] Re-run the context test and confirm it passes.

### Task 3: Recommendation filtering tests

**Files:**
- Create: `backend/tests/aiChat.recommendations.test.js`
- Create: `backend/services/aiChat/aiChatService.js`
- Modify: `backend/services/aiOps/actionRegistry.js`

- [ ] Write failing tests for filtering model-suggested actions through the existing action registry and policy.
- [ ] Run the recommendation test to confirm the failure is expected.
- [ ] Implement minimal filtering so unknown or disallowed actions are dropped.
- [ ] Re-run the recommendation test and confirm it passes.

### Task 4: Route tests

**Files:**
- Create: `backend/tests/aiChat.route.test.js`
- Create: `backend/routes/aiChat.js`
- Modify: `backend/index.js`

- [ ] Write failing tests for authenticated session creation, message posting, validation errors, session retrieval, message listing, and recent session listing.
- [ ] Run the route test to confirm it fails for missing chat route behavior.
- [ ] Implement minimal route wiring with request validation and JWT protection hooks.
- [ ] Re-run the route test and confirm it passes.

## Chunk 2: Verification

### Task 5: End-to-end backend verification

**Files:**
- Verify: `backend/tests/*.test.js`

- [ ] Run targeted Batch 7 tests.
- [ ] Run full backend test suite with `npm test`.
- [ ] Confirm all tests pass and summarize any intentionally retained stubs.
