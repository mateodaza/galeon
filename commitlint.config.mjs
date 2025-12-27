export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce lowercase for type and scope
    'type-case': [2, 'always', 'lower-case'],
    'scope-case': [2, 'always', 'lower-case'],
    // Max 72 chars for subject (GitHub truncates at 72)
    'header-max-length': [2, 'always', 72],
  },
}
