.PHONY: build test

build:
	@node ./bin/builder.js;
	cp ./dist/*.js ./examples/helloworld/public/js
	cp ./dist/*.js ./examples/chat/public/js

test:
	@rm -f ./tests/regression-tests/*~
	@rm -f ./tests/regression-tests/*#*
	@node ./tests/run.js
