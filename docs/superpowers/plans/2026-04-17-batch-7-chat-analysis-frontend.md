# Batch 7 Chat Analysis Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal front-end conversational AI analysis page that creates short sessions, asks questions with bounded context, renders structured answers, and routes recommended actions into the existing AI Ops assistant.

**Architecture:** Add a dedicated `AIChatAnalysis.vue` page backed by a focused `aiChat` API/store pair. Keep the page composition shallow: a context bar for `nodeId / incidentId / timeRange`, a message list that renders user and assistant turns, and a recommendation card group that only links to `AIOpsAssistant` with prefill query params. Reuse existing router, Pinia, and Axios conventions; keep `AIAnalysis.vue` mostly unchanged with one minimal handoff entry.

**Tech Stack:** Vue 3, Pinia, Vue Router, Axios, TypeScript, Vite

---

## Chunk 1: Data and Routing

### Task 1: Add aiChat API and store

**Files:**
- Create: `frontend/src/api/aiChat.ts`
- Create: `frontend/src/stores/aiChat.ts`

- [ ] Define the request and response types for creating sessions, posting messages, fetching a session, fetching messages, and listing recent sessions.
- [ ] Implement the Axios wrappers for `/ai/v2/chat`.
- [ ] Implement a Pinia store that owns session state, context state, loading flags, errors, recent sessions, and message submission helpers.
- [ ] Keep request payloads limited to `nodeId`, `incidentId`, `timeRange`, and `question`.

### Task 2: Add route and minimal entry

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/views/AIAnalysis.vue`

- [ ] Add an `AIChatAnalysis` route at `/ai-chat-analysis`.
- [ ] Add a minimal handoff entry from `AIAnalysis.vue` without changing its core structured-analysis flow.
- [ ] Pass only lightweight context through route query.

## Chunk 2: Page Composition

### Task 3: Build focused chat components

**Files:**
- Create: `frontend/src/components/ai-chat/ChatContextBar.vue`
- Create: `frontend/src/components/ai-chat/ChatMessageList.vue`
- Create: `frontend/src/components/ai-chat/RecommendedActionCards.vue`

- [ ] Render context chips and current AI status in a dedicated top bar.
- [ ] Render user and assistant messages with clear separation between answer, conclusion, and recommendations.
- [ ] Render recommended action cards as display-plus-navigation only; do not execute actions here.

### Task 4: Build the page shell

**Files:**
- Create: `frontend/src/views/AIChatAnalysis.vue`

- [ ] Read initial context from route query.
- [ ] Create a new short session on first submit.
- [ ] Append follow-up messages into the same session.
- [ ] Show a lightweight recent-session list without turning this into a full history center.
- [ ] Handle loading, empty state, and request error states.

## Chunk 3: AI Ops Handoff and Verification

### Task 5: Add prefill bridge into AI Ops assistant

**Files:**
- Modify: `frontend/src/views/AIOpsAssistant.vue`

- [ ] Read route query on entry.
- [ ] Preselect the recommended action when `actionId` is present.
- [ ] Prefill supported fields such as `eventId`, `incidentId`, `ruleId`, `comment`, `note`, `reason`, and `durationSec`.
- [ ] Keep user confirmation, dry-run, and confirm inside `AIOpsAssistant.vue`.

### Task 6: Verify frontend build

**Files:**
- Verify: `frontend/src/**/*`

- [ ] Run `npm run build` in `frontend`.
- [ ] Confirm `vue-tsc -b` and `vite build` both pass.
- [ ] Summarize intentionally retained simplifications, especially non-streaming behavior and minimal recent-session handling.
