# A blockchain for logs
The software Log Blockchain is recommended for systems that need to store and manage logs. Making possible to compare the local results with the valid data inside the blockchain.

With the right settings, the software will track in real time all the changes that occur in the file seted by the user and will audit the state of the file periodically, also saving the results in the log inside the blockchain.

You also have options to **compare** the data in the blockchain with the log file, **connect** your blockchain with the other peers in the network and **search** in the blockchain with date, public key, ip and creator of the block.

### Requirements

For this project to run in a proper way, it has some requirements, such as:
* A directory called _data_ in the same directory of the main.js (or the executable) file;
* A key pair of the local user needs to be in a directory called _keys_ and the names need to be _public.key_ and _private.key_. The _keys_ directory needs to be in the same directory as the main.js (or the executable) file;
* A file called _config_ in the same directory with the paths of the files to be tracked. It needs to be in the following format:
````
["/path/to/log1", "/path/to/log2"]
````
* You need to be in the same directory of the main.js (or the executable) to run it properly in such a way that you run it like this:
````
./main.js
````
or like this, in case of the executable:
````
./main-win
````
You may **not** run like this:
````
./somewhere/main-win
````


## Quick start
```
npm install

npm start
```

## General commands
### Usage

	search <option>
		Search in the blockchain logs according to <option>, it is based
		on timestamp, creator, ip or public key.

	clear	Clear the console, just like in bash.

	connect <ip>
		Connect in the blockchain with the given ip.

	compare <path> ...
		Compare the logs in the blockchain with the local logs of the given path(s).

	exit	Exit the program.

	help	Show this information.


## Search command

### Usage: search <option>

	-t, --timestamp <timestamp start> [<timestamp end>]
		If <timestamp start> and <timestamp end> are defined, the command
		returns all the logs between both dates. If only <timestamp start>
		is defined, the command returns all the logs of the day.

		The timestamp needs to be in the following format:
		dd/mm/yyyy

	-p --public-key-path <public key path>
		It returns the logs created using the <public key path>.
		The <public key path> must include the full path, the name of the
		file and the extension.

	-c --creator <creator name>
		It returns the logs created by <creator name>.
		The name may have more than one word.

	-i --ip <ip>
		It returns the logs created by the ip <ip>.
		The ip must be version 4.

	-h -? --help
		It shows this information.

## Compiled files

This project was compiled using [pkg](https://github.com/zeit/pkg "Pkg"). The binary files to linux, mac and windows are located in the [binaries](./binaries) directory. To run a binary you have to fulfill all the requirements listed above and you need to keep the file _x509.node_ in the same directory of the binary (already included in the _binaries_ folder).

## Considerations

The Log Blockchain was firstly forked from the [naivechain](https://github.com/lhartikk/naivechain) project in the branch master.

