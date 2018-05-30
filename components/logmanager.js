'use strict';

class logManager {

	constructor(fs, Tail, blockchain, connection) {
		this._blockchain = blockchain;
		this._connection = connection;

		var options= {separator: /[\r]{0,1}\n/, fromBeginning: false, follow: true}
		var logFiles;
		
		try {
			logFiles = fs.readFileSync('config', 'utf8');
		} catch(e){
			console.log("Config cannot be open");
			process.exit(1);
		}

		logFiles = JSON.parse(logFiles);

		for(var i = 0; i < logFiles.length; i++){
			try{
				let self = this;
				let file = logFiles[i];
				let tl = new Tail(file, options);
				tl.on("line", function(data){
					console.log('Log Created! Block being created...');
					if(data != ""){
						self._blockchain.addBlock(data,file, 1, self._connection);
					}
				})
			}
			catch(e){
				console.log(logFiles[i]+" this file cannot be open");
			}
		}
	}
}

module.exports = logManager;