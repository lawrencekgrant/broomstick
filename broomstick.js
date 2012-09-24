/*
 * broomstick
 * <cam@onswipe.com>
 */
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var colors = require('colors');
var zlib = require('zlib');

var Broomstick = function (options) {
  options = options || {};
  this.path = options.path || 'public';
  this.index = options.index || 'index.html';
  this.verbose = options.verbose || false;
  this.gzip = options.gzip || false;
  this.cache = {};

  var b = this;
  b.log('initialized');

  return function (route) {
    var req = this.req;
    var res = this.res;
    res.setHeader('X-Powered-By', 'broomstick-gz');

    if (!route) route = b.index;

    b.log('req', route);

    if (b.cache[route]) {
      b.log('req', 'cached version exists for ' + route + ' of type ' + b.cache[route].mime);
      res.writeHead(200, {
          'Content-Type': b.cache[route].mime,
          'Content-Encoding' : b.cache[route].encoding});
      res.write(b.cache[route].data, b.cache[route].encoding);
      res.end();

    } else {
      var filepath = path.join(b.path, route);
      b.log('req', 'no cached version for ' + route);
      b.log('req', 'looking in: ' + filepath);
      path.exists(filepath, function (exists) {
        if (!exists) {
          b.log('req', filepath + ' does not exist: sending 404');
          res.writeHead(404);
          res.end();
        } else {
          var type = mime.lookup(path.extname(route));
          var encoding = (b.gzip ? 'gzip' : '');
          res.writeHead(200, { 'Content-Type': type, 'Content-Encoding': encoding});

          //if gzip is enabled, pass the file through a gzipper
          var fileStream = (b.gzip ?
            fs.createReadStream(filepath).pipe(zlib.createGzip()) :
            fs.createReadStream(filepath));

            //we can only one buffer per encoding, so, we'll change the name of the route to match
          route = route + encoding;
          b.cache[route] = {
            mime: type,
            encoding: encoding
          }
          fileStream.on('data', function (data) {
            res.write(data, encoding);
            if (!b.cache[route].data) {
              b.cache[route].data = data;
            } else {
              b.cache[route].data += data;
            }
          });
          fileStream.on('end', function () {
            res.end();
          });
        }
      });
    }
  }
}

Broomstick.prototype.log = function (type, message) {
  if (!message && type) {
    message = type;
    type = undefined;
  }
  if (this.verbose) {
    console.log('broomstick '.magenta + (type ? type.blue + ' ' : '') + message);
  }
}

module.exports = Broomstick;
