/**
 * Web Speech API 래퍼. 지원하지 않는 브라우저에서는 supported가 false이고, 화면은 텍스트 입력으로 대신한다.
 * TypeScript DOM 타입에 음성 인식이 없어 필요한 부분만 직접 선언한다.
 */

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } };
type RecognitionErrorEvent = { error: string };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupport = {
  synthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
  recognition: recognitionConstructor() !== null,
};

/** 말로 답하기를 고르는 곳(설정·잠입)마다 같은 문장으로 알린다. */
export const RECOGNITION_NOTICE =
  '말로 답하면 브라우저의 음성 인식이 소리를 글자로 바꿉니다. Chrome·Edge 등 많은 브라우저는 이때 소리를 브라우저 제조사의 서버로 보냅니다. 바뀐 글자와 답변 기록은 이 기기에만 저장됩니다.';

function koreanVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === 'ko-KR') ?? voices.find((voice) => voice.lang.startsWith('ko')) ?? null;
}

/** 질문을 읽는다. 끝나면(또는 취소되면) resolve. */
export function speak(text: string, rate = 1): Promise<void> {
  if (!speechSupport.synthesis) return Promise.resolve();
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = rate;
    utterance.pitch = 0.85;
    const voice = koreanVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (speechSupport.synthesis) window.speechSynthesis.cancel();
}

export type Listener = {
  stop: () => void;
  abort: () => void;
};

type ListenHandlers = {
  /** 확정된 문장 + 아직 확정 안 된 문장 */
  onText: (finalText: string, interimText: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

const ERROR_MESSAGE: Record<string, string> = {
  'not-allowed': '마이크 사용이 허용되지 않았습니다. 주소창의 권한 설정을 확인하거나 직접 입력으로 답해 주세요.',
  'no-speech': '목소리가 들리지 않았습니다. 다시 시도하거나 직접 입력으로 답해 주세요.',
  'audio-capture': '마이크를 찾지 못했습니다. 직접 입력으로 답해 주세요.',
  network: '음성 인식 서버에 연결하지 못했습니다. 직접 입력으로 답해 주세요.',
};

/**
 * 답변을 듣는다. 브라우저가 잠깐 조용하면 스스로 끝내는 경우가 있어, stop()을 부르기 전에는 다시 시작한다.
 */
export function listen(handlers: ListenHandlers): Listener | null {
  const Constructor = recognitionConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = '';
  let stopped = false;

  recognition.onresult = (event) => {
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const result = event.results[index];
      if (result.isFinal) finalText += `${result[0].transcript} `;
      else interim += result[0].transcript;
    }
    handlers.onText(finalText.trim(), interim.trim());
  };
  recognition.onerror = (event) => {
    if (event.error === 'aborted') return;
    if (event.error !== 'no-speech') stopped = true;
    handlers.onError(ERROR_MESSAGE[event.error] ?? `음성 인식 오류 (${event.error})`);
  };
  recognition.onend = () => {
    if (!stopped) {
      try {
        recognition.start();
        return;
      } catch {
        // 다시 시작할 수 없으면 끝낸다.
      }
    }
    handlers.onEnd();
  };

  recognition.start();
  return {
    stop: () => {
      stopped = true;
      recognition.stop();
    },
    abort: () => {
      stopped = true;
      recognition.abort();
    },
  };
}
