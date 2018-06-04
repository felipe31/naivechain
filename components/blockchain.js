	'use strict';

class Block {
	constructor(index, timestamp, data, hash, creator, publicKey, signature, ip, file) {
		this.index = index;
		this.previousHash = null;
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
		this.blocksToAdd = [];
		this._connection = null;
		this.lock = 0;
		this.idx = 0;

		this.getAllBlocks().then(
			value => {
				if(value && this.isValidChain(value)){
					this.latestBlock = this.getLastBlock(value);
					this.idx = this.latestBlock.index;
				} else {
					this.deleteOldFiles().then(
						value => {
							this.startChain();
						},
						error => {
							console.log(error); // Error!
							console.log("erro excluir arquivos");
						}
					);
				}
			}
		);
	}

	getLastBlock(blocks){
		if(blocks[this.getGenesisBlock().hash].previousHash == null){
			return blocks[this.getGenesisBlock().hash];
		} else {
			return blocks[blocks[this.getGenesisBlock().hash].previousHash];
		}
	}

	setConnection(connection){
		this._connection = connection;
	}

	startChain(){
		let genesis = this.getGenesisBlock();
		let value = new Object();
		value[genesis.hash] = genesis;

		value = this._security.encryptSymmetric(JSON.stringify(value));

		this._fs.writeFile('./data/data.txt', value, function (err) {
			if (err) {
				console.log("erro de escrita");
			}
		});

		console.log('genesis add');

		this.latestBlock = genesis;
	}

	blockToQueue(block){
		this.blocksToAdd.push(block);
		this.pushBlock();
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
		return new Block(0,1465154705000, "genesis", this.calculateHash(0, 1465154705000, "genesis", "Blockchain Services", this._security.programPub, signature, "0.0.0.0", ""), "Blockchain Services", this._security.programPub, signature, "0.0.0.0", "");
	}

	addBlock(blockData, file, type, connection){
		this.blockToQueue({data: blockData, file: file, type: type});
	}

	generateNextBlock(blockData, file, type){
		this.idx++;

		let nextIndex = this.idx;
		let nextTimestamp = new Date().getTime();

		if(type == 0){
			let signature = this._security.signature(blockData, 0);
			let nextHash = this.calculateHash(nextTimestamp, blockData, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
			return new Block(nextIndex, nextTimestamp, blockData, nextHash, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
		} else {
			let signature = this._security.signature(blockData, 1);
			let nextHash = this.calculateHash(nextTimestamp, blockData, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
			return new Block(nextIndex, nextTimestamp, blockData, nextHash, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
		}
	};

	calculateHash(timestamp, data, creator, publicKey, signature, ip, file){
		return this._security.hash(timestamp + data + creator + publicKey + signature + ip + file);

	};

	calculateHashForBlock(block){
		return this.calculateHash(block.timestamp, block.data, block.creator, block.publicKey, block.signature, block.ip, block.file);
	};

	isValidNewBlock (newBlock, previousBlock){
		let self = this;

		return new Promise(function(resolve, reject) {

			if (previousBlock.index + 1 !== newBlock.index) {
				console.log('invalid index');
				reject();
			} else if (previousBlock.hash !== newBlock.previousHash) {
				console.log('invalid previousHash');
				reject();
			} else if (self.calculateHashForBlock(newBlock) !== newBlock.hash) {
				console.log(typeof (newBlock.hash) + ' ' + typeof self.calculateHashForBlock(newBlock));
				console.log('invalid hash: ' + self.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
				reject();
			} else if (previousBlock.nextHash !== newBlock.hash) {
				console.log('invalid previousHash.nextHash');
				reject();
			} else if(!self._security.verifySignature(newBlock.data, newBlock.signature, newBlock.publicKey)){
				console.log('invalid signature');
				reject();
			} else {
				self.getAllBlocks().then(
					value => {
						// Verify if the position of the newBlock is already taken
						if (value[self.calculateHashForBlock(newBlock)] !== undefined) {
							console.log('hash position already in use!');
							reject();
						} else {
							resolve();
						}
				});
			}
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

	async appendBlock(blocks){
		let self = this;

		let last = self.latestBlock;

		let addblocks = [];
		let firstHash = null;

		last.nextHash = blocks[0].hash;
		blocks[0].previousHash = last.hash;

		for (var i = 0; i < blocks.length; i++) {

			try{
				await self.isValidNewBlock(blocks[i], last);

				if(firstHash == null ) firstHash = blocks[i].hash;

				if (Object.keys(addblocks).length != 0) {
					addblocks[last.hash].nextHash = blocks[i].hash;
				}

				addblocks[blocks[i].hash] = blocks[i];

				last = blocks[i];

			} catch(e){ 
				console.log("some block is not valid");
			}
		}

		if (Object.keys(addblocks).length != 0) {

			self.getAllBlocks().then(
				blocks => {

					if(blocks){
					
						for(let p in addblocks){
							blocks[p] = addblocks[p];
						}

						self.idx = last.index;
						blocks[self.latestBlock.hash].nextHash = addblocks[firstHash].hash;
						blocks[self.getGenesisBlock().hash].previousHash = last.hash;

					}

					blocks = self._security.encryptSymmetric(JSON.stringify(blocks));

					self._fs.writeFile('./data/data.txt', blocks, function (err) {
						if (err) {
							console.log("erro de escrita");
						}
					});
					
					self.latestBlock = last;
					self._connection.broadcast(self._connection.responseLatestMsg());
					
					self.lock = 0;

					if(self._connection.messageToAdd.length != 0){
						self._connection.handleBlockchainResponse();
					} else if (this.blocksToAdd.length != 0){
						self.pushBlock();
					}

				}
			);
		}
	}

	async pushBlock(){	
	
		if(this.lock == 0 && this.blocksToAdd.length != 0){
			this.lock = 1;
			let last = this.latestBlock;
			let self = this;
			let blocksCounter = 0;

			let blocks = this.blocksToAdd;
			this.blocksToAdd = [];

			let addblocks = [];
			let firstHash = null;

			for (var i = 0; i < blocks.length; i++) {

				let block = self.generateNextBlock(blocks[i].data, blocks[i].file, blocks[i].type);

				last.nextHash = block.hash;
				block.previousHash = last.hash;

				try{
					await self.isValidNewBlock(block, last);
					if (Object.keys(addblocks).length != 0) {
						addblocks[last.hash].nextHash = block.hash;
					}

					if(firstHash == null ) firstHash = block.hash;

					addblocks[block.hash] = block;
					last = block;
					blocksCounter++;
				} catch(e){ 
						self.idx--;
				}
			}
			
			if(blocksCounter != 0){
				self.getAllBlocks().then(
					value => {
						
						if(value){
							
							for(let p in addblocks){
								value[p] = addblocks[p];
							}

							value[self.latestBlock.hash].nextHash = addblocks[firstHash].hash;
							value[self.getGenesisBlock().hash].previousHash = last.hash;

						}

						value = self._security.encryptSymmetric(JSON.stringify(value));

						self._fs.writeFile('./data/data.txt', value, function (err) {
							if (err) {
								console.log("erro de escrita");
							}
						});
						

						console.log('block added');

						self.latestBlock = last;
						self._connection.broadcast(self._connection.responseLatestMsg());
						
						self.lock = 0;

						if(self._connection.messageToAdd.length != 0){
							self._connection.handleBlockchainResponse();
						} else if (this.blocksToAdd.length != 0){
							self.pushBlock();
						}
						

					}, error => {
						//console.log("get all blocks");
						// console.log(error);
					}
				)
			}
		}
	}

	async mergeBlockChains(newBlocks){
		let self = this;
		console.log("1");
		if(self.isValidChain(newBlocks)){

			try{
				let myBlocks = await self.getAllBlocks();
				let myLast = this.latestBlock;
					let newLast = newBlocks[newBlocks[self.getGenesisBlock().hash].previousHash];

					// Achar o ponto comum 
					if(myLast.index > newLast.index){
						
						while(myLast.index != newLast.index){
							myLast = myBlocks[myLast.previousHash];
						}

						if(myLast.hash == newLast.hash){
							// blockchain correta, a nova está desatualizada, então só enviar
							self._connection.broadcast(self._connection.responseChainMsg(myBlocks));

							self.lock = 0;
							console.log("2");
							if(self._connection.messageToAdd.length != 0){
								self._connection.handleBlockchainResponse();
							} else if (this.blocksToAdd.length != 0){
								self.pushBlock();
							}

							return;
						}

					} else {
						while(myLast.index != newLast.index){
							newLast = newBlocks[newLast.previousHash];
						}

						if(myLast.hash == newLast.hash){
							// blockchain atrasada, só atualizar

							let newsBlocksToAdd = [];

							while(newLast.nextHash != null){
								newLast = newBlocks[newLast.nextHash];
								newsBlocksToAdd.push(newLast);
							}

							console.log("3");
							if(newsBlocksToAdd.length != 0){
								self.appendBlock(newsBlocksToAdd);
							} else {
								self.lock = 0;

								if(self._connection.messageToAdd.length != 0){
									self._connection.handleBlockchainResponse();
								} else if (this.blocksToAdd.length != 0){
									self.pushBlock();
								}
							}
							return;
						}
					}

					while(myLast.previousHash != newLast.previousHash){
						myLast = myBlocks[myLast.previousHash];
						newLast = newBlocks[newLast.previousHash];
					}
					try{
						console.log("4");
						let response = self._connection.questionBlock(myLast, newLast);
						if(response == 0){
							// minha blockchain está correta
							let newsBlocksToAdd = [];

							let last = self.latestBlock;
							let firstHash = null;

							do {

								try{
									last.nextHash = newLast.hash;

									newLast.previousHash = last.hash;

									self.idx++;

									newLast.index = self.idx;

									await self.isValidNewBlock(newLast, last);

									if (Object.keys(newsBlocksToAdd).length != 0) {
										newsBlocksToAdd[last.hash].nextHash = newLast.hash;
									}
									if(firstHash == null ) firstHash = newLast.hash;
								
									newsBlocksToAdd[newLast.hash] = newLast;
									last = newLast;

								} catch(e){
									self.idx--;
								}

								newLast = newBlocks[newLast.nextHash];
								console.log(newLast);
								
							} while(newLast.nextHash != null);

							if(Object.keys(newsBlocksToAdd).length != 0){

								for(let p in newsBlocksToAdd){
									myBlocks[p] = newsBlocksToAdd[p];
								}

								myBlocks[self.latestBlock.hash].nextHash = newsBlocksToAdd[firstHash].hash;
								myBlocks[self.getGenesisBlock().hash].previousHash = last.hash;
								myBlocks[last.hash].nextHash = null;
							

								myBlocks = self._security.encryptSymmetric(JSON.stringify(myBlocks));

								self._fs.writeFile('./data/data.txt', myBlocks, function (err) {
									if (err) {
										console.log("erro de escrita");
									}
								});
								
								self.latestBlock = last;
								self._connection.broadcast(self._connection.responseLatestMsg());
								
								self.lock = 0;

								if(self._connection.messageToAdd.length != 0){
									self._connection.handleBlockchainResponse();
								} else if (this.blocksToAdd.length != 0){
									self.pushBlock();
								}
							}


						} else {
							// minha blockchain está errada

							let newsBlocksToAdd = [];

							let last = newBlocks[newBlocks[self.getGenesisBlock().hash].previousHash];
							let firstHash = null;
							self.idx = last.index;

							do {

								try{
									last.nextHash = myLast.hash;

									myLast.previousHash = last.hash;

									self.idx++;

									myLast.index = self.idx;

									await self.isValidNewBlock(myLast, last);

									if (Object.keys(newsBlocksToAdd).length != 0) {
										newsBlocksToAdd[last.hash].nextHash = myLast.hash;
									}
									if(firstHash == null ) firstHash = myLast.hash;
								
									newsBlocksToAdd[newLast.hash] = newLast;
									last = myLast;

								} catch(e){
									self.idx--;
								}

								myLast = myBlocks[myLast.nextHash];
								
							} while(myLast.nextHash != null);

							if(Object.keys(newsBlocksToAdd).length != 0){

									for(let p in newsBlocksToAdd){
										newBlocks[p] = newsBlocksToAdd[p];
									}

									newBlocks[newBlocks[newBlocks[self.getGenesisBlock().hash].previousHash].hash].nextHash = newsBlocksToAdd[firstHash].hash;
									newBlocks[self.getGenesisBlock().hash].previousHash = last.hash;
									newBlocks[last.hash].nextHash = null;
								

								newBlocks = self._security.encryptSymmetric(JSON.stringify(newBlocks));

								self._fs.writeFile('./data/data.txt', newBlocks, function (err) {
									if (err) {
										console.log("erro de escrita");
									}
								});
								
								self.latestBlock = last;
								self._connection.broadcast(self._connection.responseLatestMsg());
								
								self.lock = 0;

								if(self._connection.messageToAdd.length != 0){
									self._connection.handleBlockchainResponse();
								} else if (this.blocksToAdd.length != 0){
									self.pushBlock();
								}
							}
						}
					} catch (e){
						console.log(e);
						console.log("error connection");
					}

			} catch (e){
				console.log(e);
				console.log("error file read");
			}
		}
	};

	async isValidChain(blockchainToValidate){
		let self = this;
		var hashCurrentBlock = self.getGenesisBlock().hash;
		if (blockchainToValidate[hashCurrentBlock] == undefined) {
			return false;
		}	
		var tempBlocks = [blockchainToValidate[hashCurrentBlock]];
		for (var i = 1; i < blockchainToValidate.length; i++) {
			hashCurrentBlock = blockchainToValidate[hashCurrentBlock].nextHash;
			if (blockchainToValidate[hashCurrentBlock]) {
				try{
					await self.isValidNewBlock(blockchainToValidate[hashCurrentBlock], tempBlocks[i - 1]);
					tempBlocks.push(blockchainToValidate[hashCurrentBlock]);
				} catch(e){ 
					return false;
				}
			}
		}
		return true;
	}
};

module.exports = Blockchain;