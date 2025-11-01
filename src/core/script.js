import { dom } from './dom.js';
import { setCurrentTab } from './messaging.js';
import { initVisualizer } from './visualizer-init.js';
import { initEQControls } from './eq-controls.js';
import { initDropdown } from './dropdown.js';
import { initKnobs } from './frequency-knobs.js';

chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;

  const tabId = tab.id;
  setCurrentTab(tabId);

  await initVisualizer(tab);
  await initEQControls(tabId);
  await initDropdown(tabId);
  await initKnobs(tabId);

  document.body.classList.remove('loading');
});

document.addEventListener('click', (e) => {
  document
    .querySelectorAll('.mode-container.open, .configurator-container.open')
    .forEach((openContainer) => {
      if (!openContainer.contains(e.target)) {
        openContainer.classList.remove('open');
      }
    });
});
