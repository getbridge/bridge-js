.PHONY: build test

build:
	@node ./bin/builder.js;
	cp ./dist/*.js ./examples/helloworld/public/js
	cp ./dist/*.js ./examples/chat/public/js

test:
	@node ./tests/run.js
