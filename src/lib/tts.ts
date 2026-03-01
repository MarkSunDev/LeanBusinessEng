// TTS 工具函数 - 选择优质女声

// 优先女声列表（按质量排序）
const PREFERRED_FEMALE_VOICES = [
  // macOS 优质女声
  "Samantha",
  "Victoria",
  "Karen",
  "Tessa",
  // Google 女声
  "Google US English",
  "Google UK English Female",
  // Microsoft 女声
  "Microsoft Zira Desktop - English (United States)",
  "Microsoft Zira - English (United States)",
  "Microsoft Sonia Online (Natural) - English (United Kingdom)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Aria Online (Natural) - English (United States)",
  // Android 女声
  "en-US-language",
  "en-us-x-sfg#female_1-local",
  "en-us-x-sfg#female_2-local",
  // 通用女声匹配
  "Female",
];

// 缓存语音列表
let cachedVoices: SpeechSynthesisVoice[] | null = null;

/**
 * 获取所有可用的语音列表
 */
export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (cachedVoices && cachedVoices.length > 0) {
      resolve(cachedVoices);
      return;
    }

    const synth = window.speechSynthesis;

    // 某些浏览器需要等待 voiceschanged 事件
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        resolve(voices);
      }
    };

    loadVoices();

    // 监听 voiceschanged 事件
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    // 超时处理（某些浏览器可能不触发事件）
    setTimeout(() => {
      if (!cachedVoices || cachedVoices.length === 0) {
        const voices = synth.getVoices();
        cachedVoices = voices;
        resolve(voices);
      }
    }, 1000);
  });
}

/**
 * 选择最佳女声
 */
export async function selectFemaleVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await getVoices();

  if (voices.length === 0) {
    return null;
  }

  // 按优先级查找女声
  for (const preferredName of PREFERRED_FEMALE_VOICES) {
    const voice = voices.find(v =>
      v.name.includes(preferredName) ||
      v.name.toLowerCase().includes(preferredName.toLowerCase())
    );
    if (voice) {
      console.log("Selected voice:", voice.name);
      return voice;
    }
  }

  // 如果没有找到优先女声，尝试找任何英文女声
  const englishVoice = voices.find(v =>
    v.lang.startsWith("en") &&
    (v.name.toLowerCase().includes("female") ||
     !v.name.toLowerCase().includes("male"))
  );

  if (englishVoice) {
    console.log("Fallback to voice:", englishVoice.name);
    return englishVoice;
  }

  // 最后回退到任何英文语音
  const anyEnglish = voices.find(v => v.lang.startsWith("en"));
  if (anyEnglish) {
    console.log("Fallback to English voice:", anyEnglish.name);
    return anyEnglish;
  }

  // 实在不行就用第一个
  return voices[0];
}

/**
 * 朗读文本（使用女声）
 */
export async function speakText(text: string): Promise<void> {
  if (!window.speechSynthesis) {
    console.error("浏览器不支持语音朗读功能");
    return;
  }

  // 取消之前的朗读
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // 选择女声
  const voice = await selectFemaleVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }

  // 优化参数使声音更清晰自然
  utterance.rate = 0.85;      // 稍慢一点，更清晰
  utterance.pitch = 1.05;     // 稍微高一点，更自然
  utterance.volume = 1;       // 最大音量

  return new Promise((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 预加载语音（在页面加载时调用）
 */
export function preloadVoices(): void {
  getVoices().then(voices => {
    console.log("Available voices:", voices.map(v => v.name));
  });
}
