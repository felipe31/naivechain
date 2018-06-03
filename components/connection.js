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
		let self = this;
		

		this._io.use(function (socket, next) {
			console.log("[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[");
			console.log(self.clients);
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

		this._io.on('connection', function(socket){
			console.log("]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]");
			console.log(this.clients);

			let peer = self.sockets.find(x => x.socket === socket.id);
			console.log("peer connected: "+ peer.address);
			let data = {'type': MessageType.ADD_PEER, 'address': peer.address, 'publicKey': peer.publicKey};
			self.connectAddress(data);
			self.broadcast(JSON.stringify(data));

			socket.on('disconnect', (result) => {
				let index = self.sockets.findIndex(x => x.socket === socket.id);
				console.log(index);
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
							self.handleBlockchainResponse(dataDecrypted);
						break;
					}

				} catch (err){
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
		if(!this.clients.find(x => x.address === address.address)) {
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
							self.handleBlockchainResponse(dataDecrypted);
						break;
						case MessageType.QUERY_LATEST:
							client.emit('message', self._security.encryptSymmetric(self.responseLatestMsg()));
						break;
						case MessageType.QUERY_ALL:
							this._blockchain.getAllBlocks().then(
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
				console.log("one peer disconnected");
			});


			this.clients.push({client: client, address: address.address});
		} else {
			console.log("this peer is already connected");
		}
	}

	handleBlockchainResponse(message){

		var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
		var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
		var latestBlockHeld = this._blockchain.latestBlock;
		if (latestBlockReceived.index > latestBlockHeld.index) {
			console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
			if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
				console.log("We can append the received block to our chain");

				//------------------------------------------------------ 
				// VERIFICAR
				//------------------------------------------------------ 

				this._blockchain.blockToQueue(latestBlockReceived);
				
			} else if (receivedBlocks.length === 1) {
				console.log("We have to query the chain from our peer");
				this.broadcast(this.queryAllMsg());
			} else {
				console.log("Received blockchain is longer than current blockchain");
				this._blockchain.tryReplaceChain(receivedBlocks).then(
					value => {
						this.broadcast(this.responseLatestMsg());	
					}
				);
			}
		} else {
			console.log('received blockchain is not longer than current blockchain. Do nothing');
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

}

module.exports = Connection;