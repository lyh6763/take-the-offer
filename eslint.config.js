import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 구성은 같은 포트폴리오의 levis 저장소와 맞췄다.
export default tseslint.config(
  {
    ignores: ['dist', 'dist-*', '.vite', 'node_modules'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // 타입을 맞추려고 받기만 하는 인자는 이름 앞에 _를 붙여 표시한다.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // 브라우저에서 도는 앱 코드
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: globals.browser,
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    // 설정 파일은 Node에서 돈다.
    files: ['*.config.{ts,js}'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
