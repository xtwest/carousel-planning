define({
	// The port on which the instrumenting proxy will listen
	proxyPort: 9000,

	// A fully qualified URL to the Intern proxy
	proxyUrl: 'http://localhost:9000/',

	// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
	// specified browser environments in the `environments` array below as well. See
	// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
	// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
	// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
	// automatically
	capabilities: {
		'selenium-version': '2.44.0',
		'idle-timeout': 30
	},

	// Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
	// OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
	// capabilities options specified for an environment will be copied as-is
	environments: [
		// { browserName: 'firefox' },
		// { browserName: 'safari' },
		{ browserName: 'chrome' }
	],

	// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
	maxConcurrency: 3,

	// Whether or not to start Sauce Connect before running tests
	// useSauceConnect: false,
	tunnel: 'NullTunnel',

	// Connection information for the remote WebDriver service. If using Sauce Labs, keep your username and password
	// in the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables unless you are sure you will NEVER be
	// publishing this configuration file somewhere
	// webdriver: {
	// 	host: 'localhost',
	// 	port: 4444
	// },

	// Configuration options for the module loader; any AMD configuration options supported by the Dojo loader can be
	// used here
	loader: {
		// Packages that should be registered with the loader in each testing environment
		packages: [ { name: 'intern-selftest', location: '.' }, { name: 'carousel', location: 'library/js/carousel' } ],
		map: { 'intern-selftest': { dojo: 'intern-selftest/node_modules/dojo' }, 'library/js/carousel': { 'vendor/x': 'library/js/vendor/x' } }
	},

	// Non-functional test suite(s) to run in each browser
	suites: [ /* 'tests/carousel-test' */ ],

	// Functional test suite(s) to run in each browser once non-functional tests are completed
	functionalSuites: [ 'tests/carousel-func-test' ],

	// A regular expression matching URLs to files that should not be included in code coverage analysis
	excludeInstrumentation: /^(?:tests|node_modules)\//,

	isSelfTestConfig: true
});