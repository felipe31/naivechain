'use strict';

var stdin = process.openStdin();

class Service {

	constructor(blockchain, fs) {
		this._blockchain = blockchain;
		this._fs = fs;
		let self = this;
		this.compareServiceLoop = setInterval(function(){self.logCompareFunc()}, 3600000);

		stdin.addListener("data", function(d) {

			let path;
			let log;
			let ip;
			let i;
			let opt = d.toString().trim();
			let x = opt.split(' ');

			switch (x[0]) {
				case "exit":
					process.exit(1);
				break;

				case "compare":
					for(i = 1; x[i] !=  undefined; i++) {
						path = x[i];
						if(self.isValidPath(path)){
							self.logCompare(path).then(
								value => {
									console.log("The logs have been verified with the blockchain");

									log ="The client ran a log compare: "+opt+" and the result was:\nLogs successfully compared!";
									self._blockchain.addBlock(log,'', 1);	

								}, error => {

									console.log("The logs in blockchain do NOT correspond with the local logs");

									log = self.generateCompareErrorLog(error, path, 0, opt);
									self._blockchain.addBlock(log,'', 1);	

								});
						} else {
							console.log("The path is invalid");
						}
					}
				break;

				case "connect":
					ip = x[1];
					if (self.isValidIp(ip)) {
						console.log("Starting connection"); 
						self._blockchain._connection.connectAddress({'address':ip});
					} else {
						console.log("Error Establishing connection");
					} 
				break;

				case "clear":
					console.clear();
				break;

				case "search":
					switch (x[1]) {
						case '--timestamp':
						case '-t':
							let data = x[2]; 
							let composedDateStart = self.isValidData(data);
								// Onde isValidData() retorna True se "data" estiver no formato correto; 		
							if (composedDateStart) {
								let composedDateEnd;
								if(x[3] == undefined){
									composedDateEnd = new Date(composedDateStart.getTime());
									composedDateEnd.setHours(23);
									composedDateEnd.setMinutes(59);
									composedDateEnd.setSeconds(59);				
								} else{
									composedDateEnd = self.isValidData(x[3]);
									if(!composedDateEnd) break;
								}
								log ="The client ran a log reading: "+opt;
								self._blockchain.addBlock(log,'', 1);
								// Onde searchLogData() retorna Log com a data correspondente;
								self.searchLogData(composedDateStart.getTime(), composedDateEnd.getTime());
							} else {
								console.log("The parameter is invalid");
							}
						break;

						case '--public-key-path':
						case '-p': 
							let path = x[2];
							// Onde isValidPath() retorna True se o "path" da PK estiver correto; 	
							if (self.isValidPath(path)) {
								log ="The client ran a log reading: "+opt;
								self._blockchain.addBlock(log,'', 1);
								// Onde searchLogPK() retorna Log com a PK correpondente;
								self.searchLogPK(path);
							} else {
								console.log("The path is invalid");
								//console.log("path da Chave Pública incorreto");
							}
						break;

						case '--creator':
						case '-c':
							let creator = x[2];

							let i;
							for(i = 3; x[i] !=  undefined; i++) creator = creator.concat(" ", x[i]);

								// Onde isValidCreator() retorna True se o "creator" estiver correto;
							if (self.isValidCreator(creator)) {
								// Onde searchLogPK() retorna Log do "creator" correspondente;
								log ="The client ran a log reading: "+opt;
								self._blockchain.addBlock(log,'', 1);
								self.searchLogCreator(creator);
							} else {
								console.log("The creator is invalid");
							} 
						break;

						case '--ip':
						case '-i': 
							ip = x[2]; 
							// Onde isValidIp() retorna True se o "ip" estiver correto;
							if (self.isValidIp(ip)) {
								// Onde searchLogIp() retorna Log do "Ip" correspondente;
								log ="The client ran a log reading: "+opt;
								self._blockchain.addBlock(log,'', 1);
								self.searchLogIp(ip);
							} else {
								console.log("The ip is invalid");
							} 
						break;

						case '--help':
						case '-?':
						case '-h':
						default: 
							console.log("\n\nUsage: search <option>");
							console.log("\n\t-t, --timestamp <timestamp start> [<timestamp end>]\n\t\tIf <timestamp start> and <timestamp end> are defined, the command\n\t\treturns all the logs between both dates. If only <timestamp start>\n\t\tis defined, the command returns all the logs of the day.\n\n\t\tThe timestamp needs to be in the following format:\n\t\tdd/mm/yyyy");
							console.log("\n\t-p --public-key-path <public key path>\n\t\tIt returns the logs created using the <public key path>.\n\t\tThe <public key path> must include the full path, the name of the\n\t\tfile and the extension.");
							console.log("\n\t-c --creator <creator name>\n\t\tIt returns the logs created by <creator name>.\n\t\tThe name may have more than one word.");
							console.log("\n\t-i --ip <ip>\n\t\tIt returns the logs created by the ip <ip>.\n\t\tThe ip must be version 4.");
							console.log("\n\t-h -? --help\n\t\tIt shows this information.");
						break;
					}
				break;
				default:
					console.log("\n\nUsage:");
					console.log("\n\tsearch <option>\n\t\tSearch in the blockchain logs according to <option>, it is based\n\t\ton timestamp, creator, ip or public key.");
					console.log("\n\tclear\tClear the console, just like in bash.");
					console.log("\n\tconnect <ip>\n\t\tConnect in the blockchain with the given ip.");
					console.log("\n\tcompare <path> ...\n\t\tCompare the logs in the blockchain with the local logs of the given path(s).")
					console.log("\n\texit\tExit the program.");
					console.log("\n\thelp\tShow this information.\n\n");
				break;
			}

		});
	}


	logCompareFunc(){
		var logFiles;
		
		try {
			logFiles = this._fs.readFileSync('config', 'utf8');
		} catch(e){
			console.log("Config cannot be open to compare");
			// process.exit(1);
		}

		logFiles = JSON.parse(logFiles);

		for(var i = 0; i < logFiles.length; i++){
			let self = this;
			let file = logFiles[i];
			let date = new Date();

			if(!self.isValidPath(file)){
				console.log("The following path inside config file was not found: "+file);
				continue;
			}


			let log;

			console.log("Executing automatic comparation on file: "+file);

			date.setHours(date.getHours()-1);

			this.logCompare(file, date.getTime()).then(
				value => {
					log = log+"Logs successfully compared!";
					self._blockchain.addBlock(log,'', 1);	
				}, error => {
					log = self.generateCompareErrorLog(error, path, 1);
					self._blockchain.addBlock(log,'', 1);	
				});
		}
	}


	logCompare(path, timestamp){
		let self = this;

		return new Promise(function(resolve, reject){

			// while(self._blockchain.lock == 1);

			self.searchLogFile(path, timestamp, function(result){
				if (result == null){ 
					//console.log("result == null");
					resolve();
				} else{
					let logBlockchain = self.concatField(result, 'data');

					self._fs.readFile(path, 'utf8', function(err, data){
						if (err) {	
							reject([1]);
						} else {
							//console.log(data);
							//console.log(logBlockchain);
							if(data.length - logBlockchain.length <  0){
								reject([2]);
							} else{
								let j, i;
								for (i = logBlockchain.length - 1, j = data.length - 1; i >= 0; i--, j--) {
									if(logBlockchain[i] !== data[j])
										reject([data.substr(j, data.length), logBlockchain.substr(j, logBlockchain.length)]);
								}
								//console.log("resolve");
								resolve();
								// } else{
								// 	console.log("reject");
								// 	reject();
								// }
							}
						}
					});
				}
			});
		});
	}

	isValidData(date){
		var matches = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(date);
		if (matches == null) return false;
		var d = matches[1];
		var m = matches[2] - 1;
		var y = matches[3];
		var composedDate = new Date(y, m, d);
		if(composedDate.getDate() == d &&
			composedDate.getMonth() == m &&
			composedDate.getFullYear() == y)
			return composedDate;
		return null;
	}

	isValidPath(path){
		return this._fs.existsSync(path);
	}

	isValidCreator(criator){
		return typeof(criator) == "string";
	}

	isValidIp(ip){
		return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
	}

	printBlockUser(results){
		var i;

		var date;
		for (i = 0; i < results.length; i++) {
			date = new Date(results[i]["timestamp"]).toLocaleString('pt-BR');
			console.log("-----------------");
			console.log("Result #: "+i);
			console.log("\nCreator: "+results[i]["creator"]);
			console.log("\nCreation date: "+date);
			console.log("\nData: "+results[i]["data"]);
			console.log("\nIP: "+results[i]["ip"]);
			console.log("\nPublic Key: "+results[i]["publicKey"]);
			console.log("-----------------\n");
		}
	}

	searchLogData(timestampStart, timestampEnd){
		console.log("Follows the result of your search by timestamp");
		let self = this;
		this._blockchain.getAllBlocks().then(function (blocks){
			let result = [];
			let currentHash = self._blockchain.getGenesisBlock().hash;

			while(currentHash != null){

				if(blocks[currentHash]["timestamp"] >= timestampStart && blocks[currentHash]["timestamp"] <= timestampEnd){
					result.push(blocks[currentHash]);
				}
				currentHash = blocks[currentHash].nextHash;	
			}

			if(result.length < 1){	
				console.log("No result found");
			} else 
				self.printBlockUser(result);
		});

	}

	searchLogPK(pathPK){
		let self = this;
		console.log("Follows the result of your search by PK");
		try{
			this._fs.readFile(pathPK, 'utf8', function(err, publicKey){
				if (err) {
					console.log("File not found!");
				} else {
					if(publicKey){

						self._blockchain.getAllBlocks().then(function (blocks){
							let result = [];
							let currentHash = self._blockchain.getGenesisBlock().hash;

							while(currentHash != null){

								if(blocks[currentHash]["publicKey"].trim() === publicKey.trim()){
									result.push(blocks[currentHash]);
								}
								currentHash = blocks[currentHash].nextHash;	
							}
							if(result.length < 1){	
								console.log("No result found");

							}else 
							self.printBlockUser(result);
						});

					} else{
						console.log("Error on file content");
					}

				}
			});

		}catch(e){
			console.log("Error on reading the file");
		}

	}

	searchLogCreator(creator, callback){
		if(callback == undefined)
			console.log("Follows the result of your search by creator");
		let self = this;
		this._blockchain.getAllBlocks().then(function (blocks){
			let result = [];

			let currentHash = self._blockchain.getGenesisBlock().hash;

			while(currentHash != null){

				if(blocks[currentHash]["creator"] === creator){
					result.push(blocks[currentHash]);
				}
				currentHash = blocks[currentHash].nextHash;	
			}

			if(result.length < 1){	
				console.log("No result found");

			}else if(callback != undefined){
				callback(result);
			} else
				self.printBlockUser(result);
		});
	}

	searchLogIp(ip, callback){
		if(callback == undefined)
			console.log("Follows the result of your search by IP");
		let self = this;
		this._blockchain.getAllBlocks().then(function (blocks){
			var result = [];

			let currentHash = self._blockchain.getGenesisBlock().hash;

			while(currentHash != null){

				if(blocks[currentHash]["ip"] === ip){
					result.push(blocks[currentHash]);
				}
				currentHash = blocks[currentHash].nextHash;	
			}

			if(result.length < 1){	
				console.log("No result found");

			}else if(callback != undefined){
				callback(result);
			} else
				self.printBlockUser(result);
		});
	}

	searchLogFile(path, timestamp, callback){
		if(callback == undefined)
			console.log("Follows the result of your search by file");
		if(timestamp == undefined)
			timestamp = 0;

		let self = this;
		this._blockchain.getAllBlocks().then(function (blocks){
			var result = [];

			let currentHash = self._blockchain.getGenesisBlock().hash;

			while(currentHash != null){
				if(blocks[currentHash].file === path && blocks[currentHash].timestamp > timestamp && self._blockchain._security.publicKey == blocks[currentHash].publicKey){
					result.push(blocks[currentHash]);
				}
				currentHash = blocks[currentHash].nextHash;	
			}

			if(result.length < 1){	
				if(callback != undefined)
					callback(null);

			}else if(callback != undefined){
				callback(result);
			} else
				self.printBlockUser(result);
		});
	}


	concatField(arrayJson, field){
		var string = "";
		for (var i = 0; i < arrayJson.length; i++) {
			string = string.concat(arrayJson[i][field]);
		}
		return string;
	}

	generateCompareErrorLog(error, path, flag, opt){
		let log = "";
		if (flag == 1) {
			log = "The system ran a log compare on file: "+path+" and the result was:\n"
		} else log = "The client ran a log compare: "+opt+" and the result was:\n";

		log = log+"Logs FAIL on compare!";
		switch(error[0]){
			case 1:
				log = log+"\nIt was not possible to open the file: "+path;
				break;
			case 2:
				log = log+"\nThe file: "+path+" do NOT contain as much data as the blockchain.";
				break;
			default:
				log = log+"\nThe file is different on: "+error[0]+"\nAccording to the blockchain, it should be: "+error[1];
		}
		return log;

	}

}

module.exports = Service;