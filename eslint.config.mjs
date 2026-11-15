import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...nextCoreWebVitals,
  {
    rules: {
      // The pages load their data in useEffect and call fetch helpers declared further
      // down the component. Both patterns are safe at runtime; these React Compiler
      // rules flag them as style issues, so they are reported but don't fail lint.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  { ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'node_modules/**', 'cloudflare-env.d.ts'] },
];
