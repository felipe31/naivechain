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
				if(!this.isValidChain(value)){
					this.deleteOldFiles().then(
						value => {
							this.startChain();
						},
						error => {
							console.log(error); // Error!
							console.log("erro excluir arquivos");
						}
					);
				} else {
					this.latestBlock = value[value.length-1];
					this.idx = this.latestBlock.index;
				}
			}
		);
	}

	setConnection(connection){
		this._connection = connection;
	}

	startChain(){
		let self = this;

		self.getAllBlocks().then(
			value => {
				let genesis = self.getGenesisBlock();
				value = [genesis];

				value = self._security.encryptSymmetric(JSON.stringify(value));

				self._fs.writeFile('./data/data.txt', value, function (err) {
					if (err) {
						console.log("erro de escrita");
					}
				});
				console.log('genesis add');

				self.latestBlock = genesis;
			}
		)
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
		return new Block(0, "0", 1465154705000, "genesis", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7", "Blockchain Services", this._security.programPub, signature, "0.0.0.0", "");
	}

	addBlock(blockData, file, type){
		
		this.blockToQueue({data: blockData, file: file, type: type});
	}

	generateNextBlock(blockData, file, type, latestBlock){
		this.idx++;

		let nextIndex = this.idx;
		let nextTimestamp = new Date().getTime();

		if(type == 0){
			let signature = this._security.signature(blockData, 0);
			let nextHash = this.calculateHash(nextIndex, latestBlock.hash, nextTimestamp, blockData, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
			return new Block(nextIndex, latestBlock.hash, nextTimestamp, blockData, nextHash, this._security.publicKeyExtracted.commonName, this._security.publicKey, signature, this._ip.address(), file);
		} else {
			let signature = this._security.signature(blockData, 1);
			let nextHash = this.calculateHash(nextIndex, latestBlock.hash, nextTimestamp, blockData, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
			return new Block(nextIndex, latestBlock.hash, nextTimestamp, blockData, nextHash, "Blockchain Services", this._security.programPub, signature, this._ip.address(), file);
		}
	};
	
	calculateHash(index, previousHash, timestamp, data, creator, publicKey, signature, ip, file){
		return this._security.hash(index + previousHash + timestamp + data + creator + publicKey + signature + ip + file);
	};

	calculateHashForBlock(block){
		return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.creator, block.publicKey, block.signature, block.ip, block.file);
	};

	isValidNewBlock (newBlock, previousBlock){
		if (previousBlock.index + 1 !== newBlock.index) {
			console.log('invalid index');
			return false;
		} else if (previousBlock.hash !== newBlock.previousHash) {
			console.log('invalid previoushash');
			return false;
		} else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
			console.log(typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
			console.log('invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
			return false;
		}

		return true;
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

	pushBlock(){

		if(this.lock == 0 && this.blocksToAdd.length != 0){
			this.lock = 1;
			let last = this.latestBlock;
			let self = this;
			let blocks = this.blocksToAdd;
			console.log(blocks);
			this.blocksToAdd = [];

			let addblocks = [];

			for (var i = 0; i < blocks.length; i++) {

				let block = self.generateNextBlock(blocks[i].data, blocks[i].file, blocks[i].type, last);

				console.log(block);

				if(self.isValidNewBlock(block, last)){
					addblocks.push(block);
					last = block;
				} else {
					self.idx--;
				}
			}

			
			if(addblocks.length != 0){
				self.getAllBlocks().then(
					value => {
						if(value){
							//value.concat(blocks);
							value.push.apply(value, addblocks)
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

						self.latestBlock = addblocks[(addblocks.length-1)];
						self._connection.broadcast(self._connection.responseLatestMsg());
						
						self.lock = 0;
						self.pushBlock();

					}, error => {
						// console.log("get all blocks");
						// console.log(error);
					}
				)
			}
		}
	}

	tryReplaceChain(newBlocks){
		if (this.isValidChain(newBlocks) && newBlocks.length > this.latestBlock.index) {
			console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

			this.replace(newBlocks);
			return true;
		} else {
			console.log('Received blockchain invalid');
			return false;
		}
	};

	isValidChain(blockchainToValidate){
		
		if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(this.getGenesisBlock())) {
			return false;
		}
		var tempBlocks = [blockchainToValidate[0]];
		for (var i = 1; i < blockchainToValidate.length; i++) {
			if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
				tempBlocks.push(blockchainToValidate[i]);
			} else {
				return false;
			}
		}
		return true;
	};
};

module.exports = Blockchain;