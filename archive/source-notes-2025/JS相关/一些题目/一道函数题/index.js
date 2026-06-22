function Foo(){
  getName = function(){console.log(1)} // 未使用声明语句直接变成全局变量了
  return this
}
Foo.getName = function(){console.log(2)}
Foo.prototype.getName = function(){console.log(3)}
var getName = function(){
  console.log(4)
}
function getName(){
  console.log(5)
}
console.log(Foo().getName)

Foo.getName()//2
getName()//1
getName()//1
new Foo.getName()//2
new Foo().getName()//3
new new Foo().getName()//3
Foo().getName()//报错


/* 
 *考察函数、构造器、原型链、变量提升、操作符优先级
*/
