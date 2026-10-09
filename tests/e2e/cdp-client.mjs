// Minimaler Chrome-DevTools-Protokoll-Client fuer die Offline-Testmatrix (Node >= 22, ohne Abhaengigkeiten).

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === "page");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map();
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression, timeout = 60000) => {
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout });
    if (reply.result?.exceptionDetails) {
      throw new Error(JSON.stringify(reply.result.exceptionDetails).slice(0, 300));
    }
    return reply.result?.result?.value;
  };

  const waitForLoad = () =>
    evaluate("new Promise((r) => document.readyState === 'complete' ? r(1) : addEventListener('load', () => r(1)))");

  const navigate = async (url) => {
    await send("Page.navigate", { url });
    await sleep(300);
    await waitForLoad();
  };

  const setOffline = (offline) =>
    send("Network.emulateNetworkConditions", { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  return { send, evaluate, navigate, waitForLoad, setOffline, close: () => socket.close() };
}
