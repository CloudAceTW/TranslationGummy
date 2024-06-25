let selectionButton;
let summaryButton;
let translationResult;
let isProcessing = false;
let currentAudio = null;
let selectionTimeout;

function createButtons() {
  selectionButton = createButton('翻譯文字', 'text-selector-btn');
  summaryButton = createButton('總結文字', 'text-summary-btn');

  selectionButton.addEventListener('click', handleTranslation);
  summaryButton.addEventListener('click', handleSummary);
}

function createButton(text, className) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = className;
  button.style.display = 'none';
  document.body.appendChild(button);
  return button;
}

function createTranslationResult() {
  translationResult = document.createElement('div');
  translationResult.className = 'translation-result';
  translationResult.style.display = 'none';

  // 阻止文本選擇事件的傳播
  translationResult.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  translationResult.addEventListener('mouseup', (e) => {
    e.stopPropagation();
  });

  document.body.appendChild(translationResult);
}

async function handleTranslation() {
  if (isProcessing) return;
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    await processText(selectedText, translateText, '翻譯中...', '翻譯文字');
  }
}

async function handleSummary() {
  if (isProcessing) return;
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    await processText(selectedText, summarizeText, '總結中...', '總結文字');
  }
}

async function processText(text, processFunction, processingText, originalText) {
  isProcessing = true;
  const activeButton = processFunction === translateText ? selectionButton : summaryButton;
  activeButton.textContent = processingText;
  activeButton.classList.add('loading');

  try {
    const resultText = await processFunction(text);
    await showTranslationResult(resultText);
  } catch (error) {
    console.error('處理錯誤：', error);
    alert('處理失敗，請檢查API密鑰是否正確設置。');
  } finally {
    isProcessing = false;
    activeButton.textContent = originalText;
    activeButton.classList.remove('loading');
  }
}

function handleSelection() {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    } else {
      hideTranslationResult();
    }
}

function handleMouseUp(e) {
  chrome.storage.sync.get(['enableExtension', 'targetLanguage'], async (data) => {
    if (!data.enableExtension) {
      return;  // 如果擴展被禁用，直接返回
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0 && !translationResult.contains(e.target)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (!translationResult.contains(range.startContainer) && !translationResult.contains(range.endContainer)) {
        const buttonTop = `${window.scrollY + rect.bottom}px`;
        const buttonLeft = `${window.scrollX + rect.left}px`;
        const targetLanguage = data.targetLanguage || 'en';
        const buttonText = `翻譯${getLanguageName(targetLanguage)}`;

        const isTargetLanguage = !isTextInSpecifiedLanguage(selectedText, targetLanguage);

        if (isTargetLanguage) {
          selectionButton.textContent = buttonText;
          selectionButton.style.top = buttonTop;
          selectionButton.style.left = buttonLeft;
          selectionButton.style.display = 'block';
        } else {
          selectionButton.style.display = 'none';
        }

        if (selectedText.length >= 50) {
          summaryButton.style.top = buttonTop;
          summaryButton.style.left = isTargetLanguage ?
            `${parseInt(buttonLeft) + selectionButton.offsetWidth + 5}px` :
            buttonLeft;
          summaryButton.style.display = 'block';
        } else {
          summaryButton.style.display = 'none';
        }

        translationResult.style.display = 'none';
      }
    } else if (!translationResult.contains(e.target)) {
      hideTranslationResult(true);  // 強制隱藏
    }
  });
}

function hideTranslationResult(force = false) {
  if (force || (!translationResult.contains(document.activeElement))) {
    selectionButton.style.display = 'none';
    summaryButton.style.display = 'none';
    translationResult.style.display = 'none';

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }
}



async function showTranslationResult(text) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  translationResult.textContent = '';
  translationResult.style.display = 'block';
  const rect = selectionButton.getBoundingClientRect();
  translationResult.style.top = `${window.scrollY + rect.bottom + 5}px`;
  translationResult.style.left = `${window.scrollX + rect.left}px`;

  const textElement = document.createElement('p');
  textElement.textContent = text;
  translationResult.appendChild(textElement);

  try {
    const audioUrl = await generateSpeech(text);
    const playButton = createPlayButton(audioUrl);
    translationResult.appendChild(playButton);
  } catch (error) {
    console.error('音頻生成錯誤：', error);
  }
}

function createPlayButton(audioUrl) {
  const playButton = document.createElement('button');
  playButton.textContent = '播放';
  playButton.className = 'play-audio-btn';

  playButton.addEventListener('click', (e) => {
    e.stopPropagation();  // 阻止事件冒泡
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      playButton.textContent = '播放';
    } else {
      if (currentAudio) {
        currentAudio.pause();
      }
      currentAudio = new Audio(audioUrl);
      currentAudio.play();
      playButton.textContent = '暫停';

      currentAudio.onended = () => {
        playButton.textContent = '播放';
        currentAudio = null;
      };
    }
  });

  return playButton;
}

async function translateText(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey', 'targetLanguage', 'aiModel'], async (data) => {
      if (!data.apiKey) {
        reject(new Error('API密鑰未設置'));
        return;
      }

      const targetLanguage = data.targetLanguage || 'zh-TW';
      const aiModel = data.aiModel || 'gpt-3.5-turbo';
      const languageNames = {
        'zh-TW': 'Traditional Chinese',
        'en': 'English',
        'ja': 'Japanese',
        'ko': 'Korean',
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.apiKey}`
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {role: "system", content: `You are a translator. Translate the following text to ${languageNames[targetLanguage]}.`},
            {role: "user", content: text}
          ]
        })
      });

      if (!response.ok) {
        reject(new Error('API請求失敗'));
        return;
      }

      const result = await response.json();
      resolve(result.choices[0].message.content.trim());
    });
  });
}

async function summarizeText(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey', 'targetLanguage', 'aiModel'], async (data) => {
      if (!data.apiKey) {
        reject(new Error('API密鑰未設置'));
        return;
      }

      const targetLanguage = data.targetLanguage || 'zh-TW';
      const aiModel = data.aiModel || 'gpt-3.5-turbo';
      const languageNames = {
        'zh-TW': 'Traditional Chinese',
        'en': 'English',
        'ja': 'Japanese',
        'ko': 'Korean',
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.apiKey}`
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            {role: "system", content: `You are a summarizer. Summarize the following text in ${languageNames[targetLanguage]} using between 50 to 200 characters.`},
            {role: "user", content: text}
          ]
        })
      });

      if (!response.ok) {
        reject(new Error('API請求失敗'));
        return;
      }

      const result = await response.json();
      resolve(result.choices[0].message.content.trim());
    });
  });
}

async function generateSpeech(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey'], async (data) => {
      if (!data.apiKey) {
        reject(new Error('API密鑰未設置'));
        return;
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.apiKey}`
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "nova",
          response_format: "mp3",
          speed: 1.0
        })
      });

      if (!response.ok) {
        reject(new Error('音頻生成失敗'));
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      resolve(audioUrl);
    });
  });
}

function isTextInSpecifiedLanguage(text, specifiedLanguage) {
  const languageRegexMap = {
    'zh-TW': /[\u4e00-\u9fff]/g,
    'ja': /[\u3040-\u30ff\u31f0-\u31ff\uFF00-\uFFEF]/g,
    'en': /[a-zA-Z]/g,
    'ko': /[\uac00-\ud7af]/g
  };

  if (!languageRegexMap[specifiedLanguage]) {
    throw new Error("Unsupported language specified");
  }

  const regex = languageRegexMap[specifiedLanguage];
  const matchedCharacters = text.match(regex) || [];
  const specifiedLanguagePercentage = matchedCharacters.length / text.length;

  return specifiedLanguagePercentage > 0.5;
}

function getLanguageName(languageCode) {
  const languageNames = {
    'zh-TW': '繁體中文',
    'en': '英文',
    'ja': '日文',
    'ko': '韓文',
  };
  return languageNames[languageCode] || '中文';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateExtensionStatus") {
    if (!request.enabled) {
      hideTranslationResult();
    }
  }
});

document.addEventListener('selectionchange', handleSelection);

document.addEventListener('click', (e) => {
  if (!translationResult.contains(e.target) &&
      e.target !== selectionButton &&
      e.target !== summaryButton) {
    hideTranslationResult(true);
  }
});


window.addEventListener('load', () => {
  createButtons();
  createTranslationResult();
});

window.addEventListener('beforeunload', () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
});
