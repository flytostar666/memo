import { writeFile } from "node:fs/promises";

const endpoint = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9231";
const targets = await fetch(`${endpoint}/json/list`).then((response) =>
  response.json(),
);
const page = targets.find((target) => target.url.includes("preview-star.html"));

if (!page) {
  throw new Error("Preview page was not found in the browser targets.");
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);
  if (!request) {
    return;
  }

  pending.delete(message.id);
  if (message.error) {
    request.reject(new Error(message.error.message));
  } else {
    request.resolve(message.result);
  }
});

function send(method, params = {}) {
  const id = nextId;
  nextId += 1;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text);
  }

  return response.result.value;
}

async function waitFor(expression, timeoutMs = 10_000) {
  return evaluate(`new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      let ready = false;
      try { ready = Boolean(${expression}); } catch {}
      if (ready) {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() - startedAt > ${timeoutMs}) {
        clearInterval(timer);
        resolve(false);
      }
    }, 50);
  })`);
}

async function submitVaultPin(pin, confirmation = null) {
  await evaluate(`(() => {
    const pin = document.querySelector("#vault-pin");
    pin.value = "${pin}";
    pin.dispatchEvent(new Event("input", { bubbles: true }));
    const confirm = document.querySelector("#vault-pin-confirm");
    confirm.value = "${confirmation ?? ""}";
    document.querySelector("#vault-auth-form").requestSubmit();
    return true;
  })()`);
}

await send("Runtime.enable");
const pin = "123456";
const secret = "Star#Memo-2026";

await evaluate(`document.querySelector('[data-filter="encrypted"]').click()`);
const setupPrompt = await evaluate(`({
  title: document.querySelector("#vault-auth-title").textContent,
  confirmVisible: !document.querySelector("#vault-pin-confirm-group").hidden
})`);

await submitVaultPin(pin, pin);
const setupFinished = await waitFor(
  `!document.querySelector("#vault-auth-dialog").open`,
);

await evaluate(`document.querySelector("#hero-add-button").click()`);
await evaluate(`(() => {
  document.querySelector("#password-title").value = "测试邮箱";
  document.querySelector("#password-account").value = "star@example.com";
  document.querySelector("#password-value").value = "${secret}";
  document.querySelector("#password-notes").value = "仅用于自动化验证";
  document.querySelector("#password-editor-form").requestSubmit();
  return true;
})()`);
const saveFinished = await waitFor(
  `!document.querySelector("#password-editor-dialog").open`,
);

const savedState = await evaluate(`(() => {
  const encrypted = localStorage.getItem("star-memo-vault-state-v2") ?? "";
  const parsed = JSON.parse(encrypted);
  return {
    activeTitle: document.querySelector("#records-title").textContent,
    cardTitle: document.querySelector(".password-title")?.textContent,
    encryptedContainsSecret: encrypted.includes("${secret}"),
    encryptedContainsTitle: encrypted.includes("测试邮箱"),
    configContainsPin: encrypted.includes("${pin}"),
    records: parsed.records.length
  };
})()`);

await evaluate(`document.querySelector(".reveal-secret").click()`);
const revealed = await evaluate(
  `document.querySelector(".secret-value").textContent`,
);

await evaluate(`document.querySelector('[data-vault-mode="note"]').click()`);
await evaluate(`document.querySelector("#hero-add-button").click()`);
await evaluate(`(() => {
  document.querySelector("#secure-note-title").value = "加密用户记录";
  document.querySelector("#secure-note-content").value = "这段用户内容只能解锁后查看";
  document.querySelector("#secure-note-editor-form").requestSubmit();
  return true;
})()`);
const secureNoteSaved = await waitFor(
  `!document.querySelector("#secure-note-editor-dialog").open`,
);
const secureNoteState = await evaluate(`(() => {
  const encrypted = localStorage.getItem("star-memo-vault-state-v2") ?? "";
  return {
    modeTitle: document.querySelector("#records-title").textContent,
    cardTitle: document.querySelector(".secure-note-title")?.textContent,
    body: document.querySelector(".secure-note-body")?.textContent,
    containsTitlePlaintext: encrypted.includes("加密用户记录"),
    containsBodyPlaintext: encrypted.includes("这段用户内容只能解锁后查看"),
    records: JSON.parse(encrypted).records.length
  };
})()`);
await evaluate(`document.querySelector('[data-vault-mode="password"]').click()`);

await evaluate(`document.querySelector('[data-filter="memo"]').click()`);
await evaluate(`document.querySelector('[data-filter="encrypted"]').click()`);
const unlockPrompt = await evaluate(
  `document.querySelector("#vault-auth-title").textContent`,
);

await submitVaultPin("000001");
const wrongPinResponded = await waitFor(
  `!document.querySelector("#vault-auth-error").hidden`,
);
const wrongPinMessage = await evaluate(
  `document.querySelector("#vault-auth-error").textContent`,
);

await submitVaultPin(pin);
const unlockFinished = await waitFor(
  `!document.querySelector("#vault-auth-dialog").open`,
);
const unlockedTitle = await evaluate(
  `document.querySelector(".password-title")?.textContent`,
);

const nextPin = "654321";
await evaluate(`document.querySelector("#reset-vault-password-button").click()`);
const resetPromptVisible = await evaluate(
  `document.querySelector("#vault-reset-dialog").open`,
);
await evaluate(`(() => {
  document.querySelector("#current-vault-pin").value = "${pin}";
  document.querySelector("#new-vault-pin").value = "${nextPin}";
  document.querySelector("#confirm-vault-pin").value = "${nextPin}";
  document.querySelector("#vault-reset-form").requestSubmit();
  return true;
})()`);
const resetFinished = await waitFor(
  `!document.querySelector("#vault-reset-dialog").open`,
);

await evaluate(`document.querySelector('[data-filter="memo"]').click()`);
await evaluate(`document.querySelector('[data-filter="encrypted"]').click()`);
await submitVaultPin(pin);
const oldPinRejected = await waitFor(
  `!document.querySelector("#vault-auth-error").hidden`,
);
await submitVaultPin(nextPin);
const newPinUnlocked = await waitFor(
  `!document.querySelector("#vault-auth-dialog").open`,
);
const afterResetState = await evaluate(`(() => {
  const encrypted = localStorage.getItem("star-memo-vault-state-v2") ?? "";
  const parsed = JSON.parse(encrypted);
  return {
    passwordTitleStillPresent: document.querySelector(".password-title")?.textContent,
    recordCount: parsed.records.length,
    containsTitlePlaintext: encrypted.includes("测试邮箱")
  };
})()`);
await evaluate(`document.querySelector('[data-vault-mode="note"]').click()`);
const secureNoteAfterReset = await evaluate(`({
  title: document.querySelector(".secure-note-title")?.textContent,
  body: document.querySelector(".secure-note-body")?.textContent
})`);

if (process.env.SCREENSHOT_PATH) {
  await send("Page.enable");
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(
    process.env.SCREENSHOT_PATH,
    Buffer.from(screenshot.data, "base64"),
  );
}

console.log(
  JSON.stringify(
    {
      setupPrompt,
      setupFinished,
      saveFinished,
      savedState,
      revealed,
      secureNoteSaved,
      secureNoteState,
      unlockPrompt,
      wrongPinResponded,
      wrongPinMessage,
      unlockFinished,
      unlockedTitle,
      resetPromptVisible,
      resetFinished,
      oldPinRejected,
      newPinUnlocked,
      afterResetState,
      secureNoteAfterReset,
    },
    null,
    2,
  ),
);

socket.close();
