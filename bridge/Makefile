.PHONY: build test

build:
	mkdir -p ./dist ./examples/chat/public/js
	@node ./bin/builder.js;
	cp ./dist/*.js ./examples/chat/public/js

test:
	@rm -f ./tests/regression-tests/*~
	@rm -f ./tests/regression-tests/*#*
	@node ./tests/run.js
