import { dom } from './dom.js';
import { setCurrentTab } from './messaging.js';
import { initVisualizer } from './visualizer-init.js';
import { initEQControls } from './eq-controls.js';
import { initDropdown } from './dropdown.js';
import { initKnobs } from './frequency-knobs.js';

(async function initPopup() {
  // 1️⃣ Get the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const tabId = tab.id;

  // 2️⃣ Store current tab ID globally
  setCurrentTab(tabId);

  // 3️⃣ Initialize visualizer (bar graph)
  await initVisualizer(tab);

  // 4️⃣ Initialize EQ sliders & controls
  await initEQControls(tabId);

  // 5️⃣ Initialize dropdown menu
  await initDropdown(tabId);

  // 6️⃣ Initialize frequency knobs (after EQ graph is ready)
  await initKnobs(tabId);

  // 7️⃣ Remove loading overlay
  document.body.classList.remove('loading');
})();

// -------------------------------
// Close open dropdowns / mode containers when clicking outside
// -------------------------------
document.addEventListener('click', (e) => {
  document
    .querySelectorAll('.mode-container.open, .configurator-container.open')
    .forEach((openContainer) => {
      if (!openContainer.contains(e.target)) {
        openContainer.classList.remove('open');
      }
    });
});
