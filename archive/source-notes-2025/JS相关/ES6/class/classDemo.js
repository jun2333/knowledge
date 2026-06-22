//class语法糖
//缺陷1：无法定义prototype属性，只能定义方法
class demo {
    a = 1;
    a() {
        //缺陷2：被属性a屏蔽了
        console.log(123);
    }
    b() {
        console.log('bbbb');
    }
}
class c {
    b() {
        console.log('from c');
    }
}

class child extends demo {
    constructor() {
        super();//静态绑定
    }
    b() {
        super.b();
        console.log('child bbbb');
    }
}
Object.setPrototypeOf(child, c);//改变child关联关系
console.log(c.isPrototypeOf(child))
console.log(demo.isPrototypeOf(child))//false
console.log(Object.getPrototypeOf(child))//c
let ins = new child();//缺陷3：super多态使用为静态绑定,new的过程中无视child的关联被改变为c，仍然认为是demo
console.log(Object.getPrototypeOf(Object.getPrototypeOf(ins)))//demo
console.log(demo.prototype.isPrototypeOf(ins))//false

ins.b();//仍然重用了demo的b方法
