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
      document.body.style.colorScheme = 'light';
    } else {
      html.removeAttribute('data-theme');
      document.body.style.colorScheme = 'dark';
    }

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
  function initTheme() {
    // Check stored preference
    const stored = localStorage.getItem(STORAGE_KEY);
    const auto = getAutoTheme();
    const theme = stored || auto;

    applyTheme(theme);

    // Listen for toggle
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
      });
    }

    // Check theme every hour (in case time changed)
    setInterval(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) { // Only auto-switch if no manual preference
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
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
    },
    get: () => localStorage.getItem(STORAGE_KEY) || getAutoTheme(),
    auto: () => {
      localStorage.removeItem(STORAGE_KEY);
      applyTheme(getAutoTheme());
    },
    getTimeZone: getUserTimeZone
  };
})();