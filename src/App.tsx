import { useEffect, useRef } from 'react';

import { Hud } from './components/Hud';
import { SaveAlert } from './components/SaveAlert';
import { syncMotionAttribute } from './lib/motion';
import { useRoute, type RouteName } from './router';
import { CallingCardScreen } from './screens/CallingCard';
import { HideoutScreen } from './screens/Hideout';
import { InfiltrateScreen } from './screens/Infiltrate';
import { PalaceDetailScreen } from './screens/PalaceDetail';
import { PalacesScreen } from './screens/Palaces';
import { ResultScreen } from './screens/Result';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { TitleScreen } from './screens/Title';
import { useStore } from './store/store';

const TITLES: Record<RouteName, string> = {
  title: 'TAKE THE OFFER',
  hideout: '아지트',
  palaces: '팰리스',
  palace: '팰리스 조사',
  card: '예고장',
  infiltrate: '잠입',
  result: '작전 결과',
  stats: '괴도 능력치',
  settings: '설정',
};

export function App() {
  const route = useRoute();
  const motion = useStore((state) => state.settings.motion);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => syncMotionAttribute(), [motion]);

  useEffect(() => {
    document.title = route.name === 'title' ? 'TAKE THE OFFER — 면접 리허설 작전' : `${TITLES[route.name]} | TAKE THE OFFER`;
  }, [route.name]);

  let screen;
  switch (route.name) {
    case 'title':
      screen = <TitleScreen />;
      break;
    case 'hideout':
      screen = <HideoutScreen />;
      break;
    case 'palaces':
      screen = <PalacesScreen />;
      break;
    case 'palace':
      screen = <PalaceDetailScreen key={route.id} id={route.id ?? ''} />;
      break;
    case 'card':
      screen = <CallingCardScreen companyId={route.query.get('company')} />;
      break;
    case 'infiltrate':
      screen = <InfiltrateScreen companyId={route.query.get('company')} />;
      break;
    case 'result':
      screen = <ResultScreen sessionId={route.id ?? ''} />;
      break;
    case 'stats':
      screen = <StatsScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
  }

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          // 해시 라우팅이라 #main으로 주소를 바꾸지 않고 포커스만 옮긴다.
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        본문 바로가기
      </a>
      {route.name !== 'title' && <Hud current={route.name} />}
      <SaveAlert />
      <main id="main" ref={mainRef} tabIndex={-1} className={`screen screen--${route.name}`}>
        {screen}
      </main>
    </>
  );
}
