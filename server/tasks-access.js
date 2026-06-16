// server/tasks-access.js

// =========================================================================
// TASKS ACCESS POLICY
// =========================================================================
// Keeps task visibility and mutation rules on the server. Non-admin accounts
// can only read tasks they created or were assigned. Authors can edit their
// tasks; assignees can only update status, comments and the unread marker.
// =========================================================================

const TASKS_RANGE = 'Tasks!A:N';
const TASK_COLUMN_COUNT = 14;
const TASK_STATUS_VALUES = new Set(['new', 'in_progress', 'done', 'cancelled']);

const COLUMN = Object.freeze({
  ID: 0,
  TITLE: 1,
  DESCRIPTION: 2,
  CATEGORY: 3,
  STATUS: 4,
  CREATED_BY: 5,
  ASSIGNED_TO: 6,
  DUE_DATE: 7,
  CREATED_AT: 8,
  UPDATED_AT: 9,
  UPDATED_BY: 10,
  COMMENTS: 11,
  CREATED_BY_DISPLAY: 12,
  IS_NEW: 13,
});

const AUTHOR_EDITABLE_COLUMNS = new Set([
  COLUMN.TITLE,
  COLUMN.DESCRIPTION,
  COLUMN.CATEGORY,
  COLUMN.STATUS,
  COLUMN.ASSIGNED_TO,
  COLUMN.DUE_DATE,
  COLUMN.COMMENTS,
]);

const ASSIGNEE_EDITABLE_COLUMNS = new Set([
  COLUMN.STATUS,
  COLUMN.COMMENTS,
]);

class TasksAccessError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'TasksAccessError';
    this.status = status;
  }
}

async function executeTasksRequest(body, account, sheets) {
  switch (body.action) {
    case 'get':
      return readVisibleTasks(body, account, sheets);
    case 'append':
      return appendTask(body, account, sheets);
    case 'update':
      return updateTask(body, account, sheets);
    case 'batchUpdateSpreadsheet':
      return deleteTask(body, account, sheets);
    default:
      throw new TasksAccessError(403, 'This operation is not allowed for tasks');
  }
}

async function readVisibleTasks(body, account, sheets) {
  if (!isFullTasksRange(body.range)) {
    throw new TasksAccessError(403, 'Tasks can only be read through the complete Tasks range');
  }

  const rows = await sheets.getValues(TASKS_RANGE, 'tasks');
  if (account.role === 'admin' || rows.length <= 1) return rows;

  return [
    rows[0],
    ...rows.slice(1).map(row => (
      canViewTask(normalizeRow(row), account)
        ? row
        : Array(TASK_COLUMN_COUNT).fill('')
    )),
  ];
}

async function appendTask(body, account, sheets) {
  if (!isFullTasksRange(body.range)) {
    throw new TasksAccessError(403, 'Tasks must be appended through the complete Tasks range');
  }

  const rows = requireSingleValuesRow(body.values);
  const row = normalizeRow(rows[0]);
  const now = new Date().toISOString();

  validateTaskId(row[COLUMN.ID]);
  validateTaskStatus(row[COLUMN.STATUS]);
  row[COLUMN.CREATED_BY] = account.username;
  row[COLUMN.CREATED_AT] = now;
  row[COLUMN.UPDATED_AT] = now;
  row[COLUMN.UPDATED_BY] = account.username;
  row[COLUMN.CREATED_BY_DISPLAY] = account.displayName || account.username;
  row[COLUMN.IS_NEW] = row[COLUMN.ASSIGNED_TO] ? '1' : '0';
  row[COLUMN.COMMENTS] = sanitizeAppendedComments('', row[COLUMN.COMMENTS], account);

  return sheets.appendValues(TASKS_RANGE, [row], 'tasks');
}

async function updateTask(body, account, sheets) {
  const parsedRange = parseTasksRange(body.range);
  if (!parsedRange || !parsedRange.rowNumber) {
    throw new TasksAccessError(403, 'Task update range is not allowed');
  }

  const values = requireSingleValuesRow(body.values);
  const current = await loadTaskRow(parsedRange.rowNumber, sheets);

  if (parsedRange.startColumn === 'N' && parsedRange.endColumn === 'N') {
    return updateUnreadMarker(body, values[0], current, account, sheets);
  }

  if (parsedRange.startColumn !== 'A' || parsedRange.endColumn !== 'N') {
    throw new TasksAccessError(403, 'Task update range is not allowed');
  }

  const isAdmin = account.role === 'admin';
  const isAuthor = identityEquals(current[COLUMN.CREATED_BY], account.username);
  const isAssignee = identityEquals(current[COLUMN.ASSIGNED_TO], account.username);
  if (!isAdmin && !isAuthor && !isAssignee) {
    throw new TasksAccessError(403, 'You cannot update this task');
  }

  const requested = normalizeRow(values[0]);
  const allowedColumns = isAdmin || isAuthor
    ? AUTHOR_EDITABLE_COLUMNS
    : ASSIGNEE_EDITABLE_COLUMNS;

  for (let index = 0; index < TASK_COLUMN_COUNT; index += 1) {
    if (
      requested[index] !== current[index]
      && !allowedColumns.has(index)
      && index !== COLUMN.UPDATED_AT
      && index !== COLUMN.UPDATED_BY
    ) {
      throw new TasksAccessError(403, 'This task field cannot be changed by the current account');
    }
  }

  const next = [...current];
  for (const index of allowedColumns) {
    next[index] = requested[index];
  }

  validateTaskStatus(next[COLUMN.STATUS]);
  if (requested[COLUMN.COMMENTS] !== current[COLUMN.COMMENTS] && !isAdmin) {
    next[COLUMN.COMMENTS] = sanitizeAppendedComments(
      current[COLUMN.COMMENTS],
      requested[COLUMN.COMMENTS],
      account
    );
  }
  if (next[COLUMN.ASSIGNED_TO] !== current[COLUMN.ASSIGNED_TO]) {
    next[COLUMN.IS_NEW] = next[COLUMN.ASSIGNED_TO] ? '1' : '0';
  }
  next[COLUMN.UPDATED_AT] = new Date().toISOString();
  next[COLUMN.UPDATED_BY] = account.username;

  return sheets.updateValues(
    `Tasks!A${parsedRange.rowNumber}:N${parsedRange.rowNumber}`,
    [next],
    'tasks'
  );
}

async function updateUnreadMarker(body, values, current, account, sheets) {
  const nextValue = String(values[0] ?? '').trim();
  const isAdmin = account.role === 'admin';
  const isAssignee = identityEquals(current[COLUMN.ASSIGNED_TO], account.username);

  if (String(body.taskId || '').trim() !== current[COLUMN.ID]) {
    throw new TasksAccessError(409, 'Task row changed; refresh and try again');
  }
  if (!isAdmin && !isAssignee) {
    throw new TasksAccessError(403, 'Only the assigned account can mark this task as viewed');
  }
  if (!['0', '1'].includes(nextValue) || (!isAdmin && nextValue !== '0')) {
    throw new TasksAccessError(400, 'Invalid task unread marker');
  }

  return sheets.updateValues(body.range, [[nextValue]], 'tasks');
}

async function deleteTask(body, account, sheets) {
  const requests = Array.isArray(body.requests) ? body.requests : [];
  if (requests.length !== 1) {
    throw new TasksAccessError(403, 'Only one task can be deleted at a time');
  }

  const range = requests[0]?.deleteDimension?.range;
  if (
    !range
    || range.dimension !== 'ROWS'
    || !Number.isInteger(range.startIndex)
    || !Number.isInteger(range.endIndex)
    || range.startIndex < 1
    || range.endIndex !== range.startIndex + 1
  ) {
    throw new TasksAccessError(403, 'Task deletion range is not allowed');
  }

  const rowNumber = range.startIndex + 1;
  const current = await loadTaskRow(rowNumber, sheets);
  if (String(body.entityId || '').trim() !== current[COLUMN.ID]) {
    throw new TasksAccessError(409, 'Task row changed; refresh and try again');
  }
  const isAuthor = identityEquals(current[COLUMN.CREATED_BY], account.username);
  if (account.role !== 'admin' && !isAuthor) {
    throw new TasksAccessError(403, 'Only the task author can delete this task');
  }

  return sheets.batchUpdateSpreadsheet(requests, 'tasks');
}

async function loadTaskRow(rowNumber, sheets) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new TasksAccessError(403, 'Task row is not allowed');
  }

  const rows = await sheets.getValues(`Tasks!A${rowNumber}:N${rowNumber}`, 'tasks');
  if (!rows[0] || !String(rows[0][COLUMN.ID] || '').trim()) {
    throw new TasksAccessError(404, 'Task not found');
  }
  return normalizeRow(rows[0]);
}

function canViewTask(row, account) {
  return account.role === 'admin'
    || identityEquals(row[COLUMN.CREATED_BY], account.username)
    || identityEquals(row[COLUMN.ASSIGNED_TO], account.username);
}

function sanitizeAppendedComments(currentValue, requestedValue, account) {
  const current = parseComments(currentValue);
  const requested = parseComments(requestedValue);

  if (requested.length < current.length) {
    throw new TasksAccessError(403, 'Existing task comments cannot be removed');
  }
  for (let index = 0; index < current.length; index += 1) {
    if (JSON.stringify(requested[index]) !== JSON.stringify(current[index])) {
      throw new TasksAccessError(403, 'Existing task comments cannot be changed');
    }
  }

  const now = new Date().toISOString();
  const appended = requested.slice(current.length).map(comment => {
    const text = String(comment?.text || '').trim();
    if (!text || text.length > 2000) {
      throw new TasksAccessError(400, 'Task comment must contain 1-2000 characters');
    }
    return {
      author: account.username,
      display_name: account.displayName || account.username,
      text,
      created_at: now,
    };
  });

  return current.length || appended.length
    ? JSON.stringify([...current, ...appended])
    : '';
}

function parseComments(value) {
  if (!String(value || '').trim()) return [];

  try {
    const comments = JSON.parse(value);
    if (!Array.isArray(comments)) {
      throw new Error('Comments must be an array');
    }
    return comments;
  } catch {
    throw new TasksAccessError(400, 'Task comments are invalid');
  }
}

function validateTaskStatus(value) {
  if (!TASK_STATUS_VALUES.has(String(value || '').trim())) {
    throw new TasksAccessError(400, 'Invalid task status');
  }
}

function validateTaskId(value) {
  const taskId = String(value || '').trim();
  if (!/^task-[A-Za-z0-9-]{6,80}$/.test(taskId)) {
    throw new TasksAccessError(400, 'Invalid task ID');
  }
}

function requireSingleValuesRow(values) {
  if (!Array.isArray(values) || values.length !== 1 || !Array.isArray(values[0])) {
    throw new TasksAccessError(400, 'Exactly one task row is required');
  }
  return values;
}

function normalizeRow(row) {
  return Array.from({ length: TASK_COLUMN_COUNT }, (_, index) => (
    row?.[index] == null ? '' : String(row[index]).trim()
  ));
}

function identityEquals(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function isFullTasksRange(range) {
  const parsed = parseTasksRange(range);
  return Boolean(
    parsed
    && !parsed.rowNumber
    && parsed.startColumn === 'A'
    && parsed.endColumn === 'N'
  );
}

function parseTasksRange(range) {
  if (typeof range !== 'string') return null;

  const match = range.trim().match(
    /^(?:Tasks|'Tasks')!\$?([A-Za-z]+)(?:\$?(\d+))?(?::\$?([A-Za-z]+)(?:\$?(\d+))?)?$/
  );
  if (!match) return null;

  const startColumn = match[1].toUpperCase();
  const startRow = match[2] ? Number.parseInt(match[2], 10) : null;
  const endColumn = (match[3] || match[1]).toUpperCase();
  const endRow = match[4] ? Number.parseInt(match[4], 10) : startRow;

  if (startRow !== endRow) return null;
  return {
    startColumn,
    endColumn,
    rowNumber: startRow,
  };
}

module.exports = {
  TasksAccessError,
  executeTasksRequest,
  parseTasksRange,
};
