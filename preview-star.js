(() => {
  "use strict";

  const STORAGE_KEY = "star-memo-notes-v1";
  const LEGACY_STORAGE_KEY = "shiguang-notes-v1";
  const VAULT_STATE_KEY = "star-memo-vault-state-v2";
  const VAULT_CONFIG_KEY = "star-memo-vault-config-v1";
  const VAULT_ITEMS_KEY = "star-memo-vault-items-v1";
  const VAULT_ITERATIONS = 1200000;
  const VAULT_CHECK_VALUE = "star-memo-vault-check-v1";
  const VAULT_AUTO_LOCK_MS = 2 * 60 * 1000;
  const FILTERS = {
    all: {
      title: "全部记录",
      emptyTitle: "这片星空还没有记录",
      emptyDescription: "写下第一条备忘，让在这里留下一颗属于你的星。",
    },
    memo: {
      title: "备忘录",
      emptyTitle: "备忘录还是一张白纸",
      emptyDescription: "把需要记住的事情写下来，它们会在这里安静发光。",
    },
    encrypted: {
      title: "加密星匣",
      emptyTitle: "加密星匣尚未开启",
      emptyDescription: "这里还没有密码记录。新的内容会加密保存在本机。",
    },
    trash: {
      title: "回收站",
      emptyTitle: "回收站里空无一物",
      emptyDescription: "被删除的记录会暂时停留在这里，确认后再永久移除。",
    },
  };

  const canvas = document.querySelector("#star-canvas");
  const context = canvas.getContext("2d");
  const noteGrid = document.querySelector("#note-grid");
  const noteTemplate = document.querySelector("#note-template");
  const vaultTemplate = document.querySelector("#vault-template");
  const secureNoteTemplate = document.querySelector("#secure-note-template");
  const emptyState = document.querySelector("#empty-state");
  const emptyTitle = document.querySelector("#empty-title");
  const emptyDescription = document.querySelector("#empty-description");
  const recordsTitle = document.querySelector("#records-title");
  const totalCount = document.querySelector("#total-count");
  const searchInput = document.querySelector("#search-input");
  const clearTrashButton = document.querySelector("#clear-trash-button");
  const lockVaultButton = document.querySelector("#lock-vault-button");
  const demoBanner = document.querySelector("#demo-banner");
  const clearDemoButton = document.querySelector("#clear-demo-button");
  const editorDialog = document.querySelector("#editor-dialog");
  const editorForm = document.querySelector("#editor-form");
  const editorTitle = document.querySelector("#editor-title");
  const noteTitleInput = document.querySelector("#note-title-input");
  const noteContent = document.querySelector("#note-content");
  const editorCharacterCount = document.querySelector("#editor-character-count");
  const saveNoteLabel = document.querySelector("#save-note-label");
  const vaultAuthDialog = document.querySelector("#vault-auth-dialog");
  const vaultAuthForm = document.querySelector("#vault-auth-form");
  const vaultAuthTitle = document.querySelector("#vault-auth-title");
  const vaultAuthDescription = document.querySelector(
    "#vault-auth-description",
  );
  const vaultPin = document.querySelector("#vault-pin");
  const vaultPinConfirm = document.querySelector("#vault-pin-confirm");
  const vaultPinConfirmGroup = document.querySelector(
    "#vault-pin-confirm-group",
  );
  const vaultAuthError = document.querySelector("#vault-auth-error");
  const vaultAuthSubmit = document.querySelector("#vault-auth-submit");
  const vaultAuthSubmitLabel = document.querySelector(
    "#vault-auth-submit-label",
  );
  const resetVaultPasswordButton = document.querySelector(
    "#reset-vault-password-button",
  );
  const vaultModeSelector = document.querySelector("#vault-mode-selector");
  const vaultModeButtons = [
    ...document.querySelectorAll("[data-vault-mode]"),
  ];
  const passwordModeCount = document.querySelector("#password-mode-count");
  const secureNoteModeCount = document.querySelector(
    "#secure-note-mode-count",
  );
  const vaultResetDialog = document.querySelector("#vault-reset-dialog");
  const vaultResetForm = document.querySelector("#vault-reset-form");
  const currentVaultPin = document.querySelector("#current-vault-pin");
  const newVaultPin = document.querySelector("#new-vault-pin");
  const confirmVaultPin = document.querySelector("#confirm-vault-pin");
  const vaultResetError = document.querySelector("#vault-reset-error");
  const vaultResetSubmit = document.querySelector("#vault-reset-submit");
  const vaultResetSubmitLabel = document.querySelector(
    "#vault-reset-submit-label",
  );
  const passwordEditorDialog = document.querySelector(
    "#password-editor-dialog",
  );
  const passwordEditorForm = document.querySelector("#password-editor-form");
  const passwordEditorTitle = document.querySelector("#password-editor-title");
  const passwordTitle = document.querySelector("#password-title");
  const passwordAccount = document.querySelector("#password-account");
  const passwordValue = document.querySelector("#password-value");
  const passwordNotes = document.querySelector("#password-notes");
  const savePasswordLabel = document.querySelector("#save-password-label");
  const secureNoteEditorDialog = document.querySelector(
    "#secure-note-editor-dialog",
  );
  const secureNoteEditorForm = document.querySelector(
    "#secure-note-editor-form",
  );
  const secureNoteEditorTitle = document.querySelector(
    "#secure-note-editor-title",
  );
  const secureNoteTitle = document.querySelector("#secure-note-title");
  const secureNoteContent = document.querySelector("#secure-note-content");
  const saveSecureNoteLabel = document.querySelector(
    "#save-secure-note-label",
  );
  const importFile = document.querySelector("#import-file");
  const toast = document.querySelector("#toast");
  const categoryTabs = [...document.querySelectorAll(".category-tab")];

  const initialVaultState = loadVaultState();
  let notes = loadNotes();
  let vaultConfig = initialVaultState.config;
  let encryptedVaultRecords = initialVaultState.records;
  let vaultKey = null;
  let decryptedVaultItems = [];
  let vaultUnlocked = false;
  let editingVaultId = null;
  let editingSecureNoteId = null;
  let vaultMode = "password";
  let vaultLockTimer;
  let vaultFailedAttempts = 0;
  let vaultRetryAfter = 0;
  let activeFilter = "all";
  let searchQuery = "";
  let editingId = null;
  let toastTimer;

  function createDemoNotes() {
    const now = Date.now();
    return [
      {
        id: "demo-star-1",
        content:
          "今晚的星空\n把喜欢的事慢慢做好，也是一种闪耀。\n记得给自己留一点安静的时间。",
        category: "memo",
        pinned: true,
        createdAt: new Date(now - 1000 * 60 * 36).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 36).toISOString(),
        deletedAt: null,
        isDemo: true,
      },
      {
        id: "demo-star-2",
        content:
          "周末小小计划\n去天文馆看秋季星空展，回程买一杯热拿铁。\n晚上整理这一周拍下的照片。",
        category: "memo",
        pinned: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        deletedAt: null,
        isDemo: true,
      },
      {
        id: "demo-star-3",
        content:
          "给未来的一封信\n希望下个月的你，仍然对生活保持好奇，\n也别忘了抬头看看星星。",
        category: "memo",
        pinned: false,
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        deletedAt: null,
        isDemo: true,
      },
    ];
  }

  function normalizeNote(note) {
    if (!note) {
      return null;
    }

    const title = typeof note.title === "string" ? note.title.trim() : "";
    const content = typeof note.content === "string" ? note.content : "";
    if (!title && !content.trim()) {
      return null;
    }

    const createdAt = validDate(note.createdAt)
      ? note.createdAt
      : new Date().toISOString();
    const updatedAt = validDate(note.updatedAt) ? note.updatedAt : createdAt;

    return {
      id: typeof note.id === "string" ? note.id : createId(),
      title,
      content,
      category: note.category === "encrypted" ? "encrypted" : "memo",
      pinned: Boolean(note.pinned) && !note.deletedAt,
      createdAt,
      updatedAt,
      deletedAt: validDate(note.deletedAt) ? note.deletedAt : null,
      isDemo: Boolean(note.isDemo),
    };
  }

  function validDate(value) {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
  }

  function isValidVaultConfig(config) {
    return Boolean(
      config &&
        config.version === 1 &&
        typeof config.salt === "string" &&
        Number.isInteger(config.iterations) &&
        config.iterations >= 310000 &&
        typeof config.verifier?.iv === "string" &&
        typeof config.verifier?.ciphertext === "string",
    );
  }

  function loadVaultState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(VAULT_STATE_KEY) ?? "null");
      const records = Array.isArray(parsed?.records) ? parsed.records : null;
      const validRecords =
        records &&
        records.every(
          (record) =>
            record &&
            typeof record.id === "string" &&
            typeof record.iv === "string" &&
            typeof record.ciphertext === "string",
        );

      if (isValidVaultConfig(parsed?.config) && validRecords) {
        return {
          config: parsed.config,
          records,
        };
      }
    } catch {
      // Fall back to the two-key format used by earlier previews.
    }

    return {
      config: loadVaultConfig(),
      records: loadEncryptedVaultRecords(),
    };
  }

  function loadVaultConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(VAULT_CONFIG_KEY) ?? "null");
      return isValidVaultConfig(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function loadEncryptedVaultRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(VAULT_ITEMS_KEY) ?? "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (record) =>
          record &&
          typeof record.id === "string" &&
          typeof record.iv === "string" &&
          typeof record.ciphertext === "string",
      );
    } catch {
      return [];
    }
  }

  function saveVaultConfig() {
    try {
      localStorage.setItem(
        VAULT_STATE_KEY,
        JSON.stringify({
          version: 2,
          config: vaultConfig,
          records: encryptedVaultRecords,
        }),
      );
      localStorage.removeItem(VAULT_CONFIG_KEY);
      localStorage.removeItem(VAULT_ITEMS_KEY);
      return true;
    } catch {
      showToast("加密配置保存失败");
      return false;
    }
  }

  function saveEncryptedVaultRecords() {
    try {
      localStorage.setItem(
        VAULT_STATE_KEY,
        JSON.stringify({
          version: 2,
          config: vaultConfig,
          records: encryptedVaultRecords,
        }),
      );
      localStorage.removeItem(VAULT_CONFIG_KEY);
      localStorage.removeItem(VAULT_ITEMS_KEY);
      return true;
    } catch {
      showToast("加密记录保存失败");
      return false;
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), (character) =>
      character.charCodeAt(0),
    );
  }

  async function deriveVaultKey(pin, salt, iterations = VAULT_ITERATIONS) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async function encryptValue(value, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintext,
    );

    return {
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    };
  }

  async function decryptValue(encryptedValue, key) {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(encryptedValue.iv),
      },
      key,
      base64ToBytes(encryptedValue.ciphertext),
    );

    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  async function buildVaultConfig(pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveVaultKey(pin, salt, VAULT_ITERATIONS);
    const verifier = await encryptValue(VAULT_CHECK_VALUE, key);

    return {
      config: {
        version: 1,
        salt: bytesToBase64(salt),
        iterations: VAULT_ITERATIONS,
        verifier,
      },
      key,
    };
  }

  async function createVaultConfig(pin) {
    const created = await buildVaultConfig(pin);
    vaultConfig = created.config;

    if (!saveVaultConfig()) {
      vaultConfig = null;
      throw new Error("Unable to save vault configuration.");
    }

    return created.key;
  }

  function resetVaultPasswordState() {
    currentVaultPin.value = "";
    newVaultPin.value = "";
    confirmVaultPin.value = "";
    vaultResetError.hidden = true;
    vaultResetError.textContent = "";
    vaultResetDialog.classList.remove("is-busy");
    vaultResetSubmit.disabled = false;
    vaultResetSubmitLabel.textContent = "更新密码";
  }

  async function verifyVaultPin(pin) {
    if (!vaultConfig) {
      return null;
    }

    const key = await deriveVaultKey(
      pin,
      base64ToBytes(vaultConfig.salt),
      vaultConfig.iterations,
    );
    const verification = await decryptValue(vaultConfig.verifier, key);
    return verification === VAULT_CHECK_VALUE ? key : null;
  }

  async function decryptVaultItems(key) {
    const results = await Promise.allSettled(
      encryptedVaultRecords.map(async (record) => {
        const payload = await decryptValue(record, key);
        return {
          ...payload,
          id: record.id,
        };
      }),
    );

    return results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
  }

  function loadNotes() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        const parsed = JSON.parse(current);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeNote).filter(Boolean);
        }
      }

      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "[]");
      if (Array.isArray(legacy) && legacy.length > 0) {
        return legacy
          .map((note) =>
            normalizeNote({
              ...note,
              category: "memo",
              updatedAt: note.createdAt,
              deletedAt: null,
            }),
          )
          .filter(Boolean);
      }
    } catch {
      return createDemoNotes();
    }

    return createDemoNotes();
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

  function createId() {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function dateLabel(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function splitContent(content) {
    const lines = content.trim().split(/\r?\n/);
    return {
      title: lines[0] || "无标题记录",
      body: lines.slice(1).join("\n").trim(),
    };
  }

  function getNoteParts(note) {
    if (typeof note.title === "string" && note.title.trim()) {
      return {
        title: note.title.trim(),
        body: note.content.trim(),
      };
    }

    return splitContent(note.content || "");
  }

  function countFor(filter) {
    if (filter === "trash") {
      return notes.filter((note) => note.deletedAt).length;
    }

    if (filter === "encrypted") {
      return (
        encryptedVaultRecords.length +
        notes.filter(
          (note) =>
            !note.deletedAt && note.category === "encrypted" && !note.isDemo,
        ).length
      );
    }

    return notes.filter((note) => {
      if (note.deletedAt) {
        return false;
      }
      return filter === "all" || note.category === filter;
    }).length;
  }

  function visibleNotes() {
    const query = searchQuery.trim().toLocaleLowerCase("zh-CN");
    return notes
      .filter((note) => {
        const inRequestedCategory =
          activeFilter === "trash"
            ? Boolean(note.deletedAt)
            : !note.deletedAt &&
              (activeFilter === "all" || note.category === activeFilter);

        if (!inRequestedCategory) {
          return false;
        }

        return (
          !query ||
          `${note.title || ""}\n${note.content || ""}`
            .toLocaleLowerCase("zh-CN")
            .includes(query)
        );
      })
      .sort((a, b) => {
        if (activeFilter === "trash") {
          return new Date(b.deletedAt) - new Date(a.deletedAt);
        }

        if (a.pinned !== b.pinned) {
          return Number(b.pinned) - Number(a.pinned);
        }

        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
  }

  function renderCard(note) {
    const fragment = noteTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");
    const { title, body } = getNoteParts(note);
    const isTrash = Boolean(note.deletedAt);

    card.dataset.noteId = note.id;
    card.classList.toggle("is-pinned", note.pinned && !isTrash);
    card.classList.toggle("is-encrypted", note.category === "encrypted");
    card.classList.toggle("is-demo", note.isDemo);

    card.querySelector(".badge-text").textContent =
      note.category === "encrypted" ? "加密分类" : "备忘录";
    card.querySelector(".demo-label").hidden = !note.isDemo;
    card.querySelector(".note-title").textContent = title;
    card.querySelector(".note-body").textContent = body;

    const timeElement = card.querySelector(".note-time");
    const displayDate = isTrash ? note.deletedAt : note.updatedAt;
    timeElement.dateTime = displayDate;
    timeElement.textContent = dateLabel(displayDate);
    card.querySelector(".edited-label").hidden =
      isTrash || note.updatedAt === note.createdAt;

    const pinButton = card.querySelector(".pin-button");
    pinButton.hidden = isTrash;
    pinButton.setAttribute(
      "aria-label",
      note.pinned ? "取消置顶" : "置顶这条记录",
    );

    card.querySelector(".edit-action").hidden = isTrash;
    card.querySelector(".copy-action").hidden = isTrash;
    card.querySelector(".restore-action").hidden = !isTrash;
    card.querySelector(".danger-action").textContent = isTrash
      ? "彻底删除"
      : "删除";

    return fragment;
  }

  function renderVaultCard(item) {
    const fragment = vaultTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");

    card.dataset.vaultId = item.id;
    card.querySelector(".password-title").textContent =
      item.title || "未命名密码";
    card.querySelector(".password-account").textContent = item.account
      ? `账号：${item.account}`
      : "";
    card.querySelector(".secret-row").hidden = !item.password;
    card.querySelector(".secret-value").textContent = item.password
      ? "••••••••••"
      : "";
    card.querySelector(".password-notes").textContent = item.notes || "";

    const dateElement = card.querySelector(".password-date");
    dateElement.dateTime = item.updatedAt;
    dateElement.textContent = dateLabel(item.updatedAt);

    return fragment;
  }

  function renderSecureNoteCard(item) {
    const fragment = secureNoteTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".note-card");

    card.dataset.vaultId = item.id;
    card.querySelector(".secure-note-title").textContent =
      item.title || "未命名加密备忘";
    card.querySelector(".secure-note-body").textContent = item.content || "";

    const dateElement = card.querySelector(".secure-note-date");
    dateElement.dateTime = item.updatedAt;
    dateElement.textContent = dateLabel(item.updatedAt);

    return fragment;
  }

  function visibleVaultItems() {
    const query = searchQuery.trim().toLocaleLowerCase("zh-CN");
    return decryptedVaultItems
      .filter((item) => {
        const kind = item.kind === "password" ? "password" : "note";
        if (kind !== vaultMode) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          item.title,
          item.account,
          item.notes,
          item.password,
          item.content,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("zh-CN").includes(query),
          );
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function updateCounts() {
    Object.keys(FILTERS).forEach((filter) => {
      const counter = document.querySelector(`[data-count-for="${filter}"]`);
      counter.textContent = countFor(filter);
    });

    totalCount.textContent = countFor("all") + encryptedVaultRecords.length;
    clearTrashButton.hidden = activeFilter !== "trash" || countFor("trash") === 0;
    lockVaultButton.hidden = activeFilter !== "encrypted" || !vaultUnlocked;
    resetVaultPasswordButton.hidden =
      activeFilter !== "encrypted" || !vaultUnlocked;
    vaultModeSelector.hidden =
      activeFilter !== "encrypted" || !vaultUnlocked;
    passwordModeCount.textContent = decryptedVaultItems.filter(
      (item) => item.kind === "password",
    ).length;
    secureNoteModeCount.textContent = decryptedVaultItems.filter(
      (item) => item.kind !== "password",
    ).length;
    vaultModeButtons.forEach((button) => {
      const selected = button.dataset.vaultMode === vaultMode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    demoBanner.hidden =
      !notes.some((note) => note.isDemo && !note.deletedAt) ||
      activeFilter === "trash" ||
      activeFilter === "encrypted";
  }

  function render() {
    const visible =
      activeFilter === "encrypted" ? visibleVaultItems() : visibleNotes();
    const config =
      activeFilter === "encrypted"
        ? {
            ...FILTERS.encrypted,
            title: vaultMode === "password" ? "密码记录" : "加密备忘",
            emptyTitle:
              vaultMode === "password"
                ? "还没有密码记录"
                : "还没有加密备忘",
            emptyDescription:
              vaultMode === "password"
                ? "账号和密码会加密保存在这里，离开后自动锁定。"
                : "写下需要保护的私人记录，标题与正文都会加密保存。",
          }
        : FILTERS[activeFilter];

    recordsTitle.textContent = config.title;
    noteGrid.classList.toggle("vault-grid", activeFilter === "encrypted");
    noteGrid.replaceChildren();

    visible.forEach((item, index) => {
      const card =
        activeFilter === "encrypted"
          ? vaultMode === "password"
            ? renderVaultCard(item)
            : renderSecureNoteCard(item)
          : renderCard(item);
      const article = card.querySelector(".note-card");
      article.style.animationDelay = `${Math.min(index * 35, 210)}ms`;
      noteGrid.append(card);
    });

    emptyState.hidden = visible.length > 0;
    emptyTitle.textContent = searchQuery ? "没有找到相关星光" : config.emptyTitle;
    emptyDescription.textContent = searchQuery
      ? "换一个关键词试试，或清空搜索查看全部记录。"
      : config.emptyDescription;

    categoryTabs.forEach((tab) => {
      const selected = tab.dataset.filter === activeFilter;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });

    updateCounts();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function lockVault(showMessage = false) {
    window.clearTimeout(vaultLockTimer);
    vaultKey = null;
    vaultUnlocked = false;
    decryptedVaultItems = [];
    vaultPin.value = "";
    vaultPinConfirm.value = "";

    if (passwordEditorDialog.open) {
      passwordEditorDialog.close();
    }

    if (secureNoteEditorDialog.open) {
      secureNoteEditorDialog.close();
    }

    if (vaultResetDialog.open) {
      resetVaultPasswordState();
      vaultResetDialog.close();
    }

    if (vaultAuthDialog.open) {
      vaultAuthDialog.close();
    }

    lockVaultButton.hidden = true;
    resetVaultPasswordButton.hidden = true;
    if (showMessage) {
      showToast("加密星匣已锁定");
    }
  }

  function setFilter(filter) {
    if (!FILTERS[filter]) {
      return;
    }

    if (filter === "encrypted") {
      lockVault();
      openVaultAuth();
      return;
    }

    if (activeFilter === "encrypted" || vaultUnlocked) {
      lockVault();
    }

    activeFilter = filter;
    render();
  }

  function openVaultAuth() {
    const isSetup = !vaultConfig;
    vaultAuthError.hidden = true;
    vaultPin.value = "";
    vaultPin.type = "password";
    vaultPinConfirm.value = "";
    vaultPinConfirm.type = "password";
    vaultPinConfirmGroup.hidden = !isSetup;
    vaultAuthTitle.textContent = isSetup ? "设置加密密码" : "解锁加密星匣";
    vaultAuthDescription.textContent = isSetup
      ? "首次使用，请设置 6 位数字密码。它只用于在本机解锁密码记录。"
      : "输入 6 位访问密码，查看加密保存的密码记录。";
    vaultAuthSubmitLabel.textContent = isSetup ? "创建星匣" : "解锁星匣";
    vaultAuthDialog.classList.remove("is-busy");
    vaultAuthSubmit.disabled = false;
    vaultAuthDialog.showModal();
    window.setTimeout(() => vaultPin.focus(), 0);
  }

  function closeVaultAuthDialog() {
    if (vaultAuthDialog.classList.contains("is-busy")) {
      return;
    }
    vaultPin.value = "";
    vaultPinConfirm.value = "";
    vaultAuthDialog.close();
  }

  function openVaultPasswordReset() {
    if (!vaultUnlocked || !vaultConfig || !vaultKey) {
      openVaultAuth();
      return;
    }

    resetVaultPasswordState();
    vaultResetDialog.showModal();
    window.setTimeout(() => currentVaultPin.focus(), 0);
  }

  function closeVaultResetDialog() {
    if (vaultResetDialog.classList.contains("is-busy")) {
      return;
    }
    resetVaultPasswordState();
    vaultResetDialog.close();
  }

  function setVaultResetBusy(isBusy) {
    vaultResetDialog.classList.toggle("is-busy", isBusy);
    vaultResetSubmit.disabled = isBusy;
    vaultResetSubmitLabel.textContent = isBusy ? "正在更新…" : "更新密码";
  }

  function showVaultResetError(message) {
    vaultResetError.textContent = message;
    vaultResetError.hidden = !message;
  }

  async function handleVaultPasswordReset(event) {
    event.preventDefault();
    showVaultResetError("");

    if (!vaultUnlocked || !vaultConfig || !vaultKey) {
      closeVaultResetDialog();
      openVaultAuth();
      return;
    }

    const now = Date.now();
    if (vaultRetryAfter > now) {
      const seconds = Math.ceil((vaultRetryAfter - now) / 1000);
      showVaultResetError(`错误次数较多，请等待 ${seconds} 秒后再试。`);
      return;
    }

    const oldPin = currentVaultPin.value;
    const nextPin = newVaultPin.value;
    if (
      !/^\d{6}$/.test(oldPin) ||
      !/^\d{6}$/.test(nextPin) ||
      !/^\d{6}$/.test(confirmVaultPin.value)
    ) {
      showVaultResetError("原密码和新密码都必须是完整的 6 位数字。");
      return;
    }
    if (nextPin !== confirmVaultPin.value) {
      showVaultResetError("两次输入的新密码不一致。");
      confirmVaultPin.focus();
      return;
    }
    if (nextPin === oldPin) {
      showVaultResetError("新密码不能与原密码相同。");
      newVaultPin.focus();
      return;
    }

    setVaultResetBusy(true);

    try {
      const verifiedKey = await verifyVaultPin(oldPin);
      if (!verifiedKey) {
        vaultFailedAttempts += 1;
        if (vaultFailedAttempts >= 5) {
          vaultRetryAfter = Date.now() + 30_000;
          vaultFailedAttempts = 0;
          throw new Error("Too many attempts");
        }
        throw new Error("Invalid PIN");
      }

      const items = await decryptVaultItems(vaultKey);
      if (items.length !== encryptedVaultRecords.length) {
        throw new Error("Corrupt vault");
      }

      const created = await buildVaultConfig(nextPin);
      const reencryptedRecords = await Promise.all(
        items.map(async (item) => {
          const { id, ...payload } = item;
          const encrypted = await encryptValue(payload, created.key);
          return {
            id,
            ...encrypted,
          };
        }),
      );

      const previousConfig = vaultConfig;
      const previousRecords = encryptedVaultRecords;
      vaultConfig = created.config;
      encryptedVaultRecords = reencryptedRecords;

      if (!saveVaultConfig()) {
        vaultConfig = previousConfig;
        encryptedVaultRecords = previousRecords;
        throw new Error("Unable to save new password");
      }

      vaultKey = created.key;
      decryptedVaultItems = items;
      vaultFailedAttempts = 0;
      vaultRetryAfter = 0;
      setVaultResetBusy(false);
      resetVaultPasswordState();
      vaultResetDialog.close();
      render();
      resetVaultLockTimer();
      showToast("加密密码已更新，所有记录已重新加密");
    } catch (error) {
      currentVaultPin.value = "";
      newVaultPin.value = "";
      confirmVaultPin.value = "";
      const message =
        error.message === "Too many attempts"
          ? "连续输错 5 次，已暂时锁定 30 秒。"
          : error.message === "Corrupt vault"
            ? "部分加密记录无法读取，已取消改密。"
            : error.message === "Unable to save new password"
              ? "新密码保存失败，原数据未改变。"
              : "原密码不正确，请重新输入。";
      showVaultResetError(message);
      currentVaultPin.focus();
    } finally {
      setVaultResetBusy(false);
    }
  }

  function showVaultAuthError(message) {
    vaultAuthError.textContent = message;
    vaultAuthError.hidden = !message;
  }

  function setVaultAuthBusy(isBusy, label) {
    vaultAuthDialog.classList.toggle("is-busy", isBusy);
    vaultAuthSubmit.disabled = isBusy;
    vaultAuthSubmitLabel.textContent =
      label ?? (vaultConfig ? "解锁星匣" : "创建星匣");
  }

  function finishVaultUnlock(key) {
    vaultFailedAttempts = 0;
    vaultRetryAfter = 0;
    vaultKey = key;
    vaultUnlocked = true;
    vaultPin.value = "";
    vaultPinConfirm.value = "";
    vaultAuthDialog.close();
    activeFilter = "encrypted";
    render();
    resetVaultLockTimer();
    showToast("加密星匣已解锁，离开分类后会重新锁定");
  }

  async function migrateLegacyEncryptedNotes(key) {
    const legacyNotes = notes.filter(
      (note) => note.category === "encrypted" && !note.deletedAt,
    );
    if (legacyNotes.length === 0) {
      return 0;
    }

    const migratedRecords = await Promise.all(
      legacyNotes.map(async (note) => {
        const { title, body } = getNoteParts(note);
        const payload = {
          kind: "note",
          title,
          account: "",
          password: "",
          notes: body || note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        };
        const encrypted = await encryptValue(payload, key);
        return {
          id: note.id,
          ...encrypted,
        };
      }),
    );

    const previousRecords = encryptedVaultRecords;
    const legacyIds = new Set(legacyNotes.map((note) => note.id));
    encryptedVaultRecords = [
      ...migratedRecords,
      ...encryptedVaultRecords.filter(
        (record) => !legacyIds.has(record.id),
      ),
    ];

    if (!saveEncryptedVaultRecords()) {
      encryptedVaultRecords = previousRecords;
      return 0;
    }

    const previousNotes = notes;
    notes = notes.filter((note) => !legacyIds.has(note.id));
    if (!saveNotes()) {
      notes = previousNotes;
    }
    return migratedRecords.length;
  }

  async function handleVaultAuthSubmit(event) {
    event.preventDefault();
    showVaultAuthError("");

    if (!window.crypto?.subtle) {
      showVaultAuthError("当前浏览器不支持安全加密，请使用新版 Edge 或 Chrome。");
      return;
    }

    const now = Date.now();
    if (vaultRetryAfter > now) {
      const seconds = Math.ceil((vaultRetryAfter - now) / 1000);
      showVaultAuthError(`错误次数较多，请等待 ${seconds} 秒后再试。`);
      return;
    }

    const pin = vaultPin.value;
    if (!/^\d{6}$/.test(pin)) {
      showVaultAuthError("请输入完整的 6 位数字密码。");
      vaultPin.focus();
      return;
    }

    if (!vaultConfig) {
      if (vaultPinConfirm.value !== pin) {
        showVaultAuthError("两次输入的密码不一致。");
        vaultPinConfirm.focus();
        return;
      }
    }

    setVaultAuthBusy(true, vaultConfig ? "正在解锁…" : "正在创建…");

    try {
      let key;
      if (!vaultConfig) {
        key = await createVaultConfig(pin);
      } else {
        key = await verifyVaultPin(pin);
        if (!key) {
          vaultFailedAttempts += 1;
          if (vaultFailedAttempts >= 5) {
            vaultRetryAfter = Date.now() + 30_000;
            vaultFailedAttempts = 0;
            throw new Error("Too many attempts");
          }
          throw new Error("Invalid PIN");
        }
      }

      const migrated = await migrateLegacyEncryptedNotes(key);
      decryptedVaultItems = await decryptVaultItems(key);
      finishVaultUnlock(key);
      if (migrated > 0) {
        showToast(`已安全迁移 ${migrated} 条旧记录`);
      }
    } catch (error) {
      const tooMany = error.message === "Too many attempts";
      showVaultAuthError(
        tooMany
          ? "连续输错 5 次，已暂时锁定 30 秒。"
          : vaultConfig
            ? "密码不正确，请重新输入。"
            : "创建加密星匣失败，请稍后重试。",
      );
      vaultPin.value = "";
      vaultPinConfirm.value = "";
      vaultPin.focus();
    } finally {
      setVaultAuthBusy(false);
    }
  }

  function resetVaultLockTimer() {
    window.clearTimeout(vaultLockTimer);
    if (!vaultUnlocked) {
      return;
    }

    vaultLockTimer = window.setTimeout(() => {
      if (!vaultUnlocked) {
        return;
      }
      lockVault();
      if (activeFilter === "encrypted") {
        activeFilter = "memo";
        render();
      }
      showToast("2 分钟无操作，加密星匣已自动锁定");
    }, VAULT_AUTO_LOCK_MS);
  }

  function openPasswordEditor(item = null) {
    if (!vaultUnlocked || !vaultKey) {
      openVaultAuth();
      return;
    }

    resetVaultLockTimer();
    editingVaultId = item?.id ?? null;
    passwordEditorTitle.textContent = item ? "编辑密码记录" : "新增密码记录";
    savePasswordLabel.textContent = item ? "保存修改" : "加密保存";
    passwordTitle.value = item?.title ?? "";
    passwordAccount.value = item?.account ?? "";
    passwordValue.value = item?.password ?? "";
    passwordValue.type = "password";
    passwordNotes.value = item?.notes ?? "";
    passwordEditorDialog.showModal();
    window.setTimeout(() => passwordTitle.focus(), 0);
  }

  function closePasswordEditor() {
    passwordEditorDialog.close();
    editingVaultId = null;
  }

  async function savePasswordItem() {
    if (!vaultKey || !vaultUnlocked) {
      closePasswordEditor();
      showToast("星匣已锁定，请重新解锁");
      return;
    }

    const title = passwordTitle.value.trim();
    const password = passwordValue.value;
    if (!title) {
      passwordTitle.focus();
      showToast("请填写记录名称");
      return;
    }
    if (!password) {
      passwordValue.focus();
      showToast("请填写需要保存的密码");
      return;
    }

    const now = new Date().toISOString();
    const wasEditing = Boolean(editingVaultId);
    const existing = decryptedVaultItems.find(
      (item) => item.id === editingVaultId,
    );
    const payload = {
      kind: "password",
      title,
      account: passwordAccount.value.trim(),
      password,
      notes: passwordNotes.value.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const recordId = editingVaultId ?? createId();
    const encrypted = await encryptValue(payload, vaultKey);
    const previousRecords = encryptedVaultRecords;
    const newRecord = { id: recordId, ...encrypted };

    encryptedVaultRecords = editingVaultId
      ? encryptedVaultRecords.map((record) =>
          record.id === editingVaultId ? newRecord : record,
        )
      : [newRecord, ...encryptedVaultRecords];

    if (!saveEncryptedVaultRecords()) {
      encryptedVaultRecords = previousRecords;
      return;
    }

    decryptedVaultItems = [
      { ...payload, id: recordId },
      ...decryptedVaultItems.filter((item) => item.id !== recordId),
    ];
    closePasswordEditor();
    render();
    resetVaultLockTimer();
    showToast(wasEditing ? "加密记录已更新" : "密码已加密保存");
  }

  function openSecureNoteEditor(item = null) {
    if (!vaultUnlocked || !vaultKey) {
      openVaultAuth();
      return;
    }

    resetVaultLockTimer();
    editingSecureNoteId = item?.id ?? null;
    secureNoteEditorTitle.textContent = item ? "编辑加密备忘" : "新增加密备忘";
    saveSecureNoteLabel.textContent = item ? "保存修改" : "加密保存";
    secureNoteTitle.value = item?.title ?? "";
    secureNoteContent.value = item?.content ?? "";
    secureNoteEditorDialog.showModal();
    window.setTimeout(() => secureNoteTitle.focus(), 0);
  }

  function closeSecureNoteEditor() {
    secureNoteEditorDialog.close();
    editingSecureNoteId = null;
  }

  async function saveSecureNoteItem() {
    if (!vaultKey || !vaultUnlocked) {
      closeSecureNoteEditor();
      showToast("星匣已锁定，请重新解锁");
      return;
    }

    const title = secureNoteTitle.value.trim();
    const content = secureNoteContent.value.trim();
    if (!title) {
      secureNoteTitle.focus();
      showToast("请填写加密备忘标题");
      return;
    }

    const now = new Date().toISOString();
    const wasEditing = Boolean(editingSecureNoteId);
    const existing = decryptedVaultItems.find(
      (item) => item.id === editingSecureNoteId,
    );
    const payload = {
      kind: "note",
      title,
      content,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const recordId = editingSecureNoteId ?? createId();
    const encrypted = await encryptValue(payload, vaultKey);
    const previousRecords = encryptedVaultRecords;
    const newRecord = { id: recordId, ...encrypted };

    encryptedVaultRecords = editingSecureNoteId
      ? encryptedVaultRecords.map((record) =>
          record.id === editingSecureNoteId ? newRecord : record,
        )
      : [newRecord, ...encryptedVaultRecords];

    if (!saveEncryptedVaultRecords()) {
      encryptedVaultRecords = previousRecords;
      return;
    }

    decryptedVaultItems = [
      { ...payload, id: recordId },
      ...decryptedVaultItems.filter((item) => item.id !== recordId),
    ];
    closeSecureNoteEditor();
    render();
    resetVaultLockTimer();
    showToast(wasEditing ? "加密备忘已更新" : "加密备忘已保存");
  }

  function deleteVaultItem(itemId) {
    const item = decryptedVaultItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (!window.confirm(`确定永久删除“${item.title}”吗？此操作无法恢复。`)) {
      return;
    }

    const previousRecords = encryptedVaultRecords;
    encryptedVaultRecords = encryptedVaultRecords.filter(
      (record) => record.id !== itemId,
    );
    if (!saveEncryptedVaultRecords()) {
      encryptedVaultRecords = previousRecords;
      return;
    }

    decryptedVaultItems = decryptedVaultItems.filter(
      (entry) => entry.id !== itemId,
    );
    render();
    resetVaultLockTimer();
    showToast("加密记录已永久删除");
  }

  async function copyVaultPassword(itemId) {
    const item = decryptedVaultItems.find((entry) => entry.id === itemId);
    if (!item?.password) {
      return;
    }

    try {
      await navigator.clipboard.writeText(item.password);
      resetVaultLockTimer();
      showToast("密码已复制，使用后请及时清除剪贴板");
    } catch {
      showToast("复制失败，请检查浏览器权限");
    }
  }

  function openEditor(note = null) {
    editingId = note?.id ?? null;
    editorTitle.textContent = note ? "编辑这颗星" : "记录此刻";
    saveNoteLabel.textContent = note ? "保存修改" : "收进星河";
    const noteParts = note ? getNoteParts(note) : { title: "", body: "" };
    noteTitleInput.value = noteParts.title;
    noteContent.value = noteParts.body;

    const categoryInput = editorForm.querySelector(
      'input[name="note-category"][value="memo"]',
    );
    categoryInput.checked = true;

    updateEditorState();
    editorDialog.showModal();
    window.setTimeout(() => noteTitleInput.focus(), 0);
  }

  function closeEditor() {
    editorDialog.close();
    editingId = null;
  }

  function updateEditorState() {
    editorCharacterCount.textContent = `${noteContent.value.length} / 5000`;
  }

  function removeDemoNotes() {
    notes = notes.filter((note) => !note.isDemo);
  }

  function saveEditorNote() {
    const title = noteTitleInput.value.trim();
    const content = noteContent.value.trim();
    if (!title) {
      noteTitleInput.focus();
      showToast("请先填写标题");
      return;
    }

    const category = "memo";
    const now = new Date().toISOString();
    const previousNotes = notes;

    if (editingId) {
      notes = notes.map((note) =>
        note.id === editingId
          ? {
              ...note,
              title,
              content,
              category,
              updatedAt: now,
              isDemo: false,
            }
          : note,
      );
    } else {
      removeDemoNotes();
      notes = [
        {
          id: createId(),
          title,
          content,
          category,
          pinned: false,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          isDemo: false,
        },
        ...notes,
      ];
    }

    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }

    closeEditor();
    setFilter(category === "encrypted" ? "encrypted" : "memo");
    showToast(editingId ? "改动已保存" : "已收进星河");
  }

  function deleteNote(noteId) {
    const note = notes.find((item) => item.id === noteId);
    if (!note) {
      return;
    }

    const previousNotes = notes;

    if (note.deletedAt) {
      if (!window.confirm("彻底删除后无法恢复，确定继续吗？")) {
        return;
      }
      notes = notes.filter((item) => item.id !== noteId);
    } else {
      notes = notes.map((item) =>
        item.id === noteId
          ? {
              ...item,
              pinned: false,
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
    }

    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }

    render();
    showToast(note.deletedAt ? "已彻底删除" : "已移入回收站");
  }

  function restoreNote(noteId) {
    const previousNotes = notes;
    notes = notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            deletedAt: null,
            updatedAt: new Date().toISOString(),
          }
        : note,
    );

    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }

    render();
    showToast("记录已恢复");
  }

  function togglePin(noteId) {
    const previousNotes = notes;
    notes = notes.map((note) =>
      note.id === noteId ? { ...note, pinned: !note.pinned } : note,
    );

    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }

    render();
    const isPinned = notes.find((note) => note.id === noteId)?.pinned;
    showToast(isPinned ? "已置顶" : "已取消置顶");
  }

  async function copyNote(noteId) {
    const note = notes.find((item) => item.id === noteId);
    if (!note) {
      return;
    }

    try {
      await navigator.clipboard.writeText(note.content);
      showToast("内容已复制");
    } catch {
      showToast("复制失败，请检查浏览器权限");
    }
  }

  function exportNotes() {
    const backup = {
      app: "star备忘录",
      version: "1.0-preview",
      exportedAt: new Date().toISOString(),
      notes,
      vault: vaultConfig
        ? {
            config: vaultConfig,
            records: encryptedVaultRecords,
          }
        : null,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `star备忘录备份-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("备份文件已导出");
  }

  async function importNotes(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.notes ?? [];
      if (!Array.isArray(incoming)) {
        throw new Error("Invalid backup");
      }

      const imported = incoming.map(normalizeNote).filter(Boolean);
      const incomingVault = !Array.isArray(parsed) ? parsed.vault : null;
      const hasValidVault =
        isValidVaultConfig(incomingVault?.config) &&
        Array.isArray(incomingVault.records) &&
        incomingVault.records.every(
          (record) =>
            record &&
            typeof record.id === "string" &&
            typeof record.iv === "string" &&
            typeof record.ciphertext === "string",
        );

      if (imported.length === 0 && !hasValidVault) {
        throw new Error("Empty backup");
      }

      const incomingIds = new Set(imported.map((note) => note.id));
      notes = [...imported, ...notes.filter((note) => !incomingIds.has(note.id))];
      if (!saveNotes()) {
        return;
      }

      let importedVaultCount = 0;
      if (hasValidVault) {
        if (!vaultConfig) {
          vaultConfig = incomingVault.config;
          encryptedVaultRecords = incomingVault.records;
          importedVaultCount = encryptedVaultRecords.length;
          if (!saveVaultConfig()) {
            return;
          }
        } else if (vaultConfig.salt === incomingVault.config.salt) {
          const vaultIds = new Set(
            encryptedVaultRecords.map((record) => record.id),
          );
          const newRecords = incomingVault.records.filter(
            (record) => !vaultIds.has(record.id),
          );
          encryptedVaultRecords = [...newRecords, ...encryptedVaultRecords];
          importedVaultCount = newRecords.length;
          if (!saveEncryptedVaultRecords()) {
            return;
          }
        } else {
          showToast("普通记录已导入；加密星匣密码不同，未自动合并");
        }
      }

      lockVault();
      render();
      showToast(
        importedVaultCount > 0
          ? `已导入 ${imported.length} 条记录和 ${importedVaultCount} 条加密记录`
          : `已导入 ${imported.length} 条记录`,
      );
    } catch {
      showToast("无法识别这个备份文件");
    } finally {
      importFile.value = "";
    }
  }

  function clearDemoNotes() {
    const previousNotes = notes;
    removeDemoNotes();
    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }
    render();
    showToast("示例已清空，可以开始记录了");
  }

  function clearTrash() {
    if (!window.confirm("确定清空回收站吗？此操作无法撤销。")) {
      return;
    }

    const previousNotes = notes;
    notes = notes.filter((note) => !note.deletedAt);
    if (!saveNotes()) {
      notes = previousNotes;
      return;
    }
    render();
    showToast("回收站已清空");
  }

  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => setFilter(tab.dataset.filter));
  });

  noteGrid.addEventListener("click", (event) => {
    const vaultActionButton = event.target.closest("[data-vault-action]");
    const vaultCard = event.target.closest("[data-vault-id]");
    if (vaultActionButton && vaultCard) {
      const itemId = vaultCard.dataset.vaultId;
      const item = decryptedVaultItems.find((entry) => entry.id === itemId);
      const action = vaultActionButton.dataset.vaultAction;

      if (action === "edit") {
        if (item?.kind === "password") {
          openPasswordEditor(item);
        } else {
          openSecureNoteEditor(item);
        }
      } else if (action === "delete") {
        deleteVaultItem(itemId);
      } else if (action === "copy-password") {
        copyVaultPassword(itemId);
      } else if (action === "reveal") {
        const secret = vaultCard.querySelector(".secret-value");
        const reveal = secret.classList.toggle("is-visible");
        secret.textContent = reveal ? item?.password ?? "" : "••••••••••";
        vaultActionButton.textContent = reveal ? "隐藏" : "显示";
        resetVaultLockTimer();
      }
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    const card = event.target.closest(".note-card");
    if (!actionButton || !card) {
      return;
    }

    const noteId = card.dataset.noteId;
    const note = notes.find((item) => item.id === noteId);
    const action = actionButton.dataset.action;

    if (action === "edit") {
      openEditor(note);
    } else if (action === "copy") {
      copyNote(noteId);
    } else if (action === "pin") {
      togglePin(noteId);
    } else if (action === "delete") {
      deleteNote(noteId);
    } else if (action === "restore") {
      restoreNote(noteId);
    }
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    resetVaultLockTimer();
    render();
  });

  function openCurrentEditor() {
    if (activeFilter === "encrypted" && vaultUnlocked) {
      if (vaultMode === "password") {
        openPasswordEditor();
      } else {
        openSecureNoteEditor();
      }
    } else {
      openEditor();
    }
  }

  vaultModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!vaultUnlocked) {
        return;
      }
      vaultMode = button.dataset.vaultMode;
      resetVaultLockTimer();
      render();
    });
  });

  document
    .querySelector("#hero-add-button")
    .addEventListener("click", openCurrentEditor);
  document
    .querySelector("#floating-add-button")
    .addEventListener("click", openCurrentEditor);
  document
    .querySelector("#empty-add-button")
    .addEventListener("click", openCurrentEditor);
  document
    .querySelector("#close-editor-button")
    .addEventListener("click", closeEditor);
  document
    .querySelector("#cancel-editor-button")
    .addEventListener("click", closeEditor);
  clearDemoButton.addEventListener("click", clearDemoNotes);
  clearTrashButton.addEventListener("click", clearTrash);
  resetVaultPasswordButton.addEventListener(
    "click",
    openVaultPasswordReset,
  );
  lockVaultButton.addEventListener("click", () => {
    lockVault();
    activeFilter = "memo";
    render();
    showToast("加密星匣已锁定");
  });
  document.querySelector("#export-button").addEventListener("click", exportNotes);
  document
    .querySelector("#import-button")
    .addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", () => {
    const [file] = importFile.files;
    if (file) {
      importNotes(file);
    }
  });

  noteContent.addEventListener("input", updateEditorState);
  editorForm
    .querySelectorAll('input[name="note-category"]')
    .forEach((input) => input.addEventListener("change", updateEditorState));

  editorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEditorNote();
  });

  vaultAuthForm.addEventListener("submit", handleVaultAuthSubmit);
  vaultResetForm.addEventListener("submit", handleVaultPasswordReset);
  document
    .querySelector("#cancel-vault-reset")
    .addEventListener("click", closeVaultResetDialog);

  [currentVaultPin, newVaultPin, confirmVaultPin].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
      showVaultResetError("");
    });
  });

  vaultResetDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeVaultResetDialog();
  });
  vaultResetDialog.addEventListener("click", (event) => {
    if (event.target === vaultResetDialog) {
      closeVaultResetDialog();
    }
  });

  document
    .querySelector("#cancel-vault-auth")
    .addEventListener("click", closeVaultAuthDialog);
  document
    .querySelector("#toggle-vault-pin")
    .addEventListener("click", () => {
      const show = vaultPin.type === "password";
      vaultPin.type = show ? "text" : "password";
      vaultPinConfirm.type = show ? "text" : "password";
      vaultPin.focus();
    });

  [vaultPin, vaultPinConfirm].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
      showVaultAuthError("");
    });
  });

  vaultPinConfirm.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      vaultAuthForm.requestSubmit();
    }
  });

  passwordEditorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    savePasswordItem();
  });
  document
    .querySelector("#close-password-editor")
    .addEventListener("click", closePasswordEditor);
  document
    .querySelector("#cancel-password-editor")
    .addEventListener("click", closePasswordEditor);
  document
    .querySelector("#toggle-password-value")
    .addEventListener("click", () => {
      passwordValue.type =
        passwordValue.type === "password" ? "text" : "password";
      passwordValue.focus();
      resetVaultLockTimer();
    });

  passwordEditorDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePasswordEditor();
  });
  passwordEditorDialog.addEventListener("click", (event) => {
    if (event.target === passwordEditorDialog) {
      closePasswordEditor();
    }
  });

  [passwordTitle, passwordAccount, passwordValue, passwordNotes].forEach(
    (input) => {
      input.addEventListener("input", resetVaultLockTimer);
    },
  );

  secureNoteEditorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSecureNoteItem();
  });
  document
    .querySelector("#close-secure-note-editor")
    .addEventListener("click", closeSecureNoteEditor);
  document
    .querySelector("#cancel-secure-note-editor")
    .addEventListener("click", closeSecureNoteEditor);
  secureNoteEditorDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSecureNoteEditor();
  });
  secureNoteEditorDialog.addEventListener("click", (event) => {
    if (event.target === secureNoteEditorDialog) {
      closeSecureNoteEditor();
    }
  });
  [secureNoteTitle, secureNoteContent].forEach((input) => {
    input.addEventListener("input", resetVaultLockTimer);
  });

  vaultAuthDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeVaultAuthDialog();
  });
  vaultAuthDialog.addEventListener("click", (event) => {
    if (event.target === vaultAuthDialog) {
      closeVaultAuthDialog();
    }
  });

  document.addEventListener(
    "pointerdown",
    () => {
      if (vaultUnlocked) {
        resetVaultLockTimer();
      }
    },
    true,
  );
  document.addEventListener(
    "keydown",
    () => {
      if (vaultUnlocked) {
        resetVaultLockTimer();
      }
    },
    true,
  );

  editorDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeEditor();
  });

  editorDialog.addEventListener("click", (event) => {
    if (event.target === editorDialog) {
      closeEditor();
    }
  });

  noteContent.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      editorForm.requestSubmit();
    }
  });

  function initStarfield() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let width = 0;
    let height = 0;
    let stars = [];
    let meteors = [];
    let nextMeteorAt = performance.now() + 4500;
    let frame;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starCount = Math.min(360, Math.floor((width * height) / 4200));
      stars = Array.from({ length: starCount }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() < 0.86 ? Math.random() * 0.8 + 0.25 : 1.2,
        alpha: Math.random() * 0.55 + 0.18,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.00045 + 0.00018,
        warm: index % 13 === 0,
      }));
    }

    function draw(timestamp = 0) {
      context.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        const twinkle = reducedMotion
          ? 1
          : 0.72 + Math.sin(timestamp * star.speed + star.phase) * 0.28;
        context.beginPath();
        context.fillStyle = star.warm
          ? `rgba(255, 220, 138, ${star.alpha * twinkle})`
          : `rgba(230, 237, 255, ${star.alpha * twinkle})`;
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();

        if (star.radius > 1) {
          context.strokeStyle = `rgba(232, 240, 255, ${star.alpha * 0.24})`;
          context.lineWidth = 0.5;
          context.beginPath();
          context.moveTo(star.x - 4, star.y);
          context.lineTo(star.x + 4, star.y);
          context.moveTo(star.x, star.y - 4);
          context.lineTo(star.x, star.y + 4);
          context.stroke();
        }
      });

      if (!reducedMotion && timestamp > nextMeteorAt) {
        meteors.push({
          x: Math.random() * width * 0.8 + width * 0.2,
          y: Math.random() * height * 0.3,
          vx: -(Math.random() * 4.5 + 5.5),
          vy: Math.random() * 2.6 + 2.4,
          life: 1,
        });
        nextMeteorAt = timestamp + 9000 + Math.random() * 9000;
      }

      meteors = meteors.filter((meteor) => meteor.life > 0);
      meteors.forEach((meteor) => {
        const gradient = context.createLinearGradient(
          meteor.x,
          meteor.y,
          meteor.x - meteor.vx * 12,
          meteor.y - meteor.vy * 12,
        );
        gradient.addColorStop(0, `rgba(255, 240, 195, ${meteor.life * 0.9})`);
        gradient.addColorStop(1, "rgba(255, 240, 195, 0)");
        context.beginPath();
        context.strokeStyle = gradient;
        context.lineWidth = 1.2;
        context.moveTo(meteor.x, meteor.y);
        context.lineTo(meteor.x - meteor.vx * 12, meteor.y - meteor.vy * 12);
        context.stroke();

        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life -= 0.012;
      });

      if (!reducedMotion) {
        frame = requestAnimationFrame(draw);
      }
    }

    resize();
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(frame);
      resize();
      draw(performance.now());
    });
    draw(performance.now());
  }

  initStarfield();
  render();
})();
