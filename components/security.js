'use strict';

module.exports = function(path, fs, x509, crypto) {

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

	var password = 'fFHstq5OLJybOqnO39ZDGl121BRbpSob';
	var iv = "BvanZY8a5d613dlg";

	try{
		var publicKey = fs.readFileSync(path.resolve("./keys/public.key"), 'utf8');	
		var publicKeyExtracted = extractPublicKey(publicKey);
		if(publicKeyExtracted == false){
			console.log("Erro public key, bad information inside");
			process.exit(1);
		};
	} catch (e){
		console.log("Erro public key, verify the path /keys");
		process.exit(1);
	}

	try{
		var privateKey = fs.readFileSync(path.resolve("./keys/private.key"), 'utf8');
	} catch (e){
		console.log("Erro private key, verify the path /keys");
		process.exit(1);
	}
	
	function signature(data, type){
		let priv = '';
		if(type == 0){
			priv = privateKey;
		} else {
			priv = programPriv;
		}

		let signer = crypto.createSign('RSA-SHA256');
		signer.update(data);
		signer.end();
		let signature = signer.sign(priv);

		return signature.toString('hex');
	}

	function extractPublicKey(pubKey){
		try {
			return x509.getIssuer(pubKey);
		} catch (err) {
			return false;
		}
	}

	function verifySignature(data, signature, pubKey){
		signature = new Buffer(signature, 'hex');
		let verifier = crypto.createVerify('RSA-SHA256');
		verifier.update(data);
		verifier.end();

		let verified = verifier.verify(pubKey, signature);
		return verified;
	}

	function generateSymmetricKey(){
		return crypto.randomBytes(64).toString('base64');
	}

	function encryptSymmetric(str) {

		var cipher = crypto.createCipheriv('aes-256-cbc',new Buffer(password), new Buffer(iv))
  		var crypted = cipher.update(str, 'utf8', 'hex')
  		crypted += cipher.final('hex');
		return crypted;
	}

	
	function decryptSymmetric(str) {

		var decipher = crypto.createDecipheriv('aes-256-cbc',new Buffer(password), new Buffer(iv))
		var dec = decipher.update(str, 'hex', 'utf8')
		dec += decipher.final('utf8')
		return dec;
	}

	function hash(str) {
		return crypto.createHash('sha256').update(str).digest('base64');
	}

	return {

		signature: signature,
		extractPublicKey: extractPublicKey,
		verifySignature: verifySignature,
		generateSymmetricKey: generateSymmetricKey,
		encryptSymmetric: encryptSymmetric,
		decryptSymmetric: decryptSymmetric,
		programPub:programPub,
		publicKeyExtracted:publicKeyExtracted,
		hash:hash, 
		publicKey:publicKey

    };
}