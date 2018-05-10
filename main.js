'use strict';
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require('body-parser');
var WebSocket = require("ws");
var request = require('request');
var fs = require('fs');
var path = require('path');


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

class Block {
    constructor(index, previousHash, timestamp, data, hash) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
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
        return new Block(0, "0", 1465154705, "genesis", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
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
        let nextHash = this.calculateHash(nextIndex, this.latestBlock.hash, nextTimestamp, blockData);
        return new Block(nextIndex, this.latestBlock.hash, nextTimestamp, blockData, nextHash);
    };

    calculateHash(index, previousHash, timestamp, data){
        return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
    };

    calculateHashForBlock(block){
        return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data);
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
                    reject(err); 
                } else {
                    resolve(JSON.parse("["+data+"]"));
                }
            });
        });
    }

    replace(newBlocks){
        fs.writeFile('data/data.txt', JSON.stringify(newBlocks).slice(1, -1), function (err) {
            if (err) {
                console.log("erro de escrita");
            }
        });
    }

    pushBlock(block){
        let append;
        
        if(block.index == 0){
            append = JSON.stringify(block);
        } else{
            append = ","+JSON.stringify(block);
        }

        fs.appendFile('data/data.txt', append, function (err) {
            if (err) {
                console.log("erro de escrita");
            }
        });

        console.log('block added: ' + JSON.stringify(block));

        this.latestBlock = block;
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

        broadcast(responseLatestMsg());
        
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
        let count = 0;

        for (var i = sockets.length - 1; i >= 0; i--) {
            if(sockets[i]._socket.remoteAddress == newPeer){
                count++;
            }
        }

        if(count == 0){
            let serv = 'ws://'+newPeer+":"+p2p_port;
            var ws = new WebSocket(serv);
            ws.on('open', () => initConnection(ws));
            ws.on('error', () => {
               console.log('connection failed')
            });    
        }
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