function log(...args) {
  console.log(...args);
  fetch("/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
}
