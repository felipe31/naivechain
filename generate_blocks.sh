for i in {1..100}
do 	
	$(eval curl -H "Content-type:application/json" --data "'"{\"data\" : \"${DATA} $i \"}"'" http://${IP_SERVER}:3001/mineBlock)
	done