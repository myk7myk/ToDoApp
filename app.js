const STORAGE_KEY = "blaze-todos-v1";
const STREAK_KEY = "blaze-streak-v1";

const todoForm = document.getElementById("todoForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const reminderInput = document.getElementById("reminderInput");
const todoList = document.getElementById("todoList");
const template = document.getElementById("todoItemTemplate");
const clearDoneBtn = document.getElementById("clearDone");
const enableNotificationBtn = document.getElementById("enableNotification");
const notificationStatus = document.getElementById("notificationStatus");

const doneCount = document.getElementById("doneCount");
const activeCount = document.getElementById("activeCount");
const streakCount = document.getElementById("streakCount");

let todos = loadTodos();
let reminderTimers = new Map();

init();

function init() {
  render();
  scheduleAllReminders();
  updateNotificationStatus();
  updateStreak(false);
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  const todo = {
    id: crypto.randomUUID(),
    text,
    priority: priorityInput.value,
    done: false,
    createdAt: new Date().toISOString(),
    reminderAt: reminderInput.value ? new Date(reminderInput.value).toISOString() : null,
  };

  todos.unshift(todo);
  persistAndRender();
  scheduleReminder(todo);

  todoForm.reset();
  priorityInput.value = "medium";
  toastMotivation("新しいミッションを追加！この勢いでいこう🔥");
});

clearDoneBtn.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.done);
  persistAndRender();
});

enableNotificationBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    notificationStatus.textContent = "通知: このブラウザは未対応";
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationStatus(permission);

  if (permission === "granted") {
    showNotification("BlazeTodo", "通知オン！あなたの集中タイムを全力サポートします。");
  }
});

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  render();
}

function render() {
  todoList.innerHTML = "";

  todos.forEach((todo) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const toggle = node.querySelector(".toggle");
    const taskText = node.querySelector(".task-text");
    const priorityPill = node.querySelector(".priority");
    const reminderPill = node.querySelector(".reminder");
    const deleteBtn = node.querySelector(".delete");

    toggle.checked = todo.done;
    taskText.textContent = todo.text;
    taskText.classList.toggle("done", todo.done);

    priorityPill.textContent = formatPriority(todo.priority);
    priorityPill.classList.add(todo.priority);

    reminderPill.textContent = todo.reminderAt
      ? `⏰ ${new Date(todo.reminderAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
      : "通知なし";

    toggle.addEventListener("change", () => {
      todo.done = toggle.checked;
      persistAndRender();
      if (todo.done) {
        updateStreak(true);
        toastMotivation("ナイス完了！次の一手でさらに差をつけよう⚡");
      }
    });

    deleteBtn.addEventListener("click", () => {
      todos = todos.filter((item) => item.id !== todo.id);
      clearReminder(todo.id);
      persistAndRender();
    });

    todoList.appendChild(node);
  });

  const done = todos.filter((todo) => todo.done).length;
  doneCount.textContent = done;
  activeCount.textContent = todos.length - done;
}

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function formatPriority(priority) {
  if (priority === "high") return "🔥 高";
  if (priority === "low") return "🌱 低";
  return "⚡ 中";
}

function scheduleAllReminders() {
  todos.forEach(scheduleReminder);
}

function scheduleReminder(todo) {
  clearReminder(todo.id);
  if (!todo.reminderAt || todo.done) return;

  const delay = new Date(todo.reminderAt).getTime() - Date.now();
  if (delay <= 0) return;

  const timer = setTimeout(() => {
    showNotification("タスク通知", `「${todo.text}」の時間です。今が動くチャンス！`);
  }, delay);

  reminderTimers.set(todo.id, timer);
}

function clearReminder(todoId) {
  const timer = reminderTimers.get(todoId);
  if (timer) {
    clearTimeout(timer);
    reminderTimers.delete(todoId);
  }
}

function showNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "https://fav.farm/✅" });
}

function updateNotificationStatus(permission) {
  if (!("Notification" in window)) {
    notificationStatus.textContent = "通知: このブラウザは未対応";
    return;
  }

  const currentPermission = permission ?? Notification.permission;

  const map = {
    granted: "通知: オン",
    denied: "通知: ブロック中",
    default: "通知: 未許可",
  };
  notificationStatus.textContent = map[currentPermission] ?? "通知: 未許可";
}

function updateStreak(increment) {
  const today = new Date().toISOString().slice(0, 10);
  const streakData = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastDate":null,"count":0}');

  if (increment) {
    if (streakData.lastDate === today) {
      streakCount.textContent = streakData.count;
      return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streakData.count = streakData.lastDate === yesterday ? streakData.count + 1 : 1;
    streakData.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streakData));

    if (streakData.count > 1) {
      showNotification("連続達成更新！", `${streakData.count}日連続でミッション達成中。最高です。`);
    }
  }

  streakCount.textContent = streakData.count;
}

function toastMotivation(message) {
  if ("Notification" in window && Notification.permission === "granted") {
    showNotification("BlazeTodo", message);
  }
}
