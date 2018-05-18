'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");
var request = require('request');
var fs = require('fs');
var path = require('path');

var crypto = require('crypto');
const x509 = require('x509');

var programPub = "-----BEGIN CERTIFICATE-----\n\
MIIDszCCApugAwIBAgIBATANBgkqhkiG9w0BAQUFADBqMQswCQYDVQQGEwJCUjEV\n\
MBMGA1UECBMMVGlhZ28gRnJhbmNvMREwDwYDVQQHEwhJYml0aW5nYTEMMAoGA1UE\n\
ChMDSVBCMQwwCgYDVQQLEwNJUEIxFTATBgNVBAMTDFRpYWdvIEZyYW5jbzAeFw0x\n\
ODA1MTYxNzQ1MTBaFw0yMDA1MTYxNzQ1MTBaMGoxCzAJBgNVBAYTAkJSMRUwEwYD\n\
VQQIEwxUaWFnbyBGcmFuY28xETAPBgNVBAcTCEliaXRpbmdhMQwwCgYDVQQKEwNJ\n\
UEIxDDAKBgNVBAsTA0lQQjEVMBMGA1UEAxMMVGlhZ28gRnJhbmNvMIIBIjANBgkq\n\
hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzK8AnKjJaeuxd9EYaUL/ZKx27u2SyvDm\n\
/nGpX5BTPFjZ4qkT79KRfkWJCiv/erKR5e0u9l2PsAdioQ2INrrYlWnNepM/Vf0w\n\
c9ytCTb3+62XvUxc5v+zcUeKj9T8lWRXQLymhM2iQnOotYxdjLelV83rJ4MO/Pmj\n\
2n+iPi6sh0NZuu5FuFKwrZ8ynMeI7kCriOmhuX/8ABlhW1002ZkUXTMvMRh1Sfpd\n\
ArHAiBahu777wEtl7/52T/UhzWK+dS46WW2vgTmbNaFqw49Ad8hnmInaydpTJFJ4\n\
e+8OdlRDgE8Sx8Z41CBcMoX/A1mZfU1lPU0mInAGYrXizgZ8EYKwKQIDAQABo2Qw\n\
YjAPBgNVHRMBAf8EBTADAQH/MA8GA1UdDwEB/wQFAwMHBgAwHQYDVR0OBBYEFAXP\n\
51pZR0/XkFupKlVvyOVIuuEOMB8GA1UdIwQYMBaAFAXP51pZR0/XkFupKlVvyOVI\n\
uuEOMA0GCSqGSIb3DQEBBQUAA4IBAQAZiD/RVHW6sTPZYLzCM2ZxUDLTcn5Md9x7\n\
joQufeKAJuxprzAlYZGj+8A9FLZOdLwQhGJimB2gXrY1fP2KqaYUnqATuB/1AxDT\n\
ExBqPJNLgL32Y7J2u5SB41COybVVkStdnOMmMucNBQ6YgzkGoE3OqZWae7DcTpDN\n\
0IQNI7kzq2MUPToiMoy21HkZGHOFDYPwtwF0IGlygXCHXYdVZ1MeDBU7Y2zQmE6v\n\
yrVTbpF5PLuhjnhvmfDEes39TMgfIIwdg9xtacsuP/NoRloxtkyD7ld10tz0ZaFG\n\
m1IPMx9BjxGKautePcE9osjXm9EWRKwYWx7LJzmxiFbhtWo8/nnk\n\
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

//var issuer = x509.getIssuer(programPub);


var block_file = 1000;
var http_port = 3001;
var p2p_port = 6001;
var initialPeers = [];

var sockets = [];
var MessageType = {
	QUERY_LATEST: 0,
	QUERY_ALL: 1,
	RESPONSE_BLOCKCHAIN: 2
};

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

var password = '123patinhos321';
var randomNumber = '0';

class Security {

	constructor() {


		const absolutePathPublic = path.resolve("keys/public.key");
		this.publicKey = fs.readFileSync(absolutePathPublic, 'utf8');
		const absolutePathPrivate = path.resolve("keys/private.key");
		this.privateKey = fs.readFileSync(absolutePathPrivate, 'utf8');

		// let str = this.encryptKeys("TESTEs45");
		// console.log(str);

		// str = this.decryptKeys(str);
		// console.log(str);

		//console.log(this.signature("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque venenatis sapien sit amet dictum tristique. Nulla id ipsum et neque tristique placerat. Vivamus maximus tincidunt ligula, a finibus nibh varius in. Nam auctor cursus velit, hendrerit dapibus sem vulputate eget. Aliquam accumsan lorem sed imperdiet efficitur. Cras ac neque est. Nam a mauris metus. Sed efficitur luctus lectus, quis aliquet ante fringilla a. Curabitur commodo dui lectus, nec molestie ex venenatis ac. Vivamus sed enim dolor. Ut nisi quam, porttitor interdum blandit in, luctus viverra metus. Nulla fermentum suscipit ultricies. Praesent mauris ipsum, vestibulum a varius malesuada, mollis non ligula. Vivamus convallis, nunc a fermentum pellentesque, erat libero elementum arcu, at ultricies magna velit ai.Phasellus nec nisi ut arcu dignissim vulputate. Vivamus et convallis enim. Vestibulum eu diam felis. Sed aliquam vel est ac imperdiet. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec pulvinar ex vitae ligula lacinia, ac volutpat turpis interdum. Praesent volutpat, arcu hendrerit pellentesque ultricies, nunc diam lacinia ligula, a laoreet libero mi ut sem. Duis sit amet nulla neque. Praesent ullamcorper, magna id egestas tincidunt, ipsum purus laoreet ex, ut maximus tortor elit acpsum. Quisque gravida sem erat, eu dictum felis gravida quis. Quisque ut ornare ipsum.Pellentesque hendrerit, felis sed porta tristique, justo tellus interdum lorem, eget pellentesque nisi eros elementum lorem. In dignissim risus sit amet quam pretium euismod. Nunc ut sem iaculis, hendrerit est id, vestibulum leo. Nunc dapibus mi quis ipsum euismod laoreet. Mauris vel congue erat, a luctus neque. Praesent varius odio eu mi rhoncus, quis tempus purus ultrices. Duis consequatulla sit amet velit facilisis, ut pretium ex finibus. Phasellus egestas odio eget urna convallis semper.Donec tristique ligula vel fringilla dictum. Curabitur lectus tortor, convallis sit amet venenatis sit amet, pellentesque sodales nisi. Ut lacus felis, ornare at eleifend in, hendrerit at diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In quis mi id nisl mattis egestas quis ac metus. Pellentesque in purus ornare mi bibendum venenatis at a tellus. Nulla vitae consequat velit. Pellentesque sollicitudin, dolor nec cursus ultrices, lacus leo dignissim eros, sit amet luctus massa elit ac sem. Nullam ultricies dignissim fermentum. Integer non nunc vel diam congue hendrerit vel quis ante. Maecenas vitae pretium nunc. Donec vulputate tortor quis tortor venenatis, in auctor nunc mollis. Morbi ut lacus ultrices, dictum erat id, venenatis massa. Nunc posuereacus nec aliquet gravida. Aliquam vulputate ante non tincidunt consectetur.Donec nec lorem felis. Sed imperdiet mauris nec neque fringilla suscipit. Suspendisse potenti. Nullam consequat nec ante id volutpat. Phasellus tristique nunc est, eu pretium tortor cursus non. Suspendisse feugiat metus vel egestas vulputate. Curabitur semper cursusapien, sit amet dictum lectus placerat ut. Nullam maximus ex massa, ut porta dolor congue id."));

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

	verify(data, signature, pubKey){
		const verifier = crypto.createVerify('RSA-SHA256');
		verifier.update(data);
		verifier.end();

		const verified = verifier.verify(pubKey, signature);

		return verified;
	}

	generateSymmetricKey(){
		return crypto.randomBytes(64);
	}

	encryptSymmetric(str, type) {
		let salt;
		
		if(type == 0){
			salt = password;
		} else {
			salt = randomNumber;
		}

		str = new Buffer(str.toString('base64'), "utf8");
		var cipher = crypto.createCipher("aes-256-ctr",salt)
		str = Buffer.concat([cipher.update(str),cipher.final()]);
		

		return str.toString('base64');
	}

	
	decryptSymmetric(str, type) {

		str = new Buffer(str, 'base64');

		let salt;
		if(type == 0){
			salt = password;
		} else {
			salt = randomNumber;
		}

		var decipher = crypto.createDecipher("aes-256-ctr",salt)
		str = Buffer.concat([decipher.update(str) , decipher.final()]);

		return str.toString('utf8');

	}

	encryptKeys(str) {
		
		str = crypto.publicEncrypt(this.publicKey, new Buffer(str));

		return str.toString('base64');
	}

	
	decryptKeys(str) {
		const decrypted = crypto.privateDecrypt(this.privateKey, new Buffer(str, 'base64'));
		return decrypted.toString('utf8');
	}
}

var security = new Security();

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
		let nextHash = this.calculateHash(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, '', '', '', '');
		return new Block(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, nextHash, '', '', '', '');
	};

	calculateHash(index, previousHash, timestamp, data){
		return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
	};

	calculateHashForBlock(block){
		return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data, '', '', '', '');
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
							let log = security.decryptSymmetric(data, 0);
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

		value = security.encryptSymmetric(JSON.stringify(newBlocks), 0);

		fs.writeFile('data/data.txt', value, function (err) {
			if (err) {
				console.log("erro de escrita");
			}
		});
	}

	pushBlock(block){

		this.getAllBlocks().then(
			value => {
				if(value){
					value.push(block);
				} else {
					value = [block];
				}

				value = security.encryptSymmetric(JSON.stringify(value), 0);
				
				fs.writeFile('data/data.txt', value, function (err) {
					if (err) {
						console.log("erro de escrita");
					}
				});

				console.log('block added: ' + JSON.stringify(block));

				this.latestBlock = block;

				broadcast(responseLatestMsg());

			}, error => {
				console.log("dasdadadasdasdsadsadasdas");
				console.log(error);
			}
		)		
	}


	tryReplaceChain(newBlocks){
		if (this.isValidChain(newBlocks) && newBlocks.length > this.latestBlock.index) {
			console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

			this.replace(newBlocks);

			broadcast(responseLatestMsg());
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
		res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
	});

	app.post('/addPeer', (req, res) => {
		connectToPeers([req.body.peer]);
		res.send();
	});

	app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};


var initP2PServer = () => {
	var server = new WebSocket.Server({port: p2p_port});
	server.on('connection', (ws) => {
		initConnection(ws);
	});

	console.log('listening websocket p2p port on: ' + p2p_port);
};

var initConnection = (ws) => {
	
	let count = 0;
	for (var i = sockets.length - 1; i >= 0; i--) {
		if(sockets[i]._socket.remoteAddress == ws._socket.remoteAddress){
			count++;
		}
	}

	if(count == 0){
		for (var i = sockets.length - 1; i >= 0; i--) {
			let site;
			site = 'http://'+sockets[i]._socket.remoteAddress+":"+http_port+"/addPeer";
			request.post({
				url: site,
				json: { peer: ws._socket.remoteAddress }
			});
		}
		sockets.push(ws);
		initMessageHandler(ws);
		initErrorHandler(ws);
		write(ws, queryChainLengthMsg());
	}
};

var initMessageHandler = (ws) => {
	ws.on('message', (data) => {
		var message = JSON.parse(data);
		console.log('Received message' + JSON.stringify(message));
		switch (message.type) {
			case MessageType.QUERY_LATEST:
				write(ws, responseLatestMsg());
				break;
			case MessageType.QUERY_ALL:
				blockchain.getAllBlocks().then(
					value => {
						write(ws, responseChainMsg(value));
					},
					error => {
						console.log(error); // Error!
						console.log("erro de leitura");
					}
				);
				break;
			case MessageType.RESPONSE_BLOCKCHAIN:
				handleBlockchainResponse(message);
				break;
		}
	});
};

var initErrorHandler = (ws) => {
	var closeConnection = (ws) => {
		console.log('connection failed to peer: ' + ws.url);
		sockets.splice(sockets.indexOf(ws), 1);
	};
	ws.on('close', () => closeConnection(ws));
	ws.on('error', () => closeConnection(ws));
};

var connectToPeers = (newPeers) => {
	newPeers.forEach((newPeer) => {
		let serv = 'ws://'+newPeer+":"+p2p_port;
		var ws = new WebSocket(serv);
		ws.on('open', () => initConnection(ws));
		ws.on('error', () => {
		   console.log('connection failed')
		});
	});
};

var handleBlockchainResponse = (message) => {

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

			broadcast(responseLatestMsg());
		} else if (receivedBlocks.length === 1) {
			console.log("We have to query the chain from our peer");
			broadcast(queryAllMsg());
		} else {
			console.log("Received blockchain is longer than current blockchain");
			blockchain.tryReplaceChain(receivedBlocks);
		}
	} else {
		console.log('received blockchain is not longer than current blockchain. Do nothing');
	}
};

var queryChainLengthMsg = () => ({'type': MessageType.QUERY_LATEST});

var queryAllMsg = () => ({'type': MessageType.QUERY_ALL});

var responseChainMsg = (data) =>({
	'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(data)
});
var responseLatestMsg = () => ({
	'type': MessageType.RESPONSE_BLOCKCHAIN,
	'data': JSON.stringify([blockchain.latestBlock])
});

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => write(socket, message));


var blockchain = new Blockchain();
connectToPeers(initialPeers);
initHttpServer();
initP2PServer();