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

await send("Runtime.enable");
await evaluate(
  "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
);

const initial = await evaluate(`({
  title: document.title,
  categories: [...document.querySelectorAll(".category-tab")].map((tab) => ({
    label: tab.innerText.replace(/\\n/g, " ").trim(),
    filter: tab.dataset.filter,
  })),
  cards: document.querySelectorAll(".note-card").length
})`);

await evaluate(`document.querySelector('[data-filter="memo"]').click()`);
const memoView = await evaluate(`({
  title: document.querySelector("#records-title").textContent,
  emptyVisible: !document.querySelector("#empty-state").hidden
})`);

await evaluate(`document.querySelector('#hero-add-button').click()`);
await evaluate(`(() => {
  const title = document.querySelector("#note-title-input");
  title.value = "升级验证记录";
  title.dispatchEvent(new Event("input", { bubbles: true }));
  const content = document.querySelector("#note-content");
  content.value = "第二行内容仍然保留";
  content.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector('input[name="note-category"][value="memo"]').click();
  document.querySelector("#editor-form").requestSubmit();
  return true;
})()`);

const afterCreate = await evaluate(`({
  activeTitle: document.querySelector("#records-title").textContent,
  count: document.querySelector('[data-count-for="memo"]').textContent,
  firstTitle: document.querySelector(".note-title")?.textContent,
  body: document.querySelector(".note-body")?.textContent
})`);

await evaluate(`document.querySelector(".note-card .danger-action").click()`);
await evaluate(`document.querySelector('[data-filter="trash"]').click()`);
const afterDelete = await evaluate(`({
  activeTitle: document.querySelector("#records-title").textContent,
  trashCount: document.querySelector('[data-count-for="trash"]').textContent,
  restoreVisible: !document.querySelector(".restore-action").hidden
})`);

await evaluate(`document.querySelector(".restore-action").click()`);
await evaluate(`document.querySelector('[data-filter="memo"]').click()`);
const afterRestore = await evaluate(`({
  activeTitle: document.querySelector("#records-title").textContent,
  memoCount: document.querySelector('[data-count-for="memo"]').textContent,
  title: document.querySelector(".note-title")?.textContent
})`);

console.log(
  JSON.stringify(
    { initial, memoView, afterCreate, afterDelete, afterRestore },
    null,
    2,
  ),
);

socket.close();
