module.exports = {
    plugins: [
        require('@tailwindcss/postcss'),
        require('cssnano')({
            preset: 'default',
        }),
    ]
}
