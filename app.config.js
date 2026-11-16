// Adds the web sub-path for the GitHub Pages build, which sets
// EXPO_BASE_URL=/math-game (see .github/workflows/pages.yml). Without it
// (npx expo start, the phone, the local web version) the app stays at the
// root, exactly as configured in app.json.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL && { baseUrl: process.env.EXPO_BASE_URL }),
  },
});
