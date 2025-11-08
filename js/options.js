// Options page script
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const defaultSetting = document.getElementById('defaultSetting');
  const saveStatus = document.getElementById('saveStatus');

  // Load saved options
  chrome.storage.sync.get(['defaultSetting'], (result) => {
    if (result.defaultSetting) {
      defaultSetting.value = result.defaultSetting;
    }
  });

  // Save options
  saveBtn.addEventListener('click', () => {
    const value = defaultSetting.value;
    
    chrome.storage.sync.set({ defaultSetting: value }, () => {
      saveStatus.textContent = 'Options saved!';
      saveStatus.style.color = '#4CAF50';
      
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2000);
    });
  });
});

