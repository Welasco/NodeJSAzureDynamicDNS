//https://thisdavej.com/using-winston-a-versatile-logging-library-for-node-js/
'use strict';
const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const path = require('path');
const filename = path.join(__dirname, 'UpdateAzureRMDDNS.log');

try { fs.unlinkSync(filename); }
catch (ex) { }

const logconsole = createLogger({
  level: 'debug',
  format: format.combine(
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
      new transports.Console()
    ]
});

const logfile = createLogger({
    level: 'debug',
    format: format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new transports.File({ filename })
      ]
  });

function info(msg) {
    logconsole.info(msg);
    logfile.info(msg);
}

function debug(msg) {
    logconsole.debug(msg);
    logfile.debug(msg);
}

function error(msg) {
    logconsole.error(msg);
    logfile.error(msg);
}

function warning(msg) {
    logconsole.warning(msg);
    logfile.warning(msg);
}

module.exports.info = info;
module.exports.debug = debug;
module.exports.error = error;
module.exports.warning = warning;