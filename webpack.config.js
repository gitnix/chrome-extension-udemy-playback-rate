module.exports = {
	mode: 'production',
	entry: './playbackRate.js',
	resolve: {
		extensions: ['.js'],
	},
	output: {
		path: __dirname + '/extension',
		filename: 'playbackRate.js',
	},
}
