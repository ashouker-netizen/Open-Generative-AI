const LAST_RUN_KEY = 'etsy_last_run_date';
const DEFAULT_RUN_HOUR = 8;

export function getLastRunDate() {
  return localStorage.getItem(LAST_RUN_KEY);
}

export function markRunToday() {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(LAST_RUN_KEY, today);
}

export function hasRunToday() {
  const today = new Date().toISOString().split('T')[0];
  return getLastRunDate() === today;
}

export function shouldAutoRun(runHour = DEFAULT_RUN_HOUR) {
  return !hasRunToday() && new Date().getHours() >= runHour;
}

export function checkAndRun(runPipelineFn, runHour = DEFAULT_RUN_HOUR) {
  if (shouldAutoRun(runHour)) {
    runPipelineFn();
  }
}
