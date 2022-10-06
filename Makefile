src/proto/http-endpoints.gen.ts: node_modules/@dcl/protocol/bff/http-endpoints.proto
	mkdir -p src/proto
	node_modules/.bin/protoc \
		--plugin=./node_modules/.bin/protoc-gen-ts_proto \
		--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions,oneof=unions \
		--ts_proto_opt=fileSuffix=.gen \
		--ts_proto_out="$(PWD)/src/proto" \
		-I="$(PWD)/node_modules/@dcl/protocol/bff" \
		-I="$(PWD)/node_modules/protobufjs" \
		"$(PWD)/node_modules/@dcl/protocol/bff/http-endpoints.proto"

build: src/proto/http-endpoints.gen.ts
	@rm -rf dist || true
	@mkdir -p dist
	@./node_modules/.bin/tsc -p tsconfig.json
