#!/usr/bin/env node

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const extend = require('util')._extend;
const program = require('commander');
const request = require('request');
const pkg = require('./package.json');

const defaultConfigFile = path.join(os.homedir(),'.godaddy-dns.json');
const defaultLastIpFile = path.join(os.tmpdir(), '.lastip');

program
	.version(pkg.version)
	.option('-c, --config [file]', `specify the configuration file to use (default "${defaultConfigFile}")`)
	.option('-i, --ipfile [file]', `specify which file to use to store the last found ip (default "${defaultLastIpFile}")`)
	.parse(process.argv)
;

const config = JSON.parse(fs.readFileSync(program.config || defaultConfigFile, 'utf8'));
const lastIpFile = program.ipfile || defaultLastIpFile;

function getCurrentIp() {
	return new Promise((resolve, reject) => {
		request('https://api.ipify.org/', (err, response, ip) => {
			if (err) {
				return reject(err);
			}

			resolve(ip);
		});
	});
}

function getLastIp() {
	return new Promise((resolve, reject) => {
		if (!fs.existsSync(lastIpFile)) {
			return resolve(undefined);
		}

		fs.readFile(lastIpFile, 'utf8', (err, ip) => {
			if (err) {
				return reject(err);
			}

			resolve(ip.split(","));
		});
	});
}

function saveLastIp(ip) {
	return new Promise((resolve, reject) => {
		fs.writeFile(lastIpFile, ip, 'utf8', (err) => {
			if (err) {
				return reject(err);
			}

			resolve();
		});
	});
}

function updateRecords(ip) {
	let recordDefaults = {
		type: 'A',
		data: ip,
		ttl: 60 * 10 // 10 minutes (minimum allowed)
	};

	let records = config.records;
	// if records is a single object or string wrap it into an array
	if (records.constructor !== Array) {
		records = [records];
	}
	records = records.map((record) => {
		// if current record is a single string
		if (typeof record === 'string') {
			record = {name: record};
		}
		return extend(recordDefaults, record);
	})

	let options = {
		method: 'PATCH',
		url: `https://api.godaddy.com/v1/domains/${config.domain}/records`,
		headers: {
			authorization: `sso-key ${config.apiKey}:${config.secret}`,
			'content-type': 'application/json'
		},
		body: records,
		json: true
	};

	return new Promise((resolve, reject) => {
		request(options, (err, response, body) => {
			if (err) {
				return reject(`Failed request to GoDaddy Api ${err}`);
			};

			if (response.statusCode !== 200) {
				return reject(`Failed request to GoDaddy Api ${body.message}`);
			}

			resolve(body);
		});
	});
}

let lastUpdate,
	lastIp,
	currentIp,
	minTime,
	minUpdateIdentifier,
	minUpdateCount;

getLastIp()
.then((ip) => {
	lastUpdate = ip[0];
	lastIp = ip[1];
	return getCurrentIp();
})
.then((ip) => {
	currentIp = ip;
	if (config.minUpdateInterval){
		let matches = config.minUpdateInterval.toUpperCase().match(/(\d+) (\w+)/);
		minUpdateCount = Number(matches[1]);
		minUpdateIdentifier = matches[2];
	} else {
		minUpdateCount = 0;
		minUpdateIdentifier = "";
	}
	switch (minUpdateIdentifier) {
		case "MIN":
		case "MINS":
		case "MINUTE":
		case "MINUTES":
			minTime = minUpdateCount*60*1000;
			break;
		case "HOUR":
		case "HOURS":
			minTime = minUpdateCount*60*60*1000;
			break;
		case "DAY":
		case "DAYS":
			minTime = minUpdateCount*24*60*60*1000;
			break;
		default:
			minTime = 0;
			break;
	}
	if (lastIp === currentIp && (new Date()-Number(lastUpdate) < minTime || minTime==0)) {
		return Promise.reject()
	}

	return updateRecords(currentIp);
})
.then(() => {
	return saveLastIp(currentIp);
})
.then(() => {
	console.log(`[${new Date()}] Successfully updated DNS records to ip ${currentIp}`);
})
.catch((err) => {
	if (err) {
		console.error(`[${new Date()}] ${err}`);
		process.exit(1);
	}
});
