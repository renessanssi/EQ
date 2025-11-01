// visualizer-init.js
import { initBarGraph } from './visualizer.js';

export async function initVisualizer(tab) {
  const tabId = tab.id;
  const { [`hasRun_${tabId}`]: hasRun } = await chrome.storage.session.get(`hasRun_${tabId}`);

  if (hasRun) {
    initBarGraph();
    return;
  }

  if (tab.url.startsWith('http')) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    await chrome.storage.session.set({ [`hasRun_${tabId}`]: true });
    initBarGraph();
  } else {
    document.querySelector('.toggle-container')?.classList.add('disabled');
  }
}
