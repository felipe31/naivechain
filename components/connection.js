'use strict';

var MessageType = {
	QUERY_LATEST: 0,
	QUERY_ALL: 1,
	RESPONSE_BLOCKCHAIN: 2,
	ADD_PEER: 3
};

var p2p_port = 6001;

class Connection {

	constructor(io, ioClient, ip, http, security, blockchain) {
		this._io = io;
		this._ioClient = ioClient;
		this._ip = ip;
		this._http = http;
		this._security = security;
		this._blockchain = blockchain;

		this.sockets = [];
		this.clients = [];
		
		this.messageToAdd = [];
		this.lock = 0;
		let self = this;
		

		self._io.use(function (socket, next) {
			let data = socket.handshake.query.data;
				try {
					let address = socket.request.connection.remoteAddress;
						if (address.substr(0, 7) == "::ffff:") {
							address = address.substr(7)
						}
					// VERIFICADOR
					if(!self.sockets.find(x => x.address === address) && address != self._ip.address()){
						let dataDecrypted = JSON.parse(self._security.decryptSymmetric(data));
						
						let publicKeyExtracted = self._security.extractPublicKey(dataDecrypted.publicKey);
						
						if(publicKeyExtracted != false){

							if(!self.sockets.find(x => x.publicKey === dataDecrypted.publicKey) && self._security.publicKey != dataDecrypted.publicKey)
							{
								self.sockets.push({'socket':socket.id, 'address': address, 'publicKey': dataDecrypted.publicKey});
								next();

							} else {
								console.log("Peer try to connect, but we already have same public key");
								next(new Error("Peer try to connect, but we already have same public key"));
								socket.disconnect();
							}
						} else {
							console.log("Peer try to connect, but not valid publicKey");
							next(new Error("Peer try to connect, but not valid publicKey"));
							socket.disconnect();
						};
					} else {
						console.log("Peer try to connect, but is already connected");
						next(new Error("Peer try to connect, but is already connected"));
						socket.disconnect();
					}
				} catch (err) {
					console.log("Peer try to connect, but not valid");
					next(new Error("Peer try to connect, but not valid"));
					socket.disconnect();
				}
		});

		self._io.on('connection', function(socket){

			let peer = self.sockets.find(x => x.socket === socket.id);
			console.log("peer connected: "+ peer.address);
			let data = {'type': MessageType.ADD_PEER, 'address': peer.address, 'publicKey': peer.publicKey};
			self.connectAddress(data);
			self.broadcast(JSON.stringify(data));

			socket.on('disconnect', (result) => {
				let index = self.sockets.findIndex(x => x.socket === socket.id);
				//console.log(index);
				if (index !== -1) {
					self.sockets.splice(index, 1);
				}
				console.log('peer disconnected');
			});

			socket.on('message', (result) => {
				
				try {
					let dataDecrypted = JSON.parse(self._security.decryptSymmetric(result));

					switch (dataDecrypted.type) {

						case MessageType.QUERY_LATEST:
							self.write(socket.id, self.responseLatestMsg());
						break;
						case MessageType.RESPONSE_BLOCKCHAIN:
							self.messageToQueue(dataDecrypted);
						break;
					}

				} catch (err){
					console.log("package damaged server");
				}
			});

			socket.on('check', function(result, fn) {
			    try {
					let dataDecrypted = JSON.parse(self._security.decryptSymmetric(result));
					self._blockchain.getAllBlocks().then(
						value => {
							if(value[dataDecrypted[0].hash] !== undefined){
								fn(0);
							} else if(value[dataDecrypted[1].hash] !== undefined){
								fn(1);
							} else {
								fn(-1);
							}
						}
					)

				} catch (err){
					console.log(err);
					console.log("package damaged server");
				}
			    
			 });

		});

		this._http.listen(p2p_port, function(){
			console.log('listening on *:' + p2p_port);
		});
	}

	responseLatestMsg(){
		let data = {
			'type': MessageType.RESPONSE_BLOCKCHAIN,
			'data': JSON.stringify([this._blockchain.latestBlock])
		}
		console.log(this._blockchain.latestBlock);
		return JSON.stringify(data);
	}

	queryAllMsg(){

		let data = {
			'type': MessageType.QUERY_ALL
		}

		return JSON.stringify(data);

	}

	queryChainLengthMsg(){

		let data = {
			'type': MessageType.QUERY_LATEST
		}

		return JSON.stringify(data);
	}

	responseChainMsg(str){
		let data = {
			'type': MessageType.RESPONSE_BLOCKCHAIN,
			'data': JSON.stringify(str)
		}

		return JSON.stringify(data);
	}

	connectAddress(address){

		if((!this.clients.find(x => x.address === address.address)) && (address.address != this._ip.address())) {
			let client;
			let data = this._security.encryptSymmetric(JSON.stringify({publicKey: this._security.publicKey}));

			client = this._ioClient.connect('http://'+address.address+":"+p2p_port, {
				query: {data: data}
			});
			
			let self = this;

			client.on("message", (result) => {
				
				try {
					let dataDecrypted = JSON.parse(self._security.decryptSymmetric(result));

					switch(dataDecrypted.type){
						case MessageType.ADD_PEER:
							self.connectAddress(dataDecrypted);
						break;
						case MessageType.RESPONSE_BLOCKCHAIN:
							self.messageToQueue(dataDecrypted);
						break;
						case MessageType.QUERY_LATEST:
							client.emit('message', self._security.encryptSymmetric(self.responseLatestMsg()));
						break;
						case MessageType.QUERY_ALL:
							self._blockchain.getAllBlocks().then(
								value => {
									client.emit('message', self._security.encryptSymmetric(self.responseChainMsg(value)) );
								},
								error => {
									console.log(error); // Error!
									console.log("erro de leitura");
								}
							);
						break;

					}

				} catch (err){
					console.log("package damaged client");
				}
			});

			
			client.on('connect', function () {
				client.emit('message', self._security.encryptSymmetric(self.queryChainLengthMsg()) );
			});

			client.on('reconnect', function () {
				client.emit('message', self._security.encryptSymmetric(self.queryChainLengthMsg()) );
			});

			client.on('disconnect', function () {
				
				let index = self.clients.findIndex(x => x.address === address.address);
				//console.log(index);
				if (index !== -1) {
					self.clients.splice(index, 1);
				}
				console.log("one peer disconnected");
			});


			this.clients.push({client: client, address: address.address});
		} else {
			console.log("this peer is already connected");
		}
	}

	messageToQueue(message){
		this.messageToAdd.push(message);
		this.handleBlockchainResponse();
	}

	handleBlockchainResponse(){

		if(this._blockchain.lock == 0 && this.messageToAdd.length != 0){
			this._blockchain.lock = 1;

			let self = this;
			let message = self.messageToAdd[0];
			self.messageToAdd.splice(0, 1);
			//console.log(message);
			console.log("lock");
			let receivedBlocks = JSON.parse(message.data);

			if(Object.keys(receivedBlocks).length == 1){

				let latestBlockReceived = receivedBlocks[Object.keys(receivedBlocks)[0]];
				let latestBlockHeld = self._blockchain.latestBlock;
				if (latestBlockHeld.hash === latestBlockReceived.previousHash) {

					self._blockchain.appendBlock([latestBlockReceived]);
				} else {
					self._blockchain.lock = 0;
					self.broadcast(self.queryAllMsg());
					// the peer need to send all blocks
				}
			} else {
				self._blockchain.mergeBlockChains(receivedBlocks);
			}
		}
	};

	write(socketID, str){
		let data = this._security.encryptSymmetric(str);
		this._io.to(socketID).emit('message', data);
	}

	broadcast(str){
		for (var i = this.sockets.length - 1; i >= 0; i--) {
			let data = this._security.encryptSymmetric(str);
			this._io.to(this.sockets[i].socket).emit('message', data);
		}
	}

	async questionBlock(block1, block2){
		let self = this;
		
		let count0 = 1;
		let count1 = 0;
		console.log(self.clients);

		for (var i = self.clients.length - 1; i >= 0; i--) {
			let send = self._security.encryptSymmetric(JSON.stringify([block1, block2]));
				
			let res = await self.receiveQuestion(self.clients[i].client, send);

			if(res == 0){
				count0++;
			} else if(res == 1){
				count1++;
			}
		}
		console.log("questionBlock");
		console.log(count0);
		console.log(count1);
		if(count0 == count1){
			return -1;
		} else if(count0 > count1){
			return 0;
		} else {
			return 1;
		}
	}

	receiveQuestion(clientToSend, send){

		return new Promise(function(resolve, reject) {
			clientToSend.emit('check', send, function (data) { 
				if(data == 0){
			    	resolve(0);
			    } else if (data == 1){
			    	resolve(1);
			    }
			});
		});
	}

}

module.exports = Connection;