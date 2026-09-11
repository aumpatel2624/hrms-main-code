const hours = ms => Math.round(Math.max(0, ms) / 3600000 * 100) / 100;
const elapsed = (first, last) => new Date(last.time) - new Date(first.time);
export const alternatingFirstAndLast = logs => logs.length < 2 ? 0 : hours(elapsed(logs[0], logs.at(-1)));
export const alternatingEveryValidPair = logs => {
  let total = 0;
  for (let i = 0; i + 1 < logs.length; i += 2) total += elapsed(logs[i], logs[i + 1]);
  return hours(total);
};
export const strictFirstAndLast = logs => {
  const first = logs.find(log => log.logType === "IN");
  const last = logs.findLast(log => log.logType === "OUT");
  return first && last ? hours(elapsed(first, last)) : 0;
};
export const strictEveryValidPair = logs => {
  let open = null;
  let total = 0;
  for (const log of logs) {
    if (log.logType === "IN" && !open) open = log;
    else if (log.logType === "OUT" && open) { total += elapsed(open, log); open = null; }
  }
  return hours(total);
};
