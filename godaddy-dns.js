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

program
	.version(pkg.version)
	.option('-c, --config [file]', `specify the configuration file to use (default "${defaultConfigFile}")`)
	.parse(process.argv)
;

const config = JSON.parse(fs.readFileSync(program.config || defaultConfigFile, 'utf8'));

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
	let records = config.records;
	let options = {
		method: 'GET',
		url: `https://api.godaddy.com/v1/domains/${config.domain}/records/${records[0].type}/${records[0].name.replace("@","%40")}`,
		headers: {
			authorization: `sso-key ${config.apiKey}:${config.secret}`,
			'content-type': 'application/json'
		},
		json: true
	};
	return new Promise((resolve, reject) => {
		request(options, (err, response, ip) => {
			if (err) {
				return reject(err);
			}

			resolve(ip.length > 0 ? ip[0].data : null);
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

let lastIp,
	currentIp;

getLastIp()
.then((ip) => {
	lastIp = ip;
	return getCurrentIp();
})
.then((ip) => {
	currentIp = ip;
	if (lastIp === currentIp) {
		return Promise.reject()
	}

	return updateRecords(currentIp);
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
