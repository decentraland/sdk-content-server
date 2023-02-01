build: 
	@rm -rf dist || true
	@mkdir -p dist
	@./node_modules/.bin/tsc -p tsconfig.json
