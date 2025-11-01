// dropdown.js
import { saveDropdownOption, loadDropdownOption } from './state.js';

export async function initDropdown(tabId) {
  const configContainer = document.getElementById('configSelect');
  if (!configContainer) return;

  const selected = configContainer.querySelector('.selected');
  const options = configContainer.querySelector('.options');
  const savedOption = await loadDropdownOption(tabId);

  selected.textContent = savedOption;
  selected.dataset.value = savedOption;

  showConfigOption(savedOption);

  selected.addEventListener('click', () =>
    configContainer.classList.toggle('open')
  );

  options.querySelectorAll('div').forEach((option) => {
    option.addEventListener('click', async () => {
      const value = option.dataset.value;
      selected.textContent = option.textContent;
      selected.dataset.value = value;
      configContainer.classList.remove('open');
      showConfigOption(value);
      await saveDropdownOption(tabId, value);
    });
  });
}

function showConfigOption(option) {
  document.querySelector('.gain-container').style.display =
    option === 'gain' ? 'flex' : 'none';
  document.querySelector('.frequency-container').style.display =
    option === 'frequency' ? 'flex' : 'none';
  document.querySelector('.q-container').style.display =
    option === 'quality' ? 'flex' : 'none';
}
