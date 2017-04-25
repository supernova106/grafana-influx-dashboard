build:
	docker build -t supernova106/grafana-scripted:dev2 .
clean-images:
	docker rmi $(docker images | grep "^<none>" | awk "{print $3}")
	
