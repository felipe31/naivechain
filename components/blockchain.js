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
				this.isValidChain(value).then(
					value_empty => {
						this.latestBlock = this.getLastBlock(value);
						this.idx = this.latestBlock.index;	
					},	
					error_empty => {
						this.deleteOldFiles().then(
							value => {
								this.startChain();
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

	getLastBlock(blocks){
		let next = blocks[this.getGenesisBlock().hash];
		

		while(next.nextHash != null) {
			next = blocks[next.nextHash];
		};

		return next;
	}

	setConnection(connection){
		this._connection = connection;
	}

	startChain(){
		let genesis = this.getGenesisBlock();
		let value = new Object();
		value[genesis.hash] = genesis;
		console.log(value.length);
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
			let nextHash = this.calculateHash(nextIndex, nextTimestamp, blockData, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
			// this.latestBlock.nextHash = nextHash;
			return new Block(nextIndex, nextTimestamp, blockData, nextHash, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
		} else {
			let signature = this._security.signature(blockData, 1);
			let nextHash = this.calculateHash(nextIndex, nextTimestamp, blockData, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
			return new Block(nextIndex, nextTimestamp, blockData, nextHash, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
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
			resolve();
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
					if (addblocks.length != 0) {
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
							

						} else {
							value = addblocks;
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
						self.pushBlock();

					}, error => {
						//console.log("get all blocks");
						// console.log(error);
					}
				)
			}
		}
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
			
			var hashCurrentBlock = self.getGenesisBlock().hash;
			if (blockchainToValidate[hashCurrentBlock] == undefined) {
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