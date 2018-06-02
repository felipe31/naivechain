	'use strict';

class Block {
	constructor(index, previousHash, timestamp, data, hash, creator, publicKey, signature, ip, file) {
		this.index = index;
		this.previousHash = previousHash.toString();
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash.toString();
		this.creator = creator;
		this.publicKey = publicKey;
		this.signature = signature;
		this.ip = ip;
		this.file = file;
		this.nextHash = null;
	}
}

class Blockchain {

	constructor(path, fs, ip, security) {
		this.latestBlock;
		this._path = path;
		this._fs = fs;
		this._ip = ip;
		this._security = security;
		this.getAllBlocks().then(
			value => {

				this.isValidChain(value).then(
					value_empty => {
						this.latestBlock = value[value.length-1];
					},
					error_empty => {
						this.deleteOldFiles().then(
							value => {
								this.pushBlock(this.getGenesisBlock());
							},
							error => {
								console.log(error); // Error!
								console.log("erro excluir arquivos");
							}
						);
					});
			}
		);
	}
	
	
	deleteOldFiles(){
		let self = this;
		return new Promise(function(resolve, reject) {

			self._fs.readdir("./data", (err, files) => {
				if (err) reject();

				for (const file of files) {
					self._fs.unlink(self._path.join("data", file), err => {
						if (err) reject();
					});
				}
				resolve(true);
			});
		});
	}

	getGenesisBlock(){
		let signature = this._security.signature("genesis", 1);
		return new Block(0, "0", 1465154705000, "genesis", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7", "Blockchain Services", this._security.programPub, signature, "0.0.0.0", "");
	}

	addBlock(blockData, file, type, connection){
		let newBlock = this.generateNextBlock(blockData, file, type);

		let self = this;

		return new Promise(function(resolve,reject){

			self.isValidNewBlock(newBlock, self.latestBlock).then(
				value => {
					self.pushBlock(newBlock).then(
						value => {
							connection.broadcast(connection.responseLatestMsg());
						},
						error => {
							console.log(error);
							console.log("erro");
						}
					);
				}
			);
		});
	}


	generateNextBlock(blockData, file, type){
		if(type == 0){
			console.log(this.latestBlock);
			let nextIndex = this.latestBlock.index + 1;
			let nextTimestamp = new Date().getTime();
			let signature = this._security.signature(blockData, 0);
			let nextHash = this.calculateHash(nextIndex, nextTimestamp, blockData, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);

			this.latestBlock.nextHash = nextHash;

			return new Block(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, nextHash, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
		} else {
			let nextIndex = this.latestBlock.index + 1;
			let nextTimestamp = new Date().getTime();
			let signature = this._security.signature(blockData, 1);
			let nextHash = this.calculateHash(nextIndex, nextTimestamp, blockData, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
			return new Block(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, nextHash, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
		}
	};

	calculateHash(index, timestamp, data, creator, publicKey, signature, ip, file){
		return this._security.hash(index + timestamp + data + creator + publicKey + signature + ip + file);
	};

	calculateHashForBlock(block){
		return this.calculateHash(block.index, block.timestamp, block.data, block.creator, block.publicKey, block.signature, block.ip, block.file);
	};

	isValidNewBlock (newBlock, previousBlock){
		let self = this;

		return new Promise(function(resolve, reject) {

			if (previousBlock.index + 1 !== newBlock.index) {
				console.log('invalid index');
				reject();
			} else if (previousBlock.hash !== newBlock.previousHash) {
				console.log('invalid previoushash');
				reject();
			} else if (self.calculateHashForBlock(newBlock) !== newBlock.hash) {
				console.log(typeof (newBlock.hash) + ' ' + typeof self.calculateHashForBlock(newBlock));
				console.log('invalid hash: ' + self.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
				reject();
			} else if (previousBlock.nextHash !== newBlock.hash) {
				console.log('invalid previoushash.nextHash');
				reject();
			} else if(!self._security.verifySignature(newBlock.data, newBlock.signature, newBlock.publicKey)){
				console.log('invalid signature');
				reject();
			} else{
				self.getAllBlocks().then(
					value => {
						// Verify if the position of the newBlock is already taken
						if (value[self.calculateHashForBlock(newBlock)] !== undefined) {
							console.log('hash position already in use!');
							reject();
						}
				});
			}
			return true;
		});
	};

	getAllBlocks(){
		let self = this;
		return new Promise(function(resolve, reject) {
			self._fs.readFile('./data/data.txt', 'utf8', function(err, data){
				if (err) {
					resolve("");
				} else {
					if(data){
						try {
							let log = self._security.decryptSymmetric(data);
							resolve(JSON.parse(log));
						} catch(e){
							resolve("");
						}
					} else{
						resolve("");
					}

				}
			});
		});
	}

	replace(newBlocks){

		let value = this._security.encryptSymmetric(JSON.stringify(newBlocks));

		this._fs.writeFile('./data/data.txt', value, function (err) {
			if (err) {
				console.log("erro de escrita");
			}
		});
	}

	pushBlock(block){
		
			let self = this;
			
			return new Promise(function(resolve, reject) {
				if(self._security.verifySignature(block.data, block.signature, block.publicKey)){
					self.getAllBlocks().then(
						value => {
							console.log("------------------------------");
							console.log("------------------------------");
							console.log("------------------------------");
							console.log("------------------------------");
							console.log(typeof(value));
							console.log(value);
							console.log("------------------------------");
							console.log("------------------------------");
							console.log("------------------------------");
							console.log("------------------------------");

							let hashCurrentBlock = self.calculateHashForBlock(block);
							if(value){
								self.latestBlock.nextHash = hashCurrentBlock;
								block.previousHash = self.calculateHashForBlock(latestBlock);
							} else value = [];

							value[hashCurrentBlock] = block;

							value = self._security.encryptSymmetric(JSON.stringify(value));

							self._fs.writeFile('./data/data.txt', value, function (err) {
								if (err) {
									console.log("erro de escrita");
								}
							});

							console.log('block added: ' + JSON.stringify(block.data));
							self.latestBlock = block;
							resolve();

							//connection.broadcast(connection.responseLatestMsg());

						}, error => {
							// console.log("get all blocks");
							// console.log(error);
							reject();
						}
					);
				} else {
					console.log("the signature not match with publicKey");
					reject();
				}
			});
	}

	tryReplaceChain(newBlocks){
		let self = this;

		return new Promise(function(resolve, reject) {
			self.isValidChain(newBlocks).then(
				value => {
					if (newBlocks.length > self.latestBlock.index) {
						console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

						self.replace(newBlocks);
						resolve();
					} else {
						console.log('Received blockchain invalid');
						reject();
					}
			});
		});
	};

	isValidChain(blockchainToValidate){
		let self = this;

		return new Promise(function(resolve, reject) {
			
			var hashCurrentBlock = self.calculateHashForBlock(self.getGenesisBlock());
			if (JSON.stringify(blockchainToValidate[hashCurrentBlock]) !== JSON.stringify(self.getGenesisBlock())) {
				reject();
			}
			var tempBlocks = [blockchainToValidate[hashCurrentBlock]];
			for (var i = 1; i < blockchainToValidate.length; i++) {
				hashCurrentBlock = blockchainToValidate[hashCurrentBlock].nextHash;
				if (blockchainToValidate[hashCurrentBlock]) {
					
					self.isValidNewBlock(blockchainToValidate[hashCurrentBlock], tempBlocks[i - 1]).then(
					value => {
						tempBlocks.push(blockchainToValidate[hashCurrentBlock]);
					}, error => {
						reject();
					});
				}
			}
			resolve();
		});
	}
};

module.exports = Blockchain;