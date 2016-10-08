# godaddy-dns

A Node.js script to programmatically update GoDaddy DNS records

[![npm version](https://badge.fury.io/js/godaddy-dns.svg)](http://badge.fury.io/js/godaddy-dns)

[![NPM](https://nodei.co/npm/godaddy-dns.png)](https://nodei.co/npm/godaddy-dns/)

---

## Introduction

This Node.js script allows you to programmatically update one or more GoDaddy DNS
records inserting the public IP of the machine where the script is run.

Quick example:

```bash
godaddy-dns -c config.json
```


## Requirements

This script requires **Node.js** (version >= 4.0.0) and a valid GoDaddy API **key**
and **secret**. You can get register a new key on your [GoDaddy developer page](https://developer.godaddy.com/keys/)


## Installation

To install the script globally you can use NPM:

```bash
npm install --global godaddy-dns
```

*If you have the script already installed in your system, this command will
update it to the latest available version.*

After executing this command the script `godaddy-dns` will be globally available
in your system. Give it a try with:

```bash
godaddy-dns -V
```


## Configuration

The command needs a configuration file in order to be executed. The configuration
file can be specified at runtime using the option `--config`, if not specfied the
command will try to access the file `.godaddy-dns.json` in the home directory of
the current user.

The configuration file contains a JSON object with the following fields:

  * **apiKey**: The API key for your GoDaddy account
  * **secret**: The API key secret for your GoDaddy account
  * **domain**: The domain for which to update the DNS records
  * **records**: An array of objects that defines the records to update. Every
  record object can define the following values:
   * **name**: (mandatory) the name of the record (e.g. `"mysubdomain"`, `"@"` or `"*"`)
   * **type**: (default `"A"`) the type of entry for the record
   * **ttl**: (default `600`) the TTL of the record in seconds (min value is 600)

You can define the DNS records in the **records** configuration also using a shorter
syntax by just passing the **name** of the domain as a plain string (e.g. `"mysubdomain"`).
If you have a single record wrapping it into an array is optional, you can
simply pass it as a single string or object.

See [config.json.sample](config.json.sample) for an example of how to structure
your `config.json`.


## Running the script continuously with Cron

One of the principal use cases why you might want to use this script (and actually
my original motivation to create it) is to map a DNS record to a machine with a
non-static IP. This way you can recreate your home-made DynamicDNS solution.

In this scenario you might want to add an entry to your Cron configuration as
in the following example:

```
*/5 * * * * godaddy-dns > /var/log/godaddy-dns.log 2>&1
```

In this case the script will be executed every 5 minutes and the logs will be stored
in `/var/logs/godaddy-dns.log`. Also note that in this example you will use the
default configuration file location. If you want to specify a different location
use the option `--config`.


## Command line options

```
Usage: godaddy-dns [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --config [file]  specify the configuration file to use  (default "<user home folder>/.godaddy-dns.json")
```

## Bugs and improvements

If you find a bug or have an idea about how to improve this script you can [open an issue](https://github.com/lmammino/godaddy-dnsissues) or [submit a pull request](https://github.com/lmammino/godaddy-dnspulls), it will definitely make you a better person! 😝


## License

Licensed under [MIT License](LICENSE). © Luciano Mammino.
