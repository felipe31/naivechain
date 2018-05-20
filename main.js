'use strict';

var express = require("express");
var app = express();

var bodyParser = require('body-parser'); 


var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
const x509 = require('x509');
var ipAddress = require("ip");


var http = require('http').Server(app);
var ioClient = require('socket.io-client');
var io = require('socket.io')(http);


var programPub = "-----BEGIN CERTIFICATE-----\n\
MIIDxzCCAq+gAwIBAgIBATANBgkqhkiG9w0BAQUFADB0MQswCQYDVQQGEwJQVDES\n\
MBAGA1UECAwJQnJhZ2Fuw6dhMRIwEAYDVQQHDAlCcmFuZ2HDp2ExDDAKBgNVBAoT\n\
A0lQQjERMA8GA1UECxMIU2VjdXJpdHkxHDAaBgNVBAMTE0Jsb2NrY2hhaW4gU2Vy\n\
dmljZXMwHhcNMTgwNTE4MTQ0MTQzWhcNMjIwNTE4MTQ0MTQzWjB0MQswCQYDVQQG\n\
EwJQVDESMBAGA1UECAwJQnJhZ2Fuw6dhMRIwEAYDVQQHDAlCcmFuZ2HDp2ExDDAK\n\
BgNVBAoTA0lQQjERMA8GA1UECxMIU2VjdXJpdHkxHDAaBgNVBAMTE0Jsb2NrY2hh\n\
aW4gU2VydmljZXMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCqCSRP\n\
osRqt7hcgRYhA3KmV3cXiGkg3x8OJTyYfDNdaRjwWzk8G2Yhp8zSKQLsqHiH/vXZ\n\
yWGODUyaa+bT+0/JApmo2WJo+ZP/m1ug2p4R6Ta43X3aXtt/8C3o1kBujy8bbBrh\n\
WzkaWDknCH/CQUJfpKWac7tBl4jqelO9iRuKHDvu79r1cFUa7kjSdRq8gEiiOJx4\n\
hzLGM0nHMyFRcDTH9TKrOh4rDyRTdhrXH6JUx68lNmILFgtxdAneyvbu41SUocUe\n\
nS/OP/h3BD1t1DuaiPycmqTAIjWU74IrdNvMQOrVaXKoAnXzE/M3JyVqHpBGkGq1\n\
M1LvB38xt7VccdIfAgMBAAGjZDBiMA8GA1UdEwEB/wQFMAMBAf8wDwYDVR0PAQH/\n\
BAUDAwcGADAdBgNVHQ4EFgQUwppT22LNGbPcXTZJiFrdg9eOpgkwHwYDVR0jBBgw\n\
FoAUwppT22LNGbPcXTZJiFrdg9eOpgkwDQYJKoZIhvcNAQEFBQADggEBAH3rNX3U\n\
qtm5HAVi1ec/Ellsl7NZRRIZjyEJ2RllJpei0L/Mx7lBF8KigJFPvuIw9dVmdxyY\n\
Ht1fGsgJPMKlc49mqCYRRj8t8Dgck9REJtbw1nAmZlapEZ4dQ9msztDmWnC41xDA\n\
gO7GcWOWBOjg8rT/iNN2PF1OuMjMiXsr9vDD3GB/b/ksU/8G+mUEBt3beXllgMTx\n\
2JmSxYq08ZiyzpBMW++HpSMROQ9cvOY3IkgqFHX8G+SPIy6bBFSiVk/9xzRi2Ew6\n\
1rpJHzZ4F9w1h0TlTx2GE5umTaTvr6dxC9kZG/FpJ0B60uNpEJyot/zePIoJvuHL\n\
41x/fyUzsUALxYc=\n\
-----END CERTIFICATE-----";

var programPriv = "-----BEGIN RSA PRIVATE KEY-----\n\
MIIEowIBAAKCAQEAqgkkT6LEare4XIEWIQNypld3F4hpIN8fDiU8mHwzXWkY8Fs5\n\
PBtmIafM0ikC7Kh4h/712clhjg1Mmmvm0/tPyQKZqNliaPmT/5tboNqeEek2uN19\n\
2l7bf/At6NZAbo8vG2wa4Vs5Glg5Jwh/wkFCX6SlmnO7QZeI6npTvYkbihw77u/a\n\
9XBVGu5I0nUavIBIojiceIcyxjNJxzMhUXA0x/UyqzoeKw8kU3Ya1x+iVMevJTZi\n\
CxYLcXQJ3sr27uNUlKHFHp0vzj/4dwQ9bdQ7moj8nJqkwCI1lO+CK3TbzEDq1Wly\n\
qAJ18xPzNyclah6QRpBqtTNS7wd/Mbe1XHHSHwIDAQABAoIBAFxF+8OPtAGp0823\n\
a7fctCIbAxDtQQfKrYKyqHCjrgg6GYOOLcA1qjYHZrqB8QlW35oFvYtDosJA61o9\n\
xhUxo3mVBKhB2ArZrfwfZhkjqnZT1hN6d2rC4WFLiM57PpoA7/J0tx2msJVgXRuW\n\
nCZh3dAjfI8V0P/maTG90qXfuuc2SrRTeie7156sVJorHgXy0zZgzx3v/jPVMtVk\n\
vrLVKD8frVoTcn+R4b6BS4hqHoB5lqcm5BVA/GqYuDO5OsG/zAjrHZ6hBqxy84a/\n\
OCZ2KD63QAMC+q+3tGPUsrWwj+/5ZwOhANm2vUgp8ibO3fmiPgbFIelsqvbBoIER\n\
JqPjDIECgYEA1m1DBj8wLCvu3EnwYGk53Av7vi5lRfhJXLIoCNWM3bf7eVVZyZeR\n\
ks2UKSmv+2mVozTNoGD1q13eWrShCeW5hPso+Wx64bxs9EgKTyxRZax+Po5GpQY9\n\
VSfYwrdbGl/LWwZPMHOW3nIaqOshtXrVzxmbYF3QWLxP0awQ+Blw5t8CgYEAywCZ\n\
AtfLMhQiDyYdjI8zRNZqb5Pecvpb7LQhnifND7oySHp5CnbpTqK0FbLlEV3yXxYJ\n\
cebIxQ3lsUNrM7E/xEO6JoQVS7vpHVml/MFRb/LAzjxCWfTURRhAZjkldIPzivM3\n\
Gue98846rr2oRiG9wTf9n3BEKNazOGd447w4vMECgYA4+qnP1CSx6C693OwCQpP8\n\
dDa+L8f7kuGzvyfCSTT4ifZKJLMKTbuCPhy733cDIOiBiPuHPZyqn/QBOHR+k8v7\n\
mV4nAXuZ1p9BPo92wHkUwoR9jQMawRC1OzRvcZfE52W7V27dmimiDMIm1uyLNAvy\n\
z4QpVGST3956AfY0Z1ZIEwKBgQCbFjXPajUeaSssD557h9tPN8/QtlM32/TmfSdB\n\
wH51CXbo0Egwqm/LV5nlCerevbsw0ZEdp4aypM9aAXug3kUtF+DbFAWA+mo5tgeN\n\
ddNVh0utQ3QdbWHN950be4UV4sjo2q66q1j/Lgq+/L3V9mkVeEUWzZoE6SG6cbJ1\n\
qZJfAQKBgBjlRZUHfEwWc1WNfXrXuDCOeeeLsi/hOiiuiW3FlUwJxBSLpTHuyUZz\n\
deptmgmHwRSm5CbgE3huFp2OdXMYe6OH3Jky1TUH7bEBJvDoYNPnXbO3I5bOPjha\n\
vT6KDq1GrZOCtsO21HxjIkVApx9cQ/7lkNjkMxXUFTn8WpTrnILT\n\
-----END RSA PRIVATE KEY-----";

var http_port = 3001;
var p2p_port = 6001;

var sockets = [];
var clients = [];

var MessageType = {
	QUERY_LATEST: 0,
	QUERY_ALL: 1,
	RESPONSE_BLOCKCHAIN: 2,
	ADD_PEER: 3
};

var password = '123patinhos321';






var stdin = process.openStdin();

var getdados = () => {
	blockchain.getAllBlocks().then(function (data){
		console.log(data);
	}).catch(function (err) {
		console.log("error");
	});
}

stdin.addListener("data", function(d) {
	// note:  d is an object, and when converted to a string it will
	// end with a linefeed.  so we (rather crudely) account for that  
	// with toString() and then trim() 
	console.log("you entered: [" + 
		d.toString().trim() + "]");

	if(d.toString().trim() == "get"){
		getdados();
	}
});





class Block {
	constructor(index, previousHash, timestamp, data, hash, creator, publicKey, signature, ip) {
		this.index = index;
		this.previousHash = previousHash.toString();
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash.toString();
		this.creator = creator;
		this.publicKey = publicKey;
		this.signature = signature;
		this.ip = ip;
	}
}

class Security {

	constructor() {

		try{
			const absolutePathPublic = path.resolve("keys/public.key");
			this.publicKey = fs.readFileSync(absolutePathPublic, 'utf8');
			this.publicKeyExtracted = this.extractPublicKey(this.publicKey);
			if(this.publicKeyExtracted == false){
				console.log("Erro public key, bad information inside");
				process.exit(1);
			};
		} catch (e){
			console.log("Erro public key, verify the path /keys");
			process.exit(1);
		}

		try{
			const absolutePathPrivate = path.resolve("keys/private.key");
			this.privateKey = fs.readFileSync(absolutePathPrivate, 'utf8');
		} catch (e){
			console.log("Erro private key, verify the path /keys");
			process.exit(1);
		}
	}

	signature(data, type){
		let priv = '';
		if(type == 0){
			priv = this.privateKey;
		} else {
			priv = programPriv;
		}

		const signer = crypto.createSign('RSA-SHA256');
		signer.update(data);
		signer.end();

		const signature = signer.sign(priv);
		const signature_hex = signature.toString('hex');

		return signature_hex;
	}

	extractPublicKey(pubKey){
		try {
			return x509.getIssuer(pubKey);
		} catch (err) {
			return false;
		}
	}

	verifySignature(data, signature, pubKey){
		const verifier = crypto.createVerify('RSA-SHA256');
		verifier.update(data);
		verifier.end();

		const verified = verifier.verify(pubKey, signature);

		return verified;
	}

	generateSymmetricKey(){
		return crypto.randomBytes(64).toString('base64');
	}

	encryptSymmetric(str) {

		str = new Buffer(str.toString('base64'), "utf8");
		var cipher = crypto.createCipher("aes-256-ctr",password)
		str = Buffer.concat([cipher.update(str),cipher.final()]);
		

		return str.toString('base64');
	}

	
	decryptSymmetric(str) {

		str = new Buffer(str, 'base64');

		var decipher = crypto.createDecipher("aes-256-ctr",password)
		str = Buffer.concat([decipher.update(str) , decipher.final()]);

		return str.toString('utf8');

	}

	encryptKeys(str, pubKey) {

		str = crypto.publicEncrypt(pubKey, new Buffer(str));

		return str.toString('base64');
	}

	
	decryptKeys(str) {
		const decrypted = crypto.privateDecrypt(this.privateKey, new Buffer(str, 'base64'));
		return decrypted.toString('utf8');
	}
}

class Blockchain {

	constructor() {

		this.getAllBlocks().then(
			value => {
				if(!this.isValidChain(value)){
					this.deleteOldFiles().then(
						value => {
							this.pushBlock(this.getGenesisBlock());
						},
						error => {
							console.log(error); // Error!
							console.log("erro excluir arquivos");
						}
						);
				} else {
					this.latestBlock = value[value.length-1];
				}
			}
			);
	}

	deleteOldFiles(){
		return new Promise(function(resolve, reject) {
			fs.readdir("data", (err, files) => {
				if (err) reject();

				for (const file of files) {
					fs.unlink(path.join("data", file), err => {
						if (err) reject();
					});
				}
				resolve(true);
			});
		});
	}

	getGenesisBlock(){
		let signature = security.signature("genesis", 1);
		return new Block(0, "0", 1465154705, "genesis", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7", "Blockchain Services", programPub, signature, "0.0.0.0");
	}

	addBlock(blockData){

		let newBlock = this.generateNextBlock(blockData);

		if (this.isValidNewBlock(newBlock, this.latestBlock)) {
			this.pushBlock(newBlock);
		}
	}

	generateNextBlock(blockData){
		let nextIndex = this.latestBlock.index + 1;
		let nextTimestamp = new Date().getTime() / 1000;
		let signature = security.signature(blockData, 0);
		let nextHash = this.calculateHash(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, security.publicKeyExtracted.commonName, security.publicKey, signature, ipAddress.address());
		return new Block(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, nextHash, security.publicKeyExtracted.commonName, security.publicKey, signature, ipAddress.address());
	};

	calculateHash(index, previousHash, timestamp, data, creator, publicKey, signature, ip){
		return crypto.createHash('sha256').update(index + previousHash + timestamp + data + creator + publicKey + signature + ip).digest('base64');
	};

	calculateHashForBlock(block){
		return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.creator, block.publicKey, block.signature, block.ip);
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
		return new Promise(function(resolve, reject) {
			fs.readFile('data/data.txt', 'utf8', function(err, data){
				if (err) {
					resolve("");

				} else {
					if(data){
						try {
							let log = security.decryptSymmetric(data);
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

		let value = security.encryptSymmetric(JSON.stringify(newBlocks));

		fs.writeFile('data/data.txt', value, function (err) {
			if (err) {
				console.log("erro de escrita");
			}
		});
	}

	pushBlock(block){
		if(!security.verifySignature(block.data, block.signature, block.publicKey)){
			
			this.getAllBlocks().then(
				value => {
					if(value){
						value.push(block);
					} else {
						value = [block];
					}

					value = security.encryptSymmetric(JSON.stringify(value));

					fs.writeFile('data/data.txt', value, function (err) {
						if (err) {
							console.log("erro de escrita");
						}
					});

				console.log('block added: ' + JSON.stringify(block.data));

				this.latestBlock = block;

				connection.broadcast(connection.responseLatestMsg());

			}, error => {
				console.log("get all blocks");
				console.log(error);
			}
			)
		} else {
			console.log("the signature not match with publicKey");
		}
		
	}


	tryReplaceChain(newBlocks){
		if (this.isValidChain(newBlocks) && newBlocks.length > this.latestBlock.index) {
			console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

			this.replace(newBlocks);

			connection.broadcast(connection.responseLatestMsg());
		} else {
			console.log('Received blockchain invalid');
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


class Connection {

	constructor() {
		io.use(function (socket, next) {
			
			//console.log(socket.request.connection);
			let data = socket.handshake.query.data;
				try {
					let address = socket.request.connection.remoteAddress;
						if (address.substr(0, 7) == "::ffff:") {
							address = address.substr(7)
						}
					// VERIFICADOR
					if(!sockets.find(x => x.address === address) && address != ipAddress.address()){
						let dataDecrypted = JSON.parse(security.decryptSymmetric(data));
						
						let publicKeyExtracted = security.extractPublicKey(dataDecrypted.publicKey);
						
						if(publicKeyExtracted != false){

							if(!sockets.find(x => x.publicKey === dataDecrypted.publicKey) && security.publicKey != dataDecrypted.publicKey)
							{
								

								sockets.push({'socket':socket.id, 'address': address, 'publicKey': dataDecrypted.publicKey});
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

		let selfie = this;
		io.on('connection', function(socket){


			let peer = sockets.find(x => x.socket === socket.id);
			console.log("peer connected: "+ peer.address);
			let data = {'type': MessageType.ADD_PEER, 'address': peer.address, 'publicKey': peer.publicKey};
			selfie.connectAddress(data);
			selfie.broadcast(JSON.stringify(data));

			socket.on('disconnect', (result) => {
				let index = sockets.findIndex(x => x.socket === socket.id);
				console.log(index);
				if (index !== -1) {
					sockets.splice(index, 1);
				}
				console.log('peer disconnected');
			});

			socket.on('message', (result) => {
				
				try {
					let dataDecrypted = JSON.parse(security.decryptSymmetric(result));

					switch (dataDecrypted.type) {

						case MessageType.QUERY_LATEST:
							selfie.write(socket.id, selfie.responseLatestMsg());
						break;
						case MessageType.RESPONSE_BLOCKCHAIN:
							selfie.handleBlockchainResponse(dataDecrypted);
						break;
					}

				} catch (err){
					console.log("package damaged server");
				}
			});

		});

		http.listen(p2p_port, function(){
			console.log('listening on *:' + p2p_port);
		});
	}

	responseLatestMsg(){
		let data = {
			'type': MessageType.RESPONSE_BLOCKCHAIN,
			'data': JSON.stringify([blockchain.latestBlock])
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
		if(!clients.find(x => x.address === address.address)) {
			let client;
			let data = security.encryptSymmetric(JSON.stringify({publicKey: security.publicKey}));

			client = ioClient.connect('http://'+address.address+":"+p2p_port, {
				query: {data: data}
			});
			
			let selfie = this;

			client.on("message", (result) => {
				
				try {
					let dataDecrypted = JSON.parse(security.decryptSymmetric(result));

					switch(dataDecrypted.type){
						case MessageType.ADD_PEER:
							selfie.connectAddress(dataDecrypted);
						break;
						case MessageType.RESPONSE_BLOCKCHAIN:
							selfie.handleBlockchainResponse(dataDecrypted);
						break;
						case MessageType.QUERY_LATEST:
							client.emit('message', security.encryptSymmetric(selfie.responseLatestMsg()));
						break;
						case MessageType.QUERY_ALL:
							blockchain.getAllBlocks().then(
								value => {
									client.emit('message', security.encryptSymmetric(selfie.responseChainMsg(value)) );
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
				client.emit('message', security.encryptSymmetric(selfie.queryChainLengthMsg()) );
			});

			client.on('disconnect', function () {
				console.log("one peer disconnected");
			});


			clients.push({client: client, address: address.address});
		} else {
			console.log("this peer is already connected");
		}
	}

	handleBlockchainResponse(message){

		var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
		var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
		var latestBlockHeld = blockchain.latestBlock;
		if (latestBlockReceived.index > latestBlockHeld.index) {
			console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
			if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
				console.log("We can append the received block to our chain");

				//------------------------------------------------------ 
				// VERIFICAR
				//------------------------------------------------------ 

				blockchain.pushBlock(latestBlockReceived);

				this.broadcast(this.responseLatestMsg());
			} else if (receivedBlocks.length === 1) {
				console.log("We have to query the chain from our peer");
				this.broadcast(this.queryAllMsg());
			} else {
				console.log("Received blockchain is longer than current blockchain");
				blockchain.tryReplaceChain(receivedBlocks);
			}
		} else {
			console.log('received blockchain is not longer than current blockchain. Do nothing');
		}
	};

	write(socketID, str){
		let data = security.encryptSymmetric(str);
		io.to(socketID).emit('message', data);
	}

	broadcast(str){
		for (var i = sockets.length - 1; i >= 0; i--) {
			let data = security.encryptSymmetric(str);
			io.to(sockets[i].socket).emit('message', data);
		}
	}

}


var security = new Security();
var blockchain = new Blockchain();
var connection = new Connection();
//connection.connectAddress({'address':"127.0.0.1"});




















var initHttpServer = () => {
	var app = express();
	app.use(bodyParser.json());

	app.get('/blocks', (req, res) => {

		blockchain.getAllBlocks().then(function (data){
			res.send(data);
		}).catch(function (err) {
			res.send(err);
		});
		
	});

	app.post('/mineBlock', (req, res) => {
		blockchain.addBlock(req.body.data);
		
		res.send();
	});

	app.get('/peers', (req, res) => {
		//console.log(sockets[0]);
		res.send(sockets.map(s => s.address ));
	});

	app.post('/addPeer', (req, res) => {
		connection.connectAddress({'address':req.body.peer});
		res.send();
	});

	app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};

initHttpServer();