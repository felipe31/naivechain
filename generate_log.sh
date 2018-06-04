# Exemplo de uso
# DATA="Alout " LOG_FILE=./logs/log ./generate_log.sh 

for i in {1..100}
do 	
	$(eval echo '$DATA $i' >> $LOG_FILE)
	$(eval sleep 0.5)
	done