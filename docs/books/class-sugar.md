# class语法糖原理

#### 1.不能像函数一样调用class，只能通过new进行实例化

```javascript
function Parent(){
    checkClassCall(this, Parent)
}
function checkClassCall(left, right){
    if (!(left instanceof right)) {
         throw new TypeError("Cannot call a class as a function"); 
    } 
}
```



#### 2.私有属性和公共属性实现以及修改

```javascript
// 用法
class Parent{
    #a = 11 //定义私有属性
    b = 12 //公共属性
	constructor(){
        this.#a = 10 //修改私有属性
        this.b = 10 //修改实例属性
    }
}
// 原理
function Parent(){
    _id.set(this, {
        writable:true,
        value:11
    })
    _defineProperty(this, b, 12)
    
    //设置私有属性
    _setPrivateProperty(this, _id, 11)
    //设置公共属性
    this.b = 10
}
function _defineProperty(obj, key, value){
    if(key in obj){
        Object.defineProperty(obj, key, { value: value, enumberable: true, configurable: true, writable: true })
    }else{
        obj[key] = value
    }
}
var _id = new WeakMap()
function _setPrivateProperty(receiver, privateMap, value){
    let descriptor =  privateMap.get(receiver)
    if(descriptor.set){
        descriptor.set.call(receiver, value)
    }else{
        if(!descriptor.writable) throw new Error('....')
        descriptor.value = value
    }
}
```



#### 3.原型方法和静态方法

```javascript
//用法
class Parent{
    static fn1(){}//定义静态方法
    fn2(){}//定义原型方法
}
//原理

function _defineProperties(target, props){
    for(let i = 0; i < props.length; i++){
        var descriptor = props[i]; 
        descriptor.enumerable = descriptor.enumerable || false; 
        descriptor.configurable = true; 
        if ("value" in descriptor) descriptor.writable = true; 
        Object.defineProperty(target, descriptor.key, descriptor); 
    }
}

function _createClass(Constructor, protoProps, staticProps) { 
    if (protoProps) _defineProperties(Constructor.prototype, protoProps); 
    if (staticProps) _defineProperties(Constructor, staticProps); 
    return Constructor; 
}

var People = function () {
  function People(id, name, age) {
    // ...
  }

  // 设置类的方法和静态方法
  _createClass(People, [{
    key: "fn2",
    value: function fn2() {
      //...
    }
  }], [{
    key: "fn1",
    value: function fn1() {
      //...
    }
  }]);

  return People;
}();
```



#### 4.类的继承

- 继承父类原型和继承父类静态属性

  ```javascript
  function _inherits(subClass, superClass){
      subClass.prototype = Object.create(superClass.prototype)
      Object.setPrototypeOf(subClass, superClass)
  }
  ```

- 通过调用父类的构造函数，获得父类的构造函数 this 上的属性

  ```javascript
  function Child(){
      _inherits(Child, Parent)
      var _super = _createSuper(Parent)
  	return _super.apply(this, arguments)
  }
  function _createSuper(superClass){
      var hasNativeReflectConstruct = _isNativeReflectConstruct(); 
      return function () { 
          var result; 
          if (hasNativeReflectConstruct) { 
              var NewTarget = _getPrototypeOf(this).constructor; 
              result = Reflect.construct(superClass, arguments, NewTarget); 
          } else { 
              result = superClass.apply(this, arguments); 
          } 
          return _possibleConstructorReturn(this, result); 
      }; 
  }
  // 判断 call 的类型，返回合适的 Constructor
  function _possibleConstructorReturn(self, call) { 
      if (call && (typeof call === "object" || typeof call === "function")) { return call; } 
      return _assertThisInitialized(self); 
  }
  
  // 断言 selft 是否初始化
  function _assertThisInitialized(self) { 
      if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } 
      return self; 
  }
  // 判断是否能否使用 Reflect
  function _isNativeReflectConstruct() { 
      if (typeof Reflect === "undefined" || !Reflect.construct) return false; 
      if (Reflect.construct.sham) return false; 
      if (typeof Proxy === "function") return true; 
      try { 
          Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); 
          return true; 
      } catch (e) { 
          return false; 
      } 
  }
  
  // 获取 o 对象的原型（__proto__）
  function _getPrototypeOf(o) { 
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; 
      return _getPrototypeOf(o); 
  }
  ```

  