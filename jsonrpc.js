/**!
 * angular-jsonrpc v0.1.2 [build 2013-07-07]
 * @copyright 2013 Arunjit Singh <opensrc@ajsd.in>. All Rights Reserved.
 * @license MIT; see LICENCE.
 * [https://github.com/ajsd/angular-jsonrpc.git]
 */
(function(){
"use strict";

/**
 * Provides and configures the jsonrpc service.
 */
function JsonRpcProvider() {
  var defaults = this.defaults = {};

  // defaults
  defaults.rpcPath_ = '/rpc';

  // provider.$get
  // @ngInject
  this.$get = ['$http', 'uuid', function($http, uuid) {
    /**
     * Makes a JSON-RPC request to `method` with `data`.
     *
     * @param {{path:string=, method: string, data:*)}} options Call options.
     * @param {angular.$http.Config} config HTTP config.
     * @return {angular.$http.HttpPromise}
     */
    function jsonrpc(options, config) {
      var id = uuid.generate();
      var payload = {
        'jsonrpc': '2.0',
        'method': options.method,
        'id': id
      };
      if (angular.isDefined(options.data)) {
        payload['params'] = options.data;
      }

      // Transformers to extract the response data.
      // TODO(arunjit): Use response interceptors when the API is stable.
      var transforms = [];
      angular.forEach($http.defaults.transformResponse, function(t) {
        transforms.push(t);
      });
      transforms.push(function(data) {
        return data['id'] === id ? data['result'] || data['error'] : null;
      });

      config = config || {};
      if (angular.isArray(config['transformResponse'])) {
        [].push.apply(transforms, config['transformResponse']);
      } else if (angular.isFunction(config['transformResponse'])) {
        transforms.push(config['transformResponse']);
      }
      config['transformResponse'] = transforms;

      // TODO(arunjit): Use $q to resolve the result.
      return $http.post(options.path || defaults.rpcPath_, payload, config);
    }

    /**
     * Shorthand for making a request.
     *
     * @param {string} path The call path.
     * @param {string} method The method to call.
     * @param {?*} data The data for the call.
     * @param {angular.$http.Config} config HTTP config.
     * @return {angular.$http.HttpPromise}
     */
    jsonrpc.request = function(path, method, data, config) {
      if (arguments.length < 4) {
        config = data;
        data = method;
        method = path;
        path = null;
      }
      return jsonrpc({path: path, method: method, data: data}, config);
    };

    /**
     * Helper to create services.
     *
     * Usage:
     *     module.service('locationService', function(jsonrpc) {
     *       var service = jsonrpc.newService('locationsvc');
     *       this.get = service.createMethod('Get');
     *     });
     *     ...
     *     module.controller(..., function(locationService) {
     *       locationService.get({max: 10}).success(function(d) {...});
     *       // GET /rpc
     *       // {"method": "locationsvc.Get", "params": {"max": 10}, ...}
     *     });
     *
     * @param {string} name The name of the service. This is the prefix used for
     *     all methods created through this service.
     * @param {string} path Optional path for this service.
     * @constructor
     */
    function Service(name, path) {
      this.serviceName = name;
      this.path = path;
    }

    /**
     * Creates a new service method.
     *
     * @param {string} name Method name.
     * @param {angular.$http.Config=} opt_config HTTP config.
     * @return {function(*):angular.$http.HttpPromise} An implementation for the
     *     service method.
     */
    Service.prototype.createMethod = function(name, opt_config) {
      var path = this.path;
      var method = this.serviceName + '.' + name;
      return function(data) {
        return jsonrpc.request(path, method, data, opt_config);
      };
    };

    /** Creates a new Service with the given `name` and optional `path`. */
    jsonrpc.newService = function(name, path) {
      return new Service(name, path);
    };

    return jsonrpc;
  }];
}

/** Set the base path for all JSON-RPC calls to |path|. */
JsonRpcProvider.prototype.setBasePath = function(path) {
  this.defaults.rpcPath_ = path;
};

/**
 * The jsonrpc module.
 */
angular.module('jsonrpc', []).
    service('uuid', UuidService).
    provider('jsonrpc', JsonRpcProvider);

/**
 * An ID generator.
 * Based on http://stackoverflow.com/a/2117523/377392.
 */
function UuidService() {
  this.format = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
}

/**
 * @return {string} A UUID.
 */
UuidService.prototype.generate = function() {
  /**! http://stackoverflow.com/a/2117523/377392 */
  return this.format.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

})();