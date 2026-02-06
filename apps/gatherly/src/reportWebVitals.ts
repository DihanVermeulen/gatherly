import {onCLS, onINP, onLCP} from 'web-vitals';

export default function reportWebVitals(metric) {
  const body = JSON.stringify(metric);
  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`.
  (navigator.sendBeacon && navigator.sendBeacon('/analytics', body)) ||
    fetch('/analytics', {body, method: 'POST', keepalive: true});
}

onCLS(reportWebVitals);
onINP(reportWebVitals);
onLCP(reportWebVitals);