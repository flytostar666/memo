(() => {
  "use strict";

  const STORAGE_KEY = "shiguang-notes-v1";
  const noteForm = document.querySelector("#note-form");
  const noteInput = document.querySelector("#note-input");
  const noteList = document.querySelector("#note-list");
  const emptyState = document.querySelector("#empty-state");
  const noteCount = document.querySelector("#note-count");
  const clearAllButton = document.querySelector("#clear-all");
  const characterCount = document.querySelector("#character-count");
  const todayLabel = document.querySelector("#today-label");
  const noteTemplate = document.querySelector("#note-template");
  const toast = document.querySelector("#toast");

  let notes = loadNotes();
  let toastTimer;

  function loadNotes() {
    try {
      const savedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (!Array.isArray(savedNotes)) {
        return [];
      }

      return savedNotes.filter(
        (note) =>
          note &&
          typeof note.id === "string" &&
          typeof note.content === "string" &&
          typeof note.createdAt === "string",
      );
    } catch {
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch {
      showToast("保存失败，浏览器存储空间可能已满");
      return false;
    }
  }

  function createNoteId() {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function renderNote(note) {
    const fragment = noteTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");
    const createdAt = new Date(note.createdAt);
    const validDate = !Number.isNaN(createdAt.getTime());

    card.dataset.noteId = note.id;
    fragment.querySelector(".note-content").textContent = note.content;
    fragment.querySelector(".note-time").textContent = validDate
      ? formatTime(createdAt)
      : "";
    fragment.querySelector(".note-date").textContent = validDate
      ? formatDate(createdAt)
      : "";

    const timeElement = fragment.querySelector(".note-time");
    if (validDate) {
      timeElement.dateTime = createdAt.toISOString();
    }
    fragment.querySelector(".delete-button").dataset.noteId = note.id;

    return fragment;
  }

  function updateInterface() {
    noteList.replaceChildren();

    notes.forEach((note) => {
      noteList.append(renderNote(note));
    });

    const hasNotes = notes.length > 0;
    emptyState.hidden = hasNotes;
    clearAllButton.hidden = !hasNotes;
    noteCount.textContent = `${notes.length} 条记录`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 2200);
  }

  function updateCharacterCount() {
    characterCount.textContent = `${noteInput.value.length} / 5000`;
  }

  noteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const content = noteInput.value.trim();
    if (!content) {
      noteInput.focus();
      showToast("请先写下一些内容");
      return;
    }

    const note = {
      id: createNoteId(),
      content,
      createdAt: new Date().toISOString(),
    };

    notes = [note, ...notes];
    if (!saveNotes()) {
      notes = notes.slice(1);
      return;
    }

    updateInterface();
    noteInput.value = "";
    updateCharacterCount();
    noteInput.focus();
    showToast("已添加到备忘录");
  });

  noteInput.addEventListener("input", updateCharacterCount);

  noteInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      noteForm.requestSubmit();
    }
  });

  noteList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".delete-button");
    if (!deleteButton) {
      return;
    }

    const noteId = deleteButton.dataset.noteId;
    const previousNotes = notes;
    notes = notes.filter((note) => note.id !== noteId);

    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }

    updateInterface();
    showToast("记录已删除");
  });

  clearAllButton.addEventListener("click", () => {
    if (!window.confirm("确定要清空全部记录吗？此操作无法撤销。")) {
      return;
    }

    const previousNotes = notes;
    notes = [];

    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }

    updateInterface();
    showToast("全部记录已清空");
  });

  todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  updateCharacterCount();
  updateInterface();
})();
