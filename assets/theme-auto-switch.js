/**
 * Auto Theme Switcher — US Time-Based + Manual Toggle
 * Prebacuje između light theme-a (dan) i dark theme-a (noć) po američkom vremenu
 * + omogućava ručnu preferencu sa toggle dugmetom
 */

(function () {
  const STORAGE_KEY = 'theme-preference';
  const US_TIMEZONES = [
    'America/New_York',        // EST/EDT (Eastern)
    'America/Chicago',         // CST/CDT (Central)
    'America/Denver',          // MST/MDT (Mountain)
    'America/Los_Angeles',     // PST/PDT (Pacific)
    'America/Anchorage',       // AKST/AKDT (Alaska)
    'Pacific/Honolulu'         // HST (Hawaii)
  ];

  /**
   * Detektuj US vremenske zone
   */
  function getUserTimeZone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return US_TIMEZONES.includes(tz) ? tz : 'America/New_York'; // Default: Eastern
  }

  /**
   * Determine theme based on US time
   * 6:00 AM - 6:00 PM = light theme
   * 6:00 PM - 6:00 AM = dark theme
   */
  function getAutoTheme() {
    const tz = getUserTimeZone();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      hour12: false
    });
    const usTime = parseInt(formatter.format(new Date()));

    // 6 AM - 6 PM = light; otherwise dark
    return usTime >= 6 && usTime < 18 ? 'light' : 'dark';
  }

  /**
   * Primenite temu
   */
  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
    html.style.colorScheme = theme === 'light' ? 'light' : 'dark';

    // Update toggle state
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', theme === 'light');
      toggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
    }
  }

  /**
   * Init theme system
   */
  // Safe storage (private mode / blocked storage must not break the toggle)
  function readPref() { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function writePref(v) { try { v ? localStorage.setItem(STORAGE_KEY, v) : localStorage.removeItem(STORAGE_KEY); } catch (e) {} }

  // Apply immediately (script is loaded in <head>, before first paint) — no dark flash
  applyTheme(readPref() || getAutoTheme());

  function initTheme() {
    applyTheme(readPref() || getAutoTheme());

    // Listen for toggle
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        writePref(next);
        applyTheme(next);
      });
    }

    // Check theme every hour (in case time changed)
    setInterval(() => {
      if (!readPref()) { // Only auto-switch if no manual preference
        const auto = getAutoTheme();
        applyTheme(auto);
      }
    }, 3600000); // 1 hour
  }

  // Init on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Expose API for manual use
  window.themeManager = {
    set: (theme) => {
      writePref(theme);
      applyTheme(theme);
    },
    get: () => readPref() || getAutoTheme(),
    auto: () => {
      writePref(null);
      applyTheme(getAutoTheme());
    },
    getTimeZone: getUserTimeZone
  };
})();