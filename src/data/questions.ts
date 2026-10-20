import type { Category, Company } from '../store/types';

export type Question = { text: string; category: Category };

const BANK: Record<Exclude<Category, 'company'>, string[]> = {
  personality: [
    '1분 동안 자기소개를 해 주세요.',
    '팀 프로젝트에서 의견이 부딪혔을 때 어떻게 해결했나요?',
    '가장 크게 실패했던 경험과 그 뒤에 바꾼 점을 말해 주세요.',
    '본인의 장점과 단점을 하나씩 말해 주세요.',
    '스트레스를 받을 때 어떻게 푸나요?',
    '최근에 스스로 공부해서 해낸 일이 있나요?',
    '함께 일하기 어려웠던 사람과 어떻게 일했나요?',
    '5년 뒤 어떤 사람이 되어 있고 싶나요?',
  ],
  job: [
    '웹 접근성을 지키기 위해 마크업에서 가장 먼저 챙기는 것은 무엇인가요?',
    '시맨틱 마크업이 왜 중요한지 예를 들어 설명해 주세요.',
    '반응형 레이아웃을 만들 때 어떤 순서로 작업하나요?',
    '크로스 브라우징 문제를 겪었던 경험과 해결 방법을 말해 주세요.',
    '페이지가 느릴 때 어디부터 확인하나요? 성능을 개선한 경험이 있나요?',
    'Flexbox와 Grid는 각각 언제 쓰나요?',
    '디자이너가 준 시안이 구현하기 어려울 때 어떻게 협의하나요?',
    'Git으로 협업할 때 지키는 규칙이 있나요?',
    '최근에 관심 있게 본 웹 기술은 무엇이고, 왜 관심이 가나요?',
    '포트폴리오 중 가장 어려웠던 문제를 하나 골라 설명해 주세요.',
  ],
  pressure: [
    '포트폴리오를 AI로 만든 것 아닌가요? 본인이 한 일은 무엇인가요?',
    '그 정도는 누구나 하는 것 아닌가요?',
    '전공자가 아닌데 우리가 왜 뽑아야 하죠?',
    '우리 회사에 떨어지면 어디로 가실 건가요?',
    '1년 안에 그만두지 않는다고 어떻게 믿죠?',
    '방금 답변은 준비해 온 말 같은데, 진짜 본인 생각은 뭔가요?',
    '야근이 잦은데 괜찮으신가요?',
    '본인의 가장 치명적인 약점은 무엇인가요?',
  ],
};

export function companyQuestions(company: Company): string[] {
  const generated = [
    `${company.name}에 지원한 이유를 말해 주세요.`,
    `${company.role || '이 직무'}에 들어오면 첫 3개월 동안 무엇을 하겠습니까?`,
    ...company.keywords.slice(0, 3).map((keyword) => `우리 회사 인재상인 "${keyword}"을(를) 보여 준 경험이 있나요?`),
  ];
  return [...company.questions.filter(Boolean), ...generated];
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** 잠입에 쓸 질문 묶음. 'mixed'는 종류를 섞는다. */
export function drawQuestions(kind: Category | 'mixed', count: number, company: Company | null): Question[] {
  const pool: Question[] = [];
  const add = (category: Category, texts: string[]) => texts.forEach((text) => pool.push({ text, category }));

  if (kind === 'company' || (kind === 'mixed' && company)) {
    if (company) add('company', companyQuestions(company));
  }
  if (kind === 'mixed') {
    add('personality', BANK.personality);
    add('job', BANK.job);
    add('pressure', BANK.pressure);
  } else if (kind !== 'company') {
    add(kind, BANK[kind]);
  }

  if (kind === 'mixed') {
    // 종류가 한쪽으로 몰리지 않게 종류별로 돌아가며 뽑는다.
    const byCategory = new Map<Category, Question[]>();
    for (const question of shuffle(pool)) {
      byCategory.set(question.category, [...(byCategory.get(question.category) ?? []), question]);
    }
    const order = shuffle([...byCategory.keys()]);
    const picked: Question[] = [];
    while (picked.length < count && [...byCategory.values()].some((list) => list.length)) {
      for (const category of order) {
        const next = byCategory.get(category)?.shift();
        if (next && picked.length < count) picked.push(next);
      }
    }
    return picked;
  }
  return shuffle(pool).slice(0, count);
}
