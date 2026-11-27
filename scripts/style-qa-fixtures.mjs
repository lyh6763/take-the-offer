export const epoch = Date.parse('2026-11-26T06:00:00.000Z');

function analysis(score) {
  return {
    chars: 72, syllables: 70, durationSec: 45, pace: null,
    fillers: [], fillerTotal: 0, conclusionFirst: true,
    star: { situation: true, task: true, action: true, result: true },
    hasNumbers: true, score,
    strengths: ['구체적인 경험과 결과를 설명했다.'],
    weaknesses: ['지원 직무와의 연결을 더 설명하면 좋다.'],
  };
}

export function stateFor(kind) {
  const state = {
    version: 1,
    companies: [{
      id: 'qa-company', name: '검수용 회사', role: '웹 퍼블리셔',
      interviewDate: '2026-12-02', keywords: ['접근성', '반응형'],
      questions: ['지원 동기를 설명해 주세요.', '협업 경험을 설명해 주세요.'],
      memo: '색상 보존 검수용 예시 데이터입니다.', createdAt: epoch - 86400000,
      cardSentAt: epoch - 3600000,
    }],
    answers: [92, 75, 32].map((score, index) => ({
      id: `qa-answer-${index}`, sessionId: 'qa-session', companyId: 'qa-company',
      question: ['자기소개를 해 주세요.', '문제 해결 경험을 설명해 주세요.', '협업 경험을 설명해 주세요.'][index],
      category: 'job', transcript: '접근성과 반응형 화면을 함께 검토하고 결과를 확인했습니다.',
      mode: 'text', analysis: analysis(score), createdAt: epoch - (3 - index) * 60000,
    })),
    interviewDraft: null,
    exp: { knowledge: 140, guts: 100, eloquence: 180, attitude: 120, charm: 90 },
    awarded: [], settings: { motion: 'reduce', voice: false, voiceRate: 1, microphone: false },
  };
  if (kind === 'empty') {
    state.companies = [];
    state.answers = [];
    state.exp = { knowledge: 0, guts: 0, eloquence: 0, attitude: 0, charm: 0 };
  }
  if (kind === 'question' || kind === 'review') {
    const question = { text: '접근성을 개선한 경험을 설명해 주세요.', category: 'job' };
    state.interviewDraft = {
      sessionId: 'qa-draft', companyId: 'qa-company', phase: kind,
      questions: [question, { text: '협업 경험을 설명해 주세요.', category: 'personality' }],
      index: 0,
      turns: kind === 'review' ? [{ question, transcript: '키보드로 화면을 검수했습니다.', mode: 'text', analysis: analysis(32) }] : [],
      mode: 'text', answer: kind === 'question' ? '' : '키보드로 화면을 검수했습니다.', duration: 0,
    };
  }
  return state;
}

export const cases = [
  { id: 'title', hash: '/' },
  { id: 'hideout', hash: '/hideout' },
  { id: 'hideout-empty', hash: '/hideout', state: 'empty' },
  { id: 'palaces', hash: '/palace' },
  { id: 'palace', hash: '/palace/qa-company' },
  { id: 'card', hash: '/card?company=qa-company' },
  { id: 'setup', hash: '/infiltrate?company=qa-company' },
  { id: 'question', hash: '/infiltrate', state: 'question' },
  { id: 'review', hash: '/infiltrate', state: 'review' },
  { id: 'result', hash: '/result/qa-session' },
  { id: 'stats', hash: '/stats' },
  { id: 'settings', hash: '/settings' },
  { id: 'dialog', hash: '/settings', dialog: true },
];
export const widths = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }];

