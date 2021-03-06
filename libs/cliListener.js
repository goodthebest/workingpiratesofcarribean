var events = require('events');
var net = require('net');



const loggerFactory = require('./logger.js');


const logger = loggerFactory.getLogger('CLI', 'system');

var listener = module.exports = function listener(host, port) {
    
    var _this = this;
var emitLog = function(text){
        _this.emit('log', text);
    };

    this.start = function() {
        net.createServer(function(c) {

            var data = '';
            try {
                c.on('data', function(d) {
                    data += d;
                    if (data.slice(-1) === '\n') {
                        var message = JSON.parse(data);
                        _this.emit('command', message.command, message.params, message.options, function(message) {
                            c.end(message);
                        });
                    }
                });
                c.on('end', function() {

                });
                c.on('error', function() {

                });
            } catch (e) {
                logger.error('CLI listener failed to parse message %s', data);
            }

        }).listen(port, host, function() {
            logger.info('CLI listening on %s:%s', host, port)
        });
    }

};

listener.prototype.__proto__ = events.EventEmitter.prototype;
