module.exports = {
  content: ["./src/html/**/*.pug"],
  theme: {
    extend: {},
    fontFamily: {
      'sans': ['"PT Sans"', 'Roboto', 'Helvetica', 'Arial'],
    }
  },
  plugins: [
    require('postcss-import'),
  ],
}
