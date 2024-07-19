// 保存選項到 chrome.storage
function saveOptions() {
  const apiKey = document.getElementById('apiKey').value;
  const aiModel = document.getElementById('aiModel').value;
  const targetLanguage = document.getElementById('targetLanguage').value;
  const enableExtension = document.getElementById('enableExtension').checked;

  chrome.storage.sync.set(
    {
      apiKey: apiKey,
      aiModel: aiModel,
      targetLanguage: targetLanguage,
      enableExtension: enableExtension
    },
    function() {
      const status = document.getElementById('status');
      status.textContent = '選項已保存。';
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
    }
  );
}

// 當頁面加載時，使用預設值恢復選項狀態
function restoreOptions() {
  chrome.storage.sync.get(
    {
      apiKey: '',
      aiModel: 'gpt-4o-mini',
      targetLanguage: 'zh-TW',
      enableExtension: true
    },
    function(items) {
      document.getElementById('apiKey').value = items.apiKey;
      document.getElementById('targetLanguage').value = items.targetLanguage;
      document.getElementById('aiModel').value = items.aiModel;
      document.getElementById('enableExtension').checked = items.enableExtension;
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
