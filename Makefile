build:
	docker build -t convert-user-schema .
run:
	docker rm user-schema || true
	docker run --name user-schema convert-user-schema python script.py
	mkdir -p schemas
	docker cp user-schema:/app/codecov.json ./schemas/codecov.json
