// 发布订阅模块全局实现
var Event = (function(){

  var global = this,
    Event,
    _default = 'default';

  Event = function(){
    var _listen,
        _trigger,
        _remove,
        _slice = Array.prototype.slice,
        _shift = Array.prototype.shift,
        _unshift = Array.prototype.unshift,
        namespaceCache = {},
        _create,
        find,
        each = function( ary, fn ){
            var ret;
            for ( var i = 0, l = ary.length; i < l; i++ ){
                var n = ary[i];
                ret = fn.call( n, i, n);
            }
            return ret;
        };

      _listen = function( key, fn, cache ){
        if ( ! cache[ key ] ){
           cache[ key ] = [];
        }
        cache[key].push( fn );
      };

      _remove = function( key, cache , fn){
        if ( cache[ key ] ){
           if( fn ){
              for( var i = cache[ key ].length; i >= 0; i-- ){
                  if( cache[ key ][i] === fn ){
                      cache[ key ].splice( i, 1 );
                  }
              }
           }else{
              cache[ key ] = [];
           }
        }
      };

      _trigger = function(){
        var cache = _shift.call(arguments),
             key = _shift.call(arguments),
             args = arguments,
             _self = this,
             ret,
             stack = cache[ key ];

        if ( ! stack || ! stack.length ){
           return;
        }

        return each( stack, function(){
           return this.apply( _self, args );
        });
      };

      _create = function( namespace ){
        var namespace = namespace || _default;
        // 利用闭包，让ret里的函数对变量保持引用
        var cache = {},
            offlineStack = [],    // 离线事件
            ret = {
                listen: function( key, fn, last ){
                  _listen( key, fn, cache );
                  if ( offlineStack === null ){
                      return;
                  }
                  // 监听的时候执行离线事件
                  if ( last === 'last' ){
                      offlineStack.length && offlineStack.pop()();
                  }else {
                      each( offlineStack, function() {
                          this();
                      });
                  }

                  offlineStack = null;
                },
                one: function( key, fn, last ){
                    _remove( key, cache );
                    this.listen( key, fn , last );
                },
                remove: function( key, fn ){
                    _remove( key, cache , fn);
                },
                trigger: function(){
                    var fn,
                      args,
                      _self = this;

                    _unshift.call( arguments, cache ); // 把cache作为第一个参数
                    args = arguments;
                    fn = function(){
                      return _trigger.apply( _self, args );
                    };

                    if ( offlineStack ){ // 未订阅场景下放入offlineStack，当offlineStack为[]的时候表示未订阅
                      return offlineStack.push( fn );
                    }
                    return fn();
                }
            };

        return namespace ?
          ( namespaceCache[ namespace ] ? namespaceCache[ namespace ] :
                namespaceCache[ namespace ] = ret )
                      : ret;
      };

    return {
      create: _create,
      one: function( key, fn, last ){
        var event = this.create( );
        event.one( key, fn, last );
      },
      remove: function( key, fn ){
        var event = this.create( );
        event.remove( key, fn );
      },
      listen: function( key, fn, last ){
        var event = this.create( );
        event.listen( key, fn, last );
      },
      trigger: function(){
        var event = this.create( );
        event.trigger.apply( this, arguments );
      }
    };
  }();
  return Event;
})();


/************** 先发布后订阅 ********************/
Event.trigger( 'click', 1 );
Event.trigger( 'click', 2 );
Event.listen( 'click', function( a ){ 
    console.log( a );       // 输出：1
});

/************** 使用命名空间 ********************/

Event.create( 'namespace1' ).listen( 'click', function( a ){
    console.log('namespace1', a );    // 输出：1
});

Event.create( 'namespace1' ).trigger( 'click', 1 );

Event.create( 'namespace2' ).listen( 'click', function( a ){
    console.log('namespace2', a );     // 输出：2
});
Event.create( 'namespace2' ).trigger( 'click', 2 );