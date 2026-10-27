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
  /** 수동·오류 종료 모두 아직 확정되지 않은 마지막 문장까지 돌려준다. */
  onEnd: (transcript: string) => void;
};

const ERROR_MESSAGE: Record<string, string> = {
  'not-allowed': '마이크 사용이 허용되지 않았습니다. 주소창의 권한 설정을 확인하거나 직접 입력으로 답해 주세요.',
  'no-speech': '목소리가 들리지 않았습니다. 다시 시도하거나 직접 입력으로 답해 주세요.',
  'audio-capture': '마이크를 찾지 못했습니다. 직접 입력으로 답해 주세요.',
  network: '음성 인식 서버에 연결하지 못했습니다. 직접 입력으로 답해 주세요.',
};

/**
 * 답변을 듣는다. 조용해서 끝난 경우에는 이어 듣고, 오류나 수동 종료 때는 마지막 결과를 보존한다.
 */
export function listen(handlers: ListenHandlers): Listener | null {
  const Constructor = recognitionConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;

  let committedText = '';
  let finalText = '';
  let interimText = '';
  let stopped = false;
  let ended = false;
  let endTimer: number | undefined;

  const transcript = () => [committedText, finalText, interimText].filter(Boolean).join(' ').trim();
  const detach = () => {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  };
  const finish = () => {
    if (ended) return;
    ended = true;
    window.clearTimeout(endTimer);
    detach();
    // 종료 이벤트가 누락된 브라우저에서도 마이크를 남겨 두지 않는다.
    try { recognition.abort(); } catch { /* 이미 끝난 경우 */ }
    handlers.onEnd(transcript());
  };
  const waitForEnd = () => {
    if (endTimer === undefined) endTimer = window.setTimeout(finish, 1500);
  };

  recognition.onresult = (event) => {
    if (ended) return;
    const finalParts: string[] = [];
    const interimParts: string[] = [];
    // 갱신된 결과 목록 전체로 다시 만든다. 같은 확정 결과를 중복해서 더하지 않는다.
    for (let index = 0; index < event.results.length; index++) {
      const result = event.results[index];
      if (!result.length) continue;
      (result.isFinal ? finalParts : interimParts).push(result[0].transcript.trim());
    }
    finalText = finalParts.filter(Boolean).join(' ');
    interimText = interimParts.filter(Boolean).join(' ');
    handlers.onText([committedText, finalText].filter(Boolean).join(' '), interimText);
  };
  recognition.onerror = (event) => {
    if (ended) return;
    stopped = true;
    handlers.onError(ERROR_MESSAGE[event.error] ?? `음성 인식 오류 (${event.error})`);
    waitForEnd();
  };
  recognition.onend = () => {
    if (ended) return;
    if (!stopped) {
      committedText = transcript();
      finalText = '';
      interimText = '';
      handlers.onText(committedText, '');
      try {
        recognition.start();
        return;
      } catch {
        handlers.onError('음성 인식을 이어갈 수 없습니다. 보존된 문장을 확인하거나 다시 녹음해 주세요.');
      }
    }
    finish();
  };

  try {
    recognition.start();
  } catch {
    handlers.onError('녹음을 시작하지 못했습니다. 마이크 권한을 확인하거나 직접 입력으로 답해 주세요.');
    finish();
  }
  return {
    stop: () => {
      if (ended || stopped) return;
      stopped = true;
      waitForEnd();
      // stop 뒤에 오는 최종 결과를 받은 후 onEnd에서 확정한다.
      try { recognition.stop(); } catch { finish(); }
    },
    abort: () => {
      if (ended) return;
      stopped = true;
      ended = true;
      window.clearTimeout(endTimer);
      detach();
      // 화면을 떠난 뒤 늦게 도착한 콜백이 새 답변을 덮어쓰지 않게 한다.
      try { recognition.abort(); } catch { /* 이미 끝난 경우 */ }
    },
  };
}
